// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-remote-agent (OpenAI / GPT-6 Astra Pro; self-reported)
import { setTimeout as delay } from 'node:timers/promises';
import { fail, ToolError } from '../errors.js';
import {
  MAX_FRAME_BYTES,
  UUID_PATTERN,
  WIRE_VERSION,
  type AgentPoll,
  type ToolRequest,
  type ToolResult,
} from './protocol.js';

export function normalizeGateway(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { fail('GATEWAY_URL', 'Gateway must be an absolute HTTPS origin.'); }
  if (
    url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
    (url.pathname !== '/' && url.pathname !== '')
  ) fail('GATEWAY_URL', 'Gateway must be an HTTPS origin without credentials, a path, query or fragment.');
  return url.origin;
}

export class GatewayTransport {
  readonly gateway: string;
  constructor(
    gateway: string,
    private readonly token?: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    this.gateway = normalizeGateway(gateway);
    if (token !== undefined && (!token || token.length > 4096 || /[\x00-\x20\x7f]/.test(token)))
      fail('REMOTE_CREDENTIAL', 'Device credential is invalid.');
  }
  async post(endpoint: string, value: unknown, signal?: AbortSignal): Promise<{ status: number; data: unknown }> {
    if (!/^\/api\/(agent|pair)\/[a-z]+$/.test(endpoint))
      fail('REMOTE_ENDPOINT', 'Endpoint is not part of the device protocol.');
    const body = JSON.stringify(value);
    if (Buffer.byteLength(body) > MAX_FRAME_BYTES) fail('REMOTE_REQUEST_LIMIT', 'Remote frame exceeds its byte limit.');
    const timeout = AbortSignal.timeout(25000);
    const bound = signal ? AbortSignal.any([signal, timeout]) : timeout;
    let response: Response;
    try {
      response = await this.fetcher(this.gateway + endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(this.token ? { authorization: 'Bearer ' + this.token } : {}) },
        body,
        redirect: 'error',
        signal: bound,
      });
    } catch {
      fail('REMOTE_NETWORK', 'Gateway request failed or timed out; no response or credential data is logged.');
    }
    if ([401, 403, 410].includes(response.status)) {
      await response.body?.cancel().catch(() => {});
      fail('REMOTE_REVOKED', 'Device authorization is expired, revoked or unavailable. Pair again explicitly.');
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      fail(response.status === 429 ? 'REMOTE_RATE_LIMIT' : 'REMOTE_HTTP', 'Gateway declined the request; retry is bounded.');
    }
    if (Number(response.headers.get('content-length')) > MAX_FRAME_BYTES) {
      await response.body?.cancel().catch(() => {});
      fail('REMOTE_RESPONSE_LIMIT', 'Gateway response exceeds the byte limit.');
    }
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    if (reader) {
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          total += part.value.byteLength;
          if (total > MAX_FRAME_BYTES) {
            await reader.cancel();
            fail('REMOTE_RESPONSE_LIMIT', 'Gateway response exceeds the byte limit.');
          }
          chunks.push(part.value);
        }
      } finally { reader.releaseLock(); }
    }
    if (!total) return { status: response.status, data: {} };
    try {
      return { status: response.status, data: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))) };
    } catch { fail('REMOTE_PROTOCOL', 'Gateway response is not valid bounded JSON.'); }
  }
}

function parsePoll(value: unknown): AgentPoll {
  const p = value as AgentPoll;
  if (
    !p || typeof p !== 'object' || !Array.isArray(p.requests) || p.requests.length > 4 ||
    !Array.isArray(p.cancelled) || p.cancelled.length > 32 ||
    p.cancelled.some(id => typeof id !== 'string' || !UUID_PATTERN.test(id)) ||
    !Number.isInteger(p.pollAfterMs) || p.pollAfterMs < 1000 || p.pollAfterMs > 30000 ||
    p.requests.some(r => !r || typeof r !== 'object' || !UUID_PATTERN.test(r.requestId ?? '') ||
      !UUID_PATTERN.test(r.deviceId ?? '') || r.version !== WIRE_VERSION || !Number.isSafeInteger(r.deadline))
  ) fail('REMOTE_PROTOCOL', 'Gateway poll response does not match the bounded device protocol.');
  return p;
}

export interface AgentEvent {
  at: string;
  state: 'connecting' | 'online' | 'reconnecting' | 'revoked' | 'stopped';
  activeRequests: number;
}
export interface ReadAdapter {
  readonly deviceId: string;
  execute(request: ToolRequest, signal?: AbortSignal): Promise<ToolResult>;
}
export interface AgentOptions {
  adapter: ReadAdapter;
  transport: GatewayTransport;
  onEvent?: (event: AgentEvent) => void;
  sleep?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  random?: () => number;
}

/** One interactive lifetime. A reconnect never resubmits or reruns a delivered tool request. */
export class RemoteAgent {
  constructor(private readonly options: AgentOptions) {}
  async run(signal?: AbortSignal): Promise<{ reason: 'stopped' | 'revoked' }> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const active = new Map<string, { controller: AbortController; done: Promise<void> }>();
    const seen = new Map<string, number>();
    const sleep = this.options.sleep ?? ((ms, s) => delay(ms, undefined, { signal: s }));
    const random = this.options.random ?? Math.random;
    let reason: 'stopped' | 'revoked' = 'stopped';
    const event = (state: AgentEvent['state']) => this.options.onEvent?.({ at: new Date().toISOString(), state, activeRequests: active.size });
    const revoked = () => { reason = 'revoked'; event('revoked'); controller.abort(); };
    const isRevoked = (e: unknown) => e instanceof ToolError && e.code === 'REMOTE_REVOKED';
    const execute = async (request: ToolRequest, child: AbortController) => {
      const bound = AbortSignal.any([controller.signal, child.signal]);
      const result = await this.options.adapter.execute(request, bound);
      // Result delivery may retry; filesystem execution above never does.
      for (let attempt = 0; attempt < 3 && !controller.signal.aborted && Date.now() < request.deadline; attempt++) {
        try { await this.options.transport.post('/api/agent/result', result, controller.signal); return; }
        catch (e) {
          if (isRevoked(e)) { revoked(); return; }
          if (attempt < 2) await sleep(Math.min(2000, 500 * 2 ** attempt), controller.signal).catch(() => {});
        }
      }
    };
    event('connecting');
    let failures = 0;
    try {
      while (!controller.signal.aborted) {
        try {
          const { data } = await this.options.transport.post('/api/agent/poll', { version: WIRE_VERSION, deviceId: this.options.adapter.deviceId }, controller.signal);
          const poll = parsePoll(data);
          failures = 0;
          for (const id of poll.cancelled) active.get(id)?.controller.abort();
          const now = Date.now();
          for (const [id, expiry] of seen) if (expiry <= now) seen.delete(id);
          for (const request of poll.requests) {
            if (request.deviceId !== this.options.adapter.deviceId || seen.has(request.requestId)) continue;
            if (active.size >= 4 || seen.size >= 4096) break;
            seen.set(request.requestId, Math.max(now + 60000, request.deadline + 60000));
            const child = new AbortController();
            const done = execute(request, child).catch(() => {}).finally(() => { active.delete(request.requestId); });
            active.set(request.requestId, { controller: child, done });
          }
          event('online');
          await sleep(poll.pollAfterMs, controller.signal);
        } catch (e) {
          if (controller.signal.aborted) break;
          if (isRevoked(e)) { revoked(); break; }
          event('reconnecting');
          failures = Math.min(failures + 1, 6);
          await sleep(Math.min(30000, 500 * 2 ** failures) + Math.floor(random() * 500), controller.signal).catch(() => {});
        }
      }
    } finally {
      controller.abort();
      for (const job of active.values()) job.controller.abort();
      await Promise.allSettled([...active.values()].map(j => j.done));
      signal?.removeEventListener('abort', abort);
      if (reason === 'stopped') event('stopped');
    }
    return { reason };
  }
}
