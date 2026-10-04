// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-04-local-mcp
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const mod = await import('../dist/files.js').catch(() => ({}));
async function fixture(t, options = {}) {
  assert.equal(typeof mod.FileService, 'function', 'FileService must be implemented');
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-safe-files-'));
  const root = path.join(parent, 'root');
  await fs.mkdir(root);
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  return { parent, root, service: await mod.FileService.create(root, options) };
}
const code = (c) => (e) => e?.code === c;
test('read-only default denies write without modifying existing bytes', async (t) => {
  const { root, service } = await fixture(t);
  await fs.writeFile(path.join(root, 'a.txt'), 'old');
  await assert.rejects(
    service.write({ path: 'a.txt', text: 'new', expectedVersion: 'missing' }),
    code('WRITE_DISABLED'),
  );
  assert.equal(await fs.readFile(path.join(root, 'a.txt'), 'utf8'), 'old');
});
test('UTF8 round trip returns SHA version, guarded update and directory listing', async (t) => {
  const { service } = await fixture(t, { allowWrite: true });
  await service.mkdir({ path: 'nested' });
  const created = await service.write({
    path: 'nested/文.txt',
    text: 'hello 🌎\nsecond\n',
    expectedVersion: 'missing',
  });
  assert.match(created.version, /^[a-f0-9]{64}$/);
  const read = await service.read({ path: 'nested/文.txt' });
  assert.equal(read.text, 'hello 🌎\nsecond\n');
  await service.write({ path: 'nested/文.txt', text: 'updated', expectedVersion: read.version });
  await assert.rejects(
    service.write({ path: 'nested/文.txt', text: 'stale', expectedVersion: read.version }),
    code('CONFLICT'),
  );
  assert.equal((await service.read({ path: 'nested/文.txt' })).text, 'updated');
  assert.equal((await service.list({ path: 'nested', limit: 1 })).entries[0].name, '文.txt');
});
test('missing precondition never replaces existing target; malformed values rejected', async (t) => {
  const { root, service } = await fixture(t, { allowWrite: true });
  await fs.writeFile(path.join(root, 'a.txt'), 'safe');
  for (const value of [null, 42, false, {}, [], undefined])
    await assert.rejects(service.write({ path: 'a.txt', text: value, expectedVersion: 'missing' }));
  await assert.rejects(
    service.write({ path: 'a.txt', text: 'bad', expectedVersion: 'missing' }),
    code('CONFLICT'),
  );
  assert.equal(await fs.readFile(path.join(root, 'a.txt'), 'utf8'), 'safe');
});
test('outside-root, private metadata and Windows special paths fail closed', async (t) => {
  const { parent, service } = await fixture(t, { allowWrite: true });
  await fs.writeFile(path.join(parent, 'outside.txt'), 'not for tool');
  for (const name of [
    '../outside.txt',
    path.join(parent, 'outside.txt'),
    '.git/config',
    '.codex/auth.json',
    '.env',
    'x.txt:secret',
    'NUL',
    'a.',
    'a ',
  ]) {
    await assert.rejects(service.read({ path: name }));
    await assert.rejects(service.write({ path: name, text: 'bad', expectedVersion: 'missing' }));
  }
  assert.equal(await fs.readFile(path.join(parent, 'outside.txt'), 'utf8'), 'not for tool');
});
test('junction/symlink and hardlink escapes are refused', async (t) => {
  const { root, parent, service } = await fixture(t, { allowWrite: true });
  const outside = path.join(parent, 'outside');
  await fs.mkdir(outside);
  await fs.writeFile(path.join(outside, 'secret'), 'safe');
  await fs.symlink(outside, path.join(root, 'jump'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(service.read({ path: 'jump/secret' }));
  await assert.rejects(service.write({ path: 'jump/new', text: 'x', expectedVersion: 'missing' }));
  await fs.link(path.join(outside, 'secret'), path.join(root, 'hard'));
  await assert.rejects(service.read({ path: 'hard' }), code('LINK_REJECTED'));
  const found = await service.search({ path: '.', query: 'safe', mode: 'content' });
  assert.equal(found.results.length, 0);
});
test('read byte cap and strict UTF8 reject oversized, binary and malformed files', async (t) => {
  const { root, service } = await fixture(t, { maxBytes: 64, allowWrite: true });
  await fs.writeFile(path.join(root, 'big'), Buffer.alloc(65, 65));
  await assert.rejects(service.read({ path: 'big' }), code('FILE_TOO_LARGE'));
  await fs.writeFile(path.join(root, 'bad'), Buffer.from([0xc3, 0x28]));
  await assert.rejects(service.read({ path: 'bad' }), code('INVALID_UTF8'));
  await fs.writeFile(path.join(root, 'zero'), Buffer.from([65, 0, 66]));
  await assert.rejects(service.read({ path: 'zero' }), code('BINARY_FILE'));
  await assert.rejects(
    service.write({ path: 'oversize', text: 'x'.repeat(65), expectedVersion: 'missing' }),
    code('FILE_TOO_LARGE'),
  );
});
test('no-overwrite move preserves both files on collision', async (t) => {
  const { service } = await fixture(t, { allowWrite: true });
  await service.write({ path: 'a', text: 'A', expectedVersion: 'missing' });
  await service.write({ path: 'b', text: 'B', expectedVersion: 'missing' });
  await assert.rejects(service.move({ source: 'a', destination: 'b' }), code('CONFLICT'));
  assert.equal((await service.read({ path: 'a' })).text, 'A');
  assert.equal((await service.read({ path: 'b' })).text, 'B');
  await service.move({ source: 'a', destination: 'c' });
  assert.equal((await service.read({ path: 'c' })).text, 'A');
  await assert.rejects(service.read({ path: 'a' }));
});
test('bounded searches exclude private/expensive trees and support cancellation', async (t) => {
  const { root, service } = await fixture(t, { allowWrite: true });
  for (let i = 0; i < 6; i++)
    await service.write({ path: `test${i}.txt`, text: 'find this', expectedVersion: 'missing' });
  await fs.mkdir(path.join(root, 'node_modules'));
  await fs.writeFile(path.join(root, 'node_modules', 'find.txt'), 'find this');
  const names = await service.search({ path: '.', query: 'test', mode: 'name', maxResults: 2 });
  assert.equal(names.results.length, 2);
  assert.equal(names.truncated, true);
  const body = await service.search({ path: '.', query: 'find', mode: 'content', maxResults: 20 });
  assert.equal(body.results.length, 6);
  const visited = await service.search({ path: '.', query: 'absent', mode: 'content', maxVisited: 2 });
  assert.equal(visited.truncated, true);
  assert.ok(visited.visited <= 2);
  const c = new AbortController();
  c.abort();
  await assert.rejects(
    service.search({ path: '.', query: 'find', mode: 'content' }, c.signal),
    code('CANCELLED'),
  );
});
test('invalid limits and unknown fields never trigger destructive work', async (t) => {
  const { service } = await fixture(t, { allowWrite: true });
  for (const limit of [-1, 0, 1.5, NaN, '5']) await assert.rejects(service.list({ path: '.', limit }));
  await assert.rejects(
    service.write({ path: 'no', text: 'x', expectedVersion: 'missing', unexpected: true }),
  );
  assert.equal((await service.list({ path: '.' })).entries.length, 0);
});
test('file ranges expose total lines and explicit remaining state', async (t) => {
  const { service } = await fixture(t, { allowWrite: true });
  await service.write({ path: 'lines', text: 'a\nb\nc', expectedVersion: 'missing' });
  const r = await service.read({ path: 'lines', offset: 1, length: 1 });
  assert.equal(r.text, 'b');
  assert.equal(r.totalLines, 3);
  assert.equal(r.nextOffset, 2);
});

test('aborted mutation cannot create a file after cancellation', async (t) => {
  const { root, service } = await fixture(t, { allowWrite: true });
  const c = new AbortController();
  c.abort();
  await assert.rejects(
    service.write({ path: 'cancelled', text: 'no', expectedVersion: 'missing' }, c.signal),
    code('CANCELLED'),
  );
  assert.equal((await fs.readdir(root)).length, 0);
});
