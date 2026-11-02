// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-utf16le-read (OpenAI / GPT-6 Astra Pro; self-reported)
// Original bounded-read fixtures; reference behavior is checked against the pinned MIT handler.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';
import { DesktopCommanderFiles } from '../dist/desktop-commander-files.js';
import { FileService } from '../dist/files.js';
import { verifyBaseline } from '../scripts/parity-baseline.mjs';

const limit = 262144;
const utf16 = (text) => Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]);
const rendered = (text) =>
  `[Reading ${text === '' ? 0 : 1} lines from start (total: ${text === '' ? 0 : 1} lines, 0 remaining)]\n\n${text}`;
async function fixture(t, allowWrite = false) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-utf16-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return {
    root,
    service: await DesktopCommanderFiles.create(root, allowWrite),
    file: (name) => path.join(root, name),
  };
}
async function reference(f) {
  await verifyBaseline(path.resolve('.'));
  const source = await fs.readFile('docs/parity/upstream/src/utils/files/text.ts', 'utf8');
  const reviewed = source.replace('import {\n    FileHandler,', 'import type {\n    FileHandler,');
  assert.notEqual(reviewed, source, 'Pinned type-import boundary changed');
  const compiled = stripTypeScriptTypes(reviewed, { mode: 'strip' });
  assert.ok(!compiled.includes('../'), 'Only the inspected filesystem handler may execute');
  const entry = f.file('reference.mjs');
  await fs.writeFile(entry, compiled);
  const { TextFileHandler } = await import(pathToFileURL(entry).href);
  return new TextFileHandler();
}
function errorCode(code, message) {
  return (error) => {
    assert.equal(error.code, code);
    if (message) assert.equal(error.message, message);
    return true;
  };
}
const differential = [
  ['BOM only', ''],
  ['single line', 'one'],
  ['LF', 'one\ntwo\nthree\n'],
  ['CRLF', 'one\r\ntwo\r\nthree\r\n'],
  ['CR', 'one\rtwo\rthree\r'],
  ['mixed endings and blank lines', 'one\r\n\nthree\rfour'],
  ['Unicode and replacement character', 'α界\n😀𝄞\n\uFFFDend'],
  ['second and embedded BOM', '\uFEFFfirst\nmid\uFEFFdle\nlast'],
];
for (const [name, text] of differential) {
  test(`BOM UTF-16LE ${name} matches pinned pagination and status`, async (t) => {
    const f = await fixture(t);
    const upstream = await reference(f);
    const file = f.file('input.txt');
    const bytes = utf16(text);
    await fs.writeFile(file, bytes);
    for (const [offset, length] of [
      [0, 1000],
      [1, 1],
      [-2, 0],
      [-99, 1],
      [99, 2],
      [0, 0],
    ]) {
      const expected = await upstream.read(file, { offset, length });
      const result = await f.service.readFile({ path: file, offset, length });
      assert.equal(result.content[0].text, expected.content, JSON.stringify({ name, offset, length }));
    }
    assert.deepEqual(await fs.readFile(file), bytes, 'Reads preserve exact original bytes');
  });
}

test('UTF-16LE pagination honors configured default and negative tails ignore it', async (t) => {
  const f = await fixture(t);
  const file = f.file('preferences.txt');
  await fs.writeFile(file, utf16('one\ntwo\nthree\n'));
  const service = DesktopCommanderFiles.using(f.service.files, () => ({ fileReadLineLimit: 1 }));
  assert.equal(
    (await service.readFile({ path: file })).content[0].text,
    '[Reading 1 lines from start (total: 3 lines, 2 remaining)]\n\none',
  );
  assert.equal(
    (await service.readFile({ path: file, offset: -2 })).content[0].text,
    '[Reading last 2 lines (total: 3 lines)]\n\ntwo\nthree',
  );
});

for (const [name, bytes] of [
  ['odd trailing byte', [0xff, 0xfe, 0x61]],
  ['unpaired high surrogate', [0xff, 0xfe, 0x00, 0xd8]],
  ['unpaired low surrogate', [0xff, 0xfe, 0x00, 0xdc]],
  ['reversed surrogate pair', [0xff, 0xfe, 0x00, 0xdc, 0x00, 0xd8]],
  ['high surrogate followed by ASCII', [0xff, 0xfe, 0x00, 0xd8, 0x61, 0x00]],
]) {
  test(`BOM UTF-16LE refuses ${name} without replacement text`, async (t) => {
    const f = await fixture(t);
    const file = f.file('invalid.txt');
    const content = Buffer.from(bytes);
    await fs.writeFile(file, content);
    await assert.rejects(
      f.service.readFile({ path: file }),
      errorCode('INVALID_UTF16', 'File is not valid BOM-marked UTF-16LE.'),
    );
    assert.deepEqual(await fs.readFile(file), content);
  });
}

test('UTF-16LE NUL and UTF-32LE-like marker remain binary, including beyond the requested page', async (t) => {
  const f = await fixture(t);
  const file = f.file('binary.txt');
  for (const bytes of [utf16('\0'), utf16('visible\nprivate\0text'), Buffer.from([0xff, 0xfe, 0, 0])]) {
    await fs.writeFile(file, bytes);
    await assert.rejects(
      f.service.readFile({ path: file, length: 1 }),
      errorCode('BINARY_FILE', 'Binary data is not exposed as text.'),
    );
    assert.deepEqual(await fs.readFile(file), bytes);
  }
});

test('UTF-16LE malformed data outside the requested page still fails strict whole-file decoding', async (t) => {
  const f = await fixture(t);
  const file = f.file('invalid-tail.txt');
  const bytes = Buffer.concat([utf16('visible\n'), Buffer.from([0x00, 0xd8])]);
  await fs.writeFile(file, bytes);
  await assert.rejects(f.service.readFile({ path: file, length: 1 }), errorCode('INVALID_UTF16'));
});

test('non-UTF-16LE markers retain strict UTF-8 behavior without encoding guesses', async (t) => {
  const f = await fixture(t);
  const file = f.file('other.txt');
  for (const [bytes, code] of [
    [Buffer.from('ab', 'utf16le'), 'BINARY_FILE'],
    [Buffer.from([0xfe, 0xff, 0x4e, 0x2d]), 'INVALID_UTF8'],
    [Buffer.from([0xff]), 'INVALID_UTF8'],
    [Buffer.from([0xc3, 0x28]), 'INVALID_UTF8'],
  ]) {
    await fs.writeFile(file, bytes);
    await assert.rejects(f.service.readFile({ path: file }), errorCode(code));
  }
  for (const text of ['\uFEFFfirst', 'α😀', 'ab']) {
    await fs.writeFile(file, text);
    assert.equal((await f.service.readFile({ path: file })).content[0].text, rendered(text));
  }
  // BOM-less code-unit bytes that are valid UTF-8 keep their original UTF-8 interpretation.
  await fs.writeFile(file, Buffer.from([0x61, 0x62]));
  assert.equal((await f.service.readFile({ path: file })).content[0].text, rendered('ab'));
});

test('raw UTF-16LE file ceiling includes the BOM and accepts exactly 262144 bytes', async (t) => {
  const f = await fixture(t);
  const file = f.file('raw-limit.txt');
  const content = 'a'.repeat((limit - 2) / 2);
  const bytes = utf16(content);
  assert.equal(bytes.length, limit);
  await fs.writeFile(file, bytes);
  assert.equal((await f.service.readFile({ path: file })).content[0].text, rendered(content));
  for (const extension of [Buffer.from([0x62]), Buffer.from([0x62, 0])]) {
    await fs.writeFile(file, Buffer.concat([bytes, extension]));
    await assert.rejects(f.service.readFile({ path: file }), errorCode('FILE_TOO_LARGE'));
  }
});

test('UTF-16LE compatibility uses the shared configured raw byte ceiling', async (t) => {
  const f = await fixture(t);
  const service = DesktopCommanderFiles.using(await FileService.create(f.root, { maxBytes: 8 }));
  const file = f.file('small-limit.txt');
  await fs.writeFile(file, utf16('abc'));
  assert.equal((await service.readFile({ path: file })).content[0].text, rendered('abc'));
  await fs.writeFile(file, utf16('abcd'));
  await assert.rejects(service.readFile({ path: file }), errorCode('FILE_TOO_LARGE'));
});

test('decoded UTF-8 expansion retains the exact batch byte ceiling', async (t) => {
  const f = await fixture(t);
  const file = f.file('界-😀.txt');
  const batch = (text) => ({
    content: [
      { type: 'text', text: `${file}: text/plain (text)` },
      { type: 'text', text: `\n--- ${file} contents: ---\n${rendered(text)}` },
    ],
  });
  const totalBytes = (result) => result.content.reduce((sum, part) => sum + Buffer.byteLength(part.text), 0);
  const overhead = totalBytes(batch('x')) - 1;
  const payload = limit - overhead;
  const text = '界'.repeat(Math.floor(payload / 3)) + 'x'.repeat(payload % 3);
  const bytes = utf16(text);
  assert.ok(bytes.length < limit, 'UTF-16LE source is smaller than its returned UTF-8 text');
  assert.equal(totalBytes(batch(text)), limit);
  await fs.writeFile(file, bytes);
  const result = await f.service.readMultipleFiles({ paths: [file] });
  assert.deepEqual(result, batch(text));
  assert.equal(totalBytes(result), limit);
  await fs.writeFile(file, utf16(text + 'x'));
  await assert.rejects(f.service.readMultipleFiles({ paths: [file] }), errorCode('RESPONSE_LIMIT'));
});

test('UTF-16LE batch ordering, duplicates and malformed per-file errors remain exact', async (t) => {
  const f = await fixture(t);
  const good = f.file('good.txt');
  const bad = f.file('bad.txt');
  await fs.writeFile(good, utf16('α😀'));
  await fs.writeFile(bad, Buffer.from([0xff, 0xfe, 0x61]));
  const result = await f.service.readMultipleFiles({ paths: [good, bad, good] });
  assert.equal(
    result.content[0].text,
    `${good}: text/plain (text)\n${bad}: Error - INVALID_UTF16 File is not valid BOM-marked UTF-16LE.\n${good}: text/plain (text)`,
  );
  assert.equal(result.content.length, 3);
  assert.equal(result.content[1].text, `\n--- ${good} contents: ---\n${rendered('α😀')}`);
  assert.equal(result.content[2].text, result.content[1].text);
});

test('UTF-16LE reads do not broaden native UTF-8 reads or compatibility writes and edits', async (t) => {
  const f = await fixture(t, true);
  const file = f.file('immutable.txt');
  const bytes = utf16('one\ntwo');
  await fs.writeFile(file, bytes);
  await assert.rejects(f.service.files.read({ path: file }), errorCode('BINARY_FILE'));
  for (const mode of ['append', 'rewrite']) {
    await assert.rejects(
      f.service.writeFile({ path: file, content: 'changed', mode }),
      errorCode('BINARY_FILE'),
    );
    assert.deepEqual(await fs.readFile(file), bytes);
  }
  await assert.rejects(
    f.service.editBlock({ file_path: file, old_string: 'one', new_string: 'changed' }),
    errorCode('BINARY_FILE'),
  );
  assert.deepEqual(await fs.readFile(file), bytes);
  assert.match((await f.service.readFile({ path: file })).content[0].text, /one\ntwo$/);
});

test('UTF-16LE detection cannot bypass private, outside-root or multiple-link policy', async (t) => {
  const f = await fixture(t);
  const privateFile = f.file('.env');
  const linked = f.file('linked.txt');
  const source = f.file('source.txt');
  const bytes = utf16('PRIVATE-FILE-SENTINEL');
  await fs.writeFile(privateFile, bytes);
  await fs.writeFile(source, bytes);
  await fs.link(source, linked);
  for (const [file, code] of [
    [privateFile, 'PRIVATE_PATH'],
    [path.dirname(f.root), 'OUTSIDE_ROOT'],
    [linked, 'LINK_REJECTED'],
  ]) {
    await assert.rejects(f.service.readFile({ path: file }), errorCode(code));
  }
  assert.deepEqual(await fs.readFile(privateFile), bytes);
  assert.deepEqual(await fs.readFile(source), bytes);
});

test('UTF-16LE pre-cancellation and cancellation after path resolution open no handles', async (t) => {
  const f = await fixture(t);
  const file = f.file('cancelled.txt');
  await fs.writeFile(file, utf16('one'));
  const open = t.mock.method(fs, 'open', async () => assert.fail('Cancelled reads must not open'));
  await assert.rejects(f.service.readFile({ path: file }, AbortSignal.abort()), errorCode('CANCELLED'));
  const controller = new AbortController();
  const resolve = f.service.files.policy.resolve.bind(f.service.files.policy);
  t.mock.method(f.service.files.policy, 'resolve', async (...args) => {
    const result = await resolve(...args);
    controller.abort();
    return result;
  });
  await assert.rejects(f.service.readFile({ path: file }, controller.signal), errorCode('CANCELLED'));
  assert.equal(open.mock.callCount(), 0);
});

for (const stage of ['open', 'stat', 'read', 'close']) {
  test(`UTF-16LE cancellation after ${stage} closes its handle and refuses output`, async (t) => {
    const f = await fixture(t);
    const file = f.file('cancel.txt');
    await fs.writeFile(file, utf16('one\n😀two'));
    const controller = new AbortController();
    const originalOpen = fs.open.bind(fs);
    let reads = 0,
      closes = 0;
    t.mock.method(fs, 'open', async (...args) => {
      const handle = await originalOpen(...args);
      const stat = handle.stat.bind(handle),
        read = handle.read.bind(handle),
        close = handle.close.bind(handle);
      handle.stat = async (...statArgs) => {
        const result = await stat(...statArgs);
        if (stage === 'stat') controller.abort();
        return result;
      };
      handle.read = async (...readArgs) => {
        reads++;
        const result = await read(...readArgs);
        if (stage === 'read') controller.abort();
        return result;
      };
      handle.close = async () => {
        closes++;
        await close();
        if (stage === 'close') controller.abort();
      };
      if (stage === 'open') controller.abort();
      return handle;
    });
    await assert.rejects(f.service.readFile({ path: file }, controller.signal), errorCode('CANCELLED'));
    assert.equal(closes, 1);
    assert.equal(reads, ['open', 'stat'].includes(stage) ? 0 : stage === 'read' ? 1 : 2);
  });
}

test('bounded reads reconstruct split UTF-16LE code units and detect growth before decode', async (t) => {
  const f = await fixture(t);
  const file = f.file('partial.txt');
  const text = 'first\n😀\nlast';
  await fs.writeFile(file, utf16(text));
  const originalOpen = fs.open.bind(fs);
  let grows = false,
    closes = 0;
  t.mock.method(fs, 'open', async (...args) => {
    const handle = await originalOpen(...args);
    const stat = handle.stat.bind(handle),
      read = handle.read.bind(handle),
      close = handle.close.bind(handle);
    handle.stat = async () => {
      const result = await stat();
      if (grows) result.size = 2;
      return result;
    };
    handle.read = (buffer, offset, length, position) =>
      read(buffer, offset, Math.min(length, grows ? 8192 : 3), position);
    handle.close = async () => {
      closes++;
      await close();
    };
    return handle;
  });
  assert.equal(
    (await f.service.readFile({ path: file })).content[0].text,
    '[Reading 3 lines from start (total: 3 lines, 0 remaining)]\n\nfirst\n😀\nlast',
  );
  assert.equal(closes, 1);
  await fs.writeFile(file, Buffer.concat([utf16('a'.repeat((limit - 2) / 2)), Buffer.from([0x62, 0])]));
  grows = true;
  await assert.rejects(f.service.readFile({ path: file }), errorCode('FILE_TOO_LARGE'));
  assert.equal(closes, 2);
});

test('UTF-16LE read faults and decode refusals always close opened handles', async (t) => {
  const f = await fixture(t);
  const file = f.file('fault.txt');
  await fs.writeFile(file, Buffer.from([0xff, 0xfe, 0x61]));
  const originalOpen = fs.open.bind(fs);
  let fault = true,
    closes = 0;
  t.mock.method(fs, 'open', async (...args) => {
    const handle = await originalOpen(...args);
    const read = handle.read.bind(handle),
      close = handle.close.bind(handle);
    handle.read = async (...readArgs) => {
      if (fault) throw Object.assign(new Error('synthetic read failure'), { code: 'EIO' });
      return read(...readArgs);
    };
    handle.close = async () => {
      closes++;
      await close();
    };
    return handle;
  });
  await assert.rejects(f.service.readFile({ path: file }), errorCode('EIO'));
  assert.equal(closes, 1);
  fault = false;
  await assert.rejects(f.service.readFile({ path: file }), errorCode('INVALID_UTF16'));
  assert.equal(closes, 2);
});
