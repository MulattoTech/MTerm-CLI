// SPDX-License-Identifier: MIT
// Policy-backed, bounded source reads shared by heuristic navigation tools.
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { RootPolicy, ignored, privateName } from '../policy.js';
import { cancelled, fail } from '../errors.js';

export interface SourceReaderOptions {
  policy?: RootPolicy;
  signal?: AbortSignal;
  maxBytes?: number;
  readText?: (file: string, signal?: AbortSignal) => Promise<string>;
}

export class SourceReader {
  private constructor(
    readonly policy: RootPolicy,
    readonly options: SourceReaderOptions,
  ) {}

  static async create(root: string, options: SourceReaderOptions = {}): Promise<SourceReader> {
    cancelled(options.signal);
    const policy = options.policy ?? (await RootPolicy.create(root));
    cancelled(options.signal);
    return new SourceReader(policy, options);
  }

  async read(file: string): Promise<string> {
    const { signal } = this.options;
    cancelled(signal);
    const full = await this.policy.resolve(file);
    cancelled(signal);
    const maxBytes = Math.min(262144, this.options.maxBytes ?? 262144);
    if (this.options.readText) {
      const content = await this.options.readText(full, signal);
      cancelled(signal);
      if (Buffer.byteLength(content, 'utf8') > maxBytes)
        fail('FILE_TOO_LARGE', 'Source exceeds the navigation byte limit.');
      return content;
    }
    const handle = await fs.open(
      full,
      constants.O_RDONLY | (process.platform === 'win32' ? 0 : constants.O_NOFOLLOW),
    );
    try {
      cancelled(signal);
      const stat = await handle.stat();
      cancelled(signal);
      if (!stat.isFile()) fail('NOT_FILE', 'Expected a regular source file.');
      if (stat.nlink !== 1) fail('LINK_REJECTED', 'Multiply-linked source files are refused.');
      if (stat.size > maxBytes) fail('FILE_TOO_LARGE', 'Source exceeds the navigation byte limit.');
      const bytes = Buffer.alloc(maxBytes + 1);
      let used = 0;
      while (used < bytes.length) {
        cancelled(signal);
        const result = await handle.read(bytes, used, bytes.length - used, null);
        cancelled(signal);
        if (!result.bytesRead) break;
        used += result.bytesRead;
      }
      if (used > maxBytes) fail('FILE_TOO_LARGE', 'Source grew beyond the navigation byte limit.');
      const content = bytes.subarray(0, used);
      if (content.includes(0)) fail('BINARY_FILE', 'Binary source is not exposed as text.');
      try {
        return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(content);
      } catch {
        fail('INVALID_UTF8', 'Source is not valid UTF-8.');
      }
    } finally {
      await handle.close();
      cancelled(signal);
    }
  }

  /** Read at most 200 files, 2,000 entries, eight levels and 8 MiB per scan. */
  async *scan(
    root: string,
    extensions: readonly string[],
    maxFiles = 200,
    maxDepth = 8,
  ): AsyncGenerator<{ file: string; text: string }> {
    const { signal } = this.options;
    cancelled(signal);
    const start = await this.policy.resolve(root);
    cancelled(signal);
    let visited = 0,
      count = 0,
      bytes = 0;
    const limit = Math.max(1, Math.min(200, maxFiles));
    const reader = this;
    async function* visit(directory: string, depth: number): AsyncGenerator<{ file: string; text: string }> {
      cancelled(signal);
      if (visited >= 2000 || count >= limit || bytes >= 8388608) return;
      const fullDirectory = await reader.policy.resolve(directory);
      cancelled(signal);
      const dir = await fs.opendir(fullDirectory);
      const iterator = dir[Symbol.asyncIterator]();
      let started = false;
      try {
        while (visited < 2000 && count < limit && bytes < 8388608) {
          cancelled(signal);
          started = true;
          const next = await iterator.next();
          cancelled(signal);
          if (next.done) break;
          visited++;
          const entry = next.value;
          if (
            entry.isSymbolicLink() ||
            entry.name.startsWith('.') ||
            privateName(entry.name) ||
            ignored.has(entry.name.toLowerCase()) ||
            ['vendor', 'build', '__pycache__'].includes(entry.name.toLowerCase())
          )
            continue;
          const file = path.join(fullDirectory, entry.name);
          try {
            if (entry.isDirectory() && depth < maxDepth) yield* visit(file, depth + 1);
            else if (entry.isFile() && extensions.includes(path.extname(entry.name).toLowerCase())) {
              const text = await reader.read(file);
              cancelled(signal);
              const size = Buffer.byteLength(text, 'utf8');
              if (bytes + size > 8388608) return;
              bytes += size;
              count++;
              yield { file, text };
              cancelled(signal);
            }
          } catch {
            cancelled(signal);
            // A denied, unsupported or concurrently changed entry is skipped.
          }
        }
      } finally {
        if (started) await iterator.return?.();
        else await dir.close();
        // Early consumer returns skip statements after finally. Cancellation
        // during awaited cleanup must still prevent returning source content.
        cancelled(signal);
      }
      cancelled(signal);
    }
    yield* visit(start, 0);
    cancelled(signal);
  }
}
