// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-05-codex-parity-foundation (OpenAI / GPT-6 Astra Pro; self-reported)
// Original bounded adapter. Pinned upstream behavioral references and limitations: docs/parity/.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { z } from 'zod';
import { FileService } from './files.js';
import { privateName } from './policy.js';
import { cancelled, fail, safeError } from './errors.js';
const pathname = z.string().min(1).max(4096);
const origin = z.enum(['ui', 'llm']).optional();
export const desktopFileSchemas = {
  read: z.object({
    path: pathname,
    isUrl: z.boolean().default(false),
    offset: z.number().int().min(-1000000).max(1000000).default(0),
    length: z.number().int().min(0).max(1000000).default(1000),
    sheet: z.string().optional(),
    range: z.string().optional(),
    options: z.record(z.string(), z.unknown()).optional(),
    origin,
  }),
  multiple: z.object({ paths: z.array(pathname).min(1).max(20) }),
  write: z.object({
    path: pathname,
    content: z.string().max(1048576),
    mode: z.enum(['rewrite', 'append']).optional(),
    origin,
  }),
  mkdir: z.object({ path: pathname }),
  list: z.object({ path: pathname, depth: z.number().int().min(0).max(16).default(2), origin }),
  move: z.object({ source: pathname, destination: pathname }),
  info: z.object({ path: pathname }),
  edit: z.object({
    file_path: pathname,
    old_string: z.string().min(1).max(262144),
    new_string: z.string().max(262144),
    expected_replacements: z.number().int().min(1).max(10000).default(1),
    origin,
  }),
};
export interface DesktopTextResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}
const reply = (text: string): DesktopTextResult => ({ content: [{ type: 'text', text }] });
const countLines = (text: string) =>
  text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
const office = /\.(?:xlsx?|xlsm|pdf|docx|png|jpe?g|gif|webp)$/i;
export class DesktopCommanderFiles {
  private queue: Promise<unknown> = Promise.resolve();
  private constructor(readonly files: FileService) {}
  static async create(root: string, allowWrite = false) {
    return new DesktopCommanderFiles(await FileService.create(root, { allowWrite, maxBytes: 262144 }));
  }
  /** Also used by the MCP host to share native versioned storage and permission policy. */
  static using(files: FileService) {
    return new DesktopCommanderFiles(files);
  }
  private absolute(input: string): string {
    const expanded =
      input === '~' || input.startsWith('~/') || input.startsWith('~\\')
        ? path.join(os.homedir(), input.slice(1))
        : input;
    // Upstream resolves relative paths from process.cwd(), not from an implicit second workspace.
    return this.files.policy.lexical(path.resolve(expanded));
  }
  private textOnly(full: string) {
    if (office.test(full))
      fail(
        'UNSUPPORTED_FORMAT',
        'This compatibility slice supports text only. Image, Excel, PDF and DOCX parity remain open.',
      );
  }
  private writeOperation<T>(action: () => Promise<T>): Promise<T> {
    if (!this.files.allowWrite) fail('WRITE_DISABLED', 'File mutation requires --allow-write.');
    const result = this.queue.then(action);
    this.queue = result.catch(() => {});
    return result;
  }
  async readFile(input: unknown, signal?: AbortSignal): Promise<DesktopTextResult> {
    cancelled(signal);
    const a = desktopFileSchemas.read.parse(input);
    if (
      a.isUrl ||
      a.sheet !== undefined ||
      a.range !== undefined ||
      a.options !== undefined ||
      a.origin === 'ui'
    )
      fail(
        'UNSUPPORTED_FORMAT',
        'URL, format options and UI preview are not implemented in this compatibility slice.',
      );
    const full = this.absolute(a.path);
    this.textOnly(full);
    const document = await this.files.read({ path: full });
    cancelled(signal);
    const lines = document.text === '' ? [] : document.text.split(/\r\n|\n|\r/);
    if (lines.length && /[\r\n]$/.test(document.text)) lines.pop();
    const total = countLines(document.text);
    const selected =
      a.offset < 0
        ? lines.slice(-Math.min(lines.length, Math.abs(a.offset)))
        : lines.slice(a.offset, a.offset + a.length);
    const status =
      a.offset < 0
        ? `[Reading last ${selected.length} lines (total: ${total} lines)]`
        : `[Reading ${selected.length} lines ${a.offset === 0 ? 'from start' : 'from line ' + a.offset} (total: ${total} lines, ${Math.max(0, total - a.offset - selected.length)} remaining)]`;
    return reply(status + '\n\n' + selected.join('\n'));
  }
  async readMultipleFiles(input: unknown, signal?: AbortSignal): Promise<DesktopTextResult> {
    const a = desktopFileSchemas.multiple.parse(input);
    const summaries: string[] = [],
      chunks: string[] = [];
    let bytes = 0;
    for (const name of a.paths) {
      cancelled(signal);
      try {
        const r = await this.readFile({ path: name }, signal);
        const block = '\n--- ' + name + ' contents: ---\n' + r.content[0]!.text;
        bytes += Buffer.byteLength(block);
        if (bytes > 262144)
          fail('RESPONSE_LIMIT', 'Batch exceeds byte budget; request fewer or smaller files.');
        summaries.push(name + ': text/plain (text)');
        chunks.push(block);
      } catch (e) {
        cancelled(signal);
        const safe = safeError(e);
        if (safe.code === 'RESPONSE_LIMIT') throw e;
        summaries.push(name + ': Error - ' + safe.code + ' ' + safe.message);
      }
    }
    return {
      content: [
        { type: 'text', text: summaries.join('\n') },
        ...chunks.map((text) => ({ type: 'text' as const, text })),
      ],
    };
  }
  async writeFile(input: unknown, signal?: AbortSignal): Promise<DesktopTextResult> {
    return this.writeOperation(async () => {
      cancelled(signal);
      const a = desktopFileSchemas.write.parse(input);
      const full = this.absolute(a.path);
      this.textOnly(full);
      if (a.origin === 'ui')
        fail('UNSUPPORTED_FORMAT', 'UI editing is outside this text compatibility profile.');
      let before: Awaited<ReturnType<FileService['read']>> | undefined;
      try {
        before = await this.files.read({ path: full });
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      }
      if (a.mode === undefined && before && before.bytes > 0)
        fail(
          'EXPLICIT_MODE_REQUIRED',
          'Existing file has content. Specify mode append or rewrite to express replacement intent.',
        );
      const content = (a.mode === 'append' ? (before?.text ?? '') : '') + a.content;
      await this.files.write(
        { path: full, text: content, expectedVersion: before?.version ?? 'missing' },
        signal,
      );
      const lines = a.content.split('\n').length;
      return reply(
        `Successfully ${a.mode === 'append' ? 'appended to' : 'wrote to'} ${a.path} (${lines} lines)${lines > 50 ? '\nPerformance tip: consider smaller chunks for subsequent writes.' : ''}`,
      );
    });
  }
  async createDirectory(input: unknown, signal?: AbortSignal): Promise<DesktopTextResult> {
    return this.writeOperation(async () => {
      cancelled(signal);
      const a = desktopFileSchemas.mkdir.parse(input);
      const full = this.absolute(a.path);
      await this.files.mkdirTree({ path: full }, signal);
      return reply('Successfully created directory ' + a.path);
    });
  }
  async listDirectory(input: unknown, signal?: AbortSignal): Promise<DesktopTextResult> {
    const a = desktopFileSchemas.list.parse(input);
    if (a.origin === 'ui') fail('UNSUPPORTED_FORMAT', 'UI previews are not implemented.');
    const base = await this.files.policy.resolve(this.absolute(a.path));
    const result: string[] = [];
    let visited = 0,
      usedBytes = 0;
    const until = performance.now() + 5000;
    const push = (text: string) => {
      usedBytes += Buffer.byteLength(text);
      if (usedBytes > 262144) fail('RESPONSE_LIMIT', 'Directory output exceeded byte budget.');
      result.push(text);
    };
    const visit = async (dir: string, depth: number): Promise<void> => {
      cancelled(signal);
      if (depth >= a.depth) return;
      const stream = await fs.opendir(dir);
      const entries: Array<{ name: string; directory: boolean; link: boolean }> = [];
      for await (const e of stream) {
        cancelled(signal);
        if (++visited > 4000 || performance.now() > until) {
          push('[WARNING] Directory traversal limit reached.');
          return;
        }
        if (privateName(e.name)) continue;
        if (entries.length === (depth === 0 ? 1000 : 100)) {
          push('[WARNING] ' + path.relative(base, dir) + ': additional entries omitted by bounded listing.');
          break;
        }
        entries.push({ name: e.name, directory: e.isDirectory(), link: e.isSymbolicLink() });
      }
      entries.sort((x, y) => x.name.localeCompare(y.name));
      for (const e of entries) {
        cancelled(signal);
        const child = path.join(dir, e.name),
          rel = path.relative(base, child).split(path.sep).join('/');
        if (e.link) {
          push('[DENIED] ' + rel + ' (link)');
          continue;
        }
        try {
          await this.files.policy.resolve(child);
        } catch {
          push('[DENIED] ' + rel);
          continue;
        }
        push((e.directory ? '[DIR] ' : '[FILE] ') + rel);
        if (e.directory) await visit(child, depth + 1);
      }
    };
    await visit(base, 0);
    return reply(result.join('\n'));
  }
  async moveFile(input: unknown, signal?: AbortSignal): Promise<DesktopTextResult> {
    return this.writeOperation(async () => {
      const a = desktopFileSchemas.move.parse(input);
      await this.files.move(
        { source: this.absolute(a.source), destination: this.absolute(a.destination) },
        signal,
      );
      return reply('Successfully moved ' + a.source + ' to ' + a.destination);
    });
  }
  async getFileInfo(input: unknown): Promise<DesktopTextResult> {
    const a = desktopFileSchemas.info.parse(input);
    const full = await this.files.policy.resolve(this.absolute(a.path));
    const st = await fs.lstat(full);
    const fields: Record<string, unknown> = {
      size: st.size,
      created: st.birthtime.toISOString(),
      modified: st.mtime.toISOString(),
      accessed: st.atime.toISOString(),
      isDirectory: st.isDirectory(),
      isFile: st.isFile(),
      permissions: st.mode.toString(8).slice(-3),
    };
    if (st.isFile() && !office.test(full))
      try {
        const content = (await this.files.read({ path: full })).text;
        const count = countLines(content);
        fields.fileType = 'text';
        fields.lineCount = count;
        fields.lastLine = Math.max(0, count - 1);
        fields.appendPosition = count;
      } catch {
        fields.textMetadata = 'unavailable';
      }
    return reply(
      Object.entries(fields)
        .map(([k, v]) => k + ': ' + String(v))
        .join('\n'),
    );
  }
  async editBlock(input: unknown, signal?: AbortSignal): Promise<DesktopTextResult> {
    return this.writeOperation(async () => {
      cancelled(signal);
      const a = desktopFileSchemas.edit.parse(input);
      const full = this.absolute(a.file_path);
      this.textOnly(full);
      if (a.origin === 'ui') fail('UNSUPPORTED_FORMAT', 'UI edits are not supported.');
      const before = await this.files.read({ path: full });
      let count = 0,
        at = 0;
      while ((at = before.text.indexOf(a.old_string, at)) !== -1) {
        count++;
        at += a.old_string.length;
        if (count > 10000) fail('MATCH_LIMIT', 'Too many replacement matches.');
      }
      if (count !== a.expected_replacements)
        fail(
          'REPLACEMENT_COUNT',
          `Expected ${a.expected_replacements} exact matches but found ${count}. No changes made; fuzzy diagnostics remain unimplemented.`,
        );
      const text = before.text.split(a.old_string).join(a.new_string);
      await this.files.write({ path: full, text, expectedVersion: before.version }, signal);
      return reply(`Successfully applied ${count} edit${count === 1 ? '' : 's'} to ${a.file_path}`);
    });
  }
}
