// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-remote-agent (OpenAI / GPT-6 Astra Pro; self-reported)
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fail } from '../errors.js';
import { remoteRoot } from './adapter.js';
import { normalizeGateway } from './agent.js';
import { UUID_PATTERN } from './protocol.js';

export interface RemoteConfig {
  schemaVersion: 1;
  gateway: string;
  dashboard?: string;
  root: string;
  name: string;
  deviceId?: string;
}
const LIMIT = 32768;
const inside = (root: string, candidate: string) => {
  const rel = path.relative(root, candidate);
  return !rel || (!path.isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + path.sep));
};
export function defaultRemoteStateDirectory(): string {
  const base = process.platform === 'win32' ? process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local')
    : process.env.XDG_STATE_HOME ?? path.join(os.homedir(), '.local', 'state');
  return path.join(base, 'MTerm-CLI', 'remote');
}
function validateConfig(value: unknown): RemoteConfig {
  const c = value as RemoteConfig;
  if (!c || c.schemaVersion !== 1 || typeof c.root !== 'string' || !path.isAbsolute(c.root) ||
    typeof c.name !== 'string' || !c.name.trim() || c.name.length > 80 || /[\x00-\x1f\x7f]/.test(c.name) ||
    (c.deviceId !== undefined && !UUID_PATTERN.test(c.deviceId)) ||
    Object.keys(c).some(k => !['schemaVersion', 'gateway', 'dashboard', 'root', 'name', 'deviceId'].includes(k)))
    fail('REMOTE_CONFIG', 'Remote configuration is invalid; preserve and repair it explicitly.');
  return { ...c, gateway: normalizeGateway(c.gateway), ...(c.dashboard ? { dashboard: normalizeGateway(c.dashboard) } : {}) };
}

/** The fixed PowerShell program receives secrets only through stdin, never argv or diagnostics. */
async function dpapi(mode: 'Protect' | 'Unprotect', input: string): Promise<string> {
  const script = `$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; ` +
    `$b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); ` +
    `$e=[Text.Encoding]::UTF8.GetBytes('MTerm-CLI remote credential v1'); ` +
    `$r=[Security.Cryptography.ProtectedData]::${mode}($b,$e,[Security.Cryptography.DataProtectionScope]::CurrentUser); ` +
    `[Console]::Out.Write([Convert]::ToBase64String($r));`;
  return new Promise<string>((resolve, reject) => {
    const binary = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const child = spawn(binary, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    });
    const chunks: Buffer[] = [];
    let bytes = 0, finished = false;
    const done = (error?: boolean) => {
      if (finished) return;
      finished = true; clearTimeout(timer);
      if (error) reject(Object.assign(new Error('Windows current-user credential protection failed.'), { code: 'REMOTE_SECRET_STORAGE' }));
      else resolve(Buffer.concat(chunks).toString('utf8').trim());
    };
    const timer = setTimeout(() => { child.kill(); done(true); }, 10000);
    child.stdout.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > LIMIT) { child.kill(); done(true); } else chunks.push(chunk);
    });
    child.stderr.resume();
    child.on('error', () => done(true));
    child.on('close', code => done(code !== 0));
    child.stdin.on('error', () => done(true));
    child.stdin.end(input);
  });
}

export class RemoteStateStore {
  private constructor(readonly directory: string) {}
  static async open(input = defaultRemoteStateDirectory(), create = true): Promise<RemoteStateStore> {
    if (!path.isAbsolute(input) || /[\x00-\x1f\x7f]/.test(input))
      fail('REMOTE_STATE', 'Select an absolute remote state directory.');
    if (create) await fs.mkdir(input, { recursive: true, mode: 0o700 });
    const st = await fs.lstat(input);
    if (!st.isDirectory() || st.isSymbolicLink()) fail('REMOTE_STATE', 'Remote state must be an owned regular directory.');
    if (process.platform !== 'win32' && ((st.mode & 0o077) !== 0 || st.uid !== process.getuid?.()))
      fail('REMOTE_STATE_PERMISSIONS', 'Remote state directory must be owned by the current user with mode 0700.');
    return new RemoteStateStore(await fs.realpath(input));
  }
  private async read(name: string): Promise<unknown | undefined> {
    const file = path.join(this.directory, name);
    let handle;
    try {
      const st = await fs.lstat(file);
      if (!st.isFile() || st.isSymbolicLink() || st.nlink > 1) fail('REMOTE_STATE', 'Remote state file is linked or not regular.');
      if (process.platform !== 'win32' && ((st.mode & 0o077) !== 0 || st.uid !== process.getuid?.()))
        fail('REMOTE_STATE_PERMISSIONS', 'Remote state files must have private current-user permissions.');
      handle = await fs.open(file, constants.O_RDONLY | (process.platform === 'win32' ? 0 : constants.O_NOFOLLOW));
      const opened = await handle.stat();
      if (!opened.isFile() || opened.nlink > 1 || opened.size > LIMIT) fail('REMOTE_STATE', 'Remote state file is unsafe or too large.');
      const buffer = Buffer.alloc(LIMIT + 1);
      let total = 0;
      while (total < buffer.length) {
        const r = await handle.read(buffer, total, buffer.length - total, null);
        if (!r.bytesRead) break;
        total += r.bytesRead;
      }
      if (total > LIMIT) fail('REMOTE_STATE', 'Remote state file exceeds its byte limit.');
      try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, total))); }
      catch { fail('REMOTE_STATE', 'Remote state JSON is invalid; no credential data is included.'); }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw e;
    } finally { await handle?.close(); }
  }
  private async write(name: string, value: unknown): Promise<void> {
    await this.read(name); // Reject unsafe existing destinations before replacing them.
    const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
    if (bytes.length > LIMIT) fail('REMOTE_STATE', 'Remote state exceeds its byte limit.');
    const temp = path.join(this.directory, '.' + randomUUID() + '.tmp');
    const h = await fs.open(temp, 'wx', 0o600);
    try { await h.writeFile(bytes); await h.sync(); } finally { await h.close(); }
    try { await fs.rename(temp, path.join(this.directory, name)); }
    finally { await fs.unlink(temp).catch(() => {}); }
  }
  async config(): Promise<RemoteConfig> {
    const raw = await this.read('config.json');
    if (!raw) fail('REMOTE_UNCONFIGURED', 'Run remote setup with an explicit gateway and trusted directory.');
    const config = validateConfig(raw);
    if (inside(config.root, this.directory)) fail('STATE_IN_ROOT', 'Remote credential storage cannot be within the exposed root.');
    return config;
  }
  async configure(input: RemoteConfig): Promise<RemoteConfig> {
    const root = await remoteRoot(input.root);
    const next = validateConfig({ ...input, root });
    if (next.deviceId) fail('REMOTE_CONFIG', 'Device identity is assigned by authenticated pairing only.');
    if (inside(root, this.directory)) fail('STATE_IN_ROOT', 'Remote credential storage cannot be within the exposed root.');
    const prior = await this.read('config.json');
    if (prior) {
      const old = validateConfig(prior);
      if (old.deviceId) {
        if (old.root === next.root && old.gateway === next.gateway && old.name === next.name && old.dashboard === next.dashboard) return old;
        fail('REMOTE_PAIRED', 'Revoke the existing pairing before changing its gateway, root or device name.');
      }
    }
    await this.write('config.json', next);
    return next;
  }
  async savePairing(deviceId: string, token: string): Promise<void> {
    const config = await this.config();
    if (config.deviceId) fail('REMOTE_PAIRED', 'A device is already paired; revoke it explicitly before pairing again.');
    if (!UUID_PATTERN.test(deviceId) || typeof token !== 'string' || !token || token.length > 4096 || /[\x00-\x20\x7f]/.test(token))
      fail('REMOTE_CREDENTIAL', 'Gateway supplied an invalid device credential.');
    const json = JSON.stringify({ deviceId, token, gateway: config.gateway });
    const protectedValue = process.platform === 'win32' ? await dpapi('Protect', Buffer.from(json).toString('base64')) : json;
    await this.write('credential.json', { schemaVersion: 1, protection: process.platform === 'win32' ? 'windows-dpapi-current-user' : 'posix-0600', value: protectedValue });
    await this.write('config.json', { ...config, deviceId });
  }
  async credential(): Promise<{ deviceId: string; token: string }> {
    const config = await this.config();
    if (!config.deviceId) fail('REMOTE_UNPAIRED', 'Pair this computer through authenticated browser approval first.');
    const raw = await this.read('credential.json') as { schemaVersion?: number; protection?: string; value?: string } | undefined;
    const expected = process.platform === 'win32' ? 'windows-dpapi-current-user' : 'posix-0600';
    if (!raw || raw.schemaVersion !== 1 || raw.protection !== expected || typeof raw.value !== 'string')
      fail('REMOTE_CREDENTIAL', 'Device credential is missing or uses an unsupported protection format.');
    let value: { deviceId?: string; token?: string; gateway?: string };
    try {
      const json = process.platform === 'win32' ? Buffer.from(await dpapi('Unprotect', raw.value), 'base64').toString('utf8') : raw.value;
      value = JSON.parse(json);
    } catch { fail('REMOTE_CREDENTIAL', 'Device credential could not be read by this OS user.'); }
    if (value.deviceId !== config.deviceId || value.gateway !== config.gateway || !value.token || typeof value.token !== 'string' || value.token.length > 4096)
      fail('REMOTE_CREDENTIAL', 'Device credential does not match the configured gateway and computer.');
    return { deviceId: config.deviceId, token: value.token };
  }
  async clearPairing(): Promise<void> {
    const config = await this.config();
    delete config.deviceId;
    await this.write('config.json', config);
    await this.read('credential.json');
    await fs.unlink(path.join(this.directory, 'credential.json')).catch(e => { if (e.code !== 'ENOENT') throw e; });
  }
  async status(): Promise<Record<string, unknown>> {
    const config = await this.config();
    const run = await this.read('running.json') as Record<string, unknown> | undefined;
    return { ...config, paired: !!config.deviceId, permissions: 'read-only', autostart: false, runtime: run ?? null };
  }
  async runtime(value: Record<string, unknown>): Promise<void> { await this.write('running.json', value); }
  async readRuntime(): Promise<Record<string, unknown> | undefined> { return await this.read('running.json') as Record<string, unknown> | undefined; }
  async acquire(instanceId: string): Promise<void> {
    const file = path.join(this.directory, 'run.lock');
    let handle;
    try { handle = await fs.open(file, 'wx', 0o600); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === 'EEXIST') fail('REMOTE_RUNNING', 'A remote start lock exists. Stop the owned session or inspect the stale lock before restarting.'); throw e; }
    try { await handle.writeFile(JSON.stringify({ instanceId, pid: process.pid })); }
    finally { await handle.close(); }
  }
  async release(instanceId: string): Promise<void> {
    const lock = await this.read('run.lock') as { instanceId?: string } | undefined;
    if (lock?.instanceId === instanceId) await fs.unlink(path.join(this.directory, 'run.lock'));
  }
  async requestStop(): Promise<boolean> {
    const lock = await this.read('run.lock') as { instanceId?: string } | undefined;
    if (!lock?.instanceId || !UUID_PATTERN.test(lock.instanceId)) return false;
    await this.write('stop.json', { instanceId: lock.instanceId });
    return true;
  }
  async stopRequested(instanceId: string): Promise<boolean> {
    const stop = await this.read('stop.json') as { instanceId?: string } | undefined;
    return stop?.instanceId === instanceId;
  }
}
