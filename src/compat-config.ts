// SPDX-License-Identifier: MIT
// Modified: 2026-11-02-config-rename-retry; bounded Windows retries revalidate snapshots and staging ownership.
// Modified: 2026-11-02-config-storage-identity; canonical policy storage and file-tool exclusion share one identity.
// AI-Change: 2026-10-06-config-parity (OpenAI / GPT-6 Astra Pro; self-reported)
// Runtime preferences are bounded by immutable owner-selected startup capabilities.
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { z } from 'zod';
import { RootPolicy } from './policy.js';
import { configPath } from './config.js';
import { fail, cancelled } from './errors.js';

export const MINIMUM_BLOCKED = Object.freeze([
  'mkfs',
  'format',
  'mount',
  'umount',
  'fdisk',
  'dd',
  'parted',
  'diskpart',
  'sudo',
  'su',
  'passwd',
  'adduser',
  'useradd',
  'usermod',
  'groupadd',
  'chsh',
  'visudo',
  'shutdown',
  'reboot',
  'halt',
  'poweroff',
  'init',
  'iptables',
  'firewall',
  'netsh',
  'sfc',
  'bcdedit',
  'reg',
  'net',
  'sc',
  'runas',
  'cipher',
  'takeown',
]);
const text = z
  .string()
  .min(1)
  .max(4096)
  .refine((v) => !/[\x00-\x1f\x7f]/.test(v));
const storedSchema = z.strictObject({
  schemaVersion: z.literal(1),
  blockedCommands: z.array(text).max(128).optional(),
  defaultShell: text.optional(),
  allowedDirectories: z.array(text).max(16).optional(),
  fileReadLineLimit: z.number().int().min(1).max(10000).optional(),
  fileWriteLineLimit: z.number().int().min(1).max(10000).optional(),
  telemetryEnabled: z.boolean().optional(),
});
type Stored = z.infer<typeof storedSchema>;
export interface CompatibilityPreferences {
  blockedCommands: readonly string[];
  defaultShell: string;
  allowedDirectories: readonly string[];
  fileReadLineLimit: number;
  fileWriteLineLimit: number;
  telemetryEnabled: boolean;
}
export const compatibilityConfigSchemas = {
  get: z.object({ origin: z.enum(['ui', 'llm']).optional() }),
  set: z.object({
    key: z.string().min(1).max(80),
    value: z.union([
      z.string().max(32768),
      z.number(),
      z.boolean(),
      z.array(z.string().max(4096)).max(128),
      z.null(),
    ]),
    origin: z.enum(['ui', 'llm']).optional(),
  }),
};
const LIMIT = 65536;
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const equivalent = (a: string, b: string) =>
  process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
const inside = (root: string, p: string) => {
  const rel = path.relative(root, p);
  return !rel || (!path.isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + path.sep));
};
export const commandName = (value: string) =>
  value
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .at(-1)!
    .toLowerCase()
    .replace(/\.(exe|com|cmd|bat|ps1)$/i, '');

/** Bind storage and its private-path guard to the same filesystem identity.
 * Only startup-selected root aliases may skip their alias prefix. Every remaining
 * existing parent is checked before canonicalization; nested/unselected links stay denied.
 * Missing parents are not created here and are checked again by safeParents at write time. */
export async function canonicalCompatibilityFile(file: string, ceiling: RootPolicy): Promise<string> {
  let target = path.resolve(file);
  try {
    target = ceiling.lexical(target);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    // The policy file may intentionally live outside exposed roots or in a private
    // directory. That does not authorize links in its storage path.
    if (code !== 'OUTSIDE_ROOT' && code !== 'PRIVATE_PATH') throw error;
  }
  const parent = path.dirname(target);
  let current = path.parse(parent).root;
  const components = path.relative(current, parent).split(path.sep).filter(Boolean);
  for (let i = 0; i < components.length; i++) {
    const candidate = path.join(current, components[i]!);
    let stat;
    try {
      stat = await fs.lstat(candidate);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      current = path.join(current, ...components.slice(i));
      break;
    }
    if (!stat.isDirectory() || stat.isSymbolicLink())
      fail('CONFIG_UNSAFE', 'Configuration parent is linked or not a directory.');
    // This also normalizes Windows 8.3 parent names without following a symlink.
    current = await fs.realpath(candidate);
  }
  const candidate = path.join(current, path.basename(target));
  let selected;
  try {
    selected = await fs.lstat(candidate);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return candidate;
    throw error;
  }
  if (!selected.isFile() || selected.isSymbolicLink() || selected.nlink > 1)
    fail('CONFIG_UNSAFE', 'Configuration must be a single-link regular file.');
  const canonical = await fs.realpath(candidate);
  // Windows can alias the filename itself. Resolve only an already checked regular
  // file, and refuse a changed leaf or any resolution that changes its parent.
  const canonicalStat = await fs.lstat(canonical);
  const checked = await fs.lstat(candidate);
  if (
    !equivalent(path.dirname(canonical), current) ||
    !checked.isFile() ||
    checked.isSymbolicLink() ||
    checked.nlink > 1 ||
    !canonicalStat.isFile() ||
    canonicalStat.isSymbolicLink() ||
    canonicalStat.nlink > 1 ||
    selected.dev !== checked.dev ||
    selected.ino !== checked.ino ||
    selected.dev !== canonicalStat.dev ||
    selected.ino !== canonicalStat.ino
  )
    fail('CONFIG_UNSAFE', 'Configuration storage identity changed during startup.');
  return canonical;
}

/** No watcher daemon or eventual-cache window: each MCP operation loads a bounded snapshot.
 * AsyncLocalStorage prevents concurrent requests from changing another request's policy mid-flight.
 * A restriction affects newly admitted work; it cannot undo previously executed OS operations. */
export class CompatibilityConfig {
  private readonly context = new AsyncLocalStorage<CompatibilityPreferences>();
  private queue: Promise<unknown> = Promise.resolve();
  private constructor(
    readonly ceiling: RootPolicy,
    readonly file: string,
    readonly allowConfigWrite: boolean,
    readonly shells: readonly string[],
    readonly minimumBlocked: readonly string[],
  ) {}
  static async create(options: {
    roots: readonly string[];
    file?: string;
    allowConfigWrite?: boolean;
    allowedShells?: readonly string[];
    blockedCommands?: readonly string[];
  }) {
    const ceiling = await RootPolicy.create(options.roots);
    const identity = sha(Buffer.from(JSON.stringify(ceiling.roots))).slice(0, 20);
    const file = options.file ?? path.join(path.dirname(configPath()), 'compat', identity + '.json');
    if (!path.isAbsolute(file) || /[\x00-\x1f\x7f]/.test(file))
      fail('CONFIG_PATH', 'Choose an absolute compatibility configuration path.');
    const shells = Object.freeze([
      ...(options.allowedShells?.length
        ? options.allowedShells
        : [
            process.platform === 'win32'
              ? 'powershell.exe'
              : process.platform === 'darwin'
                ? '/bin/zsh'
                : '/bin/sh',
          ]),
    ]);
    if (shells.length > 16 || shells.some((s) => !text.safeParse(s).success))
      fail('CONFIG_INVALID', 'Invalid owner shell list.');
    const minimum = Object.freeze([
      ...new Set([...MINIMUM_BLOCKED, ...(options.blockedCommands ?? [])].map(commandName)),
    ]);
    const storageFile = await canonicalCompatibilityFile(file, ceiling);
    const service = new CompatibilityConfig(
      ceiling,
      storageFile,
      options.allowConfigWrite === true,
      shells,
      minimum,
    );
    await service.read(); // Invalid on-disk policy never silently falls back to a permissive default.
    return service;
  }
  private defaults(): CompatibilityPreferences {
    return {
      blockedCommands: this.minimumBlocked,
      defaultShell: this.shells[0]!,
      allowedDirectories: this.ceiling.roots,
      fileReadLineLimit: 1000,
      fileWriteLineLimit: 50,
      telemetryEnabled: false,
    };
  }
  private async safeParents(create = false) {
    const parent = path.dirname(this.file),
      base = path.parse(parent).root;
    let current = base;
    for (const component of path.relative(base, parent).split(path.sep).filter(Boolean)) {
      current = path.join(current, component);
      let st;
      try {
        st = await fs.lstat(current);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
        if (!create) return;
        try {
          await fs.mkdir(current, { mode: 0o700 });
        } catch (x) {
          if ((x as NodeJS.ErrnoException).code !== 'EEXIST') throw x;
        }
        st = await fs.lstat(current);
      }
      if (!st.isDirectory() || st.isSymbolicLink())
        fail('CONFIG_UNSAFE', 'Configuration parent is linked or not a directory.');
    }
  }
  private async bytes(file = this.file): Promise<Buffer | undefined> {
    await this.safeParents();
    let h;
    try {
      const st = await fs.lstat(file);
      if (!st.isFile() || st.isSymbolicLink() || st.nlink > 1)
        fail('CONFIG_UNSAFE', 'Configuration must be a single-link regular file.');
      h = await fs.open(file, constants.O_RDONLY | (process.platform === 'win32' ? 0 : constants.O_NOFOLLOW));
      const opened = await h.stat();
      if (!opened.isFile() || opened.nlink > 1 || opened.size > LIMIT)
        fail('CONFIG_LIMIT', 'Configuration is unsafe or too large.');
      const b = Buffer.alloc(LIMIT + 1);
      let total = 0;
      while (total < b.length) {
        const r = await h.read(b, total, b.length - total, null);
        if (!r.bytesRead) break;
        total += r.bytesRead;
      }
      if (total > LIMIT) fail('CONFIG_LIMIT', 'Configuration exceeds byte limit.');
      return b.subarray(0, total);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw e;
    } finally {
      await h?.close();
    }
  }
  private decode(b?: Buffer): Stored {
    if (!b) return { schemaVersion: 1 };
    try {
      return storedSchema.parse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(b)));
    } catch {
      fail('CONFIG_INVALID', 'Invalid compatibility configuration; preserve and repair it explicitly.');
    }
  }
  private async effective(p: Stored): Promise<CompatibilityPreferences> {
    const defaults = this.defaults();
    const roots: string[] = [];
    for (const root of p.allowedDirectories ?? defaults.allowedDirectories) {
      if (!path.isAbsolute(root)) fail('CONFIG_SCOPE', 'Allowed directories must be absolute.');
      const resolved = await this.ceiling.resolve(root);
      if (!(await fs.stat(resolved)).isDirectory())
        fail('CONFIG_SCOPE', 'Allowed directory is not a directory.');
      if (!roots.some((r) => equivalent(r, resolved))) roots.push(resolved);
    }
    const shell = p.defaultShell ?? defaults.defaultShell;
    if (!this.shells.some((s) => equivalent(s, shell)))
      fail('CONFIG_SCOPE', 'Shell is outside the owner-selected shell ceiling.');
    return Object.freeze({
      ...defaults,
      ...p,
      allowedDirectories: Object.freeze(roots),
      blockedCommands: Object.freeze([
        ...new Set([...this.minimumBlocked, ...(p.blockedCommands ?? [])].map(commandName)),
      ]),
      defaultShell: shell,
    });
  }
  async read(): Promise<CompatibilityPreferences> {
    return this.effective(this.decode(await this.bytes()));
  }
  current(): CompatibilityPreferences {
    const snapshot = this.context.getStore();
    if (!snapshot) fail('CONFIG_CONTEXT_REQUIRED', 'An admitted request snapshot is required.');
    return snapshot;
  }
  async run<T>(action: () => Promise<T> | T): Promise<T> {
    const snapshot = await this.read();
    return this.context.run(snapshot, action);
  }
  bindPolicy(policy: RootPolicy) {
    policy.setAccessGuard((p) => this.assertPath(p));
  }
  private assertPath(p: string) {
    if (equivalent(p, this.file) || p.toLowerCase().startsWith((this.file + '.').toLowerCase()))
      fail('PRIVATE_PATH', 'Compatibility policy storage is not exposed through file tools.');
    if (!this.current().allowedDirectories.some((root) => inside(root, p)))
      fail('OUTSIDE_ROOT', 'Path is outside currently allowed directories.');
  }
  checkExecutable(command: string) {
    if (this.current().blockedCommands.includes(commandName(command)))
      fail('COMMAND_BLOCKED', 'The selected executable is blocked by effective configuration.');
  }
  private normalized(key: string, value: unknown): unknown {
    if (key === 'telemetryEnabled' && typeof value === 'string') {
      if (value.trim().toLowerCase() === 'false') return false;
      if (value.trim().toLowerCase() === 'true') return true;
    }
    if ((key === 'allowedDirectories' || key === 'blockedCommands') && typeof value === 'string') {
      if (value.trimStart().startsWith('[')) {
        try {
          return JSON.parse(value);
        } catch {
          fail('CONFIG_INVALID', 'Invalid JSON array value.');
        }
      }
      return [value];
    }
    return value;
  }
  private async replace(file: string, next: Buffer, old?: Buffer, signal?: AbortSignal) {
    if (next.length > LIMIT) fail('CONFIG_LIMIT', 'Configuration exceeds byte limit.');
    const temp = this.file + '.mterm-' + randomUUID() + '.tmp';
    let owned = false;
    let staged: { dev: number; ino: number } | undefined;
    try {
      await this.safeParents();
      const h = await fs.open(temp, 'wx', 0o600);
      owned = true;
      try {
        const stat = await h.stat();
        staged = { dev: stat.dev, ino: stat.ino };
        await h.writeFile(next);
        await h.sync();
      } finally {
        await h.close();
      }
      // Windows scanners can briefly deny a replacement after our handles close.
      // Each attempt checks the unchanged destination, safe parents and owned stage;
      // the cooperative lock is not an OS transaction against unrelated writers.
      const attempts = process.platform === 'win32' ? 5 : 1;
      for (let attempt = 0; attempt < attempts; attempt++) {
        cancelled(signal);
        const check = await this.bytes(file);
        if ((old === undefined) !== (check === undefined) || (old && check && !old.equals(check)))
          fail('CONFIG_CONFLICT', 'Configuration changed outside the cooperative lock.');
        const stage = await fs.lstat(temp);
        if (
          !stage.isFile() ||
          stage.isSymbolicLink() ||
          stage.nlink !== 1 ||
          stage.dev !== staged.dev ||
          stage.ino !== staged.ino
        )
          fail('CONFIG_UNSAFE', 'Configuration staging identity changed before replacement.');
        cancelled(signal);
        if (!old) {
          await fs.link(temp, file);
          break;
        }
        try {
          await fs.rename(temp, file);
          owned = false;
          break;
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (attempt === attempts - 1 || (code !== 'EPERM' && code !== 'EBUSY')) throw error;
          await new Promise((resolve) => setTimeout(resolve, 25 * 2 ** attempt));
        }
      }
    } finally {
      if (owned && staged) {
        try {
          await this.safeParents();
          const stage = await fs.lstat(temp);
          // Initial creation links this inode into the destination before unlinking
          // its temporary name, so cleanup intentionally permits that second link.
          if (
            stage.isFile() &&
            !stage.isSymbolicLink() &&
            stage.dev === staged.dev &&
            stage.ino === staged.ino
          )
            await fs.unlink(temp);
        } catch {
          // Never follow a replaced parent or delete a substituted staging file.
          // An inaccessible owned stage may remain for explicit local recovery.
        }
      }
    }
  }
  async set(key: string, value: unknown, signal?: AbortSignal): Promise<CompatibilityPreferences> {
    cancelled(signal);
    if (!this.allowConfigWrite)
      fail('CONFIG_WRITE_DISABLED', 'Configuration mutation requires explicit --allow-config-write.');
    if (
      ![
        'blockedCommands',
        'defaultShell',
        'allowedDirectories',
        'fileReadLineLimit',
        'fileWriteLineLimit',
        'telemetryEnabled',
      ].includes(key)
    )
      fail(
        'CONFIG_KEY',
        'This key is not configurable; capabilities and credentials are never runtime preferences.',
      );
    const normalized = this.normalized(key, value);
    // Validate types before creating state directories or acquiring a lock.
    storedSchema.parse({ schemaVersion: 1, [key]: normalized });
    const operation = async () => {
      cancelled(signal);
      await this.safeParents(true);
      const lockPath = this.file + '.lock',
        nonce = randomUUID();
      let lock;
      for (let attempt = 0; attempt < 100; attempt++) {
        cancelled(signal);
        try {
          lock = await fs.open(lockPath, 'wx', 0o600);
          break;
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
        }
        await new Promise((r) => setTimeout(r, 10));
      }
      if (!lock) fail('CONFIG_BUSY', 'Another config lock exists; stale locks are never stolen.');
      try {
        await lock.writeFile(nonce);
        cancelled(signal);
        const old = await this.bytes();
        const next = storedSchema.parse({ ...this.decode(old), [key]: normalized });
        const effective = await this.effective(next);
        const nextBytes = Buffer.from(JSON.stringify(next, null, 2) + '\n');
        if (old?.equals(nextBytes)) return effective;
        if (old)
          await this.replace(this.file + '.previous', old, await this.bytes(this.file + '.previous'), signal);
        await this.replace(this.file, nextBytes, old, signal);
        return effective;
      } finally {
        await lock.close();
        if ((await fs.readFile(lockPath, 'utf8').catch(() => '')) === nonce)
          await fs.unlink(lockPath).catch(() => {});
      }
    };
    const result = this.queue.then(operation);
    this.queue = result.catch(() => {});
    return result;
  }
  describe(client?: { name: string; version: string }) {
    const config = {
      ...this.current(),
      version: '0.0.1-preview.1',
      currentClient: client ?? null,
      systemInfo: {
        platform: process.platform,
        architecture: process.arch,
        nodeVersion: process.version,
        release: os.release(),
      },
      mterm: {
        ownerAllowedDirectories: this.ceiling.roots,
        configFile: this.file,
        configWriteEnabled: this.allowConfigWrite,
        allowedShells: this.shells,
        telemetryTransport: 'none',
        effectiveTelemetryEnabled: false,
        reload: 'snapshot on each MCP call',
        emptyRoots: 'deny all',
        shellCommandTools: false,
        osSandbox: false,
      },
    };
    return {
      content: [
        { type: 'text' as const, text: 'Current configuration:\n' + JSON.stringify(config, null, 2) },
      ],
      structuredContent: {
        config,
        uiHints: { availableShells: this.shells },
        entries: Object.entries(config)
          .filter(([k]) =>
            [
              'blockedCommands',
              'defaultShell',
              'allowedDirectories',
              'fileReadLineLimit',
              'fileWriteLineLimit',
              'telemetryEnabled',
            ].includes(k),
          )
          .map(([key, value]) => ({
            key,
            value,
            valueType: Array.isArray(value) ? 'array' : typeof value,
            editable: this.allowConfigWrite,
          })),
      },
    };
  }
}
