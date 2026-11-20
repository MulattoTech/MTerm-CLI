// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-20-compat-preflight-cancellation (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  FileService,
  DesktopCommanderFiles,
  fixture,
  dispose,
  manifest,
  instrument,
  settle,
  bindings,
  sampleText,
  argumentsFor,
  methodFor,
} from './compat-read-cancellation-fixture.mjs';

const features = ['metadata', 'rewrite', 'append', 'omitted-mode', 'edit'];
async function observe(t, name, options = {}) {
  const f = await fixture();
  t.after(() => dispose(f));
  if (options.state === 'missing') await fs.unlink(f.target);
  if (options.state === 'empty') await fs.writeFile(f.target, '');
  const files = await FileService.create(f.root, { allowWrite: !options.writeDisabled });
  const compat = DesktopCommanderFiles.using(files);
  const before = await manifest(f);
  const controller = new AbortController();
  const injected = Object.assign(new Error('issue243-labelled-pending-stat'), { code: 'EIO' });
  const io = instrument(
    f,
    async (observed) => {
      if (options.abortAtStat || options.statFailure) controller.abort();
      if (options.statFailure) {
        observed.injectedStatFailure = 'issue243-labelled-pending-stat';
        throw injected;
      }
    },
    files,
  );
  controller.signal.addEventListener('abort', () => io.abort(), { once: true });
  let result, observed;
  try {
    if (options.preAbort) controller.abort();
    result = await settle(() =>
      options.native
        ? files.read({ path: f.target }, controller.signal)
        : compat[methodFor(name)](argumentsFor(name, f.target), controller.signal),
    );
    observed = await io.finish();
  } finally {
    io.restore();
  }
  const after = await manifest(f);
  const evidence = {
    title: t.name,
    bindings: await bindings(),
    options,
    observed,
    service: result.observation,
    manifest: { before, after, unchanged: JSON.stringify(before) === JSON.stringify(after) },
  };
  // Emit complete observations before any feature assertion, including on the original RED source.
  t.diagnostic(JSON.stringify(evidence));
  return { f, evidence, error: result.error, injected };
}
function closed(evidence) {
  assert.equal(evidence.observed.opens, 1, 'Exactly one real preflight handle must be observed');
  assert.equal(evidence.observed.successfulStats, 1);
  assert.equal(evidence.observed.closes, 1);
  assert.deepEqual(evidence.observed.descriptors, [{ fd: -1, probe: { ok: false, code: 'EBADF' } }]);
  assert.ok(evidence.observed.events.indexOf('closed') < evidence.observed.events.indexOf('settled'));
}
function unchanged(evidence) {
  assert.equal(evidence.manifest.unchanged, true);
  assert.deepEqual(evidence.observed.mutationAttempts, []);
}
function noIo(evidence) {
  for (const key of ['opens', 'reads', 'bytes', 'closes', 'writeCalls', 'resolutions', 'lstats'])
    assert.equal(evidence.observed[key], 0, key);
  unchanged(evidence);
}

for (const name of features)
  test('compat preflight cancellation stops body reads: ' + name, async (t) => {
    const { evidence } = await observe(t, name, { abortAtStat: true });
    closed(evidence);
    assert.equal(evidence.observed.aborted, true);
    assert.ok(evidence.observed.events.indexOf('real-stat') < evidence.observed.events.indexOf('abort'));
    unchanged(evidence);
    assert.equal(evidence.observed.readsAfterAbort, 0, 'No body read may begin after observed cancellation');
    assert.equal(evidence.observed.bytesAfterAbort, 0);
    assert.equal(evidence.observed.reads, 0);
    assert.equal(evidence.observed.writeCalls, 0);
    assert.deepEqual(evidence.service, { ok: false, code: 'CANCELLED' });
  });

for (const abort of [false, true])
  test('native preflight calibration: ' + (abort ? 'abort after stat' : 'no abort'), async (t) => {
    const { evidence } = await observe(t, 'metadata', { native: true, abortAtStat: abort });
    closed(evidence);
    unchanged(evidence);
    if (abort) {
      assert.equal(evidence.observed.reads, 0);
      assert.deepEqual(evidence.service, { ok: false, code: 'CANCELLED' });
    } else {
      assert.ok(evidence.observed.reads > 0);
      assert.equal(evidence.observed.bytes, Buffer.byteLength(sampleText));
      assert.equal(evidence.service.result.text, sampleText);
    }
  });

for (const name of features)
  test('compat preflight preserves normal: ' + name, async (t) => {
    const { f, evidence } = await observe(t, name);
    assert.equal(evidence.observed.aborted, false);
    if (name === 'omitted-mode') {
      assert.deepEqual(evidence.service, { ok: false, code: 'EXPLICIT_MODE_REQUIRED' });
      unchanged(evidence);
    } else {
      assert.equal(evidence.service.ok, true);
      if (name === 'metadata') {
        assert.match(evidence.service.result.content[0].text, /lineCount: 2/);
        unchanged(evidence);
      }
    }
    const expected =
      name === 'rewrite'
        ? 'replacement\n'
        : name === 'append'
          ? sampleText + 'replacement\n'
          : name === 'edit'
            ? sampleText.replace('needle', 'changed')
            : sampleText;
    assert.equal(await fs.readFile(f.target, 'utf8'), expected);
  });

for (const name of ['metadata', 'write', 'edit'])
  test('compat preflight pre-abort performs no I/O: ' + name, async (t) => {
    const { evidence } = await observe(t, name === 'write' ? 'rewrite' : name, { preAbort: true });
    noIo(evidence);
    assert.deepEqual(evidence.service, { ok: false, code: 'CANCELLED' });
  });
for (const name of ['write', 'edit'])
  test('compat preflight write-disabled performs no I/O: ' + name, async (t) => {
    const { evidence } = await observe(t, name === 'write' ? 'rewrite' : name, { writeDisabled: true });
    noIo(evidence);
    assert.deepEqual(evidence.service, { ok: false, code: 'WRITE_DISABLED' });
  });
for (const name of ['metadata', 'write', 'edit'])
  test('compat preflight pending-stat EIO precedence: ' + name, async (t) => {
    const { evidence, error, injected } = await observe(t, name === 'write' ? 'rewrite' : name, {
      statFailure: true,
    });
    closed(evidence);
    unchanged(evidence);
    assert.equal(evidence.observed.aborted, true);
    assert.equal(evidence.observed.reads, 0);
    assert.equal(evidence.observed.injectedStatFailure, 'issue243-labelled-pending-stat');
    assert.deepEqual(evidence.service, { ok: false, code: name === 'metadata' ? 'CANCELLED' : 'EIO' });
    if (name !== 'metadata') assert.equal(error, injected, 'The original injected I/O error remains primary');
  });
for (const name of ['metadata', 'edit'])
  test('compat preflight file-state control: missing ' + name, async (t) => {
    const { evidence } = await observe(t, name, { state: 'missing' });
    unchanged(evidence);
    assert.deepEqual(evidence.service, { ok: false, code: 'ENOENT' });
  });
for (const state of ['missing', 'empty'])
  test(
    'compat preflight file-state control: implicit write ' +
      (state === 'missing' ? 'creates missing' : 'replaces empty'),
    async (t) => {
      const { f, evidence } = await observe(t, 'omitted-mode', { state });
      assert.equal(evidence.service.ok, true);
      assert.equal(await fs.readFile(f.target, 'utf8'), 'replacement\n');
    },
  );
