// SPDX-License-Identifier: MIT
// Modified: 2026-11-09-move-cancellation; honor cancelled preflight before starting a no-overwrite move.
// Modified: 2026-11-09-file-cancellation; propagate native read cancellation and await owned cleanup.
// Modified: 2026-11-08-aug003-registry-persistence; bounded guarded replacement and owned staging checks.
// Modified: 2026-10-05-codex-parity-foundation; preserve UTF-8 BOM and add guarded mkdirTree.
// Modified: 2026-11-02-utf16le-read; explicit bounded compatibility decoding and read cancellation.
// AI-Change: 2026-10-04-local-mcp (OpenAI / GPT-6 Astra Pro; self-reported)
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { RootPolicy, ignored, privateName } from './policy.js';
import { fail, cancelled, safeError, ToolError } from './errors.js';
import { parseUnifiedDiff, applyHunks, createDiffPreview } from './editing/semantic-editor.js';
import { SyntaxValidator } from './editing/syntax-validator.js';
import { CodeFormatter } from './quality/formatter.js';
import { CodeLinter } from './quality/linter.js';
import { TypeChecker } from './quality/typecheck.js';
import { RefineEngine } from './quality/refine-pipeline.js';
import { ShadowJournal } from './journaling/shadow-journal.js';
import { RepoMapGenerator } from './intelligence/repomap.js';
import { LspManager } from './lsp/manager.js';
import type { SourceReaderOptions } from './intelligence/source-reader.js';
import { ModelRouter } from './ai/router.js';
import { FleetSupervisor } from './orchestration/fleet-manager.js';
import { WindowsRetryStrategy } from './files/retry-strategy.js';
export { WindowsRetryStrategy };
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
  patch: z.strictObject({
    path: pathname,
    patch: z.string().min(1).max(1048576),
    dryRun: z.boolean().default(false),
    validateSyntax: z.boolean().default(true),
  }),
  validateSyntax: z.strictObject({
    path: pathname,
    text: z.string().max(1048576).optional(),
    language: z.string().max(32).optional(),
  }),
  formatFile: z.strictObject({
    path: pathname,
    write: z.boolean().default(true),
  }),
  lintCheck: z.strictObject({
    path: pathname,
  }),
  typeCheck: z.strictObject({
    project: pathname.optional(),
  }),
  refine: z.strictObject({
    path: pathname,
    patch: z.string().max(1048576).optional(),
    autoFormat: z.boolean().default(true),
    runLinter: z.boolean().default(true),
    runTypeCheck: z.boolean().default(false),
  }),
  rollback: z.strictObject({
    transactionId: z.string().max(64).optional(),
    file: pathname.optional(),
    stepsBack: z.number().int().min(1).max(20).default(1),
  }),
  repoMap: z.strictObject({
    path: pathname.default('.'),
    maxLines: z.number().int().min(10).max(500).default(120),
    maxFiles: z.number().int().min(1).max(200).default(50),
  }),
  lspDefinition: z.strictObject({
    path: pathname,
    symbol: z.string().min(1).max(128),
  }),
  lspReferences: z.strictObject({
    path: pathname.default('.'),
    symbol: z.string().min(1).max(128),
    limit: z.number().int().min(1).max(100).default(50),
  }),
  lspSymbols: z.strictObject({
    path: pathname,
  }),
  aiReviewDiff: z.strictObject({
    diff: z.string().min(1).max(1048576),
    provider: z.string().max(32).optional(),
    focus: z.enum(['readability', 'security', 'performance', 'architecture']).optional(),
  }),
  fleetSubmit: z.strictObject({
    sessionId: z.string().min(1).max(64),
    clientLabel: z.string().min(1).max(64),
    name: z.string().min(1).max(128),
    taskId: z.string().max(64).optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
  }),
  fleetCheckpoint: z.strictObject({
    taskId: z.string().min(1).max(64),
    checkpointData: z.record(z.string(), z.unknown()),
  }),
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
function fileFailure(error: unknown) {
  const code = (error as NodeJS.ErrnoException)?.code;
  if (code === 'EBUSY' || code === 'EIO' || code === 'ENOSPC' || code === 'EMFILE' || code === 'ENFILE')
    return { code, message: 'Operating-system file operation failed (' + code + ').' };
  return safeError(error);
}
/** A successful no-overwrite creation whose owned staging cleanup was not confirmed. */
export class FileWriteCleanupError extends ToolError {
  readonly fileWriteOutcome;
  constructor(phase: 'stage-check' | 'stage-unlink', error: unknown) {
    const safe = fileFailure(error);
    super(
      'FILE_WRITE_CLEANUP',
      'File creation committed; cleanup failed at ' +
        phase +
        ' (' +
        safe.code +
        '); commit=committed; stage=retained.',
    );
    this.fileWriteOutcome = Object.freeze({
      commit: 'committed' as const,
      phase,
      stage: 'retained' as const,
      cleanupCode: safe.code,
    });
  }
}
export class FileService {
  private queue: Promise<unknown> = Promise.resolve();
  readonly journal: ShadowJournal;
  private readonly fleet = new FleetSupervisor();
  private readonly modelRouter = new ModelRouter();
  private constructor(
    readonly policy: RootPolicy,
    readonly allowWrite: boolean,
    readonly maxBytes: number,
    readonly allowExec: boolean,
  ) {
    this.journal = new ShadowJournal(this.policy.root);
  }
  static async create(
    root: string | readonly string[],
    options: { allowWrite?: boolean; maxBytes?: number; allowExec?: boolean } = {},
  ): Promise<FileService> {
    const max = options.maxBytes ?? 1048576;
    if (!Number.isInteger(max) || max < 1 || max > 1048576)
      fail('INVALID_ARGUMENT', 'Invalid file byte limit.');
    return new FileService(
      await RootPolicy.create(root),
      options.allowWrite === true,
      max,
      options.allowExec === true,
    );
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
  private async bytes(full: string, signal?: AbortSignal, maxLinks = 1): Promise<Buffer> {
    cancelled(signal);
    const handle = await fs.open(
      full,
      constants.O_RDONLY | (process.platform === 'win32' ? 0 : constants.O_NOFOLLOW),
    );
    try {
      cancelled(signal);
      const st = await handle.stat();
      cancelled(signal);
      if (!st.isFile()) fail('NOT_FILE', 'Expected a regular file.');
      if (st.nlink > maxLinks) fail('LINK_REJECTED', 'Multiply-linked files are refused.');
      if (st.size > this.maxBytes) fail('FILE_TOO_LARGE', 'File exceeds configured byte limit.');
      const b = Buffer.alloc(this.maxBytes + 1);
      let total = 0;
      while (total < b.length) {
        cancelled(signal);
        const r = await handle.read(b, total, b.length - total, null);
        cancelled(signal);
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
  /** Read-only compatibility opt-in; native reads, metadata, writes and edits remain UTF-8. */
  async readCompatibilityText(input: unknown, signal?: AbortSignal): Promise<string> {
    cancelled(signal);
    const a = fileSchemas.info.parse(input);
    const full = await this.policy.resolve(a.path);
    const b = await this.bytes(full, signal);
    cancelled(signal);
    if (b[0] !== 0xff || b[1] !== 0xfe) return this.text(b);
    let text: string;
    try {
      // Strip only the framing marker. A second or embedded BOM is document content.
      // Fatal decoding refuses odd byte counts and unpaired UTF-16 surrogates.
      text = new TextDecoder('utf-16le', { fatal: true, ignoreBOM: true }).decode(b.subarray(2));
    } catch {
      fail('INVALID_UTF16', 'File is not valid BOM-marked UTF-16LE.');
    }
    if (text.includes('\0')) fail('BINARY_FILE', 'Binary data is not exposed as text.');
    return text;
  }
  async read(input: unknown, signal?: AbortSignal) {
    cancelled(signal);
    const a = fileSchemas.read.parse(input);
    const full = await this.policy.resolve(a.path);
    const b = await this.bytes(full, signal);
    cancelled(signal);
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
  async info(input: unknown, signal?: AbortSignal) {
    cancelled(signal);
    const a = fileSchemas.info.parse(input);
    const full = await this.policy.resolve(a.path);
    cancelled(signal);
    const st = await fs.lstat(full);
    cancelled(signal);
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
      const parentPath = path.dirname(full);
      const parent = await fs.lstat(parentPath);
      if (!parent.isDirectory() || parent.isSymbolicLink())
        fail('LINK_REJECTED', 'Write parent must be an unlinked directory.');
      const checkParent = async () => {
        const checked = await this.policy.resolve(parentPath);
        const current = await fs.lstat(parentPath);
        if (
          path.relative(parentPath, checked) !== '' ||
          path.relative(parentPath, await fs.realpath(parentPath)) !== '' ||
          !current.isDirectory() ||
          current.isSymbolicLink() ||
          current.dev !== parent.dev ||
          current.ino !== parent.ino
        )
          fail('CONFLICT', 'Write parent identity changed.');
      };
      await checkParent();
      let old: Buffer | undefined;
      let previous: Awaited<ReturnType<typeof fs.stat>> | undefined;
      let mode = 0o600;
      try {
        old = await this.bytes(full, signal);
        previous = await fs.lstat(full);
        if (!previous.isFile() || previous.isSymbolicLink() || previous.nlink !== 1)
          fail('LINK_REJECTED', 'Write destination must be a single-link regular file.');
        mode = previous.mode & 0o777;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
        old = undefined;
        previous = undefined;
      }
      if ((old === undefined ? 'missing' : sha(old)) !== a.expectedVersion)
        fail('CONFLICT', 'File changed or already exists; read it again before saving.');
      if (old !== undefined) {
        const anchor = this.policy.anchor(full);
        const journal = anchor === this.policy.root ? this.journal : new ShadowJournal(anchor);
        await journal.recordSnapshot(path.relative(anchor, full), this.text(old), 'write', undefined, a.text);
      }
      const temp = path.join(parentPath, '.mterm-' + randomUUID() + '.tmp');
      let owned = false;
      let created = false;
      let stageClosed = false;
      let staged: Awaited<ReturnType<typeof fs.stat>> | undefined;
      const checkStage = async (links: number, activeSignal?: AbortSignal) => {
        const current = await fs.lstat(temp);
        if (
          !staged ||
          !current.isFile() ||
          current.isSymbolicLink() ||
          current.nlink !== links ||
          current.dev !== staged.dev ||
          current.ino !== staged.ino ||
          current.mode !== staged.mode ||
          current.size !== b.length
        )
          fail('STAGING_CHANGED', 'Write staging identity or contents changed.');
        if (!(await this.bytes(temp, activeSignal, links)).equals(b))
          fail('STAGING_CHANGED', 'Write staging contents changed.');
        const after = await fs.lstat(temp);
        if (
          !after.isFile() ||
          after.isSymbolicLink() ||
          after.nlink !== links ||
          after.dev !== current.dev ||
          after.ino !== current.ino ||
          after.mode !== current.mode ||
          after.size !== current.size ||
          after.mtimeMs !== current.mtimeMs
        )
          fail('STAGING_CHANGED', 'Write staging identity changed while checking.');
      };
      const checkDestination = async () => {
        const resolved = await this.policy.resolve(a.path, true);
        if (path.relative(full, resolved) !== '') fail('CONFLICT', 'Write destination resolution changed.');
        if (!previous) return;
        const check = async () => {
          const current = await fs.lstat(full).catch((error) => {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT')
              fail('CONFLICT', 'Destination disappeared during write.');
            throw error;
          });
          if (!current.isFile() || current.isSymbolicLink() || current.nlink !== 1)
            fail('LINK_REJECTED', 'Write destination is no longer a single-link regular file.');
          if (current.dev !== previous.dev || current.ino !== previous.ino || current.mode !== previous.mode)
            fail('CONFLICT', 'Destination identity or permissions changed during write.');
        };
        await check();
        if (sha(await this.bytes(full, signal)) !== a.expectedVersion)
          fail('CONFLICT', 'Destination changed during write.');
        await check();
      };
      try {
        const h = await fs.open(temp, 'wx', mode);
        owned = true;
        let stageFailure: unknown;
        let failed = false;
        let stagePhase = 'stage-identity';
        try {
          staged = await h.stat();
          stagePhase = 'stage-write';
          await h.writeFile(b);
          stagePhase = 'stage-sync';
          await h.sync();
        } catch (error) {
          failed = true;
          stageFailure = error;
          throw error;
        } finally {
          try {
            await h.close();
            stageClosed = true;
          } catch (error) {
            const secondary = fileFailure(error);
            if (failed) {
              const primary = fileFailure(stageFailure);
              throw Object.assign(
                new ToolError(
                  primary.code,
                  'File ' +
                    stagePhase +
                    ' failed (' +
                    primary.code +
                    '); stage-close also failed (' +
                    secondary.code +
                    '); commit=not_confirmed. ' +
                    primary.message,
                ),
                { fileStageCleanup: Object.freeze({ phase: 'stage-close', code: secondary.code }) },
              );
            }
            throw new ToolError(
              secondary.code,
              'File stage-close failed (' + secondary.code + '); commit=not_confirmed.',
            );
          }
        }
        // Retry only the exact Windows replacement operation. All authority,
        // version and owned-stage checks run again; the destination is never deleted.
        const attempts = process.platform === 'win32' ? 5 : 1;
        for (let attempt = 0; attempt < attempts; attempt++) {
          cancelled(signal);
          await checkParent();
          await checkStage(1, signal);
          await checkDestination();
          cancelled(signal);
          if (old === undefined) {
            try {
              await fs.link(temp, full);
              created = true;
            } catch (e) {
              if ((e as NodeJS.ErrnoException).code === 'EEXIST')
                fail('CONFLICT', 'Destination appeared during create.');
              throw e;
            }
            break;
          }
          try {
            await fs.rename(temp, full);
            owned = false;
            break;
          } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (attempt === attempts - 1 || (code !== 'EPERM' && code !== 'EBUSY')) {
              if (code === 'EPERM' || code === 'EBUSY')
                fail(code, 'File replacement failed after ' + (attempt + 1) + ' attempt(s).');
              throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, 25 * 2 ** attempt));
          }
        }
        return { path: this.policy.relative(full), bytes: b.length, version: sha(b) };
      } finally {
        if (owned && staged && stageClosed) {
          let cleanupFailure: unknown;
          let cleanupPhase: 'stage-check' | 'stage-unlink' = 'stage-check';
          const attempts = process.platform === 'win32' ? 5 : 1;
          for (let attempt = 0; attempt < attempts; attempt++) {
            try {
              await checkParent();
              await checkStage(created ? 2 : 1);
              if (created) {
                const destination = await fs.lstat(full);
                if (
                  !destination.isFile() ||
                  destination.isSymbolicLink() ||
                  destination.nlink !== 2 ||
                  destination.dev !== staged.dev ||
                  destination.ino !== staged.ino
                )
                  fail('STAGING_CHANGED', 'Created destination no longer shares the owned stage.');
              }
            } catch (error) {
              cleanupPhase = 'stage-check';
              cleanupFailure = error;
              break;
            }
            try {
              await fs.unlink(temp);
              owned = false;
              break;
            } catch (error) {
              const code = (error as NodeJS.ErrnoException).code;
              if (attempt === attempts - 1 || (code !== 'EPERM' && code !== 'EBUSY')) {
                cleanupPhase = 'stage-unlink';
                cleanupFailure = error;
                break;
              }
              await new Promise((resolve) => setTimeout(resolve, 25 * 2 ** attempt));
            }
          }
          // A completed hard link is a confirmed creation even when cleanup fails.
          // Before commit, retain the first failure; never delete unverifiable stages.
          if (created && cleanupFailure) throw new FileWriteCleanupError(cleanupPhase, cleanupFailure);
        }
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
      // Find the deepest existing scoped ancestor, then create only the missing suffix.
      // Starting from the owner root would incorrectly reject a deeper runtime-selected root.
      let current = target,
        created = 0;
      const missing: string[] = [];
      for (;;) {
        cancelled(signal);
        try {
          await this.policy.resolve(current);
          if (!(await fs.lstat(current)).isDirectory())
            fail('NOT_DIRECTORY', 'Existing component is not a directory.');
          break;
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
          if (missing.length >= 64) fail('PATH_DEPTH', 'Directory creation depth exceeds64 components.');
          missing.unshift(path.basename(current));
          const parent = path.dirname(current);
          if (parent === current) throw e;
          current = parent;
        }
      }
      for (const component of missing) {
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
      cancelled(signal);
      const dest = await this.policy.resolve(a.destination, true);
      cancelled(signal);
      const st = await fs.lstat(source);
      cancelled(signal);
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
  async list(input: unknown, signal?: AbortSignal) {
    cancelled(signal);
    const a = fileSchemas.list.parse(input);
    const full = await this.policy.resolve(a.path);
    cancelled(signal);
    const dir = await fs.opendir(full);
    const iterator = dir[Symbol.asyncIterator]();
    let started = false;
    const entries: Array<{ name: string; directory: boolean; file: boolean; link: boolean }> = [];
    let truncated = false;
    try {
      for (;;) {
        cancelled(signal);
        started = true;
        const next = await iterator.next();
        cancelled(signal);
        if (next.done) break;
        const e = next.value;
        if (privateName(e.name)) continue;
        if (entries.length === a.limit) {
          truncated = true;
          break;
        }
        entries.push({
          name: e.name,
          directory: e.isDirectory(),
          file: e.isFile(),
          link: e.isSymbolicLink(),
        });
      }
    } finally {
      // Returning an unstarted async generator does not close its acquired directory.
      if (started) await iterator.return?.();
      else await dir.close();
    }
    cancelled(signal);
    entries.sort((x, y) => x.name.localeCompare(y.name));
    return { path: this.policy.relative(full), entries, truncated };
  }
  async search(input: unknown, signal?: AbortSignal) {
    const a = fileSchemas.search.parse(input);
    cancelled(signal);
    const root = await this.policy.resolve(a.path);
    cancelled(signal);
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
      const iterator = dir[Symbol.asyncIterator]();
      let started = false;
      try {
        for (;;) {
          cancelled(signal);
          started = true;
          const next = await iterator.next();
          cancelled(signal);
          if (next.done) break;
          const e = next.value;
          if (bounded()) break;
          visited++;
          if (e.isSymbolicLink() || privateName(e.name) || ignored.has(e.name.toLowerCase())) continue;
          const raw = path.join(dirPath, e.name);
          let full: string;
          try {
            full = await this.policy.resolve(this.policy.relative(raw));
            cancelled(signal);
          } catch {
            cancelled(signal);
            continue;
          }
          if (a.mode === 'name' && e.name.toLowerCase().includes(a.query.toLowerCase()))
            results.push({ path: this.policy.relative(full) });
          if (a.mode === 'content' && e.isFile())
            try {
              const b = await this.bytes(full, signal);
              cancelled(signal);
              readBytes += b.length;
              const text = this.text(b);
              const at = text.toLowerCase().indexOf(a.query.toLowerCase());
              if (at >= 0)
                results.push({
                  path: this.policy.relative(full),
                  excerpt: text.slice(Math.max(0, at - 80), at + a.query.length + 120),
                });
            } catch {
              cancelled(signal);
              /* Unsupported/changed/unreadable files are skipped; no content is leaked. */
            }
          if (e.isDirectory() && depth < a.maxDepth) await visit(full, depth + 1);
        }
      } finally {
        if (started) await iterator.return?.();
        else await dir.close();
      }
      cancelled(signal);
    };
    await visit(root, 0);
    cancelled(signal);
    return { root: this.policy.relative(root), results, visited, readBytes, truncated };
  }
  async applyPatch(input: unknown, signal?: AbortSignal) {
    const a = fileSchemas.patch.parse(input);
    cancelled(signal);
    const current = await this.read({ path: a.path }, signal);
    cancelled(signal);

    const parsedDiffs = parseUnifiedDiff(a.patch);
    if (parsedDiffs.length === 0 || !parsedDiffs[0] || parsedDiffs[0].hunks.length === 0) {
      fail('MALFORMED_DIFF', 'Supplied patch contains no valid unified diff hunks.');
    }
    if (parsedDiffs.length !== 1) fail('MULTI_FILE_PATCH', 'One patch operation can change only one file.');
    const full = await this.policy.resolve(a.path);
    const target = path.relative(this.policy.anchor(full), full).replace(/\\/g, '/');
    if (parsedDiffs[0].oldPath !== target || parsedDiffs[0].newPath !== target) {
      fail('PATCH_PATH_MISMATCH', 'Diff headers must identify the requested file exactly.');
    }

    const patchResult = applyHunks(current.text, parsedDiffs[0].hunks);
    if (!patchResult.ok) {
      fail('PATCH_CONFLICT', patchResult.error ?? 'Failed to apply diff hunks to current file content.');
    }

    let syntaxValid = true;
    if (a.validateSyntax) {
      const syntaxResult = SyntaxValidator.validate(patchResult.patchedText, a.path);
      syntaxValid = syntaxResult.valid;
      if (!syntaxResult.valid) {
        const first = syntaxResult.diagnostics[0];
        const msg = first ? ` at line ${first.line}, col ${first.column}: ${first.message}` : '';
        fail('SYNTAX_ERROR', `Patch rejected: resulting code contains syntax errors${msg}`);
      }
    }

    if (a.dryRun) {
      return {
        path: current.path,
        ok: true,
        dryRun: true,
        hunksApplied: patchResult.hunksApplied,
        hunksTotal: patchResult.hunksTotal,
        syntaxValid,
        diffPreview: createDiffPreview(a.path, current.text, patchResult.patchedText),
      };
    }

    const writeResult = await this.write(
      { path: a.path, text: patchResult.patchedText, expectedVersion: current.version },
      signal,
    );
    return {
      path: current.path,
      ok: true,
      dryRun: false,
      hunksApplied: patchResult.hunksApplied,
      hunksTotal: patchResult.hunksTotal,
      syntaxValid,
      bytes: writeResult.bytes,
      version: writeResult.version,
    };
  }
  async validateSyntax(input: unknown, signal?: AbortSignal) {
    cancelled(signal);
    const a = fileSchemas.validateSyntax.parse(input);
    let content = a.text;
    if (content === undefined) {
      const current = await this.read({ path: a.path }, signal);
      content = current.text;
    }
    return SyntaxValidator.validate(content, a.path, a.language);
  }
  async formatFile(input: unknown, signal?: AbortSignal) {
    const a = fileSchemas.formatFile.parse(input);
    cancelled(signal);
    const current = await this.read({ path: a.path }, signal);
    cancelled(signal);
    const full = await this.policy.resolve(a.path);
    const { formattedText, engine } = await CodeFormatter.formatText(current.text, full);
    const changed = formattedText !== current.text;
    if (a.write && changed) {
      const writeResult = await this.write(
        { path: a.path, text: formattedText, expectedVersion: current.version },
        signal,
      );
      return {
        path: current.path,
        formatted: true,
        changed: true,
        originalBytes: current.bytes,
        formattedBytes: writeResult.bytes,
        engine,
      };
    }
    return {
      path: current.path,
      formatted: true,
      changed,
      originalBytes: current.bytes,
      formattedBytes: Buffer.byteLength(formattedText, 'utf8'),
      engine,
    };
  }
  async lintCheck(input: unknown, signal?: AbortSignal) {
    const a = fileSchemas.lintCheck.parse(input);
    cancelled(signal);
    const current = await this.read({ path: a.path }, signal);
    cancelled(signal);
    const full = await this.policy.resolve(a.path);
    return CodeLinter.lintFile(full, current.text, { root: this.policy.root });
  }
  async typeCheck(input: unknown, signal?: AbortSignal) {
    const a = fileSchemas.typeCheck.parse(input);
    cancelled(signal);
    if (!this.allowExec)
      fail('EXEC_DISABLED', 'Typechecking requires explicit process-execution permission.');
    const targetProject = await this.policy.resolve(a.project ?? 'tsconfig.json');
    return TypeChecker.checkProject(targetProject, { allowExec: false });
  }
  async refine(input: unknown, signal?: AbortSignal) {
    const a = fileSchemas.refine.parse(input);
    cancelled(signal);
    const current = await this.read({ path: a.path }, signal);
    cancelled(signal);
    const full = await this.policy.resolve(a.path);
    if (a.patch) {
      const parsed = parseUnifiedDiff(a.patch);
      const target = path.relative(this.policy.anchor(full), full).replace(/\\/g, '/');
      if (
        parsed.length !== 1 ||
        !parsed[0]?.hunks.length ||
        parsed[0].oldPath !== target ||
        parsed[0].newPath !== target
      ) {
        fail('PATCH_PATH_MISMATCH', 'Refinement accepts only a single-file diff for the requested path.');
      }
    }
    const report = await RefineEngine.run({
      path: full,
      originalText: current.text,
      proposedPatch: a.patch,
      autoFormat: a.autoFormat,
      runLinter: a.runLinter,
      runTypeCheck: a.runTypeCheck,
    });
    if (report.ok && report.changed) {
      await this.write({ path: a.path, text: report.finalContent, expectedVersion: current.version }, signal);
    }
    return {
      ...report,
      path: current.path,
    };
  }
  async rollback(input: unknown, signal?: AbortSignal) {
    cancelled(signal);
    const a = fileSchemas.rollback.parse(input);
    if (!this.allowWrite) fail('WRITE_DISABLED', 'Rollback requires the local write capability.');
    // Multi-file rollback needs a separately designed all-or-nothing commit protocol.
    // Never advertise independent per-file writes as an atomic transaction.
    if (!a.file) fail('ROLLBACK_SCOPE', 'Specify one file for guarded rollback.');
    const full = await this.policy.resolve(a.file);
    const anchor = this.policy.anchor(full);
    const rel = path.relative(anchor, full);
    const journal = anchor === this.policy.root ? this.journal : new ShadowJournal(anchor);
    const snapshot = await journal.findSnapshot(rel, a.transactionId, a.stepsBack);
    cancelled(signal);
    if (!snapshot || !snapshot.nextVersion) {
      fail('ROLLBACK_UNAVAILABLE', 'No verified post-write snapshot is available for the requested file.');
    }
    const current = await this.read({ path: a.file }, signal);
    cancelled(signal);
    if (current.version !== snapshot.nextVersion) {
      fail('ROLLBACK_CONFLICT', 'The file changed after the journaled write; rollback was refused.');
    }
    await this.write(
      { path: a.file, text: snapshot.previousContent, expectedVersion: current.version },
      signal,
    );
    return { ok: true, restoredFiles: [rel.replace(/\\/g, '/')], transactionId: snapshot.transactionId };
  }
  private sourceReaderOptions(signal?: AbortSignal): SourceReaderOptions {
    return {
      policy: this.policy,
      signal,
      maxBytes: this.maxBytes,
      readText: async (file, activeSignal) => (await this.read({ path: file }, activeSignal)).text,
    };
  }
  async repoMap(input: unknown, signal?: AbortSignal) {
    cancelled(signal);
    const a = fileSchemas.repoMap.parse(input);
    const root = await this.policy.resolve(a.path);
    cancelled(signal);
    const result = await RepoMapGenerator.generate(root, a, this.sourceReaderOptions(signal));
    cancelled(signal);
    return result;
  }
  async lspDefinition(input: unknown, signal?: AbortSignal) {
    cancelled(signal);
    const a = fileSchemas.lspDefinition.parse(input);
    const full = await this.policy.resolve(a.path);
    cancelled(signal);
    const result = await LspManager.findDefinition(
      full,
      a.symbol,
      this.policy.anchor(full),
      this.sourceReaderOptions(signal),
    );
    cancelled(signal);
    return result;
  }
  async lspReferences(input: unknown, signal?: AbortSignal) {
    cancelled(signal);
    const a = fileSchemas.lspReferences.parse(input);
    const root = await this.policy.resolve(a.path);
    cancelled(signal);
    const result = await LspManager.findReferences(a.symbol, root, a.limit, this.sourceReaderOptions(signal));
    cancelled(signal);
    return result;
  }
  async lspSymbols(input: unknown, signal?: AbortSignal) {
    cancelled(signal);
    const a = fileSchemas.lspSymbols.parse(input);
    const full = await this.policy.resolve(a.path);
    cancelled(signal);
    const result = await LspManager.getDocumentSymbols(full, this.sourceReaderOptions(signal));
    cancelled(signal);
    return result;
  }
  async aiReviewDiff(input: unknown) {
    const a = fileSchemas.aiReviewDiff.parse(input);
    return this.modelRouter.reviewDiff(a.diff, { provider: a.provider, focus: a.focus });
  }
  async fleetSubmit(input: unknown) {
    const a = fileSchemas.fleetSubmit.parse(input);
    return this.fleet.submitTask(a);
  }
  async fleetStatus() {
    return this.fleet.getStatus();
  }
  async fleetCheckpoint(input: unknown) {
    const a = fileSchemas.fleetCheckpoint.parse(input);
    return { ok: this.fleet.saveCheckpoint(a.taskId, a.checkpointData) };
  }
  async fleetHalt() {
    return this.fleet.emergencyHalt();
  }
}
