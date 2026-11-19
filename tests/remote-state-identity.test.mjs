// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-13-exact-state-identity (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const packageRoot = process.env.MTERM_VERIFY_BIN
  ? path.resolve(path.dirname(process.env.MTERM_VERIFY_BIN), '..')
  : path.resolve(import.meta.dirname, '..');
const { RemoteStateStore } = await import(
  pathToFileURL(path.join(packageRoot, 'dist', 'remote', 'state.js')).href
);
const { admitRemoteStateDirectory, assertRemoteStateAdmission } = await import(
  pathToFileURL(path.join(packageRoot, 'dist', 'remote', 'profiles.js')).href
);
const originalId = 2n ** 60n;
const replacementId = originalId + 1n;
assert.notEqual(originalId, replacementId);
assert.equal(Number(originalId), Number(replacementId));
const partial = Buffer.from('{"partial');
const sentinel = Buffer.from('unrelated replacement');
const substitute = (stat, field, value) =>
  Object.assign(Object.create(stat), {
    [field]: typeof stat[field] === 'bigint' ? value : Number(value),
    // Different devices may legitimately reuse the same inode value.
    ...(field === 'dev' ? { ino: typeof stat.ino === 'bigint' ? originalId : Number(originalId) } : {}),
  });
const absent = async (file) => assert.rejects(fs.lstat(file), (error) => error.code === 'ENOENT');

async function fixture(t, lockName) {
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-exact-identity-')));
  const directory = path.join(parent, 'state'),
    root = path.join(parent, 'root');
  await fs.mkdir(root);
  const store = await RemoteStateStore.open(directory);
  const handles = new Set();
  t.after(async () => {
    t.mock.restoreAll();
    for (const handle of handles) if (handle.fd !== -1) await handle.close();
    await fs.rm(parent, { recursive: true, force: true, maxRetries: 3 });
  });
  return {
    parent,
    directory,
    root,
    store,
    handles,
    lock: path.join(directory, lockName),
    input: { schemaVersion: 1, gateway: 'https://gateway.test', root, name: 'owned identity fixture' },
  };
}

// Real private files are moved/replaced; only returned ID precision and one write failure are modeled.
async function lockBoundary(t, lockName, target, field, replace) {
  const f = await fixture(t, lockName),
    primary = new Error('Owned synthetic initialization failure');
  const oldDirectory = path.join(f.parent, 'old-state');
  const oldLock = path.join(f.directory, 'old.lock');
  const open = fs.open.bind(fs),
    lstat = fs.lstat.bind(fs);
  let changed = false,
    boundaryCompleted = false,
    acquired = 0;
  const selected = target === 'parent' ? f.directory : f.lock;
  t.mock.method(fs, 'lstat', async (...args) => {
    const stat = await lstat(...args);
    return args[0] === selected
      ? substitute(stat, field, changed && replace ? replacementId : originalId)
      : stat;
  });
  t.mock.method(fs, 'open', async (...args) => {
    const handle = await open(...args);
    if (args[0] !== f.lock || args[1] !== 'wx') return handle;
    f.handles.add(handle);
    const attempt = ++acquired;
    const stat = handle.stat.bind(handle),
      write = handle.writeFile.bind(handle),
      close = handle.close.bind(handle);
    if (target === 'leaf')
      t.mock.method(handle, 'stat', async (...options) =>
        substitute(await stat(...options), field, originalId),
      );
    t.mock.method(handle, 'writeFile', async (...values) => {
      if (attempt !== 1) return write(...values);
      await write(partial);
      throw primary;
    });
    t.mock.method(handle, 'close', async () => {
      await close();
      if (attempt !== 1) return;
      if (replace && target === 'parent') {
        await fs.rename(f.directory, oldDirectory);
        await fs.mkdir(f.directory, { mode: 0o700 });
        await fs.rename(path.join(oldDirectory, lockName), f.lock);
      } else if (replace) {
        await fs.rename(f.lock, oldLock);
        await fs.writeFile(f.lock, sentinel, { flag: 'wx', mode: 0o600 });
      }
      changed = true;
      boundaryCompleted = true;
    });
    return handle;
  });
  const perform = () =>
    lockName === 'run.lock' ? f.store.acquire(randomUUID()) : f.store.configure(f.input);
  await assert.rejects(perform(), (error) => error === primary);
  assert.equal(
    boundaryCompleted,
    true,
    'The real replacement boundary must finish without a hidden hook error',
  );
  if (replace) {
    assert.deepEqual(await fs.readFile(f.lock), target === 'parent' ? partial : sentinel);
    if (target === 'leaf') assert.deepEqual(await fs.readFile(oldLock), partial);
    else
      assert.notEqual(
        (await lstat(f.directory, { bigint: true })).ino,
        (await lstat(oldDirectory, { bigint: true })).ino,
      );
    await absent(path.join(f.directory, 'config.json'));
  } else {
    await absent(f.lock);
    await perform();
    if (lockName === 'run.lock') {
      const owner = JSON.parse(await fs.readFile(f.lock, 'utf8')).instanceId;
      await f.store.release(owner);
    } else assert.equal((await f.store.config()).name, f.input.name);
    await absent(f.lock);
  }
}

for (const lockName of ['run.lock', 'state.lock']) {
  for (const target of ['parent', 'leaf']) {
    for (const field of ['ino', 'dev']) {
      test(
        'exact identity retains ' + lockName + ' after a ' + target + ' ' + field + ' Number collision',
        (t) => lockBoundary(t, lockName, target, field, true),
      );
    }
  }
  test(
    'exact identity permits confirmed ' + lockName + ' cleanup and explicit retry with a large unchanged ID',
    (t) => lockBoundary(t, lockName, 'leaf', 'ino', false),
  );
}

for (const field of ['ino', 'dev']) {
  test(
    'exact identity rejects a replaced admitted profile directory despite a ' + field + ' Number collision',
    async (t) => {
      const f = await fixture(t, 'run.lock'),
        lstat = fs.lstat.bind(fs);
      let replaced = false;
      t.mock.method(fs, 'lstat', async (...args) => {
        const stat = await lstat(...args);
        return args[0] === f.directory
          ? substitute(stat, field, replaced ? replacementId : originalId)
          : stat;
      });
      const admission = await admitRemoteStateDirectory(f.directory, 'development', false);
      await assertRemoteStateAdmission(admission);
      const old = path.join(f.parent, 'old-state');
      await fs.rename(f.directory, old);
      await fs.mkdir(f.directory, { mode: 0o700 });
      await fs.writeFile(path.join(f.directory, 'sentinel'), sentinel);
      replaced = true;
      await assert.rejects(assertRemoteStateAdmission(admission), (error) => error.code === 'REMOTE_STATE');
      assert.deepEqual(await fs.readFile(path.join(f.directory, 'sentinel')), sentinel);
      assert.notEqual(
        (await lstat(old, { bigint: true })).ino,
        (await lstat(f.directory, { bigint: true })).ino,
      );
    },
  );
}

test('exact identity admits an unchanged profile directory with a large ID', async (t) => {
  const f = await fixture(t, 'run.lock'),
    lstat = fs.lstat.bind(fs);
  t.mock.method(fs, 'lstat', async (...args) => {
    const stat = await lstat(...args);
    return args[0] === f.directory ? substitute(stat, 'ino', originalId) : stat;
  });
  const admission = await admitRemoteStateDirectory(f.directory, 'development', false);
  await assertRemoteStateAdmission(admission);
  assert.deepEqual(await fs.readdir(f.directory), []);
});
