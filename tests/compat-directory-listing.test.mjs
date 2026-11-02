// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-directory-contract (OpenAI / GPT-6 Astra Pro; self-reported)
// Original bounded-listing fixtures. Pinned response references: docs/parity/upstream/.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { DesktopCommanderFiles } from '../dist/desktop-commander-files.js';

async function fixture(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-directory-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return {
    root,
    service: await DesktopCommanderFiles.create(root),
    file: (...parts) => path.join(root, ...parts),
  };
}
const text = (result) => result.content[0].text;
const fileEntry = (name) => ({ name, isDirectory: () => false, isSymbolicLink: () => false });
const numberName = (i) => 'file-' + String(i).padStart(4, '0') + '.txt';
async function writeNames(dir, names) {
  await fs.mkdir(dir, { recursive: true });
  for (let i = 0; i < names.length; i += 50)
    await Promise.all(names.slice(i, i + 50).map((name) => fs.writeFile(path.join(dir, name), '')));
}
function stream(entries, options = {}) {
  const observed = { consumed: 0, nextCalls: 0, returned: 0 };
  const value = {
    [Symbol.asyncIterator]() {
      let index = 0;
      return {
        async next() {
          observed.nextCalls++;
          await options.beforeNext?.(index);
          if (index === options.errorAt)
            throw Object.assign(new Error('PRIVATE-ERROR-SENTINEL'), { code: options.code });
          if (index >= entries.length) return { done: true, value: undefined };
          observed.consumed++;
          return { done: false, value: entries[index++] };
        },
        async return() {
          observed.returned++;
          return { done: true, value: undefined };
        },
      };
    },
  };
  return { value, observed };
}
function interceptDirectory(t, cases) {
  const original = fs.opendir.bind(fs);
  t.mock.method(fs, 'opendir', async (dir, ...args) => {
    const replacement = cases.get(path.resolve(String(dir)));
    return replacement ? replacement() : original(dir, ...args);
  });
}
function observeOpen(t, root, afterOpen) {
  const original = fs.opendir.bind(fs);
  const observed = { handle: undefined, nextCalls: 0 };
  t.mock.method(fs, 'opendir', async (dir, ...args) => {
    const handle = await original(dir, ...args);
    if (path.resolve(String(dir)) !== root) return handle;
    observed.handle = handle;
    const iterate = handle[Symbol.asyncIterator].bind(handle);
    t.mock.method(handle, Symbol.asyncIterator, () => {
      const iterator = iterate();
      const next = iterator.next.bind(iterator);
      iterator.next = (...values) => {
        observed.nextCalls++;
        return next(...values);
      };
      return iterator;
    });
    afterOpen();
    return handle;
  });
  t.after(async () => {
    try {
      await observed.handle?.close();
    } catch (error) {
      if (error.code !== 'ERR_DIR_CLOSED') throw error;
    }
  });
  return observed;
}

test('nested overflow selects a stable lexical prefix and appends an exact visible-only warning', async (t) => {
  const f = await fixture(t);
  const dir = f.file('nested');
  const names = Array.from({ length: 103 }, (_, i) => numberName(i));
  await writeNames(dir, names);
  await fs.mkdir(path.join(dir, '.ssh'));
  await fs.mkdir(path.join(dir, '.aws'));
  await fs.writeFile(path.join(dir, '.env'), 'PRIVATE-CONTENT-SENTINEL');
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let reverse = false;
  const streams = [];
  interceptDirectory(
    t,
    new Map([
      [
        dir,
        () => {
          const ordered = [...entries].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
          const current = stream(reverse ? ordered.reverse() : ordered);
          streams.push(current);
          return current.value;
        },
      ],
    ]),
  );
  const expected = [
    '[DIR] nested',
    ...names.slice(0, 100).map((name) => '[FILE] nested/' + name),
    '[WARNING] nested: 3 items hidden (showing first 100 of 103 total)',
  ].join('\n');
  assert.equal(text(await f.service.listDirectory({ path: f.root })), expected);
  reverse = true;
  assert.equal(text(await f.service.listDirectory({ path: f.root, depth: 2 })), expected);
  assert.deepEqual(
    streams.map((s) => s.observed.consumed),
    [106, 106],
  );
  assert.ok(streams.every((s) => s.observed.returned === 1));
  assert.doesNotMatch(expected, /\.ssh|\.aws|\.env|SENTINEL/);
});

test('top-level 1000-entry cap stays bounded and reports its exact completed count', async (t) => {
  const f = await fixture(t);
  const names = Array.from({ length: 1001 }, (_, i) => numberName(i));
  await writeNames(f.root, names);
  const entries = (await fs.readdir(f.root, { withFileTypes: true })).reverse();
  const current = stream(entries);
  interceptDirectory(t, new Map([[f.root, () => current.value]]));
  const result = text(await f.service.listDirectory({ path: f.root, depth: 1 }));
  const expected = [
    ...names.slice(0, 1000).map((name) => '[FILE] ' + name),
    `[WARNING] ${path.basename(f.root)}: 1 items hidden (showing first 1000 of 1001 total)`,
  ].join('\n');
  assert.equal(result, expected);
  assert.equal(current.observed.consumed, 1001);
  assert.equal(current.observed.returned, 1);
});

test('depth zero does no enumeration, default depth is two and private names stay absent', async (t) => {
  const f = await fixture(t);
  await fs.mkdir(f.file('sub', 'deep'), { recursive: true });
  await fs.writeFile(f.file('sub', 'one.txt'), '');
  await fs.writeFile(f.file('sub', 'deep', 'two.txt'), '');
  await fs.mkdir(f.file('.ssh'));
  const original = fs.opendir.bind(fs);
  let opens = 0;
  t.mock.method(fs, 'opendir', (...args) => {
    opens++;
    return original(...args);
  });
  assert.equal(text(await f.service.listDirectory({ path: f.root, depth: 0 })), '');
  assert.equal(opens, 0);
  assert.equal(text(await f.service.listDirectory({ path: f.root, depth: 1 })), '[DIR] sub');
  assert.equal(
    text(await f.service.listDirectory({ path: f.root })),
    '[DIR] sub\n[DIR] sub/deep\n[FILE] sub/one.txt',
  );
});

for (const code of ['ENOENT', 'EACCES', 'EPERM', 'ETIMEDOUT', 'EIO']) {
  test(`nested iterator ${code} retains collected entries with a safe incomplete diagnostic`, async (t) => {
    const f = await fixture(t);
    const dir = f.file('nested');
    await writeNames(dir, ['good.txt', 'unread.txt']);
    const current = stream([fileEntry('good.txt'), fileEntry('unread.txt')], { errorAt: 1, code });
    interceptDirectory(t, new Map([[dir, () => current.value]]));
    const result = text(await f.service.listDirectory({ path: f.root, depth: 2 }));
    const diagnostic =
      code === 'ENOENT'
        ? '[NOT_FOUND] nested — path does not exist'
        : ['EACCES', 'EPERM', 'ETIMEDOUT'].includes(code)
          ? '[DENIED] nested — not accessible (permission denied, cloud-only file, or Full Disk Access not granted)'
          : '[DENIED] nested';
    assert.equal(
      result,
      [
        '[DIR] nested',
        '[FILE] nested/good.txt',
        diagnostic,
        '[WARNING] nested: listing incomplete; additional entries may be omitted.',
      ].join('\n'),
    );
    assert.doesNotMatch(result, /PRIVATE-ERROR-SENTINEL|showing first|total|unread\.txt/);
    assert.equal(current.observed.returned, 1);
  });
}

test('unopenable nested directory reports an operational error while a later sibling remains visible', async (t) => {
  const f = await fixture(t);
  await fs.mkdir(f.file('blocked'));
  await fs.writeFile(f.file('later.txt'), '');
  interceptDirectory(
    t,
    new Map([
      [
        f.file('blocked'),
        () => {
          throw Object.assign(new Error('PRIVATE-ERROR-SENTINEL'), { code: 'EACCES' });
        },
      ],
    ]),
  );
  const result = text(await f.service.listDirectory({ path: f.root }));
  assert.match(result, /\[DENIED\] blocked — not accessible/);
  assert.match(result, /\[FILE\] later\.txt/);
  assert.doesNotMatch(result, /PRIVATE-ERROR-SENTINEL|showing first|total/);
});

test('global entry bound consumes at most 4000 dirents and preserves bounded partial results', async (t) => {
  const f = await fixture(t);
  const first = f.file('a');
  const second = f.file('z');
  await writeNames(
    first,
    Array.from({ length: 100 }, (_, i) => numberName(i)),
  );
  await writeNames(
    second,
    Array.from({ length: 100 }, (_, i) => numberName(i)),
  );
  const a = stream(Array.from({ length: 3500 }, (_, i) => fileEntry(numberName(i))));
  const z = stream(Array.from({ length: 1000 }, (_, i) => fileEntry(numberName(i))));
  interceptDirectory(
    t,
    new Map([
      [first, () => a.value],
      [second, () => z.value],
    ]),
  );
  const result = text(await f.service.listDirectory({ path: f.root, depth: 2 }));
  assert.equal(a.observed.consumed + z.observed.consumed + 2, 4000);
  assert.equal(z.observed.nextCalls, 498, 'No 4001st dirent or EOF lookahead is consumed');
  assert.match(result, /\[FILE\] a\/file-0000\.txt/);
  assert.match(result, /\[FILE\] z\/file-0000\.txt/);
  assert.match(result, /\[WARNING\] a: 3400 items hidden \(showing first 100 of 3500 total\)/);
  assert.match(result, /\[WARNING\] z: listing incomplete; additional entries may be omitted\./);
  assert.doesNotMatch(result, /z: \d+ items hidden/);
  assert.equal((result.match(/\[WARNING\] Directory traversal/g) ?? []).length, 1);
  assert.match(result, /4000-entry limit; listing is incomplete\.$/);
  assert.equal(a.observed.returned, 1);
  assert.equal(z.observed.returned, 1);
});

test('exactly 4000 inspected entries without an observed EOF never invents a complete total', async (t) => {
  const f = await fixture(t);
  await writeNames(
    f.root,
    Array.from({ length: 1000 }, (_, i) => numberName(i)),
  );
  const current = stream(Array.from({ length: 4000 }, (_, i) => fileEntry(numberName(i))));
  interceptDirectory(t, new Map([[f.root, () => current.value]]));
  const result = text(await f.service.listDirectory({ path: f.root, depth: 1 }));
  assert.equal(current.observed.nextCalls, 4000);
  assert.equal(current.observed.consumed, 4000);
  assert.match(result, /listing incomplete/);
  assert.doesNotMatch(result, /showing first|of 4000 total/);
  assert.equal((result.match(/\[WARNING\] Directory traversal/g) ?? []).length, 1);
});

test('deadline is checked after a pending policy lookup and stops further emission work', async (t) => {
  const f = await fixture(t);
  await writeNames(f.root, ['a.txt', 'b.txt', 'c.txt']);
  let now = 0;
  t.mock.method(performance, 'now', () => now);
  const original = f.service.files.policy.resolve.bind(f.service.files.policy);
  const resolved = [];
  t.mock.method(f.service.files.policy, 'resolve', async (...args) => {
    const result = await original(...args);
    resolved.push(path.basename(result));
    if (result === f.file('b.txt')) now = 5000;
    return result;
  });
  const result = text(await f.service.listDirectory({ path: f.root, depth: 1 }));
  assert.match(result, /^\[FILE\] a\.txt\n/);
  assert.doesNotMatch(result, /\[FILE\] b\.txt|\[FILE\] c\.txt/);
  assert.equal(resolved.includes('c.txt'), false);
  assert.equal((result.match(/\[WARNING\] Directory traversal/g) ?? []).length, 1);
  assert.match(result, /5-second limit; listing is incomplete\.$/);
});

test('response budget includes UTF-8 line-separator bytes', async (t) => {
  const f = await fixture(t);
  const names = Array.from({ length: 1000 }, (_, i) => 'a'.repeat(251) + String(i).padStart(4, '0'));
  const current = stream(names.map(fileEntry));
  interceptDirectory(t, new Map([[f.root, () => current.value]]));
  const allowed = new Set(names.map((name) => f.file(name)));
  const original = f.service.files.policy.resolve.bind(f.service.files.policy);
  // Synthetic metadata isolates the wire-byte limit without requiring OS long-path support.
  t.mock.method(f.service.files.policy, 'resolve', (target, ...args) =>
    allowed.has(target) ? Promise.resolve(target) : original(target, ...args),
  );
  await assert.rejects(f.service.listDirectory({ path: f.root, depth: 1 }), { code: 'RESPONSE_LIMIT' });
  assert.equal(current.observed.returned, 1);
});

test('cancellation during enumeration closes the iterator and remains a cancellation', async (t) => {
  const f = await fixture(t);
  await fs.writeFile(f.file('one.txt'), '');
  const controller = new AbortController();
  const current = stream([fileEntry('one.txt')], { beforeNext: () => controller.abort() });
  interceptDirectory(t, new Map([[f.root, () => current.value]]));
  await assert.rejects(f.service.listDirectory({ path: f.root }, controller.signal), { code: 'CANCELLED' });
  assert.equal(current.observed.returned, 1);
});

test('cancellation during opendir closes the unstarted real directory handle', async (t) => {
  const f = await fixture(t);
  await fs.writeFile(f.file('one.txt'), '');
  const controller = new AbortController();
  const observed = observeOpen(t, f.root, () => controller.abort());
  await assert.rejects(f.service.listDirectory({ path: f.root }, controller.signal), { code: 'CANCELLED' });
  assert.equal(observed.nextCalls, 0);
  await assert.rejects(observed.handle.read(), { code: 'ERR_DIR_CLOSED' });
});

test('deadline during opendir closes the unstarted real directory handle', async (t) => {
  const f = await fixture(t);
  await fs.writeFile(f.file('one.txt'), '');
  let now = 0;
  t.mock.method(performance, 'now', () => now);
  const observed = observeOpen(t, f.root, () => {
    now = 5000;
  });
  const result = text(await f.service.listDirectory({ path: f.root }));
  assert.equal(observed.nextCalls, 0);
  assert.doesNotMatch(result, /one\.txt/);
  assert.match(result, /5-second limit; listing is incomplete\.$/);
  await assert.rejects(observed.handle.read(), { code: 'ERR_DIR_CLOSED' });
});

test('cancellation during a denied entry check cannot become a successful denial line', async (t) => {
  const f = await fixture(t);
  await fs.writeFile(f.file('one.txt'), '');
  const controller = new AbortController();
  const original = f.service.files.policy.resolve.bind(f.service.files.policy);
  t.mock.method(f.service.files.policy, 'resolve', async (target, ...args) => {
    if (target === f.file('one.txt')) {
      controller.abort();
      throw Object.assign(new Error('PRIVATE-ERROR-SENTINEL'), { code: 'EACCES' });
    }
    return original(target, ...args);
  });
  await assert.rejects(f.service.listDirectory({ path: f.root }, controller.signal), { code: 'CANCELLED' });
});

test('root failures, schema limits and private/link boundaries remain failures or denials', async (t) => {
  const f = await fixture(t);
  await fs.mkdir(f.file('.ssh'));
  await fs.mkdir(f.file('ordinary'));
  await fs.writeFile(f.file('ordinary', 'one.txt'), '');
  await fs.symlink(f.file('ordinary'), f.file('link'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(f.service.listDirectory({ path: path.dirname(f.root) }), { code: 'OUTSIDE_ROOT' });
  await assert.rejects(f.service.listDirectory({ path: f.file('.ssh') }), { code: 'PRIVATE_PATH' });
  await assert.rejects(f.service.listDirectory({ path: f.file('link') }), { code: 'LINK_REJECTED' });
  await assert.rejects(f.service.listDirectory({ path: f.file('missing') }), { code: 'ENOENT' });
  for (const depth of [-1, 1.5, 17]) await assert.rejects(f.service.listDirectory({ path: f.root, depth }));
  await assert.rejects(f.service.listDirectory({ path: f.root, origin: 'ui' }));
  const result = text(await f.service.listDirectory({ path: f.root }));
  assert.match(result, /\[DENIED\] link \(link\)/);
  assert.doesNotMatch(result, /\.ssh|link\/one\.txt/);
  await assert.rejects(f.service.listDirectory({ path: f.root, depth: 0 }, AbortSignal.abort()), {
    code: 'CANCELLED',
  });
});
