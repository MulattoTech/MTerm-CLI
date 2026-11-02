// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-aggregate-output (OpenAI / GPT-6 Astra Pro; self-reported)
// Modified: 2026-11-02-utf16le-read; retain behavioral mocks at the explicit compatibility read boundary.
// Original fixtures for the pinned text envelope and MTerm's existing aggregate ceiling.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DesktopCommanderFiles } from '../dist/desktop-commander-files.js';
import { ToolError } from '../dist/errors.js';
import { verifyBaseline } from '../scripts/parity-baseline.mjs';

const limit = 262144;
const missing = 'ENOENT Requested path or executable was not found.';
const privatePath = 'PRIVATE_PATH Credential and repository metadata paths are not exposed.';
const utf8Bytes = (result) => result.content.reduce((sum, item) => sum + Buffer.byteLength(item.text), 0);
async function fixture(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-multiple-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return {
    root,
    service: await DesktopCommanderFiles.create(root),
    file: (name) => path.join(root, name),
  };
}
function textRead(text) {
  const count = text === '' ? 0 : 1;
  return `[Reading ${count} lines from start (total: ${count} lines, 0 remaining)]\n\n${text}`;
}
function expectedBatch(entries) {
  // Pinned filesystem-handlers.ts: one joined summary, then labeled successful contents.
  return {
    content: [
      {
        type: 'text',
        text: entries
          .map((entry) =>
            entry.error ? `${entry.path}: Error - ${entry.error}` : `${entry.path}: text/plain (text)`,
          )
          .join('\n'),
      },
      ...entries
        .filter((entry) => !entry.error)
        .map((entry) => ({
          type: 'text',
          text: `\n--- ${entry.path} contents: ---\n${textRead(entry.text)}`,
        })),
    ],
  };
}
function fillBytes(bytes, character = 'x') {
  assert.ok(bytes > 0 && bytes <= limit);
  const width = Buffer.byteLength(character);
  return character.repeat(Math.floor(bytes / width)) + 'x'.repeat(bytes % width);
}
async function nearLimit(f, entries, target = limit, character = 'x') {
  // The first successful entry owns the variable-sized payload; all other rows stay fixed.
  const variable = entries.find((entry) => !entry.error);
  variable.text = 'x';
  const overhead = utf8Bytes(expectedBatch(entries)) - 1;
  variable.text = fillBytes(target - overhead, character);
  for (const entry of entries) {
    if (!entry.error) await fs.writeFile(entry.path, entry.text);
  }
  assert.equal(utf8Bytes(expectedBatch(entries)), target, 'Fixture has the exact requested UTF-8 size');
  return f.service.readMultipleFiles({ paths: entries.map((entry) => entry.path) });
}
function responseLimit(error) {
  assert.ok(error instanceof ToolError);
  assert.equal(error.code, 'RESPONSE_LIMIT');
  assert.equal(error.message, 'Batch exceeds byte budget; request fewer or smaller files.');
  return true;
}

test('multi-file text envelope preserves pinned summary/content ordering, empty text and duplicate paths', async (t) => {
  const f = await fixture(t);
  await verifyBaseline(path.resolve('.'));
  const entries = [
    { path: f.file('missing.txt'), error: missing },
    { path: f.file('empty.txt'), text: '' },
    { path: f.file('unicode.txt'), text: '\uFEFFα😀終' },
    { path: f.file('unicode.txt'), text: '\uFEFFα😀終' },
  ];
  for (const entry of entries) if (!entry.error) await fs.writeFile(entry.path, entry.text);
  const result = await f.service.readMultipleFiles({ paths: entries.map((entry) => entry.path) });
  assert.deepEqual(result, expectedBatch(entries));
  for (const entry of entries)
    if (!entry.error) assert.equal(await fs.readFile(entry.path, 'utf8'), entry.text);
});

test('multi-file aggregate ceiling includes the successful summary and accepts exactly the limit', async (t) => {
  const f = await fixture(t);
  const entries = [{ path: f.file('large.txt'), text: 'x' }];
  const result = await nearLimit(f, entries);
  assert.deepEqual(result, expectedBatch(entries));
  assert.equal(utf8Bytes(result), limit);
  await assert.rejects(nearLimit(f, entries, limit + 1), responseLimit);
  assert.equal(await fs.readFile(entries[0].path, 'utf8'), entries[0].text);
});

test('multi-file aggregate accounting uses UTF-8 bytes for both paths and content without truncation', async (t) => {
  const f = await fixture(t);
  const entries = [{ path: f.file('é-界-😀.txt'), text: 'x' }];
  const result = await nearLimit(f, entries, limit, '😀');
  assert.deepEqual(result, expectedBatch(entries));
  assert.equal(utf8Bytes(result), limit);
  assert.ok(result.content[1].text.length < Buffer.byteLength(result.content[1].text));
  await assert.rejects(nearLimit(f, entries, limit + 1, '界'), responseLimit);
});

test('multi-file aggregate accounting includes every summary separator and successful item', async (t) => {
  const f = await fixture(t);
  const entries = [
    { path: f.file('large.txt'), text: 'x' },
    { path: f.file('empty.txt'), text: '' },
    { path: f.file('small.txt'), text: 'end' },
  ];
  assert.equal(utf8Bytes(await nearLimit(f, entries)), limit);
  await assert.rejects(nearLimit(f, entries, limit + 1), responseLimit);
});

test('multi-file error summaries after successful content consume the same aggregate budget', async (t) => {
  const f = await fixture(t);
  const entries = [
    { path: f.file('large.txt'), text: 'x' },
    { path: f.file('missing.txt'), error: missing },
    { path: f.file('.env'), error: privatePath },
  ];
  assert.deepEqual(await nearLimit(f, entries), expectedBatch(entries));
  await assert.rejects(nearLimit(f, entries, limit + 1), responseLimit);
});

test('multi-file error summaries before successful content cannot bypass the aggregate budget', async (t) => {
  const f = await fixture(t);
  const entries = [
    { path: f.file('.env'), error: privatePath },
    { path: f.file('missing.txt'), error: missing },
    { path: f.file('large.txt'), text: 'x' },
  ];
  assert.deepEqual(await nearLimit(f, entries), expectedBatch(entries));
  await assert.rejects(nearLimit(f, entries, limit + 1), responseLimit);
});

test('multi-file duplicate successes each consume their own summary and content bytes', async (t) => {
  const f = await fixture(t);
  const file = f.file('duplicate.txt');
  const entries = Array.from({ length: 2 }, () => ({ path: file, text: 'x' }));
  const overhead = utf8Bytes(expectedBatch(entries)) - 2;
  const payload = fillBytes(Math.floor((limit - overhead) / 2), 'α');
  entries.forEach((entry) => (entry.text = payload));
  await fs.writeFile(file, payload);
  const result = await f.service.readMultipleFiles({ paths: [file, file] });
  assert.deepEqual(result, expectedBatch(entries));
  assert.ok(utf8Bytes(result) <= limit);
  await fs.appendFile(file, 'x');
  await assert.rejects(f.service.readMultipleFiles({ paths: [file, file] }), responseLimit);
});

test('multi-file overflow stops further file reads and never returns a truncated partial success', async (t) => {
  const f = await fixture(t);
  const large = f.file('large.txt');
  const later = f.file('later.txt');
  const overhead = utf8Bytes(expectedBatch([{ path: large, text: 'x' }])) - 1;
  await fs.writeFile(large, fillBytes(limit + 1 - overhead));
  await fs.writeFile(later, 'LATER-READ-SENTINEL');
  const read = f.service.files.readCompatibilityText.bind(f.service.files);
  const seen = [];
  t.mock.method(f.service.files, 'readCompatibilityText', async (input) => {
    seen.push(input.path);
    return read(input);
  });
  await assert.rejects(f.service.readMultipleFiles({ paths: [large, later] }), responseLimit);
  assert.deepEqual(seen, [large]);
  assert.equal(await fs.readFile(later, 'utf8'), 'LATER-READ-SENTINEL');
});

test('multi-file schemas retain bounded batches and maximum Unicode path lengths', async (t) => {
  const f = await fixture(t);
  const name = '界'.repeat(4096);
  const result = await f.service.readMultipleFiles({ paths: Array(20).fill(name) });
  assert.equal(result.content.length, 1);
  assert.equal(result.content[0].text.split('\n').length, 20);
  assert.ok(utf8Bytes(result) <= limit);
  assert.ok(result.content[0].text.endsWith(': Error - INVALID_PATH Invalid path.'));
  const read = t.mock.method(f.service, 'readFile', async () => assert.fail('Invalid input must not read'));
  for (const input of [
    { paths: [] },
    { paths: Array(21).fill('a') },
    { paths: [''] },
    { paths: [name + '界'] },
  ])
    await assert.rejects(f.service.readMultipleFiles(input), { name: 'ZodError' });
  assert.equal(read.mock.callCount(), 0);
});

test('multi-file per-file failures retain safe policy, format and decoding diagnostics', async (t) => {
  const f = await fixture(t);
  const good = f.file('good.txt');
  const privateFile = f.file('.env');
  const binary = f.file('binary.dat');
  const invalid = f.file('invalid.txt');
  const linked = f.file('linked.txt');
  await fs.writeFile(good, 'VISIBLE');
  await fs.writeFile(privateFile, 'PRIVATE-FILE-SENTINEL');
  await fs.writeFile(binary, Buffer.from([0, 1]));
  await fs.writeFile(invalid, Buffer.from([0xc3, 0x28]));
  const source = f.file('link-source.txt');
  await fs.writeFile(source, 'LINKED-FILE-SENTINEL');
  await fs.link(source, linked);
  const paths = [privateFile, path.dirname(f.root), f.file('unsupported.pdf'), binary, invalid, linked, good];
  const result = await f.service.readMultipleFiles({ paths });
  assert.equal(result.content.length, 2);
  for (const code of [
    'PRIVATE_PATH',
    'OUTSIDE_ROOT',
    'UNSUPPORTED_FORMAT',
    'BINARY_FILE',
    'INVALID_UTF8',
    'LINK_REJECTED',
  ])
    assert.ok(result.content[0].text.includes(code), code);
  assert.equal(result.content[1].text, expectedBatch([{ path: good, text: 'VISIBLE' }]).content[1].text);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE-FILE-SENTINEL|LINKED-FILE-SENTINEL/);
  assert.equal(await fs.readFile(privateFile, 'utf8'), 'PRIVATE-FILE-SENTINEL');
});

test('multi-file unexpected errors do not expose raw error text and preserve later successful reads', async (t) => {
  const f = await fixture(t);
  const good = f.file('good.txt');
  const failed = f.file('failed.txt');
  await fs.writeFile(good, 'safe');
  const read = f.service.files.readCompatibilityText.bind(f.service.files);
  t.mock.method(f.service.files, 'readCompatibilityText', async (input) => {
    if (input.path === failed) throw new Error('PRIVATE-ERROR-SENTINEL');
    return read(input);
  });
  const result = await f.service.readMultipleFiles({ paths: [failed, good] });
  assert.match(result.content[0].text, /INTERNAL_ERROR/);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE-ERROR-SENTINEL/);
  assert.equal(result.content[1].text, expectedBatch([{ path: good, text: 'safe' }]).content[1].text);
});

test('multi-file pre-cancellation performs no reads', async (t) => {
  const f = await fixture(t);
  const read = t.mock.method(f.service.files, 'readCompatibilityText', async () =>
    assert.fail('Cancelled read must not run'),
  );
  await assert.rejects(f.service.readMultipleFiles({ paths: [f.file('a.txt')] }, AbortSignal.abort()), {
    code: 'CANCELLED',
  });
  assert.equal(read.mock.callCount(), 0);
});

for (const fails of [false, true]) {
  test(`multi-file cancellation during a ${fails ? 'failed' : 'successful'} read stops the batch`, async (t) => {
    const f = await fixture(t);
    const first = f.file('first.txt');
    const later = f.file('later.txt');
    await fs.writeFile(first, 'first');
    await fs.writeFile(later, 'later');
    const controller = new AbortController();
    const read = f.service.files.readCompatibilityText.bind(f.service.files);
    const seen = [];
    t.mock.method(f.service.files, 'readCompatibilityText', async (input) => {
      seen.push(input.path);
      const result = await read(input);
      controller.abort();
      if (fails) throw new Error('PRIVATE-CANCELLATION-SENTINEL');
      return result;
    });
    await assert.rejects(f.service.readMultipleFiles({ paths: [first, later] }, controller.signal), {
      code: 'CANCELLED',
    });
    assert.deepEqual(seen, [first]);
  });
}
