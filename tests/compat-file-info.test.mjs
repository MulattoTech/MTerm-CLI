// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-file-info-contract (OpenAI / GPT-6 Astra Pro; self-reported)
// Original fixtures; the inspected MIT text handler is used only as a bounded test oracle.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';
import { DesktopCommanderFiles } from '../dist/desktop-commander-files.js';
import { ToolError } from '../dist/errors.js';
import { verifyBaseline } from '../scripts/parity-baseline.mjs';

async function fixture(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-file-info-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return {
    root,
    service: await DesktopCommanderFiles.create(root),
    file: (...parts) => path.join(root, ...parts),
  };
}
function fields(result) {
  assert.deepEqual(Object.keys(result), ['content']);
  assert.equal(result.content.length, 1);
  assert.equal(result.content[0].type, 'text');
  return Object.fromEntries(
    result.content[0].text.split('\n').map((line) => {
      const separator = line.indexOf(': ');
      assert.ok(separator > 0, 'Every metadata line has a field separator');
      return [line.slice(0, separator), line.slice(separator + 2)];
    }),
  );
}
function statFields(st) {
  return {
    size: String(st.size),
    created: JSON.stringify(st.birthtime),
    modified: JSON.stringify(st.mtime),
    accessed: JSON.stringify(st.atime),
    isDirectory: String(st.isDirectory()),
    isFile: String(st.isFile()),
    permissions: st.mode.toString(8).slice(-3),
  };
}
async function upstreamText(f) {
  await verifyBaseline(path.resolve('.'));
  const source = await fs.readFile('docs/parity/upstream/src/utils/files/text.ts', 'utf8');
  const reviewed = source.replace('import {\n    FileHandler,', 'import type {\n    FileHandler,');
  assert.notEqual(reviewed, source, 'The pinned type-import boundary must remain explicit');
  const compiled = stripTypeScriptTypes(reviewed, { mode: 'strip' });
  assert.ok(!compiled.includes('../'), 'No upstream runtime dependency import');
  const reference = f.file('reference.mjs');
  await fs.writeFile(reference, compiled);
  const { TextFileHandler } = await import(pathToFileURL(reference).href);
  return new TextFileHandler();
}

for (const [name, content] of [
  ['empty', ''],
  ['single', 'first'],
  ['trailing-LF', 'first\n'],
  ['newline-only', '\n'],
  ['CRLF', 'one\r\ntwo\r\n'],
  ['CR-only', 'one\rtwo\r'],
  ['BOM-Unicode', '\uFEFFα\n😀\nlast'],
]) {
  test('file info matches pinned text line metadata and ordered stat rendering: ' + name, async (t) => {
    const f = await fixture(t);
    const file = f.file(name + '.txt');
    await fs.writeFile(file, content);
    const upstream = await upstreamText(f);
    const reference = await upstream.getInfo(file);
    const st = await fs.stat(file);
    const count = reference.metadata.lineCount;
    const expected = {
      ...statFields(st),
      fileType: 'text',
      lineCount: String(count),
      lastLine: String(count - 1),
      appendPosition: String(count),
    };
    const result = fields(await f.service.getFileInfo({ path: file }));
    assert.deepEqual(Object.keys(result), Object.keys(expected));
    assert.deepEqual(result, expected);
    assert.equal(await fs.readFile(file, 'utf8'), content);
  });
}

test('directory info includes the pinned text handler discriminator without reading directory contents', async (t) => {
  const f = await fixture(t);
  const directory = f.file('folder.pdf');
  await fs.mkdir(directory);
  t.mock.method(f.service.files, 'read', async () => assert.fail('A directory must not be read as text'));
  const st = await fs.stat(directory);
  assert.deepEqual(fields(await f.service.getFileInfo({ path: directory })), {
    ...statFields(st),
    fileType: 'text',
  });
});

test('file info admits text exactly at the existing 262144-byte ceiling', async (t) => {
  const f = await fixture(t);
  const file = f.file('limit.txt');
  await fs.writeFile(file, 'x'.repeat(262144));
  const result = fields(await f.service.getFileInfo({ path: file }));
  assert.equal(result.size, '262144');
  assert.equal(result.lineCount, '1');
  assert.equal(result.lastLine, '0');
  assert.equal(result.appendPosition, '1');
});

for (const [name, bytes] of [
  ['binary', Buffer.from([65, 0, 66])],
  ['invalid-UTF8', Buffer.from([0xc3, 0x28])],
  ['over-limit', Buffer.alloc(262145, 120)],
]) {
  test('file info preserves bounded unavailable metadata for ' + name, async (t) => {
    const f = await fixture(t);
    const file = f.file(name + '.dat');
    await fs.writeFile(file, bytes);
    const result = fields(await f.service.getFileInfo({ path: file }));
    assert.equal(result.size, String(bytes.length));
    assert.equal(result.textMetadata, 'unavailable');
    for (const key of ['fileType', 'lineCount', 'lastLine', 'appendPosition'])
      assert.equal(result[key], undefined);
    assert.deepEqual(await fs.readFile(file), bytes);
  });
}

test('unsupported document and image extensions retain stat-only metadata without format claims', async (t) => {
  const f = await fixture(t);
  t.mock.method(f.service.files, 'read', async () => assert.fail('Unsupported format must not be parsed'));
  for (const ext of ['pdf', 'docx', 'xlsx', 'PNG']) {
    const file = f.file('unsupported.' + ext);
    await fs.writeFile(file, 'NOT-A-DOCUMENT');
    const result = fields(await f.service.getFileInfo({ path: file }));
    assert.deepEqual(result, statFields(await fs.stat(file)));
  }
});

test('qualifying operational text-read failures retain safe stat metadata without raw error text', async (t) => {
  const f = await fixture(t);
  const file = f.file('operational.txt');
  await fs.writeFile(file, 'data');
  let code;
  t.mock.method(f.service.files, 'read', async () => {
    throw Object.assign(new Error('PRIVATE-ERROR-SENTINEL'), { code });
  });
  for (code of ['EACCES', 'EPERM', 'EBUSY', 'EIO', 'ETIMEDOUT', 'EMFILE', 'ENFILE', 'ENOENT']) {
    const result = await f.service.getFileInfo({ path: file });
    assert.equal(fields(result).textMetadata, 'unavailable');
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE-ERROR-SENTINEL/);
  }
});

test('unexpected, abort and changed-path errors are never swallowed as optional metadata', async (t) => {
  const f = await fixture(t);
  const file = f.file('unexpected.txt');
  await fs.writeFile(file, 'data');
  let error;
  t.mock.method(f.service.files, 'read', async () => {
    throw error;
  });
  for (error of [
    new Error('PRIVATE-ERROR-SENTINEL'),
    Object.assign(new Error('PRIVATE-ERROR-SENTINEL'), { code: 'ABORT_ERR', name: 'AbortError' }),
    ...['ENOTDIR', 'EISDIR', 'ELOOP'].map((code) =>
      Object.assign(new Error('PRIVATE-ERROR-SENTINEL'), { code }),
    ),
    ...['CANCELLED', 'PRIVATE_PATH', 'OUTSIDE_ROOT', 'LINK_REJECTED', 'NOT_FILE', 'CONFIG_INVALID'].map(
      (code) => new ToolError(code, 'PRIVATE-ERROR-SENTINEL'),
    ),
  ])
    await assert.rejects(f.service.getFileInfo({ path: file }), (actual) => actual === error);
});

test('a real policy denial during the metadata read propagates instead of returning stale success', async (t) => {
  const f = await fixture(t);
  const file = f.file('guarded.txt');
  await fs.writeFile(file, 'data');
  const read = f.service.files.read.bind(f.service.files);
  t.mock.method(f.service.files, 'read', async (...args) => {
    f.service.files.policy.setAccessGuard(() => {
      throw new ToolError('OUTSIDE_ROOT', 'Request scope denied');
    });
    return read(...args);
  });
  await assert.rejects(f.service.getFileInfo({ path: file }), { code: 'OUTSIDE_ROOT' });
});

for (const stage of ['after-resolution', 'during-text-read']) {
  test('a hardlink substituted ' + stage + ' remains a failure', async (t) => {
    const f = await fixture(t);
    const file = f.file('target.txt');
    const other = f.file('other.txt');
    await fs.writeFile(file, 'original');
    await fs.writeFile(other, 'PRIVATE-LINK-SENTINEL');
    let changed = false;
    const replace = async () => {
      if (changed) return;
      changed = true;
      await fs.unlink(file);
      await fs.link(other, file);
    };
    if (stage === 'after-resolution') {
      const resolve = f.service.files.policy.resolve.bind(f.service.files.policy);
      t.mock.method(f.service.files.policy, 'resolve', async (...args) => {
        const result = await resolve(...args);
        await replace();
        return result;
      });
    } else {
      const read = f.service.files.read.bind(f.service.files);
      t.mock.method(f.service.files, 'read', async (...args) => {
        await replace();
        return read(...args);
      });
    }
    await assert.rejects(f.service.getFileInfo({ path: file }), { code: 'LINK_REJECTED' });
  });
}

test('schema, private, outside-root and missing paths remain failures', async (t) => {
  const f = await fixture(t);
  await assert.rejects(f.service.getFileInfo({ path: '' }), { name: 'ZodError' });
  await assert.rejects(f.service.getFileInfo({ path: path.dirname(f.root) }), { code: 'OUTSIDE_ROOT' });
  await assert.rejects(f.service.getFileInfo({ path: f.file('.env') }), { code: 'PRIVATE_PATH' });
  await assert.rejects(f.service.getFileInfo({ path: f.file('missing.txt') }), { code: 'ENOENT' });
});

test('pre-cancelled file info performs no path resolution or metadata read', async (t) => {
  const f = await fixture(t);
  let resolved = 0;
  const resolve = f.service.files.policy.resolve.bind(f.service.files.policy);
  t.mock.method(f.service.files.policy, 'resolve', async (...args) => {
    resolved++;
    return resolve(...args);
  });
  await assert.rejects(f.service.getFileInfo({ path: f.root }, AbortSignal.abort()), { code: 'CANCELLED' });
  assert.equal(resolved, 0);
});

test('cancellation immediately after path resolution prevents stat-only success', async (t) => {
  const f = await fixture(t);
  const controller = new AbortController();
  const resolve = f.service.files.policy.resolve.bind(f.service.files.policy);
  t.mock.method(f.service.files.policy, 'resolve', async (...args) => {
    const result = await resolve(...args);
    controller.abort();
    return result;
  });
  await assert.rejects(f.service.getFileInfo({ path: f.root }, controller.signal), { code: 'CANCELLED' });
});

for (const failure of [false, true]) {
  test(
    'cancellation during a ' + (failure ? 'failed' : 'successful') + ' text read propagates',
    async (t) => {
      const f = await fixture(t);
      const file = f.file('cancel.txt');
      await fs.writeFile(file, 'data');
      const controller = new AbortController();
      const read = f.service.files.read.bind(f.service.files);
      t.mock.method(f.service.files, 'read', async (...args) => {
        const result = await read(...args);
        controller.abort();
        if (failure) throw Object.assign(new Error('PRIVATE-ERROR-SENTINEL'), { code: 'EIO' });
        return result;
      });
      await assert.rejects(f.service.getFileInfo({ path: file }, controller.signal), { code: 'CANCELLED' });
    },
  );
}
