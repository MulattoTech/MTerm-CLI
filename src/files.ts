// SPDX-License-Identifier: MIT
// Modified: 2026-10-05-codex-parity-foundation; preserve UTF-8 BOM and add guarded mkdirTree.
// AI-Change: 2026-10-04-local-mcp (OpenAI / GPT-6 Astra Pro; self-reported)
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { RootPolicy, ignored, privateName } from './policy.js';
import { fail, cancelled } from './errors.js';
const pathname = z.string().min(1).max(4096);
const version = z.union([z.literal('missing'), z.string().regex(/^[a-f0-9]{64}$/)]);
export const fileSchemas = {
  read: z.strictObject({
    path: pathname,
    offset: z.number().int().min(0).max(1000000).default(0),
    length: z.number().int().min(1).max(1000000).optional(),
  }),
  info: z.strictObject({ path: pathname }),
  write: z.strictObject({ path: pathname, text: z.string().max(1048576), expectedVersion: version }),
  mkdir: z.strictObject({ path: pathname }),
  list: z.strictObject({ path: pathname.default('.'), limit: z.number().int().min(1).max(500).default(100) }),
  move: z.strictObject({ source: pathname, destination: pathname }),
  search: z.strictObject({
    path: pathname.default('.'),
    query: z.string().min(1).max(256),
    mode: z.enum(['name', 'content']).default('name'),
    maxResults: z.number().int().min(1).max(200).default(50),
    maxDepth: z.number().int().min(0).max(16).default(8),
    maxVisited: z.number().int().min(1).max(10000).default(2000),
    timeoutMs: z.number().int().min(1).max(5000).default(2000),
  }),
};
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
export class FileService {
  private queue: Promise<unknown> = Promise.resolve();
  private constructor(
    readonly policy: RootPolicy,
    readonly allowWrite: boolean,
    readonly maxBytes: number,
  ) {}
  static async create(
    root: string,
    options: { allowWrite?: boolean; maxBytes?: number } = {},
  ): Promise<FileService> {
    const max = options.maxBytes ?? 1048576;
    if (!Number.isInteger(max) || max < 1 || max > 1048576)
      fail('INVALID_ARGUMENT', 'Invalid file byte limit.');
    return new FileService(await RootPolicy.create(root), options.allowWrite === true, max);
  }
  private mutation<T>(action: () => Promise<T>): Promise<T> {
    if (!this.allowWrite)
      return Promise.reject(
        Object.assign(new Error('File mutation requires --allow-write.'), { code: 'WRITE_DISABLED' }),
      );
    const result = this.queue.then(action);
    this.queue = result.catch(() => {});
    return result;
  }
  private async bytes(full: string): Promise<Buffer> {
    const handle = await fs.open(
      full,
      constants.O_RDONLY | (process.platform === 'win32' ? 0 : constants.O_NOFOLLOW),
    );
    try {
      const st = await handle.stat();
      if (!st.isFile()) fail('NOT_FILE', 'Expected a regular file.');
      if (st.nlink > 1) fail('LINK_REJECTED', 'Multiply-linked files are refused.');
      if (st.size > this.maxBytes) fail('FILE_TOO_LARGE', 'File exceeds configured byte limit.');
      const b = Buffer.alloc(this.maxBytes + 1);
      let total = 0;
      while (total < b.length) {
        const r = await handle.read(b, total, b.length - total, null);
        if (!r.bytesRead) break;
        total += r.bytesRead;
      }
      if (total > this.maxBytes) fail('FILE_TOO_LARGE', 'File grew beyond the configured byte limit.');
      return b.subarray(0, total);
    } finally {
      await handle.close();
    }
  }
  private text(b: Buffer): string {
    if (b.includes(0)) fail('BINARY_FILE', 'Binary data is not exposed as text.');
    try {
      return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(b);
    } catch {
      fail('INVALID_UTF8', 'File is not valid UTF-8.');
    }
  }
  async read(input: unknown) {
    const a = fileSchemas.read.parse(input);
    const full = await this.policy.resolve(a.path);
    const b = await this.bytes(full);
    const text = this.text(b);
    const lines = text.split('\n');
    const end = a.length === undefined ? lines.length : Math.min(lines.length, a.offset + a.length);
    return {
      path: this.policy.relative(full),
      bytes: b.length,
      version: sha(b),
      text: a.offset === 0 && a.length === undefined ? text : lines.slice(a.offset, end).join('\n'),
      totalLines: lines.length,
      nextOffset: end < lines.length ? end : null,
    };
  }
  async info(input: unknown) {
    const a = fileSchemas.info.parse(input);
    const full = await this.policy.resolve(a.path);
    const st = await fs.lstat(full);
    return {
      path: this.policy.relative(full),
      file: st.isFile(),
      directory: st.isDirectory(),
      bytes: st.size,
      modifiedAt: st.mtime.toISOString(),
    };
  }
  async write(input: unknown, signal?: AbortSignal) {
    return this.mutation(async () => {
      cancelled(signal);
      const a = fileSchemas.write.parse(input);
      const b = Buffer.from(a.text, 'utf8');
      if (b.length > this.maxBytes) fail('FILE_TOO_LARGE', 'Write exceeds configured byte limit.');
      const full = await this.policy.resolve(a.path, true);
      let old: Buffer | undefined;
      let mode = 0o600;
      try {
        old = await this.bytes(full);
        mode = (await fs.stat(full)).mode & 0o777;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      }
      if ((old === undefined ? 'missing' : sha(old)) !== a.expectedVersion)
        fail('CONFLICT', 'File changed or already exists; read it again before saving.');
      const temp = path.join(path.dirname(full), '.mterm-' + randomUUID() + '.tmp');
      let owned = false;
      try {
        const h = await fs.open(temp, 'wx', mode);
        owned = true;
        try {
          await h.writeFile(b);
          await h.sync();
        } finally {
          await h.close();
        }
        cancelled(signal);
        await this.policy.resolve(a.path, true);
        if (old === undefined) {
          try {
            await fs.link(temp, full);
          } catch (e) {
            if ((e as NodeJS.ErrnoException).code === 'EEXIST')
              fail('CONFLICT', 'Destination appeared during create.');
            throw e;
          }
        } else {
          if (sha(await this.bytes(full)) !== a.expectedVersion)
            fail('CONFLICT', 'Destination changed during write.');
          await fs.rename(temp, full);
          owned = false;
        }
        return { path: this.policy.relative(full), bytes: b.length, version: sha(b) };
      } finally {
        if (owned) await fs.unlink(temp).catch(() => {});
      }
    });
  }
  async mkdir(input: unknown, signal?: AbortSignal) {
    return this.mutation(async () => {
      cancelled(signal);
      const a = fileSchemas.mkdir.parse(input);
      const full = await this.policy.resolve(a.path, true);
      await fs.mkdir(full, { mode: 0o700 });
      return { path: this.policy.relative(full), created: true };
    });
  }
  async mkdirTree(input: unknown, signal?: AbortSignal) {
    return this.mutation(async () => {
      cancelled(signal);
      const a = fileSchemas.mkdir.parse(input);
      // Validate all lexical components first so a later forbidden name cannot leave earlier dirs.
      const target = this.policy.lexical(a.path);
      const relative = path.relative(this.policy.root, target);
      const parts = relative ? relative.split(path.sep) : [];
      if (parts.length > 64) fail('PATH_DEPTH', 'Directory creation depth exceeds64 components.');
      let current = this.policy.root,
        created = 0;
      for (const component of parts) {
        cancelled(signal);
        current = path.join(current, component);
        const checked = await this.policy.resolve(current, true);
        try {
          await fs.mkdir(checked, { mode: 0o700 });
          created++;
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
        }
        await this.policy.resolve(current);
        if (!(await fs.lstat(current)).isDirectory())
          fail('NOT_DIRECTORY', 'Existing component is not a directory.');
      }
      return { path: this.policy.relative(target), created };
    });
  }
  async move(input: unknown, signal?: AbortSignal) {
    return this.mutation(async () => {
      cancelled(signal);
      const a = fileSchemas.move.parse(input);
      const source = await this.policy.resolve(a.source);
      const dest = await this.policy.resolve(a.destination, true);
      const st = await fs.lstat(source);
      if (!st.isFile()) fail('NOT_FILE', 'The current no-overwrite move supports regular files only.');
      try {
        await fs.link(source, dest);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'EEXIST')
          fail('CONFLICT', 'Destination exists; move never overwrites.');
        throw e;
      }
      // No-overwrite link + unlink is deliberate; interruption can leave both names, never discard destination data.
      await fs.unlink(source);
      return { source: this.policy.relative(source), destination: this.policy.relative(dest), moved: true };
    });
  }
  async list(input: unknown) {
    const a = fileSchemas.list.parse(input);
    const full = await this.policy.resolve(a.path);
    const dir = await fs.opendir(full);
    const entries: Array<{ name: string; directory: boolean; file: boolean; link: boolean }> = [];
    let truncated = false;
    for await (const e of dir) {
      if (privateName(e.name)) continue;
      if (entries.length === a.limit) {
        truncated = true;
        break;
      }
      entries.push({ name: e.name, directory: e.isDirectory(), file: e.isFile(), link: e.isSymbolicLink() });
    }
    entries.sort((x, y) => x.name.localeCompare(y.name));
    return { path: this.policy.relative(full), entries, truncated };
  }
  async search(input: unknown, signal?: AbortSignal) {
    const a = fileSchemas.search.parse(input);
    cancelled(signal);
    const root = await this.policy.resolve(a.path);
    const deadline = performance.now() + a.timeoutMs;
    const results: Array<{ path: string; excerpt?: string }> = [];
    let visited = 0,
      readBytes = 0,
      truncated = false;
    const bounded = () => {
      cancelled(signal);
      if (
        results.length >= a.maxResults ||
        visited >= a.maxVisited ||
        readBytes >= 8388608 ||
        performance.now() > deadline
      ) {
        truncated = true;
        return true;
      }
      return false;
    };
    const visit = async (dirPath: string, depth: number): Promise<void> => {
      if (bounded()) return;
      const dir = await fs.opendir(dirPath);
      for await (const e of dir) {
        if (bounded()) break;
        visited++;
        if (e.isSymbolicLink() || privateName(e.name) || ignored.has(e.name.toLowerCase())) continue;
        const raw = path.join(dirPath, e.name);
        let full: string;
        try {
          full = await this.policy.resolve(this.policy.relative(raw));
        } catch {
          continue;
        }
        if (a.mode === 'name' && e.name.toLowerCase().includes(a.query.toLowerCase()))
          results.push({ path: this.policy.relative(full) });
        if (a.mode === 'content' && e.isFile())
          try {
            const b = await this.bytes(full);
            readBytes += b.length;
            const text = this.text(b);
            const at = text.toLowerCase().indexOf(a.query.toLowerCase());
            if (at >= 0)
              results.push({
                path: this.policy.relative(full),
                excerpt: text.slice(Math.max(0, at - 80), at + a.query.length + 120),
              });
          } catch {
            /* Unsupported/changed/unreadable files are skipped; no content is leaked. */
          }
        if (e.isDirectory() && depth < a.maxDepth) await visit(full, depth + 1);
      }
    };
    await visit(root, 0);
    return { root: this.policy.relative(root), results, visited, readBytes, truncated };
  }
}
