// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-04-local-mcp (OpenAI / GPT-6 Astra Pro; self-reported)
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import { fail } from './errors.js';
const absolute = z
  .string()
  .min(1)
  .max(4096)
  .refine((p) => path.isAbsolute(p) && !/[\x00-\x1f]/.test(p));
export const configSchema = z.strictObject({
  schemaVersion: z.literal(1),
  trustedRoot: absolute.optional(),
  codexExecutable: absolute.optional(),
});
export type Settings = z.infer<typeof configSchema>;
export function configPath(): string {
  const explicit = process.env.MTERM_CONFIG_PATH;
  if (explicit) {
    if (!path.isAbsolute(explicit)) fail('CONFIG_PATH', 'MTERM_CONFIG_PATH must be absolute.');
    return explicit;
  }
  const base =
    process.platform === 'win32'
      ? (process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'))
      : process.platform === 'darwin'
        ? path.join(os.homedir(), 'Library', 'Application Support')
        : (process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config'));
  return path.join(base, 'MTermCLI', 'config.json');
}
async function readBytes(file: string): Promise<Buffer | undefined> {
  let handle;
  try {
    handle = await fs.open(file, 'r');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw e;
  }
  try {
    const st = await handle.stat();
    if (!st.isFile() || st.nlink > 1 || st.size > 65536)
      fail('CONFIG_INVALID', 'Config must be a bounded single-link regular JSON file.');
    const b = Buffer.alloc(65537);
    let size = 0;
    while (size < b.length) {
      const r = await handle.read(b, size, b.length - size, null);
      if (!r.bytesRead) break;
      size += r.bytesRead;
    }
    if (size > 65536) fail('CONFIG_INVALID', 'Config exceeds size limit.');
    return b.subarray(0, size);
  } finally {
    await handle.close();
  }
}
function decode(b?: Buffer): Settings {
  if (!b) return { schemaVersion: 1 };
  try {
    return configSchema.parse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(b)));
  } catch {
    fail('CONFIG_INVALID', 'Config is invalid; preserve it and repair its schema before changing it.');
  }
}
export async function settings() {
  const file = configPath();
  try {
    const st = await fs.lstat(file);
    if (st.isSymbolicLink()) fail('CONFIG_INVALID', 'Symlinked config is refused.');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
  return { path: file, settings: decode(await readBytes(file)) };
}
export async function setSetting(key: string, value: string) {
  if (key !== 'trustedRoot' && key !== 'codexExecutable')
    fail(
      'CONFIG_KEY',
      'Only trustedRoot and codexExecutable are supported; permissions and credentials cannot be stored here.',
    );
  absolute.parse(value);
  const before = await settings();
  const next = configSchema.parse({ ...before.settings, [key]: value });
  await fs.mkdir(path.dirname(before.path), { recursive: true, mode: 0o700 });
  const lock = before.path + '.lock';
  let lockHandle;
  try {
    lockHandle = await fs.open(lock, 'wx', 0o600);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'EEXIST')
      fail(
        'CONFIG_BUSY',
        'Another config operation owns the lock; stale locks are never removed automatically.',
      );
    throw e;
  }
  const temporary = before.path + '.' + randomUUID() + '.tmp';
  let tempOwned = false;
  try {
    const old = await readBytes(before.path);
    const current = decode(old);
    if (JSON.stringify(current) !== JSON.stringify(before.settings))
      fail('CONFIG_CONFLICT', 'Config changed while acquiring its lock.');
    const b = Buffer.from(JSON.stringify(next, null, 2) + '\n');
    const handle = await fs.open(temporary, 'wx', 0o600);
    tempOwned = true;
    try {
      await handle.writeFile(b);
      await handle.sync();
    } finally {
      await handle.close();
    }
    const check = await readBytes(before.path);
    const hash = (x: Buffer | undefined) => (x ? createHash('sha256').update(x).digest('hex') : 'missing');
    if (hash(old) !== hash(check)) fail('CONFIG_CONFLICT', 'Config changed during save.');
    if (old) {
      await fs.writeFile(before.path + '.backup-' + randomUUID(), old, { flag: 'wx', mode: 0o600 });
      await fs.rename(temporary, before.path);
      tempOwned = false;
    } else await fs.link(temporary, before.path);
    return { path: before.path, settings: next };
  } finally {
    if (tempOwned) await fs.unlink(temporary).catch(() => {});
    await lockHandle.close();
    await fs.unlink(lock).catch(() => {});
  }
}
