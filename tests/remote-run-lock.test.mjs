// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-run-lock-recovery (OpenAI / GPT-6 Astra Pro; self-reported)
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
const fault = (code) => Object.assign(new Error('Synthetic owned run-lock failure'), { code });
const partial = Buffer.from('{"instan');
const absent = async (file) => assert.rejects(fs.lstat(file), (error) => error.code === 'ENOENT');
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
async function observed(promise) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Run-lock observation did not settle')), 10000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function fixture(t) {
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-run-lock-')));
  const store = await RemoteStateStore.open(path.join(parent, 'state'));
  const handles = new Set();
  t.after(async () => {
    t.mock.restoreAll();
    try {
      for (const handle of handles) if (handle.fd !== -1) await handle.close();
    } finally {
      await fs.rm(parent, { recursive: true, force: true, maxRetries: 3 });
    }
  });
  return {
    parent,
    store,
    directory: store.directory,
    lock: path.join(store.directory, 'run.lock'),
    handles,
  };
}

// All operations use real owned files. Only the explicitly selected boundary fails or waits.
function instrument(t, f, hooks) {
  const open = fs.open.bind(fs);
  let created = 0;
  t.mock.method(fs, 'open', async (...args) => {
    const handle = await open(...args);
    if (args[0] !== f.lock || args[1] !== 'wx') return handle;
    f.handles.add(handle);
    const attempt = ++created;
    for (const [name, hook] of Object.entries(hooks)) {
      const original = handle[name].bind(handle);
      t.mock.method(handle, name, (...values) => hook(original, { handle, attempt }, ...values));
    }
    return handle;
  });
}
const failWrite =
  (error, bytes = partial) =>
  async (write, { attempt }, ...args) => {
    if (attempt !== 1) return write(...args);
    if (bytes.length) await write(bytes);
    throw error;
  };

test('remote run lock preserves successful ownership, duplicate refusal and explicit owner release', async (t) => {
  const f = await fixture(t);
  const owner = randomUUID(),
    other = randomUUID();
  await f.store.acquire(owner);
  const bytes = await fs.readFile(f.lock);
  assert.deepEqual(JSON.parse(bytes.toString()), { instanceId: owner, pid: process.pid });
  await assert.rejects(f.store.acquire(other), (error) => error.code === 'REMOTE_RUNNING');
  await f.store.release(other);
  assert.deepEqual(await fs.readFile(f.lock), bytes);
  await f.store.release(owner);
  await absent(f.lock);
  await f.store.acquire(other);
  assert.equal(JSON.parse(await fs.readFile(f.lock, 'utf8')).instanceId, other);
  await f.store.release(other);
  await absent(f.lock);
});

test('remote run lock never removes a preexisting malformed lock', async (t) => {
  const f = await fixture(t);
  await fs.writeFile(f.lock, partial, { flag: 'wx', mode: 0o600 });
  const before = await fs.lstat(f.lock);
  await assert.rejects(f.store.acquire(randomUUID()), (error) => error.code === 'REMOTE_RUNNING');
  const after = await fs.lstat(f.lock);
  assert.deepEqual(await fs.readFile(f.lock), partial);
  assert.equal(after.dev, before.dev);
  assert.equal(after.ino, before.ino);
});

for (const [name, bytes, code] of [
  ['empty', Buffer.alloc(0), 'ENOSPC'],
  ['partial', partial, 'EIO'],
]) {
  test(
    'remote run lock recovers an owned ' + name + ' initialization failure for an explicit retry',
    async (t) => {
      const f = await fixture(t);
      const primary = fault(code);
      instrument(t, f, { writeFile: failWrite(primary, bytes) });
      await assert.rejects(f.store.acquire(randomUUID()), (error) => error === primary);
      await absent(f.lock);
      const next = randomUUID();
      await f.store.acquire(next);
      assert.equal(JSON.parse(await fs.readFile(f.lock, 'utf8')).instanceId, next);
      await f.store.release(next);
      await absent(f.lock);
    },
  );
}

test('remote run lock keeps admission occupied until failed initialization closes its real handle', async (t) => {
  const f = await fixture(t);
  const primary = fault('ENOSPC');
  const closing = deferred(),
    release = deferred();
  let confirmed = false;
  instrument(t, f, {
    writeFile: failWrite(primary),
    close: async (close, { attempt }) => {
      if (attempt !== 1) return close();
      closing.resolve();
      await release.promise;
      await close();
      confirmed = true;
    },
  });
  const unlink = fs.unlink.bind(fs);
  t.mock.method(fs, 'unlink', async (...args) => {
    if (args[0] === f.lock) assert.equal(confirmed, true, 'Removal must follow confirmed closure');
    return unlink(...args);
  });
  let settled = false;
  const operation = assert
    .rejects(f.store.acquire(randomUUID()), (error) => error === primary)
    .finally(() => {
      settled = true;
    });
  try {
    await observed(closing.promise);
    assert.equal(settled, false);
    assert.deepEqual(await fs.readFile(f.lock), partial);
    await assert.rejects(f.store.acquire(randomUUID()), (error) => error.code === 'REMOTE_RUNNING');
  } finally {
    release.resolve();
    await operation;
  }
  assert.equal(confirmed, true);
  await absent(f.lock);
  const next = randomUUID();
  await f.store.acquire(next);
  await f.store.release(next);
  await absent(f.lock);
});

test('remote run lock closes but retains ownership when descriptor identity inspection fails', async (t) => {
  const f = await fixture(t);
  const primary = fault('EIO');
  let closeConfirmed = false;
  instrument(t, f, {
    stat: async () => {
      throw primary;
    },
    close: async (close) => {
      await close();
      closeConfirmed = true;
    },
  });
  await assert.rejects(f.store.acquire(randomUUID()), (error) => error === primary);
  assert.equal(closeConfirmed, true);
  assert.equal((await fs.readFile(f.lock)).length, 0);
  await assert.rejects(f.store.acquire(randomUUID()), (error) => error.code === 'REMOTE_RUNNING');
});

test('remote run lock preserves an initialization error when close confirmation also fails', async (t) => {
  const f = await fixture(t);
  const primary = fault('ENOSPC'),
    cleanup = fault('EIO');
  instrument(t, f, {
    writeFile: failWrite(primary),
    close: async (close) => {
      await close(); // Real descriptor is closed; rejection deliberately withholds confirmation.
      throw cleanup;
    },
  });
  await assert.rejects(f.store.acquire(randomUUID()), (error) => error === primary);
  assert.deepEqual(await fs.readFile(f.lock), partial);
  await assert.rejects(f.store.acquire(randomUUID()), (error) => error.code === 'REMOTE_RUNNING');
});

test('remote run lock retains a completed payload when only close confirmation fails', async (t) => {
  const f = await fixture(t);
  const cleanup = fault('EIO'),
    owner = randomUUID();
  instrument(t, f, {
    close: async (close) => {
      await close(); // Simulate an unconfirmed close without leaking an actual descriptor.
      throw cleanup;
    },
  });
  await assert.rejects(f.store.acquire(owner), (error) => error === cleanup);
  assert.equal(JSON.parse(await fs.readFile(f.lock, 'utf8')).instanceId, owner);
  await assert.rejects(f.store.acquire(randomUUID()), (error) => error.code === 'REMOTE_RUNNING');
});

test('remote run lock cleanup preserves a replacement and the renamed original', async (t) => {
  const f = await fixture(t);
  const primary = fault('ENOSPC');
  const old = path.join(f.directory, 'old-run.lock'),
    sentinel = Buffer.from('unrelated replacement');
  instrument(t, f, {
    writeFile: failWrite(primary),
    close: async (close) => {
      await close();
      await fs.rename(f.lock, old);
      await fs.writeFile(f.lock, sentinel, { flag: 'wx', mode: 0o600 });
    },
  });
  await assert.rejects(f.store.acquire(randomUUID()), (error) => error === primary);
  assert.deepEqual(await fs.readFile(old), partial);
  assert.deepEqual(await fs.readFile(f.lock), sentinel);
  assert.notEqual(
    (await fs.lstat(old, { bigint: true })).ino,
    (await fs.lstat(f.lock, { bigint: true })).ino,
  );
});

test('remote run lock cleanup retains an inode with an additional hard link', async (t) => {
  const f = await fixture(t);
  const primary = fault('ENOSPC'),
    other = path.join(f.directory, 'other.lock');
  instrument(t, f, {
    writeFile: failWrite(primary),
    close: async (close) => {
      await close();
      await fs.link(f.lock, other);
    },
  });
  await assert.rejects(f.store.acquire(randomUUID()), (error) => error === primary);
  assert.deepEqual(await fs.readFile(f.lock), partial);
  assert.deepEqual(await fs.readFile(other), partial);
  assert.equal((await fs.lstat(f.lock)).nlink, 2);
});

test('remote run lock cleanup preserves a symlink or junction replacement and its target', async (t) => {
  const f = await fixture(t);
  const primary = fault('ENOSPC'),
    old = path.join(f.directory, 'old-run.lock');
  const target = path.join(f.parent, 'unrelated-target');
  await fs.mkdir(target);
  await fs.writeFile(path.join(target, 'sentinel'), 'untouched');
  instrument(t, f, {
    writeFile: failWrite(primary),
    close: async (close) => {
      await close();
      await fs.rename(f.lock, old);
      await fs.symlink(target, f.lock, process.platform === 'win32' ? 'junction' : 'dir');
    },
  });
  await assert.rejects(f.store.acquire(randomUUID()), (error) => error === primary);
  assert.equal((await fs.lstat(f.lock)).isSymbolicLink(), true);
  assert.deepEqual(await fs.readFile(old), partial);
  assert.equal(await fs.readFile(path.join(target, 'sentinel'), 'utf8'), 'untouched');
});

test('remote run lock retains the file when cleanup identity cannot be inspected', async (t) => {
  const f = await fixture(t);
  const primary = fault('ENOSPC'),
    lookup = fault('EACCES');
  let closed = false,
    inspected = false;
  instrument(t, f, {
    writeFile: failWrite(primary),
    close: async (close) => {
      await close();
      closed = true;
    },
  });
  const lstat = fs.lstat.bind(fs);
  t.mock.method(fs, 'lstat', async (...args) => {
    if (args[0] === f.lock && closed) {
      inspected = true;
      throw lookup;
    }
    return lstat(...args);
  });
  await assert.rejects(f.store.acquire(randomUUID()), (error) => error === primary);
  assert.equal(inspected, true);
  assert.deepEqual(await fs.readFile(f.lock), partial);
});

test('remote run lock preserves the initialization error when its one cleanup unlink fails', async (t) => {
  const f = await fixture(t);
  const primary = fault('ENOSPC'),
    cleanup = fault('EBUSY');
  let attempts = 0;
  instrument(t, f, { writeFile: failWrite(primary) });
  const unlink = fs.unlink.bind(fs);
  t.mock.method(fs, 'unlink', async (...args) => {
    if (args[0] === f.lock) {
      attempts++;
      throw cleanup;
    }
    return unlink(...args);
  });
  await assert.rejects(f.store.acquire(randomUUID()), (error) => error === primary);
  assert.equal(attempts, 1);
  assert.deepEqual(await fs.readFile(f.lock), partial);
});

test('remote run lock cleanup refuses a redirected parent and preserves both lock locations', async (t) => {
  const f = await fixture(t);
  const primary = fault('ENOSPC');
  const old = path.join(f.parent, 'old-state'),
    target = path.join(f.parent, 'redirected-state');
  await fs.mkdir(target, { mode: 0o700 });
  await fs.writeFile(path.join(target, 'run.lock'), 'unrelated lock', { mode: 0o600, flag: 'wx' });
  instrument(t, f, {
    writeFile: failWrite(primary),
    close: async (close) => {
      await close();
      await fs.rename(f.directory, old);
      await fs.symlink(target, f.directory, process.platform === 'win32' ? 'junction' : 'dir');
    },
  });
  await assert.rejects(f.store.acquire(randomUUID()), (error) => error === primary);
  assert.deepEqual(await fs.readFile(path.join(old, 'run.lock')), partial);
  assert.equal(await fs.readFile(path.join(target, 'run.lock'), 'utf8'), 'unrelated lock');
  assert.equal((await fs.lstat(f.directory)).isSymbolicLink(), true);
});

test('remote run lock cleanup retains its inode after that inode moves under a replacement parent', async (t) => {
  const f = await fixture(t);
  const primary = fault('ENOSPC'),
    old = path.join(f.parent, 'old-state');
  let inode;
  instrument(t, f, {
    writeFile: failWrite(primary),
    close: async (close) => {
      await close();
      inode = (await fs.lstat(f.lock, { bigint: true })).ino;
      await fs.rename(f.directory, old);
      await fs.mkdir(f.directory, { mode: 0o700 });
      await fs.rename(path.join(old, 'run.lock'), f.lock);
    },
  });
  await assert.rejects(f.store.acquire(randomUUID()), (error) => error === primary);
  assert.deepEqual(await fs.readFile(f.lock), partial);
  assert.equal((await fs.lstat(f.lock, { bigint: true })).ino, inode);
  assert.notEqual(
    (await fs.lstat(f.directory, { bigint: true })).ino,
    (await fs.lstat(old, { bigint: true })).ino,
  );
});

test('remote run lock propagates an initial open error without acquiring cleanup authority', async (t) => {
  const f = await fixture(t);
  const primary = fault('EACCES'),
    open = fs.open.bind(fs);
  t.mock.method(fs, 'open', async (...args) => {
    if (args[0] === f.lock && args[1] === 'wx') throw primary;
    return open(...args);
  });
  await assert.rejects(f.store.acquire(randomUUID()), (error) => error === primary);
  assert.deepEqual(await fs.readdir(f.directory), []);
});
