// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-08-aug005-container-isolation (OpenAI / GPT-6 Astra Pro; self-reported)
import http from 'node:http';
import { StringDecoder } from 'node:string_decoder';
import type { Readable } from 'node:stream';
import { ToolError, fail } from './errors.js';
const API_BYTES = 524288;
export const ENGINE_API = '1.45';
export const reason = (signal?: AbortSignal) =>
  signal?.reason instanceof ToolError
    ? signal.reason
    : new ToolError('CANCELLED', 'Isolated execution was cancelled.');
const transportError = (error: unknown) =>
  ['EACCES', 'EPERM'].includes((error as NodeJS.ErrnoException)?.code ?? '')
    ? new ToolError('ISOLATION_PERMISSION_DENIED', 'Access to the selected local Engine endpoint was denied.')
    : new ToolError('ISOLATION_UNAVAILABLE', 'The selected local Engine connection failed.');
export type ApiReply = { status: number; body: Record<string, any> };
export function expect(reply: ApiReply, statuses = [200]) {
  if (!statuses.includes(reply.status)) {
    if (reply.status === 401 || reply.status === 403)
      fail('ISOLATION_PERMISSION_DENIED', 'The Engine denied this operation.');
    fail('ISOLATION_BACKEND_ERROR', 'The Engine did not confirm the requested operation.');
  }
  return reply.body;
}
export class EngineApi {
  constructor(readonly socketPath: string) {}
  request(
    method: string,
    resource: string,
    input?: unknown,
    signal?: AbortSignal,
    timeoutMs = 3000,
  ): Promise<ApiReply> {
    if (signal?.aborted) return Promise.reject(reason(signal));
    const body = input === undefined ? undefined : Buffer.from(JSON.stringify(input));
    if (body && body.length > API_BYTES)
      return Promise.reject(
        new ToolError('ISOLATION_REQUEST_LIMIT', 'Engine request exceeds its byte limit.'),
      );
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error, value?: ApiReply) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        if (error) {
          request.destroy();
          reject(error);
        } else resolve(value!);
      };
      const request = http.request(
        {
          socketPath: this.socketPath,
          agent: false,
          method,
          path: '/v' + ENGINE_API + resource,
          headers: {
            connection: 'close',
            ...(body ? { 'content-type': 'application/json', 'content-length': body.length } : {}),
          },
        },
        (response) => {
          let bytes = 0;
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > API_BYTES) {
              response.destroy();
              finish(new ToolError('ISOLATION_RESPONSE_LIMIT', 'Engine response exceeds its byte limit.'));
            } else chunks.push(chunk);
          });
          response.on('error', (e) => finish(transportError(e)));
          response.on('aborted', () =>
            finish(new ToolError('ISOLATION_UNAVAILABLE', 'The Engine response was interrupted.')),
          );
          response.on('end', () => {
            try {
              const parsed = bytes ? JSON.parse(Buffer.concat(chunks, bytes).toString('utf8')) : {};
              if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
              finish(undefined, { status: response.statusCode ?? 0, body: parsed });
            } catch {
              finish(new ToolError('ISOLATION_PROTOCOL', 'The Engine returned invalid bounded JSON.'));
            }
          });
        },
      );
      const abort = () => finish(reason(signal));
      const timer = setTimeout(
        () =>
          finish(
            new ToolError(
              'ISOLATION_BACKEND_TIMEOUT',
              'The Engine operation was not confirmed before its deadline.',
            ),
          ),
        timeoutMs,
      );
      signal?.addEventListener('abort', abort, { once: true });
      request.on('error', (e) => finish(signal?.aborted ? reason(signal) : transportError(e)));
      request.end(body);
    });
  }
  attach(id: string, signal: AbortSignal, maxBytes: number): Promise<AttachedOutput> {
    if (signal.aborted) return Promise.reject(reason(signal));
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error, stream?: Readable, head = Buffer.alloc(0)) => {
        if (settled) {
          stream?.destroy();
          return;
        }
        settled = true;
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        if (error) {
          request.destroy();
          reject(error);
          return;
        }
        const capture = new AttachedOutput(stream!, signal, maxBytes);
        capture.feed(head);
        resolve(capture);
      };
      const request = http.request({
        socketPath: this.socketPath,
        agent: false,
        method: 'POST',
        path: '/v' + ENGINE_API + '/containers/' + id + '/attach?stream=1&stdout=1&stderr=1&stdin=0',
        headers: { Connection: 'Upgrade', Upgrade: 'tcp' },
      });
      const abort = () => finish(reason(signal));
      const timer = setTimeout(
        () => finish(new ToolError('ISOLATION_BACKEND_TIMEOUT', 'Output attachment was not confirmed.')),
        3000,
      );
      signal.addEventListener('abort', abort, { once: true });
      request.on('upgrade', (response, socket, head) => {
        if (response.statusCode !== 101 || response.headers.upgrade?.toLowerCase() !== 'tcp') {
          socket.destroy();
          finish(new ToolError('ISOLATION_PROTOCOL', 'Unexpected Engine stream upgrade.'));
        } else finish(undefined, socket, head);
      });
      request.on('response', (response) => {
        if (response.statusCode !== 200) {
          response.destroy();
          finish(
            new ToolError(
              response.statusCode === 403 ? 'ISOLATION_PERMISSION_DENIED' : 'ISOLATION_PROTOCOL',
              'Engine output attachment was refused.',
            ),
          );
        } else finish(undefined, response);
      });
      request.on('error', (e) => finish(signal.aborted ? reason(signal) : transportError(e)));
      request.end();
    });
  }
}
/** Incremental, non-TTY Docker multiplexing. No allocation is based on an unchecked frame length. */
export class AttachedOutput {
  readonly done: Promise<void>;
  stdout = '';
  stderr = '';
  bytes = 0;
  private wireBytes = 0;
  private frames = 0;
  private pieces = 0;
  private header = Buffer.alloc(8);
  private headerBytes = 0;
  private remaining = 0;
  private selected = 1;
  private ended = false;
  private failure?: Error;
  private resolve!: () => void;
  private reject!: (error: Error) => void;
  private out = new StringDecoder('utf8');
  private err = new StringDecoder('utf8');
  private abort: () => void;
  constructor(
    private stream: Readable,
    private signal: AbortSignal,
    private maxBytes: number,
  ) {
    this.done = new Promise<void>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
    // A synchronous upgrade head can fail before its caller has received this object.
    void this.done.catch(() => {});
    this.abort = () => this.finish(reason(signal));
    signal.addEventListener('abort', this.abort, { once: true });
    stream.on('data', (b: Buffer) => this.feed(b));
    stream.on('error', () =>
      this.finish(new ToolError('ISOLATION_STREAM_LOST', 'Owned container output was interrupted.')),
    );
    stream.on('end', () => {
      if (this.headerBytes || this.remaining) {
        this.finish(new ToolError('ISOLATION_PROTOCOL', 'Truncated container output frame.'));
        return;
      }
      try {
        this.append(1, this.out.end());
        this.append(2, this.err.end());
        this.finish();
      } catch (e) {
        this.finish(e as Error);
      }
    });
    stream.on('close', () => {
      if (!this.ended)
        this.finish(
          new ToolError('ISOLATION_STREAM_LOST', 'Owned container output closed without completion.'),
        );
    });
    if (signal.aborted) this.abort();
  }
  private append(stream: number, text: string) {
    if (!text) return;
    this.wireBytes += Buffer.byteLength(JSON.stringify(text)) - 2;
    if (this.wireBytes > 262144 || ++this.pieces > 8192)
      fail('ISOLATION_OUTPUT_LIMIT', 'Isolated output exceeds its bounded wire budget.');
    if (stream === 1) this.stdout += text;
    else this.stderr += text;
  }
  feed(chunk: Buffer) {
    if (this.ended) return;
    try {
      let at = 0;
      while (at < chunk.length) {
        if (!this.remaining) {
          const count = Math.min(8 - this.headerBytes, chunk.length - at);
          chunk.copy(this.header, this.headerBytes, at, at + count);
          this.headerBytes += count;
          at += count;
          if (this.headerBytes < 8) continue;
          this.headerBytes = 0;
          this.selected = this.header[0]!;
          this.remaining = this.header.readUInt32BE(4);
          if (![1, 2].includes(this.selected) || this.header[1] || this.header[2] || this.header[3])
            fail('ISOLATION_PROTOCOL', 'Invalid container output frame.');
          if (++this.frames > 4096 || this.remaining > this.maxBytes - this.bytes)
            fail('ISOLATION_OUTPUT_LIMIT', 'Isolated output exceeds its owner ceiling.');
          if (!this.remaining) continue;
        }
        const count = Math.min(this.remaining, chunk.length - at),
          part = chunk.subarray(at, at + count);
        this.bytes += count;
        this.remaining -= count;
        at += count;
        this.append(this.selected, (this.selected === 1 ? this.out : this.err).write(part));
      }
    } catch (e) {
      this.finish(
        e instanceof ToolError ? e : new ToolError('ISOLATION_PROTOCOL', 'Invalid container output stream.'),
      );
    }
  }
  private finish(error?: Error) {
    if (this.ended) return;
    this.ended = true;
    this.failure = error;
    this.signal.removeEventListener('abort', this.abort);
    if (error) {
      this.stream.destroy();
      this.reject(error);
    } else this.resolve();
  }
  assertOpen() {
    if (this.failure) throw this.failure;
    if (this.ended) fail('ISOLATION_STREAM_LOST', 'Owned output ended before container start.');
  }
  dispose() {
    this.stream.destroy();
  }
}
