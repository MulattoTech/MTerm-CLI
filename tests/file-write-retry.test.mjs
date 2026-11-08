// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-08-aug003-registry-persistence (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const packageRoot = process.env.MTERM_VERIFY_BIN
  ? path.resolve(path.dirname(process.env.MTERM_VERIFY_BIN), '..')
  : path.resolve(import.meta.dirname, '..');
const installedModule = (name) => import(pathToFileURL(path.join(packageRoot, 'dist', name)).href);
const { FileService } = await installedModule('files.js');
const nativePlatform = process.platform;
const fault = (code) => Object.assign(new Error('PRIVATE_UNDERLYING_ERROR_MUST_NOT_ESCAPE'), { code });
async function fixture(t) {
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-file-retry-')));
  const root = path.join(parent, 'root');
  await fs.mkdir(root);
  t.after(() => fs.rm(parent, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }));
  const file = path.join(root, 'data.txt'),
    before = Buffer.from('\ufefforiginal 🌎\n');
  await fs.writeFile(file, before);
  const service = await FileService.create(root, { allowWrite: true });
  const expectedVersion = createHash('sha256').update(before).digest('hex');
  return {
    parent,
    root,
    file,
    before,
    service,
    write: (signal) => service.write({ path: 'data.txt', text: 'replacement\n', expectedVersion }, signal),
  };
}
// Fault substitution exists only in this sequential test process. No runtime switch.
async function withFault(platform, hooks, action) {
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
  const originals = Object.fromEntries(Object.keys(hooks).map((k) => [k, fs[k]]));
  Object.defineProperty(process, 'platform', { ...descriptor, value: platform });
  for (const [name, hook] of Object.entries(hooks)) fs[name] = (...args) => hook(originals[name], ...args);
  try {
    return await action();
  } finally {
    for (const [name, value] of Object.entries(originals)) fs[name] = value;
    Object.defineProperty(process, 'platform', descriptor);
  }
}
async function clean(f) {
  assert.deepEqual(await fs.readdir(f.root), ['data.txt']);
}

test('file replacement recovers only exact Windows rename EPERM and EBUSY without destination deletion', async (t) => {
  const f = await fixture(t);
  let attempts = 0,
    deletedDestination = false;
  await withFault(
    'win32',
    {
      rename: async (rename, source, target) => {
        if (target === f.file) {
          attempts++;
          assert.deepEqual(await fs.readFile(target), f.before);
          if (attempts < 3) throw fault(attempts === 1 ? 'EPERM' : 'EBUSY');
        }
        return rename(source, target);
      },
      unlink: async (unlink, file) => {
        if (file === f.file) deletedDestination = true;
        return unlink(file);
      },
    },
    () => f.write(),
  );
  assert.equal(attempts, 3);
  assert.equal(deletedDestination, false);
  assert.equal(await fs.readFile(f.file, 'utf8'), 'replacement\n');
  await clean(f);
});
test('persistent Windows file replacement failure stops after five attempts with original bytes intact', async (t) => {
  const f = await fixture(t);
  let attempts = 0;
  await withFault(
    'win32',
    {
      rename: async (rename, source, target) => {
        if (target === f.file) {
          attempts++;
          throw fault('EBUSY');
        }
        return rename(source, target);
      },
    },
    () => assert.rejects(f.write(), (e) => e.code === 'EBUSY'),
  );
  assert.equal(attempts, 5);
  assert.deepEqual(await fs.readFile(f.file), f.before);
  await clean(f);
});
for (const [platform, code] of [
  ['linux', 'EPERM'],
  ['darwin', 'EBUSY'],
  ['win32', 'EACCES'],
  ['win32', 'EIO'],
]) {
  test('file replacement does not retry ' + platform + ' ' + code, async (t) => {
    const f = await fixture(t);
    let attempts = 0;
    await withFault(
      platform,
      {
        rename: async (rename, source, target) => {
          if (target === f.file) {
            attempts++;
            throw fault(code);
          }
          return rename(source, target);
        },
      },
      () => assert.rejects(f.write(), (e) => e.code === code),
    );
    assert.equal(attempts, 1);
    assert.deepEqual(await fs.readFile(f.file), f.before);
    await clean(f);
  });
}
for (const scenario of ['edit', 'disappear', 'new-inode', 'permissions']) {
  test('file replacement revalidates destination ' + scenario + ' during retry', async (t) => {
    const f = await fixture(t);
    let attempts = 0;
    try {
      await withFault(
        'win32',
        {
          rename: async (rename, source, target) => {
            if (target !== f.file) return rename(source, target);
            attempts++;
            if (scenario === 'edit') await fs.writeFile(target, 'external edit');
            if (scenario === 'disappear') await fs.unlink(target);
            if (scenario === 'new-inode') {
              await rename(target, path.join(f.parent, 'retained-original'));
              await fs.writeFile(target, f.before);
            }
            if (scenario === 'permissions') await fs.chmod(target, 0o400);
            throw fault('EPERM');
          },
        },
        () => assert.rejects(f.write(), (e) => e.code === 'CONFLICT'),
      );
      assert.equal(attempts, 1);
      if (scenario === 'disappear') assert.equal(await fs.stat(f.file).catch(() => null), null);
      else
        assert.deepEqual(
          await fs.readFile(f.file),
          scenario === 'edit' ? Buffer.from('external edit') : f.before,
        );
    } finally {
      if (scenario === 'permissions') await fs.chmod(f.file, 0o600);
    }
  });
}
for (const scenario of ['hardlink', 'directory']) {
  test('file replacement refuses destination ' + scenario + ' introduced during backoff', async (t) => {
    const f = await fixture(t);
    let attempts = 0;
    const retained = path.join(f.parent, 'retained-data');
    await withFault(
      'win32',
      {
        rename: async (rename, source, target) => {
          if (target !== f.file) return rename(source, target);
          attempts++;
          await rename(target, retained);
          if (scenario === 'hardlink') await fs.link(retained, target);
          else await fs.mkdir(target);
          throw fault('EPERM');
        },
      },
      () => assert.rejects(f.write(), (e) => ['LINK_REJECTED', 'NOT_FILE', 'CONFLICT'].includes(e.code)),
    );
    assert.equal(attempts, 1);
    assert.deepEqual(await fs.readFile(retained), f.before);
  });
}
test('file replacement cancellation during backoff prevents another rename', async (t) => {
  const f = await fixture(t),
    controller = new AbortController();
  let attempts = 0;
  await withFault(
    'win32',
    {
      rename: async (rename, source, target) => {
        if (target === f.file) {
          attempts++;
          controller.abort();
          throw fault('EPERM');
        }
        return rename(source, target);
      },
    },
    () => assert.rejects(f.write(controller.signal), (e) => e.code === 'CANCELLED'),
  );
  assert.equal(attempts, 1);
  assert.deepEqual(await fs.readFile(f.file), f.before);
  await clean(f);
});
for (const linked of [true, false]) {
  test(
    'file replacement and stage cleanup reject a ' + (linked ? 'linked' : 'replaced') + ' parent',
    async (t) => {
      const f = await fixture(t);
      let attempts = 0,
        decoy,
        moved = false;
      const retained = path.join(f.parent, 'retained-root'),
        external = path.join(f.parent, 'external');
      await fs.mkdir(external);
      try {
        await withFault(
          'win32',
          {
            rename: async (rename, source, target) => {
              if (target !== f.file) return rename(source, target);
              attempts++;
              await rename(f.root, retained);
              moved = true;
              if (linked) await fs.symlink(external, f.root, nativePlatform === 'win32' ? 'junction' : 'dir');
              else await fs.mkdir(f.root);
              decoy = path.join(linked ? external : f.root, path.basename(source));
              await fs.writeFile(decoy, 'unrelated staging-name sentinel');
              throw fault('EPERM');
            },
          },
          () =>
            assert.rejects(f.write(), (e) => ['LINK_REJECTED', 'OUTSIDE_ROOT', 'CONFLICT'].includes(e.code)),
        );
        assert.equal(attempts, 1);
        assert.equal(await fs.readFile(decoy, 'utf8'), 'unrelated staging-name sentinel');
        assert.deepEqual(await fs.readFile(path.join(retained, 'data.txt')), f.before);
        assert.ok((await fs.readdir(retained)).some((n) => n.startsWith('.mterm-')));
      } finally {
        if (moved) {
          if (linked) await fs.unlink(f.root);
          else await fs.rm(f.root, { recursive: true, force: true });
          await fs.rename(retained, f.root);
        }
      }
    },
  );
}
for (const scenario of ['new-inode', 'modified-bytes', 'hardlink']) {
  test('file replacement refuses and retains ' + scenario + ' staging substitution', async (t) => {
    const f = await fixture(t);
    let attempts = 0,
      stage;
    const retained = path.join(f.parent, 'retained-stage');
    await withFault(
      'win32',
      {
        rename: async (rename, source, target) => {
          if (target !== f.file) return rename(source, target);
          attempts++;
          stage = source;
          if (scenario === 'new-inode') {
            await rename(source, retained);
            await fs.writeFile(source, 'unrelated replacement stage');
          }
          if (scenario === 'modified-bytes') await fs.writeFile(source, 'changed staging bytes');
          if (scenario === 'hardlink') await fs.link(source, retained);
          throw fault('EPERM');
        },
      },
      () => assert.rejects(f.write(), (e) => ['STAGING_CHANGED', 'LINK_REJECTED'].includes(e.code)),
    );
    assert.equal(attempts, 1);
    assert.deepEqual(await fs.readFile(f.file), f.before);
    assert.ok(await fs.stat(stage), 'unverifiable stage remains untouched');
    if (scenario === 'new-inode')
      assert.equal(await fs.readFile(stage, 'utf8'), 'unrelated replacement stage');
    if (scenario === 'modified-bytes')
      assert.equal(await fs.readFile(stage, 'utf8'), 'changed staging bytes');
  });
}
test('no-overwrite file creation retains its link contract and never retries link failures', async (t) => {
  const f = await fixture(t);
  let calls = 0;
  const dest = path.join(f.root, 'new.txt');
  await withFault(
    'win32',
    {
      link: async (link, source, target) => {
        if (target === dest) {
          calls++;
          throw fault('EBUSY');
        }
        return link(source, target);
      },
    },
    () =>
      assert.rejects(
        f.service.write({ path: 'new.txt', text: 'new', expectedVersion: 'missing' }),
        (e) => e.code === 'EBUSY',
      ),
  );
  assert.equal(calls, 1);
  assert.equal(await fs.stat(dest).catch(() => null), null);
  await clean(f);
  await f.service.write({ path: 'new.txt', text: 'created', expectedVersion: 'missing' });
  assert.equal((await fs.stat(dest)).nlink, 1);
  assert.equal(await fs.readFile(dest, 'utf8'), 'created');
  await assert.rejects(
    f.service.write({ path: 'new.txt', text: 'overwrite', expectedVersion: 'missing' }),
    (e) => e.code === 'CONFLICT',
  );
  assert.equal(await fs.readFile(dest, 'utf8'), 'created');
});

test('file replacement keeps the destination version check after staging reads', async (t) => {
  const f = await fixture(t);
  let edited = false,
    renames = 0;
  await withFault(
    'win32',
    {
      open: async (open, file, ...args) => {
        const h = await open(file, ...args);
        if (path.dirname(file) === f.root && path.basename(file).startsWith('.mterm-') && args[0] !== 'wx') {
          const read = h.read.bind(h);
          h.read = async (...values) => {
            const result = await read(...values);
            if (!edited) {
              edited = true;
              await fs.writeFile(f.file, 'external edit during stage validation');
            }
            return result;
          };
        }
        return h;
      },
      rename: async (rename, ...args) => {
        renames++;
        return rename(...args);
      },
    },
    () => assert.rejects(f.write(), (e) => e.code === 'CONFLICT'),
  );
  assert.equal(edited, true);
  assert.equal(renames, 0);
  assert.equal(await fs.readFile(f.file, 'utf8'), 'external edit during stage validation');
  await clean(f);
});
test('file creation recovers transient owned-stage unlink failures without repeating its hard link', async (t) => {
  const f = await fixture(t);
  const target = path.join(f.root, 'new.txt');
  let links = 0,
    unlinks = 0;
  await withFault(
    'win32',
    {
      link: async (link, ...args) => {
        links++;
        return link(...args);
      },
      unlink: async (unlink, file) => {
        if (path.basename(file).startsWith('.mterm-') && ++unlinks < 3)
          throw fault(unlinks === 1 ? 'EPERM' : 'EBUSY');
        assert.notEqual(file, target);
        return unlink(file);
      },
    },
    () => f.service.write({ path: 'new.txt', text: 'created', expectedVersion: 'missing' }),
  );
  assert.equal(links, 1);
  assert.equal(unlinks, 3);
  assert.equal((await fs.stat(target)).nlink, 1);
  assert.equal((await f.service.read({ path: 'new.txt' })).text, 'created');
  assert.deepEqual((await fs.readdir(f.root)).sort(), ['data.txt', 'new.txt']);
});
test('file creation reports committed bytes and persistent owned-stage cleanup failure', async (t) => {
  const f = await fixture(t);
  const target = path.join(f.root, 'new.txt');
  let links = 0,
    unlinks = 0;
  await withFault(
    'win32',
    {
      link: async (link, ...args) => {
        links++;
        return link(...args);
      },
      unlink: async (unlink, file) => {
        if (path.basename(file).startsWith('.mterm-')) {
          unlinks++;
          throw fault('EPERM');
        }
        return unlink(file);
      },
    },
    () =>
      assert.rejects(
        f.service.write({ path: 'new.txt', text: 'created', expectedVersion: 'missing' }),
        (e) => {
          assert.equal(e.code, 'FILE_WRITE_CLEANUP');
          assert.deepEqual(e.fileWriteOutcome, {
            commit: 'committed',
            phase: 'stage-unlink',
            stage: 'retained',
            cleanupCode: 'EPERM',
          });
          assert.ok(!e.message.includes('PRIVATE_'));
          return true;
        },
      ),
  );
  assert.equal(links, 1);
  assert.equal(unlinks, 5);
  assert.equal(await fs.readFile(target, 'utf8'), 'created');
  assert.equal((await fs.stat(target)).nlink, 2);
  await assert.rejects(f.service.read({ path: 'new.txt' }), (e) => e.code === 'LINK_REJECTED');
  assert.deepEqual(await fs.readFile(f.file), f.before);
});
test('file creation retains a substituted staging name and reports the confirmed commit', async (t) => {
  const f = await fixture(t);
  const target = path.join(f.root, 'new.txt'),
    retained = path.join(f.parent, 'retained-stage');
  let stage,
    unlinks = 0;
  await withFault(
    'win32',
    {
      link: async (link, source, destination) => {
        await link(source, destination);
        stage = source;
        await fs.rename(source, retained);
        await fs.writeFile(source, 'unrelated staging sentinel');
      },
      unlink: async (unlink, file) => {
        if (file === stage) unlinks++;
        return unlink(file);
      },
    },
    () =>
      assert.rejects(
        f.service.write({ path: 'new.txt', text: 'created', expectedVersion: 'missing' }),
        (e) => {
          assert.equal(e.code, 'FILE_WRITE_CLEANUP');
          assert.deepEqual(e.fileWriteOutcome, {
            commit: 'committed',
            phase: 'stage-check',
            stage: 'retained',
            cleanupCode: 'STAGING_CHANGED',
          });
          return true;
        },
      ),
  );
  assert.equal(unlinks, 0);
  assert.equal(await fs.readFile(stage, 'utf8'), 'unrelated staging sentinel');
  assert.equal(await fs.readFile(target, 'utf8'), 'created');
  assert.equal(await fs.readFile(retained, 'utf8'), 'created');
});
for (const operation of ['writeFile', 'sync']) {
  test('file staging preserves ' + operation + ' failure when descriptor close also fails', async (t) => {
    const f = await fixture(t);
    let renames = 0,
      stage;
    await withFault(
      'win32',
      {
        open: async (open, file, ...args) => {
          const h = await open(file, ...args);
          if (
            path.dirname(file) === f.root &&
            path.basename(file).startsWith('.mterm-') &&
            args[0] === 'wx'
          ) {
            stage = file;
            const close = h.close.bind(h),
              write = h.writeFile.bind(h),
              sync = h.sync.bind(h);
            if (operation === 'writeFile')
              h.writeFile = async (bytes) => {
                await write(bytes.subarray(0, 3));
                throw fault('EIO');
              };
            else
              h.sync = async () => {
                await sync();
                throw fault('EIO');
              };
            h.close = async () => {
              await close();
              throw fault('EPERM');
            };
          }
          return h;
        },
        rename: async (rename, ...args) => {
          renames++;
          return rename(...args);
        },
      },
      () =>
        assert.rejects(f.write(), (e) => {
          assert.equal(e.code, 'EIO');
          assert.match(e.message, /stage-close.*EPERM/);
          assert.ok(!e.message.includes('PRIVATE_'));
          return true;
        }),
    );
    assert.equal(renames, 0);
    assert.deepEqual(await fs.readFile(f.file), f.before);
    assert.ok(await fs.stat(stage), 'unconfirmed descriptor closure never authorizes stage deletion');
  });
}
