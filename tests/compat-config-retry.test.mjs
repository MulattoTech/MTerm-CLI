// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-config-rename-retry (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CompatibilityConfig } from '../dist/compat-config.js';

const nativePlatform = process.platform;
const fault = (code) => Object.assign(new Error('synthetic configuration replacement failure'), { code });
async function fixture(t) {
  const home = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-config-retry-')));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const root = path.join(home, 'workspace');
  await fs.mkdir(root);
  const file = path.join(home, 'settings', 'compat.json');
  const config = await CompatibilityConfig.create({ roots: [root], file, allowConfigWrite: true });
  await config.set('fileReadLineLimit', 7);
  return { home, root, file, config, before: await fs.readFile(file) };
}

// Only this sequential test process substitutes OS faults. Production exposes no
// environment switch or injectable filesystem that could disable its guards.
async function withRenameFault(platform, replacement, action) {
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
  const original = fs.rename;
  Object.defineProperty(process, 'platform', { ...descriptor, value: platform });
  fs.rename = (source, target) => replacement(source, target, original);
  try {
    return await action();
  } finally {
    fs.rename = original;
    Object.defineProperty(process, 'platform', descriptor);
  }
}
async function assertClean(file) {
  const names = await fs.readdir(path.dirname(file));
  assert.ok(!names.some((name) => name.includes('.mterm-')), 'owned stages are removed');
  assert.ok(!names.includes(path.basename(file) + '.lock'), 'owned lock is removed');
}

test('Windows configuration replacement recovers from EPERM and EBUSY without deleting old bytes', async (t) => {
  const f = await fixture(t);
  let attempts = 0;
  await withRenameFault(
    'win32',
    async (source, target, rename) => {
      if (target === f.file) {
        attempts++;
        assert.deepEqual(await fs.readFile(f.file), f.before, 'destination remains intact until commit');
        if (attempts < 3) throw fault(attempts === 1 ? 'EPERM' : 'EBUSY');
      }
      return rename(source, target);
    },
    async () => assert.equal((await f.config.set('fileReadLineLimit', 8)).fileReadLineLimit, 8),
  );
  assert.equal(attempts, 3);
  assert.equal((await f.config.read()).fileReadLineLimit, 8);
  assert.deepEqual(await fs.readFile(f.file + '.previous'), f.before);
  await assertClean(f.file);
});

test('Windows previous-config backup replacement receives the same bounded recovery', async (t) => {
  const f = await fixture(t);
  await f.config.set('fileReadLineLimit', 8);
  const before = await fs.readFile(f.file);
  let attempts = 0;
  await withRenameFault(
    'win32',
    async (source, target, rename) => {
      if (target === f.file + '.previous' && ++attempts === 1) throw fault('EBUSY');
      return rename(source, target);
    },
    () => f.config.set('fileReadLineLimit', 9),
  );
  assert.equal(attempts, 2);
  assert.equal((await f.config.read()).fileReadLineLimit, 9);
  assert.deepEqual(await fs.readFile(f.file + '.previous'), before);
  await assertClean(f.file);
});

test('a retry rejects an intervening external config edit and retains original backup bytes', async (t) => {
  const f = await fixture(t);
  const external = Buffer.from('{"schemaVersion":1,"fileReadLineLimit":99}\n');
  let attempts = 0;
  await withRenameFault(
    'win32',
    async (source, target, rename) => {
      if (target === f.file) {
        attempts++;
        await fs.writeFile(f.file, external);
        throw fault('EPERM');
      }
      return rename(source, target);
    },
    () => assert.rejects(f.config.set('fileReadLineLimit', 8), (error) => error.code === 'CONFIG_CONFLICT'),
  );
  assert.equal(attempts, 1, 'changed bytes prohibit a second rename');
  assert.deepEqual(await fs.readFile(f.file), external);
  assert.deepEqual(await fs.readFile(f.file + '.previous'), f.before);
  await assertClean(f.file);
});

test('persistent Windows sharing failures exhaust five attempts and preserve usable config', async (t) => {
  const f = await fixture(t);
  let attempts = 0;
  await withRenameFault(
    'win32',
    async (source, target, rename) => {
      if (target === f.file) {
        attempts++;
        throw fault('EBUSY');
      }
      return rename(source, target);
    },
    () => assert.rejects(f.config.set('fileReadLineLimit', 8), (error) => error.code === 'EBUSY'),
  );
  assert.equal(attempts, 5);
  assert.deepEqual(await fs.readFile(f.file), f.before);
  assert.deepEqual(await fs.readFile(f.file + '.previous'), f.before);
  assert.equal((await f.config.read()).fileReadLineLimit, 7);
  await assertClean(f.file);
});

test('non-Windows and nontransient errors are never retried', async (t) => {
  for (const [platform, code] of [
    ['linux', 'EPERM'],
    ['darwin', 'EBUSY'],
    ['win32', 'EACCES'],
    ['win32', 'EIO'],
  ]) {
    await t.test(`${platform} ${code}`, async (s) => {
      const f = await fixture(s);
      let attempts = 0;
      await withRenameFault(
        platform,
        async (source, target, rename) => {
          if (target === f.file) {
            attempts++;
            throw fault(code);
          }
          return rename(source, target);
        },
        () => assert.rejects(f.config.set('fileReadLineLimit', 8), (error) => error.code === code),
      );
      assert.equal(attempts, 1);
      assert.deepEqual(await fs.readFile(f.file), f.before);
      await assertClean(f.file);
    });
  }
});

test('cancellation during retry backoff prevents a second replacement attempt', async (t) => {
  const f = await fixture(t);
  const controller = new AbortController();
  let attempts = 0;
  let timer;
  t.after(() => clearTimeout(timer));
  await withRenameFault(
    'win32',
    async (source, target, rename) => {
      if (target === f.file) {
        attempts++;
        timer = setTimeout(() => controller.abort(), 1);
        throw fault('EPERM');
      }
      return rename(source, target);
    },
    () =>
      assert.rejects(
        f.config.set('fileReadLineLimit', 8, controller.signal),
        (error) => error.code === 'CANCELLED',
      ),
  );
  assert.equal(attempts, 1);
  assert.deepEqual(await fs.readFile(f.file), f.before);
  await assertClean(f.file);
});

test('a multiply-linked destination introduced during backoff is rejected before retry', async (t) => {
  const f = await fixture(t);
  const external = path.join(f.home, 'external.json');
  await fs.writeFile(external, f.before);
  let attempts = 0;
  await withRenameFault(
    'win32',
    async (source, target, rename) => {
      if (target === f.file) {
        attempts++;
        await fs.unlink(f.file);
        await fs.link(external, f.file);
        throw fault('EPERM');
      }
      return rename(source, target);
    },
    () => assert.rejects(f.config.set('fileReadLineLimit', 8), (error) => error.code === 'CONFIG_UNSAFE'),
  );
  assert.equal(attempts, 1);
  assert.deepEqual(await fs.readFile(external), f.before);
  assert.deepEqual(await fs.readFile(f.file + '.previous'), f.before);
  await assertClean(f.file);
});

test('a linked parent introduced during backoff cannot redirect retry or staged cleanup', async (t) => {
  const f = await fixture(t);
  const next = Buffer.from(JSON.stringify({ ...JSON.parse(f.before), fileReadLineLimit: 8 }) + '\n');
  const parent = path.dirname(f.file);
  const retained = path.join(f.home, 'retained-settings');
  const external = path.join(f.home, 'external-directory');
  await fs.mkdir(external);
  let attempts = 0;
  let decoy;
  let redirected = false;
  try {
    await withRenameFault(
      'win32',
      async (source, target, rename) => {
        if (target === f.file) {
          attempts++;
          await rename(parent, retained);
          redirected = true;
          await fs.symlink(external, parent, nativePlatform === 'win32' ? 'junction' : 'dir');
          decoy = path.join(external, path.basename(source));
          await fs.writeFile(decoy, 'unrelated staged-name sentinel');
          throw fault('EPERM');
        }
        return rename(source, target);
      },
      // Windows itself denies moving this directory while public set() holds its
      // lock handle. Exercise the same production replacement method directly to
      // reach this parent/cleanup invariant; other cases retain the public API.
      () =>
        assert.rejects(f.config.replace(f.file, next, f.before), (error) => error.code === 'CONFIG_UNSAFE'),
    );
    assert.equal(attempts, 1);
    assert.equal(await fs.readFile(decoy, 'utf8'), 'unrelated staged-name sentinel');
    assert.deepEqual(await fs.readFile(path.join(retained, path.basename(f.file))), f.before);
    assert.ok(
      (await fs.readdir(retained)).some((name) => name.includes('.mterm-')),
      'stage moved with its parent is retained when its original pathname becomes unsafe',
    );
  } finally {
    if (redirected) {
      await fs.unlink(parent).catch(() => {});
      await fs.rename(retained, parent);
    }
  }
});

test('a substituted staging file is never committed or deleted as an owned stage', async (t) => {
  const f = await fixture(t);
  const retained = path.join(f.home, 'retained-stage');
  let attempts = 0;
  let substituted;
  await withRenameFault(
    'win32',
    async (source, target, rename) => {
      if (target === f.file) {
        attempts++;
        await rename(source, retained);
        substituted = source;
        await fs.writeFile(source, 'unrelated replacement stage');
        throw fault('EPERM');
      }
      return rename(source, target);
    },
    () => assert.rejects(f.config.set('fileReadLineLimit', 8), (error) => error.code === 'CONFIG_UNSAFE'),
  );
  assert.equal(attempts, 1);
  assert.deepEqual(await fs.readFile(f.file), f.before);
  assert.equal(await fs.readFile(substituted, 'utf8'), 'unrelated replacement stage');
  assert.equal(JSON.parse(await fs.readFile(retained, 'utf8')).fileReadLineLimit, 8);
});
