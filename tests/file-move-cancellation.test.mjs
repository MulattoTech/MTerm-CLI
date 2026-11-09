// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-move-cancellation (OpenAI / GPT-6 Astra Pro; self-reported)
// Real owned files; cancellation is injected around observed preflight and mutation boundaries.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const entry = path.resolve(process.env.MTERM_VERIFY_BIN ?? 'bin/mterm-cli.js');
const moduleUrl = (name) => pathToFileURL(path.resolve(path.dirname(entry), '../dist', name)).href;
const { FileService } = await import(moduleUrl('files.js'));
const { DesktopCommanderFiles } = await import(moduleUrl('desktop-commander-files.js'));
const code = (expected) => (error) => error?.code === expected;
const content = Buffer.concat([Buffer.from('owned move bytes 🌎\n'), Buffer.from([0, 255, 1])]);
async function fixture(t, profile = 'native', allowWrite = true) {
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-move-cancel-')));
  t.after(async () => {
    t.mock.restoreAll();
    await fs.rm(parent, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  });
  const root = path.join(parent, 'root'),
    source = path.join(root, 'source.bin'),
    destination = path.join(root, 'destination.bin');
  await fs.mkdir(root);
  await fs.writeFile(source, content);
  const service = await FileService.create(root, { allowWrite });
  const compat = DesktopCommanderFiles.using(service);
  const invoke = (signal, from = source, to = destination) =>
    profile === 'native'
      ? service.move({ source: from, destination: to }, signal)
      : compat.moveFile({ source: from, destination: to }, signal);
  const calls = { link: 0, unlink: 0 };
  for (const name of Object.keys(calls)) {
    const original = fs[name].bind(fs);
    t.mock.method(fs, name, async (...args) => {
      if (path.resolve(String(args[0])) === source) calls[name]++;
      return original(...args);
    });
  }
  return { parent, root, source, destination, service, invoke, calls };
}
async function bounded(promise) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error('Owned move gate timed out')), 10000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function untouched(f) {
  assert.deepEqual(await fs.readFile(f.source), content);
  await assert.rejects(fs.lstat(f.destination), code('ENOENT'));
}
async function moved(f) {
  assert.deepEqual(await fs.readFile(f.destination), content);
  await assert.rejects(fs.lstat(f.source), code('ENOENT'));
  assert.deepEqual(f.calls, { link: 1, unlink: 1 });
}

for (const profile of ['native', 'compat']) {
  for (const phase of ['source resolution', 'destination resolution', 'source metadata']) {
    test(`move cancellation: ${profile} stops after ${phase} without changing either path`, async (t) => {
      const f = await fixture(t, profile),
        controller = new AbortController();
      const resolve = f.service.policy.resolve.bind(f.service.policy),
        lstat = fs.lstat.bind(fs);
      let destinationResolved = false,
        injected = false;
      t.mock.method(f.service.policy, 'resolve', async (...args) => {
        const result = await resolve(...args);
        const source = path.relative(result, f.source) === '',
          destination = path.relative(result, f.destination) === '';
        if (destination) destinationResolved = true;
        if (
          (phase === 'source resolution' && source) ||
          (phase === 'destination resolution' && destination)
        ) {
          injected = true;
          controller.abort();
        }
        return result;
      });
      t.mock.method(fs, 'lstat', async (...args) => {
        const result = await lstat(...args);
        if (
          phase === 'source metadata' &&
          destinationResolved &&
          path.resolve(String(args[0])) === f.source
        ) {
          injected = true;
          controller.abort();
        }
        return result;
      });
      await assert.rejects(f.invoke(controller.signal), code('CANCELLED'));
      assert.equal(injected, true, 'The real preflight boundary must be reached');
      assert.deepEqual(f.calls, { link: 0, unlink: 0 });
      await untouched(f);
    });
  }

  test(`move cancellation: ${profile} completes a move when cancellation arrives after the real link`, async (t) => {
    const f = await fixture(t, profile),
      controller = new AbortController(),
      link = fs.link.bind(fs);
    t.mock.method(fs, 'link', async (...args) => {
      const result = await link(...args);
      if (path.resolve(String(args[0])) === f.source) controller.abort();
      return result;
    });
    const result = await f.invoke(controller.signal);
    assert.equal(controller.signal.aborted, true);
    if (profile === 'native') assert.equal(result.moved, true);
    else assert.match(result.content[0].text, /^Successfully moved /);
    await moved(f);
  });

  test(`move cancellation: ${profile} retains collision and no-overwrite behavior`, async (t) => {
    const f = await fixture(t, profile),
      originalDestination = Buffer.from('existing destination');
    await fs.writeFile(f.destination, originalDestination);
    await assert.rejects(f.invoke(), code('CONFLICT'));
    assert.deepEqual(await fs.readFile(f.source), content);
    assert.deepEqual(await fs.readFile(f.destination), originalDestination);
    assert.deepEqual(f.calls, { link: 1, unlink: 0 });
  });

  test(`move cancellation: ${profile} preserves failed-unlink evidence after link and cancellation`, async (t) => {
    const f = await fixture(t, profile),
      controller = new AbortController(),
      link = fs.link.bind(fs),
      unlink = fs.unlink.bind(fs);
    t.mock.method(fs, 'link', async (...args) => {
      const result = await link(...args);
      if (path.resolve(String(args[0])) === f.source) controller.abort();
      return result;
    });
    const failure = Object.assign(new Error('Owned injected unlink failure'), { code: 'EBUSY' });
    let unlinkAttempts = 0;
    t.mock.method(fs, 'unlink', async (...args) => {
      if (path.resolve(String(args[0])) === f.source) {
        unlinkAttempts++;
        throw failure;
      }
      return unlink(...args);
    });
    await assert.rejects(f.invoke(controller.signal), (error) => error === failure);
    assert.equal(controller.signal.aborted, true);
    assert.equal(f.calls.link, 1);
    assert.equal(unlinkAttempts, 1);
    assert.deepEqual(await fs.readFile(f.source), content);
    assert.deepEqual(await fs.readFile(f.destination), content);
  });
}

test('move cancellation: an already-aborted request never resolves a path', async (t) => {
  const f = await fixture(t),
    controller = new AbortController();
  let resolutions = 0;
  t.mock.method(f.service.policy, 'resolve', async () => {
    resolutions++;
    throw Error('Unexpected resolution');
  });
  controller.abort();
  await assert.rejects(f.invoke(controller.signal), code('CANCELLED'));
  assert.equal(resolutions, 0);
  assert.deepEqual(f.calls, { link: 0, unlink: 0 });
  await untouched(f);
});

test('move cancellation: a request cancelled while queued cannot mutate after the prior move settles', async (t) => {
  const f = await fixture(t),
    controller = new AbortController(),
    entered = Promise.withResolvers(),
    release = Promise.withResolvers();
  const second = path.join(f.root, 'second.bin'),
    secondDestination = path.join(f.root, 'second-moved.bin');
  await fs.writeFile(second, content);
  const resolve = f.service.policy.resolve.bind(f.service.policy);
  let gated = false;
  t.mock.method(f.service.policy, 'resolve', async (...args) => {
    const result = await resolve(...args);
    if (!gated && path.relative(result, f.destination) === '') {
      gated = true;
      entered.resolve();
      await release.promise;
    }
    return result;
  });
  const first = f.invoke();
  try {
    await bounded(entered.promise);
    const next = f.invoke(controller.signal, second, secondDestination);
    const rejected = assert.rejects(next, code('CANCELLED'));
    controller.abort();
    release.resolve();
    await first;
    await rejected;
    await moved(f);
    assert.deepEqual(await fs.readFile(second), content);
    await assert.rejects(fs.lstat(secondDestination), code('ENOENT'));
  } finally {
    release.resolve();
    await first;
  }
});

test('move cancellation: an in-flight first-link failure retains its error and original source', async (t) => {
  const f = await fixture(t),
    controller = new AbortController();
  const failure = Object.assign(new Error('Owned injected cross-device failure'), { code: 'EXDEV' });
  let attempts = 0;
  t.mock.method(fs, 'link', async () => {
    attempts++;
    controller.abort();
    throw failure;
  });
  await assert.rejects(f.invoke(controller.signal), (error) => error === failure);
  assert.equal(attempts, 1);
  assert.equal(f.calls.unlink, 0);
  await untouched(f);
});

test('move cancellation: write permission and root confinement remain required', async (t) => {
  const f = await fixture(t, 'compat', false);
  await assert.rejects(f.invoke(), code('WRITE_DISABLED'));
  const enabled = await FileService.create(f.root, { allowWrite: true });
  await assert.rejects(
    enabled.move({ source: f.source, destination: path.join(f.parent, 'outside.bin') }),
    code('OUTSIDE_ROOT'),
  );
  assert.deepEqual(f.calls, { link: 0, unlink: 0 });
  await untouched(f);
});
