// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-05-codex-parity-foundation (OpenAI / GPT-6 Astra Pro; self-reported)
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';
import { RootPolicy } from './policy.js';
import { resolveCodex } from './codex.js';
import { fail } from './errors.js';

const exec = promisify(execFile);
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const nameSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const LIMIT = 1048576;
export interface RegistrationPlan {
  name: string;
  command: string;
  args: string[];
  root: string;
}
interface Snapshot {
  bytes: Buffer;
  exists: boolean;
  mode: number;
}
const journalSchema = z.strictObject({
  schemaVersion: z.literal(1),
  name: nameSchema,
  planHash: z.string().regex(/^[a-f0-9]{64}$/),
  addition: z.string().min(1).max(65536),
  beforeHash: z.string(),
  targetHash: z.string(),
  phase: z.enum(['installing', 'installed', 'removing']),
});
type Journal = z.infer<typeof journalSchema>;
interface ApplyOptions {
  home?: string;
  /** Internal dependency injection for deterministic tests. Not exposed by CLI or configuration. */
  generateTable?: (plan: RegistrationPlan) => Promise<string>;
}
export async function planCodexRegistration(options: {
  root: string;
  allowWrite?: boolean;
  allowExec?: boolean;
  name?: string;
}): Promise<RegistrationPlan> {
  const name = nameSchema.parse(options.name ?? 'mterm-local');
  const policy = await RootPolicy.create(path.resolve(options.root));
  const bin = fileURLToPath(new URL('../bin/mterm-cli.js', import.meta.url));
  return {
    name,
    command: process.execPath,
    root: policy.root,
    args: [
      bin,
      'mcp',
      '--stdio',
      '--root',
      policy.root,
      ...(options.allowWrite ? ['--allow-write'] : []),
      ...(options.allowExec ? ['--allow-exec'] : []),
    ],
  };
}
function chosenHome(input?: string): string {
  const home = input ?? process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex');
  if (!path.isAbsolute(home) || /[\x00-\x1f]/.test(home))
    fail('CONFIG_PATH', 'Choose an absolute Codex home.');
  return path.resolve(home);
}
async function safeDirectory(dir: string, create: boolean): Promise<void> {
  try {
    const st = await fs.lstat(dir);
    if (st.isSymbolicLink() || !st.isDirectory())
      fail('CONFIG_UNSAFE', 'Configuration directory is unsafe or linked.');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT' || !create) throw e;
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    await safeDirectory(dir, false);
  }
}
async function snapshot(file: string): Promise<Snapshot> {
  let h;
  try {
    const lst = await fs.lstat(file);
    if (lst.isSymbolicLink() || !lst.isFile() || lst.nlink > 1)
      fail('CONFIG_UNSAFE', 'Configuration file is unsafe or linked.');
    h = await fs.open(file, constants.O_RDONLY | (process.platform === 'win32' ? 0 : constants.O_NOFOLLOW));
    const st = await h.stat();
    if (!st.isFile() || st.nlink > 1 || st.size > LIMIT)
      fail('CONFIG_UNSAFE', 'Configuration file is unsafe, linked or too large.');
    const b = Buffer.alloc(LIMIT + 1);
    let size = 0;
    while (size < b.length) {
      const r = await h.read(b, size, b.length - size, null);
      if (!r.bytesRead) break;
      size += r.bytesRead;
    }
    if (size > LIMIT) fail('CONFIG_LIMIT', 'Configuration grew beyond its byte limit.');
    const bytes = b.subarray(0, size);
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      fail('CONFIG_UTF8', 'Configuration must be valid UTF-8.');
    }
    return { bytes, exists: true, mode: st.mode & 0o777 };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT')
      return { bytes: Buffer.alloc(0), exists: false, mode: 0o600 };
    throw e;
  } finally {
    await h?.close();
  }
}
async function replace(file: string, bytes: Buffer, expected: Snapshot): Promise<void> {
  if (bytes.length > LIMIT) fail('CONFIG_LIMIT', 'Configuration exceeds byte limit.');
  const tmp = path.join(path.dirname(file), '.mterm-stage-' + randomUUID());
  let owned = false;
  try {
    const h = await fs.open(tmp, 'wx', expected.mode);
    owned = true;
    try {
      await h.writeFile(bytes);
      await h.sync();
    } finally {
      await h.close();
    }
    const current = await snapshot(file);
    if (current.exists !== expected.exists || !current.bytes.equals(expected.bytes))
      fail('CONFIG_CONFLICT', 'Configuration changed during setup; original and backup were preserved.');
    // This serializes MTerm writers, not a hostile writer ignoring the lock. No OS-sandbox claim.
    if (expected.exists) {
      await fs.rename(tmp, file);
      owned = false;
    } else await fs.link(tmp, file);
  } finally {
    if (owned) await fs.unlink(tmp).catch(() => {});
  }
}
async function withLock<T>(home: string, operation: (store: string) => Promise<T>): Promise<T> {
  await safeDirectory(home, true);
  const file = path.join(home, '.mterm-setup.lock');
  let lock;
  try {
    lock = await fs.open(file, 'wx', 0o600);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'EEXIST')
      fail(
        'CONFIG_BUSY',
        'Another setup lock exists. Verify ownership before manual recovery; it is never stolen automatically.',
      );
    throw e;
  }
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    const store = path.join(home, '.mterm-registration');
    await safeDirectory(store, true);
    return await operation(store);
  } finally {
    await lock.close();
    await fs.unlink(file).catch(() => {});
  }
}
async function saveJournal(file: string, record: Journal): Promise<void> {
  await replace(file, Buffer.from(JSON.stringify(record, null, 2) + '\n'), await snapshot(file));
}
async function readJournal(file: string): Promise<Journal | undefined> {
  const s = await snapshot(file);
  if (!s.exists) return undefined;
  try {
    return journalSchema.parse(JSON.parse(s.bytes.toString('utf8')));
  } catch {
    fail('CONFIG_JOURNAL', 'Invalid ownership record; configuration was not changed.');
  }
}
function checkAddition(record: Journal): void {
  if (
    !record.addition.startsWith('\n# BEGIN MTERM ' + record.name + '\n') ||
    !record.addition.endsWith('# END MTERM ' + record.name + '\n') ||
    (record.addition.match(/^\[mcp_servers\./gm) ?? []).length !== 1
  )
    fail('CONFIG_JOURNAL', 'Ownership block is invalid; configuration was not changed.');
}
async function backup(store: string, before: Snapshot): Promise<string | null> {
  if (!before.exists) return null;
  const dir = path.join(store, 'backups');
  await safeDirectory(dir, true);
  const file = path.join(dir, hash(before.bytes) + '.toml');
  const old = await snapshot(file);
  if (!old.exists) await replace(file, before.bytes, old);
  else if (!old.bytes.equals(before.bytes))
    fail('CONFIG_BACKUP', 'Backup collision; configuration was not changed.');
  return file;
}
async function officialTable(plan: RegistrationPlan, candidate?: string): Promise<string> {
  const codex = await resolveCodex();
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-codex-config-'));
  await fs.chmod(temp, 0o700);
  const env = { ...process.env, CODEX_HOME: temp };
  const call = async (args: string[]) => {
    try {
      return await exec(codex.command, [...codex.prefix, ...args], {
        env,
        timeout: 15000,
        maxBuffer: LIMIT,
        windowsHide: true,
      });
    } catch {
      fail(
        'CODEX_CONFIG_FAILED',
        'Codex rejected staged configuration. No real authentication was read or changed; inspect supported Codex setup syntax.',
      );
    }
  };
  try {
    if (candidate === undefined) await call(['mcp', 'add', plan.name, '--', plan.command, ...plan.args]);
    else await fs.writeFile(path.join(temp, 'config.toml'), candidate, { mode: 0o600 });
    const result = JSON.parse((await call(['mcp', 'get', plan.name, '--json'])).stdout);
    const transport = result.transport ?? result;
    if (transport.command !== plan.command || JSON.stringify(transport.args) !== JSON.stringify(plan.args))
      fail('CODEX_CONFIG_MISMATCH', 'Codex did not parse the expected executable and arguments.');
    return (await snapshot(path.join(temp, 'config.toml'))).bytes.toString('utf8');
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}
export async function applyCodexRegistration(plan: RegistrationPlan, options: ApplyOptions = {}) {
  nameSchema.parse(plan.name);
  const home = chosenHome(options.home);
  return withLock(home, async (store) => {
    const config = path.join(home, 'config.toml'),
      recordFile = path.join(store, plan.name + '.json');
    const before = await snapshot(config),
      text = before.bytes.toString('utf8');
    const planHash = hash(JSON.stringify(plan));
    let record = await readJournal(recordFile);
    if (record) {
      checkAddition(record);
      if (record.name !== plan.name || record.planHash !== planHash || record.phase === 'removing')
        fail(
          'CONFIG_CONFLICT',
          'Registration changed; remove the owned registration deliberately before reconfiguring.',
        );
      const index = text.indexOf(record.addition);
      if (index >= 0 && text.indexOf(record.addition, index + 1) === -1) {
        if (!options.generateTable) await officialTable(plan, text);
        if (record.phase !== 'installed') await saveJournal(recordFile, { ...record, phase: 'installed' });
        return { applied: true, changed: false, name: plan.name, configPath: config };
      }
      if (record.phase !== 'installing' || hash(before.bytes) !== record.beforeHash)
        fail(
          'CONFIG_CONFLICT',
          'Owned block was changed or removed outside MTerm; configuration was preserved.',
        );
    } else {
      const quoted = `(?:${plan.name}|"${plan.name}"|'${plan.name}')`;
      const header = new RegExp(
        `^\\s*\\[\\s*(?:mcp_servers|"mcp_servers"|'mcp_servers')\\s*\\.\\s*${quoted}(?:\\s*\\]|\\.)`,
        'm',
      );
      if (
        header.test(text) ||
        /^\s*(?:mcp_servers|"mcp_servers"|'mcp_servers')\s*=/m.test(text) ||
        text.includes('# BEGIN MTERM ' + plan.name)
      )
        fail(
          'CONFIG_CONFLICT',
          'An existing unowned MCP entry or inline MCP configuration requires manual review.',
        );
      const stanza = await (options.generateTable ?? officialTable)(plan);
      if ((stanza.match(/^\[mcp_servers\./gm) ?? []).length !== 1 || stanza.includes('# BEGIN MTERM'))
        fail('CODEX_CONFIG_MISMATCH', 'Unexpected staged MCP configuration.');
      const addition =
        '\n# BEGIN MTERM ' + plan.name + '\n' + stanza.trimEnd() + '\n# END MTERM ' + plan.name + '\n';
      record = {
        schemaVersion: 1,
        name: plan.name,
        planHash,
        addition,
        phase: 'installing',
        beforeHash: hash(before.bytes),
        targetHash: hash(text + addition),
      };
    }
    const next = Buffer.concat([before.bytes, Buffer.from(record.addition)]);
    if (!options.generateTable) await officialTable(plan, next.toString('utf8'));
    const savedBackup = await backup(store, before);
    await saveJournal(recordFile, record);
    await replace(config, next, before);
    await saveJournal(recordFile, { ...record, phase: 'installed' });
    return { applied: true, changed: true, name: plan.name, configPath: config, backupPath: savedBackup };
  });
}
export async function removeCodexRegistration(
  options: { home?: string; apply?: boolean; name?: string } = {},
) {
  const name = nameSchema.parse(options.name ?? 'mterm-local'),
    home = chosenHome(options.home);
  if (!options.apply)
    return {
      applied: false,
      changed: false,
      name,
      configPath: path.join(home, 'config.toml'),
      action: 'Remove only the exact owned registration block; preserve unrelated configuration.',
    };
  return withLock(home, async (store) => {
    const recordFile = path.join(store, name + '.json'),
      config = path.join(home, 'config.toml');
    const record = await readJournal(recordFile);
    if (!record) return { applied: true, changed: false, removed: false, name };
    checkAddition(record);
    if (record.name !== name) fail('CONFIG_JOURNAL', 'Ownership identity mismatch.');
    const before = await snapshot(config),
      text = before.bytes.toString('utf8');
    const index = text.indexOf(record.addition);
    if (index < 0 && record.phase === 'removing' && hash(before.bytes) === record.targetHash) {
      await fs.unlink(recordFile);
      return { applied: true, changed: false, removed: true, recovered: true, name };
    }
    if (index < 0 || text.indexOf(record.addition, index + 1) >= 0)
      fail('CONFIG_CONFLICT', 'Owned configuration block changed; removal refuses to overwrite user edits.');
    const next = Buffer.from(text.slice(0, index) + text.slice(index + record.addition.length));
    const savedBackup = await backup(store, before);
    await saveJournal(recordFile, { ...record, phase: 'removing', targetHash: hash(next) });
    await replace(config, next, before);
    await fs.unlink(recordFile);
    return { applied: true, changed: true, removed: true, name, configPath: config, backupPath: savedBackup };
  });
}
