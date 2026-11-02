// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-windows-dpapi-bounds (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { EventEmitter } from 'node:events';
import { RemoteStateStore } from '../dist/remote/state.js';

const DEVICE = '71cc3a46-b23d-44fa-b4a9-267d4d783457';
const TOKEN = 'synthetic-dpapi-token-not-a-real-credential';
const CANARY = 'synthetic-private-child-diagnostic';
const STORAGE_MESSAGE = 'Windows current-user credential protection failed.';
const PROTECTED = Buffer.from('synthetic-protected-value').toString('base64');

class Clock {
  now = 0;
  timers = new Map();
  nextId = 0;
  set = (callback, delay) => {
    const timer = {
      id: ++this.nextId,
      unref() {
        return this;
      },
    };
    this.timers.set(timer, { at: this.now + delay, callback });
    return timer;
  };
  clear = (timer) => this.timers.delete(timer);
  advance(milliseconds) {
    const target = this.now + milliseconds;
    for (;;) {
      const due = [...this.timers.entries()]
        .filter(([, timer]) => timer.at <= target)
        .sort((a, b) => a[1].at - b[1].at || a[0].id - b[0].id)[0];
      if (!due) break;
      this.now = due[1].at;
      this.timers.delete(due[0]);
      due[1].callback();
    }
    this.now = target;
  }
}

class SyntheticChild extends EventEmitter {
  pid = 999900;
  exitCode = null;
  signalCode = null;
  kills = 0;
  unrefs = 0;
  closed = false;
  stdin = new EventEmitter();
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  constructor(options = {}) {
    super();
    this.options = options;
    if (options.noPid) this.pid = undefined;
    for (const stream of [this.stdin, this.stdout, this.stderr]) {
      stream.destroyed = false;
      stream.destroy = () => {
        stream.destroyed = true;
      };
    }
    this.stderr.resume = () => {
      this.stderr.drained = true;
    };
    this.stdin.end = (input) => {
      this.input = input;
      if (options.stdinThrow) throw new Error(CANARY);
    };
  }
  kill() {
    this.kills++;
    if (this.options.killThrow) throw new Error(CANARY);
    return this.options.killFalse ? false : true;
  }
  unref() {
    this.unrefs++;
  }
  output(value) {
    this.stdout.emit('data', Buffer.isBuffer(value) ? value : Buffer.from(value));
  }
  exit(code = 0) {
    this.exitCode = code;
    this.emit('exit', code, null);
  }
  close(code = 0) {
    if (this.closed) return;
    this.closed = true;
    this.exitCode = code;
    this.emit('close', code, null);
  }
}

async function fixture(t, paired = false) {
  const home = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-dpapi-bounds-')));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const root = path.join(home, 'workspace');
  await fs.mkdir(root);
  const store = await RemoteStateStore.open(path.join(home, 'state'));
  await store.configure({ schemaVersion: 1, gateway: 'https://gateway.test', root, name: 'Synthetic' });
  const config = { ...(await store.config()), ...(paired ? { deviceId: DEVICE } : {}) };
  if (paired) {
    await fs.writeFile(path.join(store.directory, 'config.json'), JSON.stringify(config) + '\n', {
      mode: 0o600,
    });
    await fs.writeFile(
      path.join(store.directory, 'credential.json'),
      JSON.stringify({
        schemaVersion: 1,
        protection: 'windows-dpapi-current-user',
        value: PROTECTED,
      }) + '\n',
      { mode: 0o600 },
    );
  }
  return {
    store,
    config,
    beforeConfig: await fs.readFile(path.join(store.directory, 'config.json')),
    beforeCredential: paired ? await fs.readFile(path.join(store.directory, 'credential.json')) : undefined,
  };
}

// This sequential test process alone substitutes the owned child and clock.
// No production environment switch, credential callback or exported test hook exists.
async function withHelper(f, action) {
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
  const originalSpawn = childProcess.spawn;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const clock = new Clock();
  const children = [],
    operations = [],
    calls = [];
  let options = {},
    signalAttempt;
  childProcess.spawn = (...args) => {
    calls.push(args);
    if (options.spawnThrow) {
      signalAttempt(undefined);
      throw new Error(CANARY);
    }
    const child = new SyntheticChild(options);
    children.push(child);
    signalAttempt(child);
    return child;
  };
  syncBuiltinESMExports();
  Object.defineProperty(process, 'platform', { ...descriptor, value: 'win32' });
  globalThis.setTimeout = clock.set;
  globalThis.clearTimeout = clock.clear;
  const h = {
    clock,
    children,
    calls,
    async begin(mode = 'protect', nextOptions = {}) {
      options = nextOptions;
      const attempted = new Promise((resolve) => {
        signalAttempt = resolve;
      });
      const operation = { status: 'pending' };
      operation.result = (
        mode === 'protect' ? f.store.savePairing(DEVICE, TOKEN) : f.store.credential()
      ).then(
        (value) => {
          operation.status = 'fulfilled';
          return { ok: true, value };
        },
        (error) => {
          operation.status = 'rejected';
          return { ok: false, error };
        },
      );
      operations.push(operation);
      return { operation, child: await attempted };
    },
  };
  try {
    return await action(h);
  } finally {
    for (const child of children) child.close(0);
    await Promise.all(operations.map((operation) => operation.result));
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    childProcess.spawn = originalSpawn;
    syncBuiltinESMExports();
    Object.defineProperty(process, 'platform', descriptor);
  }
}

async function preserved(f, locked = false) {
  assert.deepEqual(await fs.readFile(path.join(f.store.directory, 'config.json')), f.beforeConfig);
  if (f.beforeCredential) {
    assert.deepEqual(await fs.readFile(path.join(f.store.directory, 'credential.json')), f.beforeCredential);
  } else {
    await assert.rejects(fs.lstat(path.join(f.store.directory, 'credential.json')), { code: 'ENOENT' });
  }
  const names = await fs.readdir(f.store.directory);
  assert.equal(names.includes('state.lock'), locked);
  assert.ok(!names.some((name) => name.endsWith('.tmp')));
}

function safeFailure(result, code = 'REMOTE_SECRET_STORAGE') {
  assert.equal(result.ok, false);
  assert.equal(result.error.code, code);
  if (code === 'REMOTE_SECRET_STORAGE') assert.equal(result.error.message, STORAGE_MESSAGE);
  assert.ok(!String(result.error).includes(CANARY));
  assert.ok(!String(result.error).includes(TOKEN));
}

test('DPAPI protection can finish after ten seconds within the bounded thirty-second budget', async (t) => {
  const f = await fixture(t);
  await withHelper(f, async (h) => {
    const { child, operation } = await h.begin();
    h.clock.advance(15000);
    assert.equal(child.kills, 0, 'a valid operation still inside its budget is not killed');
    assert.equal(operation.status, 'pending');
    const [binary, args, options] = h.calls[0];
    assert.equal(path.basename(binary), 'powershell.exe');
    assert.deepEqual(args.slice(0, 4), ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command']);
    assert.match(args[4], /DataProtectionScope\]::CurrentUser/);
    assert.match(args[4], /MTerm-CLI remote credential v1/);
    assert.match(args[4], /::Protect\(/);
    assert.ok(!JSON.stringify(h.calls).includes(TOKEN));
    assert.ok(!args[4].includes(child.input));
    assert.deepEqual(options.stdio, ['pipe', 'pipe', 'pipe']);
    assert.equal(options.windowsHide, true);
    assert.equal(JSON.parse(Buffer.from(child.input, 'base64').toString()).token, TOKEN);
    assert.equal(child.stderr.drained, true);
    child.output('  ' + PROTECTED + '\n');
    child.exit(0);
    child.close(0);
    assert.equal((await operation.result).ok, true);
    assert.equal((await f.store.config()).deviceId, DEVICE);
    const raw = await fs.readFile(path.join(f.store.directory, 'credential.json'), 'utf8');
    assert.equal(JSON.parse(raw).value, PROTECTED);
    assert.ok(!raw.includes(TOKEN));
    assert.equal(h.clock.timers.size, 0);
    h.clock.advance(60000);
    assert.equal(child.kills, 0);
    child.emit('error', new Error(CANARY));
    assert.equal(operation.status, 'fulfilled');
  });
});

test('DPAPI unprotection can finish immediately before thirty seconds without altering stored bytes', async (t) => {
  const f = await fixture(t, true);
  await withHelper(f, async (h) => {
    const { child, operation } = await h.begin('unprotect');
    h.clock.advance(29999);
    assert.equal(child.kills, 0);
    assert.match(h.calls[0][1][4], /::Unprotect\(/);
    assert.equal(child.input, PROTECTED);
    child.output(Buffer.from(JSON.stringify({ ...f.config, token: TOKEN })).toString('base64'));
    child.exit(0);
    child.close(0);
    assert.deepEqual(await operation.result, { ok: true, value: { deviceId: DEVICE, token: TOKEN } });
    await preserved(f);
    assert.equal(h.clock.timers.size, 0);
  });
});

test('DPAPI success waits for code-zero close even after an observed successful exit', async (t) => {
  const f = await fixture(t);
  await withHelper(f, async (h) => {
    const { child, operation } = await h.begin();
    child.output(PROTECTED);
    child.exit(0);
    await preserved(f, true);
    assert.equal(operation.status, 'pending');
    child.close(0);
    assert.equal((await operation.result).ok, true);
    assert.equal(h.clock.timers.size, 0);
  });
});

test('DPAPI exact deadline kills only its child once and cannot accept a late successful close', async (t) => {
  const f = await fixture(t);
  await withHelper(f, async (h) => {
    const { child, operation } = await h.begin();
    h.clock.advance(29999);
    assert.equal(child.kills, 0);
    h.clock.advance(1);
    assert.equal(child.kills, 1);
    await preserved(f, true);
    child.output(PROTECTED);
    child.exit(0);
    child.close(0);
    safeFailure(await operation.result);
    await preserved(f);
    assert.equal(child.kills, 1);
    assert.equal(h.clock.timers.size, 0);
  });
});

test('DPAPI failure can observe exit before pipe close and release its pairing lock safely', async (t) => {
  const f = await fixture(t);
  await withHelper(f, async (h) => {
    const { child, operation } = await h.begin();
    child.stdin.emit('error', new Error(CANARY));
    assert.equal(child.kills, 1);
    child.exit(1);
    safeFailure(await operation.result);
    assert.equal(child.closed, false);
    await preserved(f);
    assert.ok(child.stdin.destroyed && child.stdout.destroyed && child.stderr.destroyed);
    child.close(1);
    assert.equal(child.kills, 1);
    assert.equal(h.clock.timers.size, 0);
  });
});

test('DPAPI unprotection accepts exactly thirty-two KiB of stdout', async (t) => {
  const f = await fixture(t, true);
  await withHelper(f, async (h) => {
    const { child, operation } = await h.begin('unprotect');
    const json = JSON.stringify({ ...f.config, token: TOKEN }).padEnd(24576, ' ');
    const output = Buffer.from(json).toString('base64');
    assert.equal(Buffer.byteLength(output), 32768);
    child.output(output.slice(0, 16384));
    child.output(output.slice(16384));
    child.exit(0);
    child.close(0);
    assert.equal((await operation.result).value.token, TOKEN);
    assert.equal(child.kills, 0);
    await preserved(f);
  });
});

test('DPAPI stdout overflow terminates once and refuses partial or late output', async (t) => {
  const f = await fixture(t);
  await withHelper(f, async (h) => {
    const { child, operation } = await h.begin();
    child.output(Buffer.alloc(32768, 65));
    assert.equal(child.kills, 0);
    child.output('A');
    child.output(CANARY);
    child.stdin.emit('error', new Error(CANARY));
    assert.equal(child.kills, 1);
    child.close(0);
    safeFailure(await operation.result);
    await preserved(f);
    assert.equal(h.clock.timers.size, 0);
  });
});

test('DPAPI nonzero close exposes no stderr or credential bytes and preserves configuration', async (t) => {
  const f = await fixture(t);
  await withHelper(f, async (h) => {
    const { child, operation } = await h.begin();
    child.stderr.emit('data', Buffer.from(CANARY));
    child.output(PROTECTED);
    child.exit(1);
    child.close(1);
    safeFailure(await operation.result);
    await preserved(f);
    assert.equal(child.kills, 0);
    assert.equal(h.clock.timers.size, 0);
  });
});

test('DPAPI synchronous spawn failure is generic and releases the pairing lock without a child', async (t) => {
  const f = await fixture(t);
  await withHelper(f, async (h) => {
    const { operation } = await h.begin('protect', { spawnThrow: true });
    safeFailure(await operation.result);
    await preserved(f);
    assert.equal(h.children.length, 0);
    assert.equal(h.clock.timers.size, 0);
  });
});

test('DPAPI asynchronous failed spawn with no child PID does not retain a stale lock', async (t) => {
  const f = await fixture(t);
  await withHelper(f, async (h) => {
    const { child, operation } = await h.begin('protect', { noPid: true });
    child.emit('error', Object.assign(new Error(CANARY), { code: 'ENOENT' }));
    child.close(-2);
    safeFailure(await operation.result);
    await preserved(f);
    assert.equal(child.kills, 0);
    assert.equal(h.clock.timers.size, 0);
  });
});

for (const [name, options, trigger] of [
  ['synchronous stdin.end throw', { stdinThrow: true }, () => {}],
  ['asynchronous stdin error', {}, (child) => child.stdin.emit('error', new Error(CANARY))],
  ['spawned child error', {}, (child) => child.emit('error', new Error(CANARY))],
]) {
  test(`DPAPI ${name} waits for owned-child termination and preserves prior bytes`, async (t) => {
    const f = await fixture(t);
    await withHelper(f, async (h) => {
      const { child, operation } = await h.begin('protect', options);
      trigger(child);
      assert.equal(child.kills, 1);
      child.exit(1);
      child.close(1);
      safeFailure(await operation.result);
      await preserved(f);
      assert.equal(h.clock.timers.size, 0);
    });
  });
}

for (const [name, options] of [
  ['kill returns false', { killFalse: true }],
  ['kill throws', { killThrow: true }],
]) {
  test(`DPAPI ${name} has a bounded cleanup grace and retains unconfirmed pairing admission`, async (t) => {
    const f = await fixture(t);
    await withHelper(f, async (h) => {
      const { child, operation } = await h.begin('protect', options);
      h.clock.advance(30000);
      assert.equal(child.kills, 1);
      h.clock.advance(4999);
      await preserved(f, true);
      h.clock.advance(1);
      safeFailure(await operation.result);
      await preserved(f, true);
      assert.equal(child.kills, 1);
      assert.ok(child.stdin.destroyed && child.stdout.destroyed && child.stderr.destroyed);
      assert.equal(child.unrefs, 1);
      assert.equal(h.clock.timers.size, 0);
      await assert.rejects(f.store.configure(f.config), { code: 'REMOTE_STATE_BUSY' });
      child.exit(1);
      child.close(1);
      await preserved(f, true);
      assert.equal(operation.status, 'rejected');
    });
  });
}

test('DPAPI overflow cleanup uncertainty retains the lock even when kill reports success', async (t) => {
  const f = await fixture(t);
  await withHelper(f, async (h) => {
    const { child, operation } = await h.begin();
    child.output(Buffer.alloc(32769, 65));
    h.clock.advance(5000);
    safeFailure(await operation.result);
    await preserved(f, true);
    assert.equal(child.kills, 1);
    assert.equal(child.unrefs, 1);
    assert.equal(h.clock.timers.size, 0);
  });
});

test('DPAPI unprotection errors stay generic and preserve both existing files', async (t) => {
  const f = await fixture(t, true);
  await withHelper(f, async (h) => {
    const { child, operation } = await h.begin('unprotect');
    child.stdin.emit('error', new Error(CANARY));
    child.close(1);
    safeFailure(await operation.result, 'REMOTE_CREDENTIAL');
    assert.equal(child.kills, 1);
    await preserved(f);
    assert.equal(h.clock.timers.size, 0);
  });
});
