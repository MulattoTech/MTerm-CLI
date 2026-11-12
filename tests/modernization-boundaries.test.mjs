// SPDX-License-Identifier: MIT
// Regression tests for the current-main modernization reconciliation.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { FileService } from '../dist/files.js';
import { SyntaxValidator } from '../dist/editing/syntax-validator.js';
import { FleetSupervisor } from '../dist/orchestration/fleet-manager.js';
import { CodeFormatter } from '../dist/quality/formatter.js';

async function fixture(t, options = {}) {
  const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-navigation-')));
  t.after(() => fs.rm(base, { recursive: true, force: true, maxRetries: 5 }));
  const root = path.join(base, 'root');
  await fs.mkdir(root);
  return { base, root, service: await FileService.create(root, options) };
}

test('navigation respects a narrowed request scope before scanning any directory', async (t) => {
  const { root, service } = await fixture(t);
  await fs.mkdir(path.join(root, 'allowed'));
  await fs.mkdir(path.join(root, 'denied'));
  await fs.writeFile(path.join(root, 'denied/hidden.ts'), 'export function privateMarker() {}\n');
  service.policy.setAccessGuard((target) => {
    if (!target.startsWith(path.join(root, 'allowed') + path.sep)) throw Error('not allowed');
  });
  await assert.rejects(service.repoMap({}), (error) => error.code === 'OUTSIDE_ROOT');
  await assert.rejects(
    service.lspReferences({ symbol: 'privateMarker' }),
    (error) => error.code === 'OUTSIDE_ROOT',
  );
});

test('definition fallback does not read hardlinked siblings or denied source files', async (t) => {
  const { base, root, service } = await fixture(t);
  await fs.writeFile(path.join(root, 'entry.ts'), 'privateMarker();\n');
  const outside = path.join(base, 'outside.ts');
  await fs.writeFile(outside, 'export function privateMarker() { return "outside"; }\n');
  await fs.link(outside, path.join(root, 'sibling.ts'));
  assert.equal(await service.lspDefinition({ path: 'entry.ts', symbol: 'privateMarker' }), null);
});

test('document symbols obey the configured byte limit and strict UTF-8 decoding', async (t) => {
  const { root, service } = await fixture(t, { maxBytes: 64 });
  await fs.writeFile(path.join(root, 'large.ts'), 'export function oversized() {}\n' + ' '.repeat(100));
  await fs.writeFile(path.join(root, 'invalid.ts'), Buffer.from([0xff, 0xfe, 0x61]));
  await assert.rejects(service.lspSymbols({ path: 'large.ts' }), (error) => error.code === 'FILE_TOO_LARGE');
  await assert.rejects(service.lspSymbols({ path: 'invalid.ts' }), (error) => error.code === 'INVALID_UTF8');
});

test('all navigation entry points observe pre-aborted calls without filesystem reads', async (t) => {
  const { root, service } = await fixture(t);
  await fs.writeFile(path.join(root, 'entry.ts'), 'export function example() {}\n');
  const abort = new AbortController();
  abort.abort();
  for (const [method, args] of [
    ['repoMap', {}],
    ['lspReferences', { symbol: 'example' }],
    ['lspDefinition', { path: 'entry.ts', symbol: 'example' }],
    ['lspSymbols', { path: 'entry.ts' }],
  ])
    await assert.rejects(service[method](args, abort.signal), (error) => error.code === 'CANCELLED');
});

test('unavailable syntax parsers and mismatched language overrides cannot certify input', () => {
  for (const [source, file, language] of [
    ['a: [unterminated', 'bad.yaml', undefined],
    ['const = ;', 'bad.js', 'text'],
    ['anything', 'file.unknown', 'arbitrary-parser'],
  ])
    assert.equal(SyntaxValidator.validate(source, file, language).valid, false);
});

test('syntax validation rejects malformed regexes, duplicate bindings and unresolved exports', () => {
  for (const [source, file] of [
    ['export const x = /(/;', 'bad.mjs'],
    ['export const x = 1; export const x = 2;', 'bad.mjs'],
    ['export { missing };', 'bad.mjs'],
    ['const x: number = 1; const x: number = 2;', 'bad.ts'],
  ])
    assert.equal(SyntaxValidator.validate(source, file).valid, false, file + ': ' + source);
});

test('syntax validation accepts ESM, CommonJS and erasable TypeScript without execution', () => {
  for (const [source, file] of [
    ['export const expression = /a+/u; await Promise.resolve();', 'ok.mjs'],
    ['module.exports = function (value) { return value; };', 'ok.cjs'],
    ['if (true) return; module.exports = 1;', 'return.cjs'],
    ['export const x: number = 1; export type Value = typeof x;', 'ok.ts'],
  ])
    assert.equal(SyntaxValidator.validate(source, file).valid, true, file + ': ' + source);
});

test('separate FileService instances do not share fleet payloads or halt state', async (t) => {
  const { root, service } = await fixture(t, { allowWrite: true });
  const other = await FileService.create(root, { allowWrite: true });
  await service.fleetSubmit({
    taskId: 'shared-id',
    sessionId: 'first',
    clientLabel: 'a',
    name: 'one',
    payload: { privateMarker: 1 },
  });
  const second = await other.fleetSubmit({
    taskId: 'shared-id',
    sessionId: 'second',
    clientLabel: 'b',
    name: 'two',
  });
  assert.equal(second.sessionId, 'second');
  assert.equal(second.payload.privateMarker, undefined);
  await service.fleetHalt();
  assert.equal((await other.fleetStatus()).halted, false);
});

test('a logical fleet task id cannot be adopted by another logical session', () => {
  const fleet = new FleetSupervisor();
  fleet.submitTask({ taskId: 'id', sessionId: 'first', clientLabel: 'a', name: 'one' });
  assert.throws(
    () => fleet.submitTask({ taskId: 'id', sessionId: 'second', clientLabel: 'b', name: 'two' }),
    /conflict|another|owner/i,
  );
});

test('formatting preserves semantic whitespace in multiline strings and non-code formats', async () => {
  for (const [file, text] of [
    ['template.js', 'export const text = `first  \r\nsecond  `;\n'],
    ['continued.js', 'const text = "first\\\nsecond";  '],
    ['notes.md', 'A Markdown hard break  \nNext line'],
    ['config.yaml', 'text: |\n  keep spaces  \n'],
    ['text.py', 'text = """first  \nsecond"""\n'],
  ])
    assert.equal((await CodeFormatter.formatText(text, file)).formattedText, text);
});

test('explicit navigation paths work within narrowed roots and never return denied siblings', async (t) => {
  const { root, service } = await fixture(t);
  const allowed = path.join(root, 'allowed');
  await fs.mkdir(allowed);
  await fs.writeFile(path.join(allowed, 'entry.ts'), 'export function publicSymbol() {}\n');
  await fs.writeFile(path.join(root, 'denied.ts'), 'export function deniedSymbol() {}\n');
  service.policy.setAccessGuard((target) => {
    if (target !== allowed && !target.startsWith(allowed + path.sep)) throw Error('not allowed');
  });
  const map = await service.repoMap({ path: 'allowed' });
  assert.equal(map.filesIndexed, 1);
  assert.match(map.markdownSummary, /publicSymbol/);
  assert.doesNotMatch(JSON.stringify(map), /deniedSymbol/);
  const refs = await service.lspReferences({ path: 'allowed', symbol: 'publicSymbol' });
  assert.equal(refs.length, 1);
});

test('navigation propagates cancellation during a file read and releases its directory handle', async (t) => {
  const { root, service } = await fixture(t);
  await fs.writeFile(path.join(root, 'entry.ts'), 'export function example() {}\n');
  const abort = new AbortController();
  const read = service.read.bind(service);
  t.mock.method(service, 'read', async (...args) => {
    const result = await read(...args);
    abort.abort();
    return result;
  });
  await assert.rejects(service.repoMap({}, abort.signal), (error) => error.code === 'CANCELLED');
  await fs.rename(root, path.join(path.dirname(root), 'renamed'));
});

for (const operation of ['references', 'definition'])
  test('navigation observes cancellation during early directory cleanup: ' + operation, async (t) => {
    const { root, service } = await fixture(t);
    await fs.writeFile(path.join(root, 'entry.ts'), 'example();\n');
    await fs.writeFile(path.join(root, 'sibling.ts'), 'export function example() {}\n');
    const abort = new AbortController();
    const opendir = fs.opendir.bind(fs);
    let closed = false;
    t.mock.method(fs, 'opendir', async (...args) => {
      const dir = await opendir(...args);
      const iterate = dir[Symbol.asyncIterator].bind(dir);
      dir[Symbol.asyncIterator] = () => {
        const iterator = iterate();
        const finish = iterator.return.bind(iterator);
        iterator.return = async (...values) => {
          const result = await finish(...values);
          closed = true;
          abort.abort();
          return result;
        };
        return iterator;
      };
      return dir;
    });
    const call =
      operation === 'references'
        ? service.lspReferences({ symbol: 'example', limit: 1 }, abort.signal)
        : service.lspDefinition({ path: 'entry.ts', symbol: 'example' }, abort.signal);
    await assert.rejects(call, (error) => error.code === 'CANCELLED');
    assert.equal(closed, true);
    await fs.rename(root, path.join(path.dirname(root), 'renamed'));
  });

test('rollback cancellation during snapshot lookup cannot mutate a file', async (t) => {
  const { root, service } = await fixture(t, { allowWrite: true });
  const file = path.join(root, 'entry.txt');
  await fs.writeFile(file, 'current bytes');
  const current = await service.read({ path: 'entry.txt' });
  const abort = new AbortController();
  t.mock.method(service.journal, 'findSnapshot', async () => {
    abort.abort();
    return { previousContent: 'older bytes', nextVersion: current.version, transactionId: 'test' };
  });
  await assert.rejects(
    service.rollback({ file: 'entry.txt' }, abort.signal),
    (error) => error.code === 'CANCELLED',
  );
  assert.equal(await fs.readFile(file, 'utf8'), 'current bytes');
});
