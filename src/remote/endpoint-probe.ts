// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-12-public-endpoint-inspector (OpenAI / GPT-6 Astra Pro; self-reported)
import https, { type RequestOptions } from 'node:https';
import { Resolver } from 'node:dns/promises';
import { isIP } from 'node:net';
import { checkServerIdentity, type TLSSocket } from 'node:tls';
import type { ClientRequest, IncomingMessage } from 'node:http';
import { ToolError, fail } from '../errors.js';
import { admitPublicEndpoint, isPublicEndpointAddress, type PublicEndpoint } from './endpoint-policy.js';

export type InspectionProtocol = '2026-07-28' | '2025-11-25';
type Cleanup = 'not-needed' | 'acknowledged' | 'unsupported' | 'unconfirmed';
interface Address {
  address: string;
  family: 4 | 6;
}
interface Inspection {
  schemaVersion: 1;
  endpoint: string;
  mode: 'public-https';
  requestedProtocol: InspectionProtocol;
  status: string;
  urlValidated: true;
  networkChecked: boolean;
  protocolChecked: boolean;
  credentialsUsed: false;
  routingEnabled: false;
  cleanup: Cleanup;
  addressesChecked?: number;
  protocolVersion?: string;
  httpStatus?: number;
  errorCode?: string;
  serverInfo?: { name: string; version: string; verified: false };
  advertisedCapabilities?: { tools: boolean; resources: boolean; prompts: boolean };
}
const REQUEST_ID = 'mterm-endpoint-inspection';
const MAX_BYTES = 65536,
  MAX_HEADERS = 8192,
  MAX_EVENT_BYTES = 16384,
  MAX_EVENTS = 16;
const LEGACY_VERSIONS = new Set(['2025-11-25', '2025-06-18', '2025-03-26']);
const CLIENT_INFO = { name: 'mterm-cli-endpoint-inspector', version: '0.0.1-preview.1' };
const problem = (code: string) =>
  new ToolError(code, 'The bounded endpoint inspection did not establish compatibility.');
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

function deadline(parent: AbortSignal | undefined, milliseconds: number) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, milliseconds);
  parent?.addEventListener('abort', abort, { once: true });
  if (parent?.aborted) controller.abort();
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer);
      parent?.removeEventListener('abort', abort);
    },
  };
}

async function addresses(target: PublicEndpoint, signal: AbortSignal): Promise<Address[]> {
  if (signal.aborted) throw problem('ENDPOINT_ABORTED');
  if (target.family) return [{ address: target.hostname, family: target.family }];
  const resolver = new Resolver({ timeout: 1000, tries: 1 });
  const phase = deadline(signal, 2000);
  let stop: (() => void) | undefined;
  try {
    const results = await new Promise<PromiseSettledResult<string[]>[]>((resolve, reject) => {
      stop = () => {
        resolver.cancel();
        reject(problem('ENDPOINT_DNS_TIMEOUT'));
      };
      phase.signal.addEventListener('abort', stop, { once: true });
      if (phase.signal.aborted) return stop();
      void Promise.allSettled([resolver.resolve4(target.hostname), resolver.resolve6(target.hostname)]).then(
        resolve,
        () => reject(problem('ENDPOINT_DNS')),
      );
    });
    const found: Address[] = [];
    for (const [index, result] of results.entries()) {
      if (result.status === 'rejected') {
        // A family can have no records; other resolution errors are uncertain.
        if (result.reason?.code === 'ENODATA') continue;
        throw problem('ENDPOINT_DNS');
      }
      if (!Array.isArray(result.value) || result.value.length > 8) throw problem('ENDPOINT_DNS_LIMIT');
      for (const address of result.value) {
        const family = index === 0 ? 4 : 6;
        if (typeof address !== 'string' || isIP(address) !== family || !isPublicEndpointAddress(address)) {
          throw problem('ENDPOINT_ADDRESS');
        }
        found.push({ address, family });
      }
    }
    if (!found.length || found.length > 8) throw problem('ENDPOINT_DNS_LIMIT');
    return found;
  } finally {
    if (stop) phase.signal.removeEventListener('abort', stop);
    phase.dispose();
    resolver.cancel();
  }
}

// Shared by the probe and isolated TLS qualification. It takes no caller options:
// neither environment proxies nor an ambient TLS-disable flag may alter it.
export function createEndpointInspectionAgent(): https.Agent {
  return new https.Agent({
    proxyEnv: {},
    keepAlive: false,
    maxSockets: 1,
    maxTotalSockets: 1,
    maxCachedSessions: 0,
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2',
    checkServerIdentity,
  });
}

function sameAddress(actual: string | undefined, pinned: Address): boolean {
  if (!actual || isIP(actual) !== pinned.family || !isPublicEndpointAddress(actual)) return false;
  if (pinned.family === 4) return actual === pinned.address;
  return new URL(`https://[${actual}]/`).hostname === new URL(`https://[${pinned.address}]/`).hostname;
}

function boundedJson(text: string): unknown {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw problem('ENDPOINT_RESPONSE');
  }
  const work = [{ value, depth: 0 }];
  let inspected = 0;
  while (work.length) {
    const item = work.pop()!;
    if (++inspected > 2048 || item.depth > 16) throw problem('ENDPOINT_LIMIT');
    if (item.value && typeof item.value === 'object') {
      const entries = Object.values(item.value);
      if (entries.length > 128) throw problem('ENDPOINT_LIMIT');
      for (const child of entries) work.push({ value: child, depth: item.depth + 1 });
    }
  }
  return value;
}

function rpcResult(message: unknown, notificationsAllowed: boolean): Record<string, unknown> | undefined {
  if (!object(message) || message.jsonrpc !== '2.0') throw problem('ENDPOINT_RESPONSE');
  if (Object.hasOwn(message, 'method')) {
    if (
      notificationsAllowed &&
      !Object.hasOwn(message, 'id') &&
      typeof message.method === 'string' &&
      /^notifications\/[a-zA-Z0-9_/-]{1,80}$/.test(message.method)
    )
      return;
    throw problem('ENDPOINT_INTERACTION');
  }
  if (message.id !== REQUEST_ID) throw problem('ENDPOINT_RESPONSE');
  if (Object.hasOwn(message, 'error')) throw problem('ENDPOINT_PROTOCOL');
  if (!object(message.result)) throw problem('ENDPOINT_RESPONSE');
  return message.result;
}

interface ExchangeResult {
  status: number;
  result?: Record<string, unknown>;
}
interface Exchange {
  method: 'POST' | 'DELETE';
  body?: Record<string, unknown>;
  protocol: string;
  session?: string;
  expect: 'rpc' | 'empty' | 'delete';
  onSessionObserved?: () => void;
  onSession?: (session: string) => void;
}

async function exchange(
  target: PublicEndpoint,
  pinned: Address,
  agent: https.Agent,
  spec: Exchange,
  signal: AbortSignal,
): Promise<ExchangeResult> {
  const bytes = spec.body ? Buffer.from(JSON.stringify(spec.body)) : undefined;
  const lookup = ((
    hostname: string,
    options: { all?: boolean },
    callback: (error: Error | null, address: string | Address[], family?: number) => void,
  ) => {
    if (hostname !== target.hostname) return callback(problem('ENDPOINT_PIN'), '', 0);
    if (options.all) callback(null, [{ ...pinned }]);
    else callback(null, pinned.address, pinned.family);
  }) as NonNullable<RequestOptions['lookup']>;
  const headers: Record<string, string | number> = {
    Accept: 'application/json, text/event-stream',
    'Accept-Encoding': 'identity',
    'MCP-Protocol-Version': spec.protocol,
    'User-Agent': 'MTerm-endpoint-inspector/1',
  };
  if (bytes) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = bytes.length;
  }
  if (spec.protocol === '2026-07-28') headers['Mcp-Method'] = 'server/discover';
  if (spec.session) headers['MCP-Session-Id'] = spec.session;
  return new Promise((resolve, reject) => {
    let request: ClientRequest | undefined,
      response: IncomingMessage | undefined,
      settled = false;
    const stop = () => finish(undefined, problem('ENDPOINT_ABORTED'));
    const finish = (result?: ExchangeResult, error?: Error) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', stop);
      response?.destroy();
      request?.destroy();
      if (error) reject(error);
      else resolve(result!);
    };
    if (signal.aborted) return finish(undefined, problem('ENDPOINT_ABORTED'));
    signal.addEventListener('abort', stop, { once: true });
    try {
      // Node HTTPS forwards this net.connect option; the pinned HTTP typings
      // omit it from RequestOptions even though the runtime supports it.
      const requestOptions: RequestOptions & { autoSelectFamily: boolean } = {
        protocol: 'https:',
        hostname: target.hostname,
        port: target.port,
        path: target.path,
        method: spec.method,
        headers,
        agent,
        lookup,
        family: pinned.family,
        autoSelectFamily: false,
        servername: target.family ? '' : target.hostname,
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
        checkServerIdentity,
        maxHeaderSize: MAX_HEADERS,
        insecureHTTPParser: false,
      };
      request = https.request(requestOptions, (incoming) => {
        response = incoming;
        incoming.on('error', () => finish(undefined, problem('ENDPOINT_NETWORK')));
        incoming.on('aborted', () => finish(undefined, problem('ENDPOINT_NETWORK')));
        try {
          if (
            !sameAddress(incoming.socket.remoteAddress, pinned) ||
            (incoming.socket as TLSSocket).authorized !== true
          ) {
            throw problem('ENDPOINT_PIN');
          }
          if (incoming.rawHeaders.reduce((size, part) => size + Buffer.byteLength(part), 0) > MAX_HEADERS) {
            throw problem('ENDPOINT_LIMIT');
          }
          const header = (name: string): string | undefined => {
            if (
              incoming.rawHeaders.filter((item, index) => index % 2 === 0 && item.toLowerCase() === name)
                .length > 1
            ) {
              throw problem('ENDPOINT_RESPONSE');
            }
            const value = incoming.headers[name];
            if (value !== undefined && typeof value !== 'string') throw problem('ENDPOINT_RESPONSE');
            return value;
          };
          const status = incoming.statusCode ?? 0;
          if (!Number.isInteger(status) || status < 100 || status > 599) throw problem('ENDPOINT_RESPONSE');
          // Observation records possible remote allocation even when a duplicate
          // or malformed value cannot be adopted or authorize a later DELETE.
          if (
            incoming.headers['mcp-session-id'] !== undefined ||
            incoming.rawHeaders.some(
              (item, index) => index % 2 === 0 && item.toLowerCase() === 'mcp-session-id',
            )
          ) {
            spec.onSessionObserved?.();
          }
          // Do not consume authentication challenges, redirect targets or error bodies.
          if (spec.expect === 'delete' || (spec.expect === 'rpc' ? status !== 200 : status !== 202)) {
            return finish({ status });
          }
          const session = header('mcp-session-id');
          if (session !== undefined) {
            if (!/^[\x21-\x7e]{1,256}$/.test(session)) throw problem('ENDPOINT_RESPONSE');
            spec.onSession?.(session);
            if (spec.protocol === '2026-07-28') throw problem('ENDPOINT_PROTOCOL');
          }
          const encoding = header('content-encoding');
          if (encoding && encoding.toLowerCase() !== 'identity') throw problem('ENDPOINT_RESPONSE');
          const length = header('content-length');
          if (length && (!/^\d{1,10}$/.test(length) || Number(length) > MAX_BYTES))
            throw problem('ENDPOINT_LIMIT');
          const type = (header('content-type') ?? '').toLowerCase();
          const mime = type.split(';')[0]!.trim();
          if (
            spec.expect === 'rpc' &&
            (!['application/json', 'text/event-stream'].includes(mime) ||
              (type.includes('charset=') && !/;\s*charset=(?:utf-8|"utf-8")\s*(?:;|$)/.test(type)))
          ) {
            throw problem('ENDPOINT_RESPONSE');
          }
          const decoder = new TextDecoder('utf-8', { fatal: true });
          let size = 0,
            text = '',
            eventBytes = 0,
            eventCount = 0,
            eventName = '',
            data: string[] = [];
          const line = (value: string, delimiterBytes: number) => {
            eventBytes += Buffer.byteLength(value) + delimiterBytes;
            if (eventBytes > MAX_EVENT_BYTES) throw problem('ENDPOINT_LIMIT');
            if (!value) {
              if (++eventCount > MAX_EVENTS) throw problem('ENDPOINT_LIMIT');
              const payload = data.join('\n');
              if (payload) {
                if (eventName && eventName !== 'message') throw problem('ENDPOINT_INTERACTION');
                const result = rpcResult(boundedJson(payload), true);
                if (result) finish({ status, result });
              }
              eventBytes = 0;
              eventName = '';
              data = [];
              return;
            }
            if (value.startsWith(':')) return;
            const colon = value.indexOf(':');
            const field = colon < 0 ? value : value.slice(0, colon);
            const content = colon < 0 ? '' : value.slice(colon + 1).replace(/^ /, '');
            if (field === 'data') data.push(content);
            else if (field === 'event') eventName = content;
          };
          const consume = (final = false) => {
            while (!settled) {
              const end = text.search(/[\r\n]/);
              if (end < 0 || (!final && end === text.length - 1 && text[end] === '\r')) break;
              const width = text[end] === '\r' && text[end + 1] === '\n' ? 2 : 1;
              const value = text.slice(0, end);
              text = text.slice(end + width);
              line(value, width);
            }
            if (Buffer.byteLength(text) + eventBytes > MAX_EVENT_BYTES) throw problem('ENDPOINT_LIMIT');
          };
          incoming.on('data', (chunk: Buffer) => {
            if (settled) return;
            try {
              size += chunk.length;
              if (size > MAX_BYTES || (spec.expect === 'empty' && size)) throw problem('ENDPOINT_LIMIT');
              text += decoder.decode(chunk, { stream: true });
              if (mime === 'text/event-stream') consume();
            } catch (error) {
              finish(undefined, error instanceof ToolError ? error : problem('ENDPOINT_RESPONSE'));
            }
          });
          incoming.on('end', () => {
            if (settled) return;
            try {
              text += decoder.decode();
              if (spec.expect === 'empty') return finish({ status });
              if (mime === 'text/event-stream') {
                consume(true);
                if (!settled) throw problem('ENDPOINT_INCOMPLETE');
              } else finish({ status, result: rpcResult(boundedJson(text), false) });
            } catch (error) {
              finish(undefined, error instanceof ToolError ? error : problem('ENDPOINT_RESPONSE'));
            }
          });
        } catch (error) {
          finish(undefined, error instanceof ToolError ? error : problem('ENDPOINT_RESPONSE'));
        }
      });
      request.on('error', () => finish(undefined, problem('ENDPOINT_NETWORK')));
      if (signal.aborted) stop();
      else request.end(bytes);
    } catch {
      finish(undefined, problem('ENDPOINT_NETWORK'));
    }
  });
}

function description(result: Record<string, unknown>, modern: boolean, session?: string) {
  if (!object(result.capabilities)) throw problem('ENDPOINT_RESPONSE');
  for (const key of ['tools', 'resources', 'prompts']) {
    if (Object.hasOwn(result.capabilities, key) && !object(result.capabilities[key]))
      throw problem('ENDPOINT_RESPONSE');
  }
  const info = modern
    ? object(result._meta)
      ? result._meta['io.modelcontextprotocol/serverInfo']
      : undefined
    : result.serverInfo;
  if (
    (!modern || info !== undefined) &&
    (!object(info) || typeof info.name !== 'string' || typeof info.version !== 'string')
  ) {
    throw problem('ENDPOINT_RESPONSE');
  }
  const printable = (value: unknown): value is string =>
    typeof value === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9 ._+:/()-]{0,79}$/.test(value) &&
    (!session || !value.includes(session));
  return {
    advertisedCapabilities: {
      tools: object(result.capabilities.tools),
      resources: object(result.capabilities.resources),
      prompts: object(result.capabilities.prompts),
    },
    ...(object(info) && printable(info.name) && printable(info.version)
      ? { serverInfo: { name: info.name, version: info.version, verified: false as const } }
      : {}),
  };
}

export async function inspectPublicEndpoint(
  input: string,
  options: { check?: boolean; protocol?: InspectionProtocol; signal?: AbortSignal } = {},
): Promise<Inspection> {
  const target = admitPublicEndpoint(input),
    protocol = options.protocol ?? '2026-07-28';
  if (protocol !== '2026-07-28' && protocol !== '2025-11-25')
    fail('USAGE', 'Select protocol 2026-07-28 or 2025-11-25 explicitly.');
  const report: Inspection = {
    schemaVersion: 1,
    endpoint: target.url,
    mode: 'public-https',
    requestedProtocol: protocol,
    status: 'url-valid',
    urlValidated: true,
    networkChecked: false,
    protocolChecked: false,
    credentialsUsed: false,
    routingEnabled: false,
    cleanup: 'not-needed',
  };
  if (options.check !== true) return report;
  report.networkChecked = true;
  // Main work has eight seconds; only a confirmed owned legacy session can use
  // a separate two-second cleanup allowance. DNS has its own two-second cap.
  const work = deadline(options.signal, 8000);
  let agent: https.Agent | undefined, pinned: Address | undefined, sessionCandidate: string | undefined;
  let ownedSession: string | undefined,
    negotiated = protocol as string;
  try {
    const resolved = await addresses(target, work.signal);
    report.addressesChecked = resolved.length;
    pinned = resolved[0]!;
    agent = createEndpointInspectionAgent();
    const modern = protocol === '2026-07-28';
    const body = modern
      ? {
          jsonrpc: '2.0',
          id: REQUEST_ID,
          method: 'server/discover',
          params: {
            _meta: {
              'io.modelcontextprotocol/protocolVersion': protocol,
              'io.modelcontextprotocol/clientInfo': CLIENT_INFO,
              'io.modelcontextprotocol/clientCapabilities': {},
            },
          },
        }
      : {
          jsonrpc: '2.0',
          id: REQUEST_ID,
          method: 'initialize',
          params: { protocolVersion: protocol, capabilities: {}, clientInfo: CLIENT_INFO },
        };
    const first = await exchange(
      target,
      pinned,
      agent,
      {
        method: 'POST',
        body,
        protocol,
        expect: 'rpc',
        onSessionObserved() {
          report.cleanup = 'unconfirmed';
        },
        onSession(value) {
          sessionCandidate = value;
        },
      },
      work.signal,
    );
    report.httpStatus = first.status;
    if (first.status !== 200) {
      report.status =
        first.status === 401
          ? 'authorization-required'
          : first.status === 403
            ? 'access-denied'
            : first.status >= 300 && first.status < 400
              ? 'redirect-refused'
              : 'inconclusive';
      return report;
    }
    const result = first.result!;
    if (modern) {
      if (result.resultType !== 'complete') throw problem('ENDPOINT_INTERACTION');
      if (
        !Array.isArray(result.supportedVersions) ||
        !result.supportedVersions.length ||
        result.supportedVersions.length > 8 ||
        result.supportedVersions.some((v: unknown) => typeof v !== 'string' || v.length > 64) ||
        !result.supportedVersions.includes(protocol)
      )
        throw problem('ENDPOINT_PROTOCOL');
      if (
        typeof result.ttlMs !== 'number' ||
        !Number.isFinite(result.ttlMs) ||
        result.ttlMs < 0 ||
        typeof result.cacheScope !== 'string' ||
        !['public', 'private'].includes(result.cacheScope)
      )
        throw problem('ENDPOINT_RESPONSE');
      Object.assign(report, description(result, true));
    } else {
      if (typeof result.protocolVersion !== 'string' || !LEGACY_VERSIONS.has(result.protocolVersion))
        throw problem('ENDPOINT_PROTOCOL');
      const metadata = description(result, false, sessionCandidate);
      negotiated = result.protocolVersion;
      // A session-looking header alone cannot authorize a DELETE. Bind it only
      // after the matching initialization result passes the supported schema.
      ownedSession = sessionCandidate;
      const notified = await exchange(
        target,
        pinned,
        agent,
        {
          method: 'POST',
          body: { jsonrpc: '2.0', method: 'notifications/initialized' },
          protocol: negotiated,
          session: ownedSession,
          expect: 'empty',
        },
        work.signal,
      );
      if (notified.status !== 202) throw problem('ENDPOINT_PROTOCOL');
      Object.assign(report, metadata);
    }
    report.protocolVersion = negotiated;
    report.protocolChecked = true;
    report.status = 'compatible';
  } catch (error) {
    report.errorCode = error instanceof ToolError ? error.code : 'ENDPOINT_NETWORK';
    report.status = options.signal?.aborted
      ? 'cancelled'
      : work.signal.aborted || report.errorCode === 'ENDPOINT_DNS_TIMEOUT'
        ? 'timeout'
        : report.errorCode === 'ENDPOINT_ADDRESS'
          ? 'blocked-address'
          : report.errorCode === 'ENDPOINT_PROTOCOL'
            ? 'unsupported-protocol'
            : 'inconclusive';
  } finally {
    work.dispose();
    if (ownedSession && pinned && agent) {
      const cleanup = deadline(undefined, 2000);
      try {
        const result = await exchange(
          target,
          pinned,
          agent,
          {
            method: 'DELETE',
            protocol: negotiated,
            session: ownedSession,
            expect: 'delete',
          },
          cleanup.signal,
        );
        report.cleanup =
          (result.status >= 200 && result.status < 300) || result.status === 404
            ? 'acknowledged'
            : result.status === 405
              ? 'unsupported'
              : 'unconfirmed';
      } catch {
        report.cleanup = 'unconfirmed';
      } finally {
        cleanup.dispose();
      }
      if (report.protocolChecked && report.cleanup !== 'acknowledged')
        report.status = 'compatible-cleanup-unconfirmed';
    }
    agent?.destroy();
  }
  return report;
}
