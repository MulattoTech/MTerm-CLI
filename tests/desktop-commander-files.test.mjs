// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-05-codex-parity-foundation
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';
import { verifyBaseline } from '../scripts/parity-baseline.mjs';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
const mod = await import('../dist/desktop-commander-files.js').catch(() => ({}));
async function fixture(t, allowWrite = true) {
  assert.equal(
    typeof mod.DesktopCommanderFiles?.create,
    'function',
    'compatible file implementation required',
  );
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-dc-files-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return {
    root,
    files: await mod.DesktopCommanderFiles.create(root, allowWrite),
    file: (p) => path.join(root, p),
  };
}
test('text range and negative-tail output matches the exact pinned upstream handler', async (t) => {
  const f = await fixture(t);
  await verifyBaseline(path.resolve('.'));
  const source = await fs.readFile('docs/parity/upstream/src/utils/files/text.ts', 'utf8');
  // Execute ONLY this fully inspected filesystem-only handler, never upstream server/telemetry/bootstrap.
  // Node's native erasure requires an explicit type-only import; this does not modify behavior.
  const reviewed = source.replace('import {\n    FileHandler,', 'import type {\n    FileHandler,');
  assert.notEqual(reviewed, source, 'Pinned type-import boundary changed');
  const compiled = stripTypeScriptTypes(reviewed, { mode: 'strip' });
  assert.ok(!compiled.includes('../'), 'Type-only upstream imports must not become runtime dependency loads');
  const ref = path.join(f.root, 'reference.mjs');
  await fs.writeFile(ref, compiled);
  const { TextFileHandler } = await import(pathToFileURL(ref).href);
  const upstream = new TextFileHandler();
  for (const [index, content] of [
    '',
    'a',
    'a\n',
    'one\r\ntwo\r\nthree\r\n',
    'α\n😀\nlast',
    '\uFEFFfirst\nsecond',
  ].entries()) {
    const file = f.file('input-' + index + '.txt');
    await fs.writeFile(file, content);
    for (const [offset, length] of [
      [0, 1000],
      [1, 1],
      [-2, 1],
      [-99, 2],
      [99, 1],
      [0, 0],
    ]) {
      const expected = await upstream.read(file, { offset, length });
      const result = await f.files.readFile({ path: file, offset, length });
      assert.equal(result.content[0].text, expected.content, JSON.stringify({ content, offset, length }));
    }
  }
});
test('write requires explicit replacement intent and preserves BOM when appending', async (t) => {
  const f = await fixture(t);
  const file = f.file('note.txt');
  await fs.writeFile(file, '\uFEFFfirst\r\n');
  await assert.rejects(f.files.writeFile({ path: file, content: 'lost' }), /mode|replace|intent/i);
  assert.equal(await fs.readFile(file, 'utf8'), '\uFEFFfirst\r\n');
  await f.files.writeFile({ path: file, content: 'second', mode: 'append' });
  assert.equal(await fs.readFile(file, 'utf8'), '\uFEFFfirst\r\nsecond');
  await f.files.writeFile({ path: file, content: 'replacement', mode: 'rewrite' });
  assert.equal(await fs.readFile(file, 'utf8'), 'replacement');
  const signal = AbortSignal.abort();
  await assert.rejects(f.files.writeFile({ path: f.file('cancel.txt'), content: 'never' }, signal));
  assert.equal(
    await fs.stat(f.file('cancel.txt')).then(
      () => true,
      () => false,
    ),
    false,
  );
});
test('multi-file reads retain successful text when another path fails', async (t) => {
  const f = await fixture(t);
  await fs.writeFile(f.file('good.txt'), 'works');
  const r = await f.files.readMultipleFiles({ paths: [f.file('missing.txt'), f.file('good.txt')] });
  assert.match(r.content.map((x) => x.text).join('\n'), /Error/);
  assert.match(r.content.map((x) => x.text).join('\n'), /works/);
  await assert.rejects(
    f.files.readFile({ path: 'https://example.invalid/', isUrl: true }),
    /unsupported|not implemented/i,
  );
});
test('nested directory creation is idempotent and prevalidates the whole path', async (t) => {
  const f = await fixture(t);
  await f.files.createDirectory({ path: f.file('nested/a/b') });
  await f.files.createDirectory({ path: f.file('nested/a/b') });
  assert.equal((await fs.stat(f.file('nested/a/b'))).isDirectory(), true);
  await assert.rejects(f.files.createDirectory({ path: f.file('must-not-exist/.ssh/child') }));
  assert.equal(
    await fs.stat(f.file('must-not-exist')).then(
      () => true,
      () => false,
    ),
    false,
  );
});
test('recursive directory listing has depth limits and preserves private boundaries', async (t) => {
  const f = await fixture(t);
  await fs.mkdir(f.file('sub/deep'), { recursive: true });
  await fs.writeFile(f.file('sub/a.txt'), 'a');
  await fs.writeFile(f.file('sub/deep/b.txt'), 'b');
  await fs.mkdir(f.file('.ssh'));
  const one = await f.files.listDirectory({ path: f.root, depth: 1 });
  assert.match(one.content[0].text, /\[DIR\] sub/);
  assert.doesNotMatch(one.content[0].text, /a\.txt|\.ssh/);
  const two = await f.files.listDirectory({ path: f.root, depth: 2 });
  assert.match(two.content[0].text, /sub[/\\]a\.txt/);
  assert.doesNotMatch(two.content[0].text, /b\.txt/);
});
test('exact edit counts prevent accidental replacement and preserve literal dollar strings', async (t) => {
  const f = await fixture(t);
  const file = f.file('edit.txt');
  await fs.writeFile(file, 'item item');
  await assert.rejects(
    f.files.editBlock({ file_path: file, old_string: 'item', new_string: 'bad' }),
    /count|match/i,
  );
  assert.equal(await fs.readFile(file, 'utf8'), 'item item');
  await f.files.editBlock({
    file_path: file,
    old_string: 'item',
    new_string: '$&',
    expected_replacements: 2,
  });
  assert.equal(await fs.readFile(file, 'utf8'), '$& $&');
  const info = await f.files.getFileInfo({ path: file });
  assert.match(info.content[0].text, /lineCount: 1/);
});
test('MCP protocol advertises only implemented optional aliases and returns readable tool content', async (t) => {
  const f = await fixture(t);
  await fs.writeFile(f.file('protocol.txt'), 'one\ntwo\n');
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      path.resolve('bin/mterm-cli.js'),
      'mcp',
      '--stdio',
      '--root',
      f.root,
      '--compat-desktop-commander',
      '--allow-write',
    ],
    stderr: 'pipe',
  });
  const client = new Client({ name: 'mterm-compat-tests', version: '1' });
  t.after(async () => {
    await client.close();
    await transport.close().catch(() => {});
  });
  await client.connect(transport);
  const names = (await client.listTools()).tools.map((x) => x.name);
  for (const name of [
    'read_file',
    'read_multiple_files',
    'write_file',
    'create_directory',
    'list_directory',
    'move_file',
    'get_file_info',
    'edit_block',
  ])
    assert.ok(names.includes(name), name);
  assert.ok(!names.includes('write_pdf'), 'Unimplemented tools must not be advertised');
  const r = await client.callTool({
    name: 'read_file',
    arguments: { path: f.file('protocol.txt'), offset: -1, length: 0 },
  });
  assert.equal(r.isError, false);
  assert.equal(r.content[0].text, '[Reading last 1 lines (total: 2 lines)]\n\ntwo');
});
