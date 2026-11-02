// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-edit-line-endings (OpenAI / GPT-6 Astra Pro; self-reported)
// Original byte fixtures for the inspected DesktopCommanderMCP 0.2.52 exact-edit contract.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { constants as bufferConstants } from 'node:buffer';
import { DesktopCommanderFiles } from '../dist/desktop-commander-files.js';

const limit = 262144;
async function fixture(t, allowWrite = true) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-edit-eol-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return {
    root,
    service: await DesktopCommanderFiles.create(root, allowWrite),
    file: (...parts) => path.join(root, ...parts),
  };
}
async function assertBytes(file, expected) {
  const actual = await fs.readFile(file);
  assert.ok(actual.equals(Buffer.from(expected, 'utf8')), 'File bytes must exactly match the fixture');
}
async function assertNoStaging(root) {
  assert.deepEqual(
    (await fs.readdir(root)).filter((name) => name.startsWith('.mterm-')),
    [],
    'No owned temporary write remains',
  );
}

for (const [name, before, search, replacement, expected] of [
  [
    'LF requests against CRLF files',
    'keep\r\none\r\ntwo\r\ntail\r\n',
    'one\ntwo',
    'alpha\nbeta',
    'keep\r\nalpha\r\nbeta\r\ntail\r\n',
  ],
  [
    'CRLF requests against LF files',
    'keep\none\ntwo\ntail\n',
    'one\r\ntwo',
    'alpha\r\nbeta',
    'keep\nalpha\nbeta\ntail\n',
  ],
  [
    'mixed request delimiters against CR files',
    'keep\rone\rtwo\rthree\rtail\r',
    'one\r\ntwo\nthree',
    'alpha\nbeta\r\ngamma',
    'keep\ralpha\rbeta\rgamma\rtail\r',
  ],
  [
    'mixed request delimiters against LF files',
    'one\ntwo\nthree\n',
    'one\rtwo\r\nthree',
    'alpha\rbeta\r\ngamma',
    'alpha\nbeta\ngamma\n',
  ],
  [
    'multiline replacement after a single-line match',
    'keep\r\nold\r\ntail',
    'old',
    'new\nmore',
    'keep\r\nnew\r\nmore\r\ntail',
  ],
  [
    'empty replacement deletes only the normalized match',
    'keep\r\none\r\ntwo\r\ntail',
    'one\ntwo\n',
    '',
    'keep\r\ntail',
  ],
  [
    'BOM, Unicode, indentation and literal dollar replacement strings',
    '\uFEFFπ\r\n\t  old\r\n\t  value\r\nuntouched 😀',
    '\t  old\n\t  value',
    "\t  $& $1 $` $'\n\t  νέα 😀",
    "\uFEFFπ\r\n\t  $& $1 $` $'\r\n\t  νέα 😀\r\nuntouched 😀",
  ],
  [
    'first CRLF delimiter wins and untouched minority LF stays unchanged',
    'first\r\nold\r\nvalue\nminority\nmajority\nlast',
    'old\nvalue',
    'new\ntext',
    'first\r\nnew\r\ntext\nminority\nmajority\nlast',
  ],
  [
    'first LF delimiter wins and untouched minority CRLF stays unchanged',
    'first\nold\nvalue\r\nminority\r\nmajority\r\nlast',
    'old\r\nvalue',
    'new\rtext',
    'first\nnew\ntext\r\nminority\r\nmajority\r\nlast',
  ],
]) {
  test('edit_block preserves exact bytes for ' + name, async (t) => {
    const f = await fixture(t);
    const file = f.file('edit.txt');
    await fs.writeFile(file, before);
    const result = await f.service.editBlock({
      file_path: file,
      old_string: search,
      new_string: replacement,
    });
    assert.equal(result.isError, undefined);
    await assertBytes(file, expected);
    await assertNoStaging(f.root);
  });
}

test('edit_block uses the native default when the original file has no delimiter', async (t) => {
  const f = await fixture(t);
  const file = f.file('single.txt');
  await fs.writeFile(file, 'before old after');
  await f.service.editBlock({ file_path: file, old_string: 'old', new_string: 'new\rmore\nlast' });
  const eol = process.platform === 'win32' ? '\r\n' : '\n';
  await assertBytes(file, `before new${eol}more${eol}last after`);
});

test('edit_block counts normalized matches before any write and replaces all only at the exact count', async (t) => {
  const f = await fixture(t);
  const file = f.file('count.txt');
  const before = 'one\r\ntwo\r\none\r\ntwo';
  await fs.writeFile(file, before);
  const request = { file_path: file, old_string: 'one\ntwo', new_string: 'new\nvalue' };
  await assert.rejects(f.service.editBlock(request), (error) => {
    assert.equal(error.code, 'REPLACEMENT_COUNT');
    assert.match(error.message, /found 2/);
    return true;
  });
  await assertBytes(file, before);
  await f.service.editBlock({ ...request, expected_replacements: 2 });
  await assertBytes(file, 'new\r\nvalue\r\nnew\r\nvalue');
});

test('edit_block rejects no-match and whitespace-only approximations without mutation', async (t) => {
  const f = await fixture(t);
  const file = f.file('exact.txt');
  const before = '\t  old\r\n\t  value';
  await fs.writeFile(file, before);
  for (const old_string of ['missing', '  old\n  value', '\t old\n\t value', '\t  OLD\n\t  value']) {
    await assert.rejects(f.service.editBlock({ file_path: file, old_string, new_string: 'bad' }), {
      code: 'REPLACEMENT_COUNT',
    });
    await assertBytes(file, before);
  }
  await assertNoStaging(f.root);
});

test('edit_block does not normalize the entire mixed-ending file to create a match', async (t) => {
  const f = await fixture(t);
  const file = f.file('mixed.txt');
  const before = 'first\r\nminority\nblock\nlast';
  await fs.writeFile(file, before);
  await assert.rejects(
    f.service.editBlock({ file_path: file, old_string: 'minority\nblock', new_string: 'bad' }),
    { code: 'REPLACEMENT_COUNT' },
  );
  await assertBytes(file, before);
});

test('edit_block retains non-overlapping occurrence semantics for adjacent and overlapping patterns', async (t) => {
  const f = await fixture(t);
  const file = f.file('overlap.txt');
  await fs.writeFile(file, 'aaaa');
  await f.service.editBlock({
    file_path: file,
    old_string: 'aa',
    new_string: '$&',
    expected_replacements: 2,
  });
  await assertBytes(file, '$&$&');
  await fs.writeFile(file, 'aaa');
  await assert.rejects(
    f.service.editBlock({ file_path: file, old_string: 'aa', new_string: 'X', expected_replacements: 2 }),
    { code: 'REPLACEMENT_COUNT' },
  );
  await assertBytes(file, 'aaa');
  await f.service.editBlock({ file_path: file, old_string: 'aa', new_string: 'X' });
  await assertBytes(file, 'Xa');
});

test('edit_block validates empty search and invalid expected counts without writes', async (t) => {
  const f = await fixture(t);
  const file = f.file('schema.txt');
  await fs.writeFile(file, 'old');
  for (const request of [
    { old_string: '', new_string: 'bad' },
    { old_string: 'old', new_string: 'bad', expected_replacements: 0 },
    { old_string: 'old', new_string: 'bad', expected_replacements: 1.5 },
    { old_string: 'old', new_string: 'bad', expected_replacements: 10001 },
  ]) {
    await assert.rejects(f.service.editBlock({ file_path: file, ...request }), { name: 'ZodError' });
    await assertBytes(file, 'old');
  }
});

test('edit_block retains the match-work ceiling after newline normalization', async (t) => {
  const f = await fixture(t);
  const file = f.file('many.txt');
  const before = '\n'.repeat(10001);
  await fs.writeFile(file, before);
  await assert.rejects(
    f.service.editBlock({
      file_path: file,
      old_string: '\r\n',
      new_string: '',
      expected_replacements: 10000,
    }),
    { code: 'MATCH_LIMIT' },
  );
  await assertBytes(file, before);
});

for (const unit of ['a', 'é', '😀']) {
  const width = Buffer.byteLength(unit);
  const fill = unit.repeat(Math.floor((limit - 4) / width)) + 'x'.repeat((limit - 4) % width);
  test('edit_block accepts exactly the UTF-8 byte ceiling after CRLF expansion: ' + unit, async (t) => {
    const f = await fixture(t);
    const file = f.file('limit.txt');
    await fs.writeFile(file, 'OLD\r\n');
    await f.service.editBlock({ file_path: file, old_string: 'OLD', new_string: fill + '\n' });
    await assertBytes(file, fill + '\r\n\r\n');
    assert.equal((await fs.stat(file)).size, limit);
    await assertNoStaging(f.root);
  });
  test('edit_block rejects one byte over the ceiling after CRLF expansion: ' + unit, async (t) => {
    const f = await fixture(t);
    const file = f.file('limit.txt');
    const before = 'OLD\r\n';
    await fs.writeFile(file, before);
    await assert.rejects(
      f.service.editBlock({ file_path: file, old_string: 'OLD', new_string: fill + 'x\n' }),
      { code: 'FILE_TOO_LARGE' },
    );
    await assertBytes(file, before);
    await assertNoStaging(f.root);
  });
}

test('edit_block remains unavailable without the separate write capability', async (t) => {
  const f = await fixture(t, false);
  const file = f.file('readonly.txt');
  await fs.writeFile(file, 'old\r\nvalue');
  await assert.rejects(
    f.service.editBlock({ file_path: file, old_string: 'old\nvalue', new_string: 'bad' }),
    { code: 'WRITE_DISABLED' },
  );
  await assertBytes(file, 'old\r\nvalue');
});

test('edit_block keeps private, outside-root, missing and unsupported file failures', async (t) => {
  const f = await fixture(t);
  const outside = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-edit-outside-')));
  t.after(() => fs.rm(outside, { recursive: true, force: true }));
  for (const [file, code] of [
    [f.file('.env'), 'PRIVATE_PATH'],
    [path.join(outside, 'outside.txt'), 'OUTSIDE_ROOT'],
    [f.file('document.docx'), 'UNSUPPORTED_FORMAT'],
  ]) {
    await fs.writeFile(file, 'old\r\nvalue');
    await assert.rejects(
      f.service.editBlock({ file_path: file, old_string: 'old\nvalue', new_string: 'bad' }),
      { code },
    );
    await assertBytes(file, 'old\r\nvalue');
  }
  await assert.rejects(
    f.service.editBlock({ file_path: f.file('missing.txt'), old_string: 'old', new_string: 'bad' }),
    { code: 'ENOENT' },
  );
});

test('edit_block refuses directory links and multiply-linked files without changing either target', async (t) => {
  const f = await fixture(t);
  const target = f.file('target');
  await fs.mkdir(target);
  const file = path.join(target, 'file.txt');
  await fs.writeFile(file, 'old\r\nvalue');
  const alias = f.file('alias');
  await fs.symlink(target, alias, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(
    f.service.editBlock({ file_path: path.join(alias, 'file.txt'), old_string: 'old', new_string: 'bad' }),
    { code: 'LINK_REJECTED' },
  );
  const hardlink = f.file('hardlink.txt');
  await fs.link(file, hardlink);
  await assert.rejects(f.service.editBlock({ file_path: hardlink, old_string: 'old', new_string: 'bad' }), {
    code: 'LINK_REJECTED',
  });
  await assertBytes(file, 'old\r\nvalue');
  await assertBytes(hardlink, 'old\r\nvalue');
});

test('edit_block preserves a concurrent writer when the read version becomes stale', async (t) => {
  const f = await fixture(t);
  const file = f.file('conflict.txt');
  await fs.writeFile(file, 'old\r\nvalue');
  const read = f.service.files.read.bind(f.service.files);
  t.mock.method(f.service.files, 'read', async (...args) => {
    const result = await read(...args);
    await fs.writeFile(file, 'external writer\r\nretained');
    return result;
  });
  await assert.rejects(
    f.service.editBlock({ file_path: file, old_string: 'old\nvalue', new_string: 'bad' }),
    { code: 'CONFLICT' },
  );
  await assertBytes(file, 'external writer\r\nretained');
  await assertNoStaging(f.root);
});

test('pre-cancelled edit_block performs no read or write', async (t) => {
  const f = await fixture(t);
  const file = f.file('cancel.txt');
  await fs.writeFile(file, 'old');
  const read = t.mock.method(f.service.files, 'read');
  const write = t.mock.method(f.service.files, 'write');
  await assert.rejects(
    f.service.editBlock({ file_path: file, old_string: 'old', new_string: 'bad' }, AbortSignal.abort()),
    { code: 'CANCELLED' },
  );
  assert.equal(read.mock.callCount(), 0);
  assert.equal(write.mock.callCount(), 0);
  await assertBytes(file, 'old');
});

for (const old_string of ['old\nvalue', 'absent']) {
  test('cancellation during edit_block read takes precedence over matching: ' + old_string, async (t) => {
    const f = await fixture(t);
    const file = f.file('cancel.txt');
    const before = 'old\r\nvalue';
    await fs.writeFile(file, before);
    const controller = new AbortController();
    const read = f.service.files.read.bind(f.service.files);
    t.mock.method(f.service.files, 'read', async (...args) => {
      const result = await read(...args);
      controller.abort();
      return result;
    });
    const write = t.mock.method(f.service.files, 'write');
    await assert.rejects(
      f.service.editBlock({ file_path: file, old_string, new_string: 'bad' }, controller.signal),
      { code: 'CANCELLED' },
    );
    assert.equal(write.mock.callCount(), 0);
    await assertBytes(file, before);
    await assertNoStaging(f.root);
  });
}

test('edit_block rejects oversized repeated replacement before allocating the output string', async (t) => {
  const f = await fixture(t);
  const file = f.file('allocation.txt');
  const before = 'x'.repeat(10000) + '\r\n';
  const replacement = '\n'.repeat(limit);
  // Even the original unnormalized result exceeds V8's string ceiling. Its
  // join fails before allocation; the repaired path must return the byte-limit
  // error before constructing any oversized result, including CRLF expansion.
  assert.ok(replacement.length * 10000 > bufferConstants.MAX_STRING_LENGTH);
  await fs.writeFile(file, before);
  await assert.rejects(
    f.service.editBlock({
      file_path: file,
      old_string: 'x',
      new_string: replacement,
      expected_replacements: 10000,
    }),
    { code: 'FILE_TOO_LARGE' },
  );
  await assertBytes(file, before);
  await assertNoStaging(f.root);
});
