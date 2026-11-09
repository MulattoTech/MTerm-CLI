// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-state-lock-init (OpenAI / GPT-6 Astra Pro; self-reported)
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
const fault = (code) => Object.assign(new Error('Synthetic owned state-lock failure'), { code });
const partial = Buffer.from('{"non');
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
        timer = setTimeout(() => reject(new Error('State-lock observation did not settle')), 10000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function fixture(t) {
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-state-lock-')));
  const root = path.join(parent, 'root');
  await fs.mkdir(root);
  const store = await RemoteStateStore.open(path.join(parent, 'state'));
  const handles = new Set();
  t.after(async () => {
    t.mock.restoreAll();
    const unconfirmed = [];
    for (const handle of handles) {
      try {
        if (handle.fd !== -1) await observed(handle.close());
      } catch (error) {
        unconfirmed.push(error);
      }
    }
    if (unconfirmed.length)
      throw new AggregateError(unconfirmed, 'Owned state-lock fixture retained after unconfirmed closure');
    await fs.rm(parent, { recursive: true, force: true, maxRetries: 3 });
  });
  return {
    parent,
    root,
    store,
    directory: store.directory,
    lock: path.join(store.directory, 'state.lock'),
    config: path.join(store.directory, 'config.json'),
    handles,
    input: { schemaVersion: 1, gateway: 'https://gateway.test', root, name: 'owned fixture' },
  };
}
// Real owned files/handles; only the named asynchronous boundary is replaced.
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

test('remote state lock preserves successful configuration and explicit subsequent mutation', async (t) => {
  const f = await fixture(t);
  await f.store.configure(f.input);
  await absent(f.lock);
  assert.equal((await f.store.config()).name, f.input.name);
  await f.store.configure({ ...f.input, name: 'second explicit operation' });
  assert.equal((await f.store.config()).name, 'second explicit operation');
  await absent(f.lock);
});

test('remote state lock preserves initialized operation failure and releases normal admission', async (t) => {
  const f = await fixture(t);
  await f.store.configure(f.input);
  const before = await fs.readFile(f.config);
  await assert.rejects(
    f.store.configure({ ...f.input, name: '\x01' }),
    (error) => error.code === 'REMOTE_CONFIG',
  );
  await absent(f.lock);
  assert.deepEqual(await fs.readFile(f.config), before);
});

test('remote state lock never removes a preexisting malformed lock', async (t) => {
  const f = await fixture(t);
  await fs.writeFile(f.lock, partial, { flag: 'wx', mode: 0o600 });
  const before = await fs.lstat(f.lock);
  await assert.rejects(f.store.configure(f.input), (error) => error.code === 'REMOTE_STATE_BUSY');
  const after = await fs.lstat(f.lock);
  assert.deepEqual(await fs.readFile(f.lock), partial);
  assert.equal(after.dev, before.dev);
  assert.equal(after.ino, before.ino);
  await absent(f.config);
});

test('remote state lock preserves an exclusive-open failure without claiming cleanup ownership', async (t) => {
  const f = await fixture(t);
  const primary = fault('EACCES');
  const open = fs.open.bind(fs);
  t.mock.method(fs, 'open', (...args) => {
    if (args[0] === f.lock && args[1] === 'wx') throw primary;
    return open(...args);
  });
  await assert.rejects(f.store.configure(f.input), (error) => error === primary);
  await absent(f.lock);
  await absent(f.config);
});

for (const [name, bytes, code] of [
  ['empty', Buffer.alloc(0), 'ENOSPC'],
  ['partial', partial, 'EIO'],
]) {
  test('remote state lock recovers owned ' + name + ' initialization for an explicit retry', async (t) => {
    const f = await fixture(t);
    const primary = fault(code);
    instrument(t, f, { writeFile: failWrite(primary, bytes) });
    await assert.rejects(f.store.configure(f.input), (error) => error === primary);
    await absent(f.lock);
    await absent(f.config);
    await f.store.configure(f.input);
    assert.equal((await f.store.config()).name, f.input.name);
    await absent(f.lock);
  });
}

test('remote state lock preserves a falsy initialization rejection', async (t) => {
  const f = await fixture(t);
  instrument(t, f, { writeFile: failWrite(undefined) });
  const result = await f.store.configure(f.input).then(
    () => ({ rejected: false }),
    (error) => ({ rejected: true, error }),
  );
  assert.deepEqual(result, { rejected: true, error: undefined });
  await absent(f.lock);
  await absent(f.config);
});

test('remote state lock treats a complete nonce write followed by rejection as failed initialization', async (t) => {
  const f = await fixture(t);
  const primary = fault('EIO');
  let payload;
  instrument(t, f, {
    writeFile: async (write, { attempt }, ...args) => {
      if (attempt !== 1) return write(...args);
      await write(...args);
      payload = JSON.parse(await fs.readFile(f.lock, 'utf8'));
      throw primary;
    },
  });
  await assert.rejects(f.store.configure(f.input), (error) => error === primary);
  assert.equal(typeof payload.nonce, 'string');
  await absent(f.config);
  await absent(f.lock);
  await f.store.configure(f.input);
  await absent(f.lock);
});

test('remote state lock keeps admission until failed initialization confirms handle closure', async (t) => {
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
    if (args[0] === f.lock) assert.equal(confirmed, true, 'Removal requires confirmed handle closure');
    return unlink(...args);
  });
  let settled = false;
  const operation = assert
    .rejects(f.store.configure(f.input), (error) => error === primary)
    .finally(() => {
      settled = true;
    });
  try {
    await observed(closing.promise);
    assert.equal(settled, false);
    await absent(f.config);
    await assert.rejects(f.store.configure(f.input), (error) => error.code === 'REMOTE_STATE_BUSY');
  } finally {
    release.resolve();
    await operation;
  }
  assert.equal(confirmed, true);
  await absent(f.lock);
  await f.store.configure(f.input);
  await absent(f.lock);
});

test('remote state lock retains unknown descriptor identity while closing its acquired handle', async (t) => {
  const f = await fixture(t);
  const primary = fault('EIO');
  let closes = 0;
  instrument(t, f, {
    stat: async () => {
      throw primary;
    },
    close: async (close) => {
      await close();
      closes++;
    },
  });
  await assert.rejects(f.store.configure(f.input), (error) => error === primary);
  assert.equal(closes, 1);
  assert.equal((await fs.readFile(f.lock)).length, 0);
  await absent(f.config);
  await assert.rejects(f.store.configure(f.input), (error) => error.code === 'REMOTE_STATE_BUSY');
});

test('remote state lock preserves initialization failure if close confirmation also fails', async (t) => {
  const f = await fixture(t);
  const primary = fault('ENOSPC'),
    cleanup = fault('EIO');
  let closes = 0;
  instrument(t, f, {
    writeFile: failWrite(primary),
    close: async (close) => {
      await close();
      closes++;
      throw cleanup;
    },
  });
  await assert.rejects(f.store.configure(f.input), (error) => error === primary);
  assert.equal(closes, 1);
  assert.deepEqual(await fs.readFile(f.lock), partial);
  await absent(f.config);
  await assert.rejects(f.store.configure(f.input), (error) => error.code === 'REMOTE_STATE_BUSY');
});

test('remote state lock keeps committed operation bytes when only close confirmation fails', async (t) => {
  const f = await fixture(t);
  const cleanup = fault('EIO');
  instrument(t, f, {
    close: async (close) => {
      await close();
      throw cleanup;
    },
  });
  await assert.rejects(f.store.configure(f.input), (error) => error === cleanup);
  assert.equal(JSON.parse(await fs.readFile(f.config, 'utf8')).name, f.input.name);
  assert.equal(typeof JSON.parse(await fs.readFile(f.lock, 'utf8')).nonce, 'string');
  await assert.rejects(f.store.configure(f.input), (error) => error.code === 'REMOTE_STATE_BUSY');
});

test('remote state lock recovery preserves a replaced leaf and its renamed original', async (t) => {
  const f = await fixture(t);
  const primary = fault('ENOSPC'),
    sentinel = Buffer.from('unrelated replacement');
  const old = path.join(f.directory, 'old-state.lock');
  instrument(t, f, {
    writeFile: failWrite(primary),
    close: async (close) => {
      await close();
      await fs.rename(f.lock, old);
      await fs.writeFile(f.lock, sentinel, { flag: 'wx', mode: 0o600 });
    },
  });
  await assert.rejects(f.store.configure(f.input), (error) => error === primary);
  assert.deepEqual(await fs.readFile(old), partial);
  assert.deepEqual(await fs.readFile(f.lock), sentinel);
  assert.notEqual((await fs.lstat(old)).ino, (await fs.lstat(f.lock)).ino);
});

test('remote state lock recovery retains an inode with an additional hard link', async (t) => {
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
  await assert.rejects(f.store.configure(f.input), (error) => error === primary);
  assert.deepEqual(await fs.readFile(f.lock), partial);
  assert.deepEqual(await fs.readFile(other), partial);
  assert.equal((await fs.lstat(f.lock)).nlink, 2);
});

test('remote state lock recovery requires original parent identity even for the original leaf', async (t) => {
  const f = await fixture(t);
  const primary = fault('ENOSPC'),
    moved = path.join(f.parent, 'moved-state');
  let originalInode;
  instrument(t, f, {
    writeFile: failWrite(primary),
    close: async (close) => {
      await close();
      originalInode = (await fs.lstat(f.lock)).ino;
      await fs.rename(f.directory, moved);
      await fs.mkdir(f.directory, { mode: 0o700 });
      await fs.rename(path.join(moved, 'state.lock'), f.lock);
    },
  });
  await assert.rejects(f.store.configure(f.input), (error) => error === primary);
  assert.deepEqual(await fs.readFile(f.lock), partial);
  assert.equal((await fs.lstat(f.lock)).ino, originalInode);
  assert.notEqual((await fs.lstat(f.directory)).ino, (await fs.lstat(moved)).ino);
  await absent(f.config);
});

test('remote state lock recovery preserves a redirected parent and its unrelated target', async (t) => {
  const f = await fixture(t);
  const primary = fault('ENOSPC'),
    moved = path.join(f.parent, 'moved-state');
  const target = path.join(f.parent, 'unrelated-state'),
    sentinel = Buffer.from('unrelated state bytes');
  await fs.mkdir(target, { mode: 0o700 });
  await fs.writeFile(path.join(target, 'state.lock'), sentinel, { mode: 0o600 });
  instrument(t, f, {
    writeFile: failWrite(primary),
    close: async (close) => {
      await close();
      await fs.rename(f.directory, moved);
      await fs.symlink(target, f.directory, process.platform === 'win32' ? 'junction' : 'dir');
    },
  });
  await assert.rejects(f.store.configure(f.input), (error) => error === primary);
  assert.equal((await fs.lstat(f.directory)).isSymbolicLink(), true);
  assert.deepEqual(await fs.readFile(path.join(moved, 'state.lock')), partial);
  assert.deepEqual(await fs.readFile(path.join(target, 'state.lock')), sentinel);
});

test('remote state lock recovery preserves a replaced link leaf and its unrelated target', async (t) => {
  const f = await fixture(t);
  const primary = fault('ENOSPC'),
    old = path.join(f.directory, 'old-state.lock');
  const target = path.join(f.parent, 'unrelated-directory'),
    sentinel = Buffer.from('unrelated target bytes');
  await fs.mkdir(target, { mode: 0o700 });
  await fs.writeFile(path.join(target, 'sentinel'), sentinel, { mode: 0o600 });
  instrument(t, f, {
    writeFile: failWrite(primary),
    close: async (close) => {
      await close();
      await fs.rename(f.lock, old);
      await fs.symlink(target, f.lock, process.platform === 'win32' ? 'junction' : 'dir');
    },
  });
  await assert.rejects(f.store.configure(f.input), (error) => error === primary);
  assert.equal((await fs.lstat(f.lock)).isSymbolicLink(), true);
  assert.deepEqual(await fs.readFile(old), partial);
  assert.deepEqual(await fs.readFile(path.join(target, 'sentinel')), sentinel);
});

test('remote state lock refuses an aliased parent before acquiring a new lock', async (t) => {
  const f = await fixture(t);
  const moved = path.join(f.parent, 'moved-state');
  await fs.rename(f.directory, moved);
  await fs.symlink(moved, f.directory, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(f.store.configure(f.input), (error) => error.code === 'REMOTE_STATE');
  await absent(path.join(moved, 'state.lock'));
  await absent(path.join(moved, 'config.json'));
});

for (const target of ['parent', 'leaf']) {
  test('remote state lock recovery retains changed ' + target + ' ownership metadata', async (t) => {
    const f = await fixture(t);
    const primary = fault('ENOSPC');
    let closed = false;
    instrument(t, f, {
      writeFile: failWrite(primary),
      close: async (close) => {
        await close();
        closed = true;
      },
    });
    const lstat = fs.lstat.bind(fs);
    t.mock.method(fs, 'lstat', async (...args) => {
      const stat = await lstat(...args);
      if (closed && args[0] === (target === 'parent' ? f.directory : f.lock))
        return Object.assign(Object.create(stat), { mode: stat.mode ^ 0o200 });
      return stat;
    });
    await assert.rejects(f.store.configure(f.input), (error) => error === primary);
    assert.deepEqual(await fs.readFile(f.lock), partial);
    await absent(f.config);
  });
}

test('remote state lock preserves primary failure if cleanup inspection fails', async (t) => {
  const f = await fixture(t);
  const primary = fault('ENOSPC');
  let closed = false;
  instrument(t, f, {
    writeFile: failWrite(primary),
    close: async (close) => {
      await close();
      closed = true;
    },
  });
  const lstat = fs.lstat.bind(fs);
  t.mock.method(fs, 'lstat', (...args) => {
    if (closed && args[0] === f.lock) throw fault('EACCES');
    return lstat(...args);
  });
  await assert.rejects(f.store.configure(f.input), (error) => error === primary);
  assert.deepEqual(await fs.readFile(f.lock), partial);
  await absent(f.config);
});

test('remote state lock attempts one unlink and preserves primary failure when cleanup fails', async (t) => {
  const f = await fixture(t);
  const primary = fault('ENOSPC');
  instrument(t, f, { writeFile: failWrite(primary) });
  const unlink = fs.unlink.bind(fs);
  let attempts = 0;
  t.mock.method(fs, 'unlink', (...args) => {
    if (args[0] === f.lock) {
      attempts++;
      throw fault('EACCES');
    }
    return unlink(...args);
  });
  await assert.rejects(f.store.configure(f.input), (error) => error === primary);
  assert.equal(attempts, 1);
  assert.deepEqual(await fs.readFile(f.lock), partial);
  await absent(f.config);
  await assert.rejects(f.store.configure(f.input), (error) => error.code === 'REMOTE_STATE_BUSY');
});

for (const operation of ['savePairing', 'clearPairing']) {
  test('remote state lock failed initialization never enters ' + operation, async (t) => {
    const f = await fixture(t);
    await f.store.configure(f.input);
    const before = await fs.readFile(f.config);
    const credential = path.join(f.directory, 'credential.json');
    const marker = Buffer.from('{"synthetic":"preserve exact existing bytes"}\n');
    await fs.writeFile(credential, marker, { flag: 'wx', mode: 0o600 });
    const primary = fault('ENOSPC');
    instrument(t, f, { writeFile: failWrite(primary) });
    let entered = 0;
    const config = f.store.config.bind(f.store);
    t.mock.method(f.store, 'config', (...args) => {
      entered++;
      return config(...args);
    });
    const pending =
      operation === 'savePairing'
        ? f.store.savePairing(randomUUID(), 'synthetic-test-token')
        : f.store.clearPairing();
    await assert.rejects(pending, (error) => error === primary);
    assert.equal(entered, 0);
    assert.deepEqual(await fs.readFile(f.config), before);
    assert.deepEqual(await fs.readFile(credential), marker);
    await absent(f.lock);
  });
}
