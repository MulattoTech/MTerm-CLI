// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-file-cancellation (OpenAI / GPT-6 Astra Pro; self-reported)
// Real temporary files/handles with injected cancellation at observed I/O boundaries.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const entry = path.resolve(process.env.MTERM_VERIFY_BIN ?? 'bin/mterm-cli.js');
const moduleUrl = (name) => pathToFileURL(path.resolve(path.dirname(entry), '../dist', name)).href;
const { FileService } = await import(moduleUrl('files.js'));
const { RemoteReadAdapter } = await import(moduleUrl('remote/adapter.js'));
const code = (expected) => (error) => error?.code === expected;
const operations = [
  { method: 'read', tool: 'mterm_read_file', args: { path: 'sample.txt' }, target: 'file' },
  { method: 'info', tool: 'mterm_file_info', args: { path: 'sample.txt' }, target: 'file' },
  { method: 'list', tool: 'mterm_list_directory', args: { path: '.' }, target: 'root' },
  {
    method: 'search',
    tool: 'mterm_search_files',
    args: { path: '.', query: 'sample' },
    mode: 'name',
    target: 'root',
  },
  {
    method: 'search',
    tool: 'mterm_search_content',
    args: { path: '.', query: 'needle' },
    mode: 'content',
    target: 'root',
  },
];
const invoke = (service, operation, signal) =>
  service[operation.method](
    { ...operation.args, ...(operation.mode ? { mode: operation.mode } : {}) },
    signal,
  );
async function fixture(t, empty = false) {
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-file-cancel-')));
  t.after(() => fs.rm(parent, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }));
  const root = path.join(parent, 'root');
  const file = path.join(root, 'sample.txt');
  await fs.mkdir(root);
  if (!empty) await fs.writeFile(file, 'needle in owned temporary content\n');
  return { parent, root, file, service: await FileService.create(root) };
}
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
async function bounded(promise, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Fixture timed out: ' + label)), 10000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
function countTargetIo(t, target, active) {
  const counts = { open: 0, lstat: 0, opendir: 0 };
  for (const name of Object.keys(counts)) {
    const original = fs[name].bind(fs);
    t.mock.method(fs, name, async (file, ...args) => {
      if (active() && path.resolve(String(file)) === target) counts[name]++;
      return original(file, ...args);
    });
  }
  return counts;
}
const noIo = (counts) => assert.deepEqual(counts, { open: 0, lstat: 0, opendir: 0 });
const remoteRequest = (adapter, operation, milliseconds = 20000) => ({
  version: 1,
  requestId: randomUUID(),
  deviceId: adapter.deviceId,
  deadline: Date.now() + milliseconds,
  tool: operation.tool,
  arguments: { ...operation.args },
});
const errorCode = (response) => {
  assert.equal(response.result.isError, true);
  return response.result.structuredContent.error.code;
};

for (const operation of operations) {
  test('pre-aborted native ' + operation.tool + ' does not resolve or access a path', async (t) => {
    const f = await fixture(t);
    let resolutions = 0;
    const resolve = f.service.policy.resolve.bind(f.service.policy);
    t.mock.method(f.service.policy, 'resolve', async (...args) => {
      resolutions++;
      return resolve(...args);
    });
    const counts = countTargetIo(t, f[operation.target], () => true);
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(invoke(f.service, operation, controller.signal), code('CANCELLED'));
    assert.equal(resolutions, 0);
    noIo(counts);
  });
}

for (const operation of operations.slice(0, 3)) {
  test('native ' + operation.method + ' stops after cancellation during path resolution', async (t) => {
    const f = await fixture(t);
    const controller = new AbortController();
    let resolved = false;
    const resolve = f.service.policy.resolve.bind(f.service.policy);
    t.mock.method(f.service.policy, 'resolve', async (...args) => {
      const result = await resolve(...args);
      resolved = true;
      controller.abort();
      return result;
    });
    const counts = countTargetIo(t, f[operation.target], () => resolved);
    await assert.rejects(invoke(f.service, operation, controller.signal), code('CANCELLED'));
    noIo(counts);
  });
}

for (const phase of ['open', 'stat', 'read', 'close']) {
  test('native read cancellation after real ' + phase + ' closes its handle before settling', async (t) => {
    const f = await fixture(t);
    const controller = new AbortController();
    const open = fs.open.bind(fs);
    let handle,
      reads = 0,
      closes = 0;
    t.mock.method(fs, 'open', async (...args) => {
      handle = await open(...args);
      const stat = handle.stat.bind(handle),
        read = handle.read.bind(handle),
        close = handle.close.bind(handle);
      t.mock.method(handle, 'stat', async (...values) => {
        const result = await stat(...values);
        if (phase === 'stat') controller.abort();
        return result;
      });
      t.mock.method(handle, 'read', async (...values) => {
        reads++;
        const result = await read(...values);
        if (phase === 'read') controller.abort();
        return result;
      });
      t.mock.method(handle, 'close', async () => {
        closes++;
        await close();
        if (phase === 'close') controller.abort();
      });
      if (phase === 'open') controller.abort();
      return handle;
    });
    await assert.rejects(f.service.read({ path: 'sample.txt' }, controller.signal), code('CANCELLED'));
    assert.equal(closes, 1);
    assert.equal(handle.fd, -1);
    if (phase === 'open' || phase === 'stat') assert.equal(reads, 0);
    if (phase === 'read') assert.equal(reads, 1);
  });
}

test('native metadata cancellation after final real lstat cannot return success', async (t) => {
  const f = await fixture(t);
  const controller = new AbortController();
  let resolved = false,
    finalStats = 0;
  const resolve = f.service.policy.resolve.bind(f.service.policy),
    lstat = fs.lstat.bind(fs);
  t.mock.method(f.service.policy, 'resolve', async (...args) => {
    const result = await resolve(...args);
    resolved = true;
    return result;
  });
  t.mock.method(fs, 'lstat', async (...args) => {
    const result = await lstat(...args);
    if (resolved) {
      finalStats++;
      controller.abort();
    }
    return result;
  });
  await assert.rejects(f.service.info({ path: 'sample.txt' }, controller.signal), code('CANCELLED'));
  assert.equal(finalStats, 1);
});

for (const operation of operations.slice(2)) {
  for (const phase of ['open', 'entry', 'eof']) {
    test(operation.tool + ' cancellation at directory ' + phase + ' closes the real directory', async (t) => {
      const f = await fixture(t, phase === 'eof');
      const controller = new AbortController();
      const opendir = fs.opendir.bind(fs);
      let directory,
        nextCalls = 0;
      t.mock.method(fs, 'opendir', async (...args) => {
        directory = await opendir(...args);
        const iterator = directory[Symbol.asyncIterator]();
        t.mock.method(directory, Symbol.asyncIterator, () => ({
          [Symbol.asyncIterator]() {
            return this;
          },
          async next(...values) {
            nextCalls++;
            const result = await iterator.next(...values);
            if ((phase === 'entry' && !result.done) || (phase === 'eof' && result.done)) controller.abort();
            return result;
          },
          return: (...values) => iterator.return(...values),
        }));
        if (phase === 'open') controller.abort();
        return directory;
      });
      await assert.rejects(invoke(f.service, operation, controller.signal), code('CANCELLED'));
      await assert.rejects(directory.read(), code('ERR_DIR_CLOSED'));
      assert.equal(nextCalls, phase === 'open' ? 0 : 1);
    });
  }
}

for (const operation of operations.slice(2)) {
  test(operation.tool + ' observes cancellation during iterator cleanup', async (t) => {
    const f = await fixture(t);
    await fs.writeFile(path.join(f.root, 'sample-two.txt'), 'another needle');
    const controller = new AbortController();
    const opendir = fs.opendir.bind(fs);
    let directory,
      returns = 0;
    t.mock.method(fs, 'opendir', async (...args) => {
      directory = await opendir(...args);
      const iterator = directory[Symbol.asyncIterator]();
      t.mock.method(directory, Symbol.asyncIterator, () => ({
        [Symbol.asyncIterator]() {
          return this;
        },
        next: (...values) => iterator.next(...values),
        async return(...values) {
          returns++;
          const result = await iterator.return(...values);
          controller.abort();
          return result;
        },
      }));
      return directory;
    });
    const limited = {
      ...operation,
      args: { ...operation.args, ...(operation.method === 'list' ? { limit: 1 } : { maxResults: 1 }) },
    };
    await assert.rejects(invoke(f.service, limited, controller.signal), code('CANCELLED'));
    assert.equal(returns, 1);
    await assert.rejects(directory.read(), code('ERR_DIR_CLOSED'));
  });
}

test('nested content cancellation closes the file and every ancestor directory', async (t) => {
  const f = await fixture(t);
  await fs.mkdir(path.join(f.root, 'nested'));
  await fs.rename(f.file, path.join(f.root, 'nested', 'sample.txt'));
  const controller = new AbortController();
  const opendir = fs.opendir.bind(fs),
    open = fs.open.bind(fs);
  const directories = [];
  let handle,
    reads = 0;
  t.mock.method(fs, 'opendir', async (...args) => {
    const directory = await opendir(...args);
    directories.push(directory);
    return directory;
  });
  t.mock.method(fs, 'open', async (...args) => {
    handle = await open(...args);
    const read = handle.read.bind(handle);
    t.mock.method(handle, 'read', async (...values) => {
      reads++;
      const result = await read(...values);
      controller.abort();
      return result;
    });
    return handle;
  });
  await assert.rejects(invoke(f.service, operations[4], controller.signal), code('CANCELLED'));
  assert.equal(reads, 1);
  assert.equal(handle.fd, -1);
  assert.equal(directories.length, 2);
  for (const directory of directories) await assert.rejects(directory.read(), code('ERR_DIR_CLOSED'));
});

for (const denied of [false, true]) {
  test(
    'content search preserves cancellation at its final file read' + (denied ? ' with an I/O failure' : ''),
    async (t) => {
      const f = await fixture(t);
      const controller = new AbortController();
      const open = fs.open.bind(fs);
      let handle,
        reads = 0;
      t.mock.method(fs, 'open', async (...args) => {
        handle = await open(...args);
        const read = handle.read.bind(handle);
        t.mock.method(handle, 'read', async (...values) => {
          reads++;
          const result = await read(...values);
          controller.abort();
          if (denied) throw Object.assign(new Error('owned fixture access failure'), { code: 'EACCES' });
          return result;
        });
        return handle;
      });
      await assert.rejects(invoke(f.service, operations[4], controller.signal), code('CANCELLED'));
      assert.equal(reads, 1);
      assert.equal(handle.fd, -1);
    },
  );
  test(
    'filename search preserves cancellation at final path resolution' +
      (denied ? ' with a policy failure' : ''),
    async (t) => {
      const f = await fixture(t);
      const controller = new AbortController();
      const resolve = f.service.policy.resolve.bind(f.service.policy);
      let filesResolved = 0;
      t.mock.method(f.service.policy, 'resolve', async (...args) => {
        const full = await resolve(...args);
        if (full === f.file) {
          filesResolved++;
          controller.abort();
          if (denied) throw Object.assign(new Error('owned fixture policy failure'), { code: 'EACCES' });
        }
        return full;
      });
      await assert.rejects(invoke(f.service, operations[3], controller.signal), code('CANCELLED'));
      assert.equal(filesResolved, 1);
    },
  );
}

for (const operation of operations) {
  test('remote caller cancellation reaches ' + operation.tool + ' before further I/O', async (t) => {
    const f = await fixture(t);
    const adapter = await RemoteReadAdapter.create({ root: f.root, deviceId: randomUUID() });
    const controller = new AbortController();
    let resolved = false;
    const resolve = adapter.files.policy.resolve.bind(adapter.files.policy);
    const hook = t.mock.method(adapter.files.policy, 'resolve', async (...args) => {
      const full = await resolve(...args);
      resolved = true;
      controller.abort();
      return full;
    });
    const counts = countTargetIo(t, f[operation.target], () => resolved);
    const request = remoteRequest(adapter, operation);
    assert.equal(errorCode(await adapter.execute(request, controller.signal)), 'CANCELLED');
    noIo(counts);
    hook.mock.restore();
    assert.equal(errorCode(await adapter.execute(request)), 'REPLAY_REJECTED');
    assert.equal((await adapter.execute(remoteRequest(adapter, operation))).result.isError, false);
  });
}

function observeDeadline(t) {
  const timeout = AbortSignal.timeout;
  let signal;
  t.mock.method(AbortSignal, 'timeout', (milliseconds) => {
    signal = timeout(milliseconds);
    return signal;
  });
  return async () => {
    assert.ok(signal, 'Adapter must create its real deadline signal');
    if (signal.aborted) return;
    await bounded(
      new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true })),
      'real adapter deadline',
    );
  };
}
for (const operation of operations) {
  test('real remote deadline cancels ' + operation.tool + ' without subsequent I/O', async (t) => {
    const f = await fixture(t);
    const adapter = await RemoteReadAdapter.create({ root: f.root, deviceId: randomUUID() });
    const waitDeadline = observeDeadline(t);
    let resolved = false;
    const resolve = adapter.files.policy.resolve.bind(adapter.files.policy);
    t.mock.method(adapter.files.policy, 'resolve', async (...args) => {
      const full = await resolve(...args);
      await waitDeadline();
      resolved = true;
      return full;
    });
    const counts = countTargetIo(t, f[operation.target], () => resolved);
    assert.equal(
      errorCode(await adapter.execute(remoteRequest(adapter, operation, 250))),
      'DEADLINE_EXCEEDED',
    );
    assert.equal(resolved, true);
    noIo(counts);
  });
}

test('an expired owned deadline signal wins even when the wall clock is just before expiry', async (t) => {
  const f = await fixture(t);
  const adapter = await RemoteReadAdapter.create({ root: f.root, deviceId: randomUUID() });
  const waitDeadline = observeDeadline(t);
  const request = remoteRequest(adapter, operations[0], 250);
  const resolve = adapter.files.policy.resolve.bind(adapter.files.policy);
  let resolved = false;
  t.mock.method(adapter.files.policy, 'resolve', async (...args) => {
    const full = await resolve(...args);
    await waitDeadline();
    // Preserve the actual fired timer while deterministically reproducing clock disagreement.
    t.mock.method(Date, 'now', () => request.deadline - 1);
    resolved = true;
    return full;
  });
  const counts = countTargetIo(t, f.file, () => resolved);
  assert.equal(errorCode(await adapter.execute(request)), 'DEADLINE_EXCEEDED');
  assert.equal(Date.now(), request.deadline - 1);
  noIo(counts);
});

test('remote deadline does not relabel an unrelated filesystem failure as cancellation', async (t) => {
  const f = await fixture(t);
  const adapter = await RemoteReadAdapter.create({ root: f.root, deviceId: randomUUID() });
  const waitDeadline = observeDeadline(t);
  const resolve = adapter.files.policy.resolve.bind(adapter.files.policy);
  t.mock.method(adapter.files.policy, 'resolve', async (...args) => {
    await resolve(...args);
    await waitDeadline();
    throw Object.assign(new Error('sensitive fixture error body'), { code: 'EACCES' });
  });
  const response = await adapter.execute(remoteRequest(adapter, operations[0], 250));
  assert.equal(errorCode(response), 'EACCES');
  assert.doesNotMatch(JSON.stringify(response), /sensitive fixture/);
});

test('remote cancelled reads retain all four slots through real open and close cleanup', async (t) => {
  const f = await fixture(t);
  const adapter = await RemoteReadAdapter.create({ root: f.root, deviceId: randomUUID() });
  const opened = deferred(),
    returnOpen = deferred(),
    closing = deferred(),
    finishClose = deferred();
  const open = fs.open.bind(fs);
  const handles = [];
  let closingCount = 0,
    readCount = 0,
    settled = 0;
  const hook = t.mock.method(fs, 'open', async (...args) => {
    const handle = await open(...args);
    handles.push(handle);
    const read = handle.read.bind(handle),
      close = handle.close.bind(handle);
    t.mock.method(handle, 'read', (...values) => {
      readCount++;
      return read(...values);
    });
    t.mock.method(handle, 'close', async () => {
      if (++closingCount === 4) closing.resolve();
      await finishClose.promise;
      return close();
    });
    if (handles.length === 4) opened.resolve();
    await returnOpen.promise;
    return handle;
  });
  const controllers = Array.from({ length: 4 }, () => new AbortController());
  const requests = controllers.map(() => remoteRequest(adapter, operations[0]));
  const pending = requests.map((request, index) =>
    adapter.execute(request, controllers[index].signal).finally(() => {
      settled++;
    }),
  );
  try {
    await bounded(opened.promise, 'four owned handles opened');
    controllers.forEach((controller) => controller.abort());
    assert.equal(errorCode(await adapter.execute(remoteRequest(adapter, operations[0]))), 'BUSY');
    assert.equal(settled, 0);
    returnOpen.resolve();
    await bounded(closing.promise, 'four owned handles closing');
    assert.equal(errorCode(await adapter.execute(remoteRequest(adapter, operations[0]))), 'BUSY');
    assert.equal(settled, 0);
    finishClose.resolve();
    const results = await bounded(Promise.all(pending), 'cancelled work cleanup');
    assert.deepEqual(results.map(errorCode), Array(4).fill('CANCELLED'));
    assert.equal(readCount, 0);
    assert.equal(closingCount, 4);
    assert.ok(handles.every((handle) => handle.fd === -1));
    hook.mock.restore();
    for (const request of requests)
      assert.equal(errorCode(await adapter.execute(request)), 'REPLAY_REJECTED');
    assert.equal((await adapter.execute(remoteRequest(adapter, operations[0]))).result.isError, false);
  } finally {
    returnOpen.resolve();
    finishClose.resolve();
    await Promise.allSettled(pending);
  }
});
