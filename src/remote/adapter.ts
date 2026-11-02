// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-remote-agent (OpenAI / GPT-6 Astra Pro; self-reported)
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { FileService, fileSchemas } from '../files.js';
import { cancelled, fail, safeError } from '../errors.js';
import {
  JOB_TIMEOUT_MS,
  MAX_RESULT_BYTES,
  READ_TOOLS,
  UUID_PATTERN,
  WIRE_VERSION,
  type ToolRequest,
  type ToolResult,
} from './protocol.js';

/** A remote root is deliberately narrower than an entire drive or user profile. */
export async function remoteRoot(input: string): Promise<string> {
  if (!path.isAbsolute(input)) fail('INVALID_ROOT', 'Select an explicit absolute trusted directory.');
  const root = await fs.realpath(input);
  const home = await fs.realpath(os.homedir());
  if (path.relative(root, path.parse(root).root) === '' || path.relative(root, home) === '')
    fail('INVALID_ROOT', 'Select a specific trusted directory, not a drive root or user home.');
  return root;
}

/** Both transports reuse FileService; remote access never inherits mutable local compatibility settings. */
export class RemoteReadAdapter {
  private active = 0;
  private readonly admitted = new Map<string, number>();
  private constructor(
    readonly files: FileService,
    readonly deviceId: string,
  ) {}
  static async create(options: { root: string; deviceId: string }): Promise<RemoteReadAdapter> {
    if (!UUID_PATTERN.test(options.deviceId)) fail('INVALID_DEVICE', 'Device identity is invalid.');
    const root = await remoteRoot(options.root);
    return new RemoteReadAdapter(
      await FileService.create(root, { allowWrite: false, maxBytes: 65536 }),
      options.deviceId,
    );
  }
  async execute(request: ToolRequest, signal?: AbortSignal): Promise<ToolResult> {
    let counted = false;
    const envelope = {
      version: WIRE_VERSION,
      requestId: UUID_PATTERN.test(request?.requestId ?? '') ? request.requestId : 'invalid',
      deviceId: this.deviceId,
    };
    try {
      if (
        !request ||
        request.version !== WIRE_VERSION ||
        !UUID_PATTERN.test(request.requestId) ||
        !Number.isSafeInteger(request.deadline) ||
        !request.arguments ||
        typeof request.arguments !== 'object' ||
        Array.isArray(request.arguments)
      )
        fail('INVALID_REQUEST', 'Remote request does not match protocol version 1.');
      if (request.deviceId !== this.deviceId)
        fail('DEVICE_MISMATCH', 'Request is addressed to another paired computer.');
      const now = Date.now();
      if (request.deadline <= now) fail('DEADLINE_EXCEEDED', 'Remote request expired before execution.');
      if (request.deadline > now + JOB_TIMEOUT_MS + 1000)
        fail('INVALID_REQUEST', 'Remote request deadline exceeds the permitted budget.');
      cancelled(signal);
      if (!READ_TOOLS.some((tool) => tool.name === request.tool))
        fail('TOOL_DISABLED', 'Only explicitly listed read-only tools are available remotely.');
      for (const [id, expires] of this.admitted) if (expires <= now) this.admitted.delete(id);
      if (this.admitted.has(request.requestId)) fail('REPLAY_REJECTED', 'A request ID cannot execute twice.');
      if (this.active >= 4 || this.admitted.size >= 4096)
        fail('BUSY', 'Remote request capacity is bounded; retry with a new request after prior work completes.');
      this.admitted.set(request.requestId, request.deadline + 60000);
      this.active++;
      counted = true;
      const deadline = AbortSignal.timeout(Math.max(1, request.deadline - Date.now()));
      const bound = signal ? AbortSignal.any([signal, deadline]) : deadline;
      let value: Record<string, unknown>;
      switch (request.tool) {
        case 'mterm_read_file':
          value = await this.files.read(request.arguments);
          break;
        case 'mterm_file_info':
          value = await this.files.info(request.arguments);
          break;
        case 'mterm_list_directory':
          value = await this.files.list(request.arguments);
          break;
        default: {
          const args = fileSchemas.search.omit({ mode: true }).parse(request.arguments);
          value = await this.files.search(
            { ...args, mode: request.tool === 'mterm_search_files' ? 'name' : 'content' },
            bound,
          );
        }
      }
      if (Date.now() >= request.deadline) fail('DEADLINE_EXCEEDED', 'Remote tool exceeded its deadline.');
      cancelled(bound);
      const text = JSON.stringify(value);
      const result = { content: [{ type: 'text' as const, text }], structuredContent: value, isError: false };
      if (Buffer.byteLength(JSON.stringify(result)) > MAX_RESULT_BYTES)
        fail('RESPONSE_LIMIT', 'Result exceeds the remote wire budget; request a smaller range.');
      return { ...envelope, result };
    } catch (error) {
      const value = { ok: false, error: safeError(error) };
      return {
        ...envelope,
        result: {
          content: [{ type: 'text', text: JSON.stringify(value) }],
          structuredContent: value,
          isError: true,
        },
      };
    } finally {
      if (counted) this.active--;
    }
  }
}
