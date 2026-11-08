// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-08-aug003-registry-persistence (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const packageRoot = process.env.MTERM_VERIFY_BIN
  ? path.resolve(path.dirname(process.env.MTERM_VERIFY_BIN), '..')
  : path.resolve(import.meta.dirname, '..');
const installedModule = (name) => import(pathToFileURL(path.join(packageRoot, 'dist', name)).href);
const { packsMain } = await installedModule('tool-packs.js');
const { safeError } = await installedModule('errors.js');
const nativePlatform = process.platform;
const fault = (code) =>
  Object.assign(new Error('PRIVATE_UNDERLYING_ERROR_MUST_NOT_ESCAPE'), {
    code,
    path: 'PRIVATE_PATH_MUST_NOT_ESCAPE',
  });
async function fixture(t) {
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-registry-outcome-')));
  const root = path.join(parent, 'root');
  await fs.mkdir(root);
  t.after(() => fs.rm(parent, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }));
  const file = path.join(root, 'registry.json'),
    lock = file + '.lock';
  const before = Buffer.from(
    JSON.stringify({
      schemaVersion: 1,
      packs: [
        {
          id: 'fixture',
          version: '1.0.0',
          manifestPath: path.join(root, 'pack.json'),
          manifestSha256: 'a'.repeat(64),
        },
      ],
    }) + '\n',
  );
  await fs.writeFile(file, before);
  const output = [];
  t.mock.method(console, 'log', (...args) => output.push(args.join(' ')));
  return {
    parent,
    root,
    file,
    lock,
    before,
    output,
    remove: (id = 'fixture', apply = true) =>
      packsMain(['uninstall', '--id', id, '--registry', file, ...(apply ? ['--apply'] : [])]),
  };
}
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
function publicOutcome(error, { code, phase, commit, lock, cleanupCode }) {
  assert.equal(error.code, code);
  assert.equal(error.registryOutcome?.phase, phase);
  assert.equal(error.registryOutcome?.commit, commit);
  assert.equal(error.registryOutcome?.lock, lock);
  if (cleanupCode) assert.ok(error.registryOutcome.cleanup.some((e) => e.code === cleanupCode));
  const safe = JSON.stringify(safeError(error));
  assert.match(safe, new RegExp('commit=' + commit));
  assert.ok(!safe.includes('PRIVATE_'), 'raw error data must remain private');
  assert.ok(Buffer.byteLength(safe) < 1024, 'bounded public failure');
  return true;
}
test('pack registry uninstall recovers bounded transient replacement and revokes the registration', async (t) => {
  const f = await fixture(t);
  let renames = 0;
  await withFault(
    'win32',
    {
      rename: async (rename, source, target) => {
        if (target === f.file && ++renames < 3) throw fault(renames === 1 ? 'EPERM' : 'EBUSY');
        return rename(source, target);
      },
    },
    () => f.remove(),
  );
  assert.equal(renames, 3);
  assert.deepEqual(JSON.parse(await fs.readFile(f.file, 'utf8')).packs, []);
  assert.equal(await fs.stat(f.lock).catch(() => null), null);
  assert.equal(JSON.parse(f.output[0]).applied, true);
  assert.equal(JSON.parse(f.output[0]).changed, true);
});
test('pack registry retries only owned Windows lock unlink EPERM and EBUSY', async (t) => {
  const f = await fixture(t);
  let unlinks = 0;
  await withFault(
    'win32',
    {
      unlink: async (unlink, file) => {
        if (file === f.lock && ++unlinks < 3) throw fault(unlinks === 1 ? 'EPERM' : 'EBUSY');
        return unlink(file);
      },
    },
    () => f.remove(),
  );
  assert.equal(unlinks, 3);
  assert.deepEqual(JSON.parse(await fs.readFile(f.file, 'utf8')).packs, []);
  assert.equal(await fs.stat(f.lock).catch(() => null), null);
  assert.equal(JSON.parse(f.output[0]).changed, true);
});
test('registry write failure remains primary when owned lock cleanup also fails', async (t) => {
  const f = await fixture(t);
  let renames = 0,
    unlinks = 0;
  await withFault(
    'win32',
    {
      rename: async (rename, source, target) => {
        if (target === f.file) {
          renames++;
          throw fault('EACCES');
        }
        return rename(source, target);
      },
      unlink: async (unlink, file) => {
        if (file === f.lock) {
          unlinks++;
          throw fault('EBUSY');
        }
        return unlink(file);
      },
    },
    () =>
      assert.rejects(f.remove(), (e) =>
        publicOutcome(e, {
          code: 'EACCES',
          phase: 'write',
          commit: 'not_confirmed',
          lock: 'retained',
          cleanupCode: 'EBUSY',
        }),
      ),
  );
  assert.equal(renames, 1);
  assert.equal(unlinks, 5);
  assert.deepEqual(await fs.readFile(f.file), f.before);
  assert.ok(await fs.stat(f.lock));
  assert.deepEqual(f.output, []);
});
test('committed registry write and failed cleanup are reported without repeating the mutation', async (t) => {
  const f = await fixture(t);
  let renames = 0,
    unlinks = 0;
  await withFault(
    'win32',
    {
      rename: async (rename, source, target) => {
        if (target === f.file) renames++;
        return rename(source, target);
      },
      unlink: async (unlink, file) => {
        if (file === f.lock) {
          unlinks++;
          throw fault('EPERM');
        }
        return unlink(file);
      },
    },
    () =>
      assert.rejects(f.remove(), (e) =>
        publicOutcome(e, {
          code: 'PACK_REGISTRY_CLEANUP',
          phase: 'lock-unlink',
          commit: 'committed',
          lock: 'retained',
          cleanupCode: 'EPERM',
        }),
      ),
  );
  assert.equal(renames, 1);
  assert.equal(unlinks, 5);
  assert.deepEqual(JSON.parse(await fs.readFile(f.file, 'utf8')).packs, []);
  assert.ok(await fs.stat(f.lock));
  assert.deepEqual(f.output, []);
});
test('unchanged registry is distinguished from a commit when cleanup fails', async (t) => {
  const f = await fixture(t);
  let renames = 0;
  await withFault(
    'win32',
    {
      rename: async (rename, ...args) => {
        renames++;
        return rename(...args);
      },
      unlink: async (unlink, file) => {
        if (file === f.lock) throw fault('EPERM');
        return unlink(file);
      },
    },
    () =>
      assert.rejects(f.remove('absent'), (e) =>
        publicOutcome(e, {
          code: 'PACK_REGISTRY_CLEANUP',
          phase: 'lock-unlink',
          commit: 'unchanged',
          lock: 'retained',
          cleanupCode: 'EPERM',
        }),
      ),
  );
  assert.equal(renames, 0);
  assert.deepEqual(await fs.readFile(f.file), f.before);
  assert.deepEqual(f.output, []);
});
test('lock identity inspection failure still closes the acquired descriptor and retains unknown ownership', async (t) => {
  const f = await fixture(t);
  let closes = 0,
    unlinks = 0,
    recoverHandle;
  try {
    await withFault(
      'win32',
      {
        open: async (open, file, ...args) => {
          const h = await open(file, ...args);
          if (file === f.lock) {
            const close = h.close.bind(h);
            recoverHandle = close;
            h.stat = async () => {
              throw fault('EIO');
            };
            h.close = async () => {
              closes++;
              return close();
            };
          }
          return h;
        },
        unlink: async (unlink, file) => {
          if (file === f.lock) unlinks++;
          return unlink(file);
        },
      },
      () =>
        assert.rejects(f.remove(), (e) =>
          publicOutcome(e, {
            code: 'EIO',
            phase: 'lock-identity',
            commit: 'not_confirmed',
            lock: 'retained',
          }),
        ),
    );
  } finally {
    if (recoverHandle && closes === 0) await recoverHandle();
  }
  assert.equal(closes, 1);
  assert.equal(unlinks, 0);
  assert.deepEqual(await fs.readFile(f.file), f.before);
  assert.ok(await fs.stat(f.lock));
});
test('a lock close error is explicit after commit and does not authorize unlink', async (t) => {
  const f = await fixture(t);
  let closes = 0,
    unlinks = 0;
  await withFault(
    'win32',
    {
      open: async (open, file, ...args) => {
        const h = await open(file, ...args);
        if (file === f.lock) {
          const close = h.close.bind(h);
          h.close = async () => {
            closes++;
            await close();
            throw fault('EIO');
          };
        }
        return h;
      },
      unlink: async (unlink, file) => {
        if (file === f.lock) unlinks++;
        return unlink(file);
      },
    },
    () =>
      assert.rejects(f.remove(), (e) =>
        publicOutcome(e, {
          code: 'PACK_REGISTRY_CLEANUP',
          phase: 'lock-close',
          commit: 'committed',
          lock: 'retained',
          cleanupCode: 'EIO',
        }),
      ),
  );
  assert.equal(closes, 1);
  assert.equal(unlinks, 0);
  assert.deepEqual(JSON.parse(await fs.readFile(f.file, 'utf8')).packs, []);
  assert.ok(await fs.stat(f.lock));
});
for (const scenario of ['substituted', 'hardlinked']) {
  test('registry cleanup retains a ' + scenario + ' lock instead of declaring clean success', async (t) => {
    const f = await fixture(t);
    let unlinks = 0;
    const retained = path.join(f.parent, 'retained-lock');
    await withFault(
      'win32',
      {
        open: async (open, file, ...args) => {
          const h = await open(file, ...args);
          if (file === f.lock) {
            const close = h.close.bind(h);
            h.close = async () => {
              await close();
              if (scenario === 'substituted') {
                await fs.rename(f.lock, retained);
                await fs.writeFile(f.lock, 'unrelated lock sentinel');
              } else await fs.link(f.lock, retained);
            };
          }
          return h;
        },
        unlink: async (unlink, file) => {
          if (file === f.lock) unlinks++;
          return unlink(file);
        },
      },
      () =>
        assert.rejects(f.remove(), (e) =>
          publicOutcome(e, {
            code: 'PACK_REGISTRY_CLEANUP',
            phase: 'lock-check',
            commit: 'committed',
            lock: 'retained',
            cleanupCode: 'PACK_REGISTRY_LOCK_CHANGED',
          }),
        ),
    );
    assert.equal(unlinks, 0);
    assert.ok(await fs.stat(f.lock));
    assert.ok(await fs.stat(retained));
    if (scenario === 'substituted')
      assert.equal(await fs.readFile(f.lock, 'utf8'), 'unrelated lock sentinel');
  });
}
test('registry lock cleanup refuses parent redirection and preserves the unrelated lock name', async (t) => {
  const f = await fixture(t);
  let moved = false,
    unlinks = 0;
  const retained = path.join(f.parent, 'retained-root'),
    external = path.join(f.parent, 'external');
  await fs.mkdir(external);
  try {
    await withFault(
      'win32',
      {
        open: async (open, file, ...args) => {
          const h = await open(file, ...args);
          if (file === f.lock) {
            const close = h.close.bind(h);
            h.close = async () => {
              await close();
              await fs.rename(f.root, retained);
              moved = true;
              await fs.symlink(external, f.root, nativePlatform === 'win32' ? 'junction' : 'dir');
              await fs.writeFile(path.join(external, 'registry.json.lock'), 'unrelated lock sentinel');
            };
          }
          return h;
        },
        unlink: async (unlink, file) => {
          if (file === f.lock) unlinks++;
          return unlink(file);
        },
      },
      () =>
        assert.rejects(f.remove(), (e) =>
          publicOutcome(e, {
            code: 'PACK_REGISTRY_CLEANUP',
            phase: 'lock-check',
            commit: 'committed',
            lock: 'retained',
          }),
        ),
    );
    assert.equal(unlinks, 0);
    assert.equal(
      await fs.readFile(path.join(external, 'registry.json.lock'), 'utf8'),
      'unrelated lock sentinel',
    );
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(retained, 'registry.json'), 'utf8')).packs, []);
    assert.ok(await fs.stat(path.join(retained, 'registry.json.lock')));
  } finally {
    if (moved) {
      await fs.unlink(f.root);
      await fs.rename(retained, f.root);
    }
  }
});
for (const [platform, code] of [
  ['linux', 'EPERM'],
  ['darwin', 'EBUSY'],
  ['win32', 'EACCES'],
  ['win32', 'EIO'],
]) {
  test('registry lock unlink does not retry ' + platform + ' ' + code, async (t) => {
    const f = await fixture(t);
    let unlinks = 0;
    await withFault(
      platform,
      {
        unlink: async (unlink, file) => {
          if (file === f.lock) {
            unlinks++;
            throw fault(code);
          }
          return unlink(file);
        },
      },
      () =>
        assert.rejects(f.remove(), (e) =>
          publicOutcome(e, {
            code: 'PACK_REGISTRY_CLEANUP',
            phase: 'lock-unlink',
            commit: 'committed',
            lock: 'retained',
            cleanupCode: code,
          }),
        ),
    );
    assert.equal(unlinks, 1);
    assert.deepEqual(JSON.parse(await fs.readFile(f.file, 'utf8')).packs, []);
  });
}
test('pack registry preview and occupied lock preserve the existing registration', async (t) => {
  const f = await fixture(t);
  await f.remove('fixture', false);
  assert.deepEqual(await fs.readFile(f.file), f.before);
  assert.equal(await fs.stat(f.lock).catch(() => null), null);
  assert.equal(JSON.parse(f.output[0]).applied, false);
  await fs.writeFile(f.lock, 'another writer');
  await assert.rejects(f.remove(), (e) => e.code === 'PACK_REGISTRY_BUSY');
  assert.equal(await fs.readFile(f.lock, 'utf8'), 'another writer');
  assert.deepEqual(await fs.readFile(f.file), f.before);
});

test('registry initial creation retains confirmed commit when file staging cleanup fails', async (t) => {
  const f = await fixture(t);
  const { createHash } = await import('node:crypto');
  const hash = (value) => createHash('sha256').update(value).digest('hex');
  await fs.unlink(f.file);
  const payload = '// Synthetic fixture; never executed.\n';
  const object = { type: 'object', properties: {}, required: [], additionalProperties: false };
  const manifest = {
    manifestVersion: 1,
    abiVersion: 1,
    id: 'fixture',
    version: '1.0.0',
    source: { url: 'https://github.com/MulattoTech/MTerm-CLI', commit: 'a'.repeat(40), license: 'MIT' },
    runtime: { kind: 'node-stdio-once', nodeMajor: 24, entry: 'worker.mjs' },
    platforms: [nativePlatform + '-' + process.arch],
    dependencies: [],
    files: [{ path: 'worker.mjs', sha256: hash(payload) }],
    permissions: ['execute-unsandboxed'],
    tools: [
      {
        name: 'echo',
        description: 'Synthetic nonexecuted registration fixture.',
        inputSchema: object,
        outputSchema: object,
        timeoutMs: 5000,
      },
    ],
  };
  const manifestFile = path.join(f.root, 'pack.json'),
    bytes = JSON.stringify(manifest);
  await fs.writeFile(manifestFile, bytes);
  await fs.writeFile(path.join(f.root, 'worker.mjs'), payload);
  let links = 0,
    unlinks = 0,
    stage;
  await withFault(
    nativePlatform,
    {
      link: async (link, source, target) => {
        if (target !== f.file) return link(source, target);
        assert.equal(path.dirname(source), f.root);
        assert.match(path.basename(source), /^\.mterm-[a-f0-9-]+\.tmp$/);
        assert.equal(process.platform, nativePlatform, 'pack admission uses the actual native host');
        links++;
        stage = source;
        const result = await link(source, target);
        // Only after native admission and the real owned creation, exercise
        // the Windows cleanup branch. withFault restores the original platform.
        Object.defineProperty(process, 'platform', {
          ...Object.getOwnPropertyDescriptor(process, 'platform'),
          value: 'win32',
        });
        return result;
      },
      unlink: async (unlink, file) => {
        if (file === stage) {
          unlinks++;
          throw fault('EPERM');
        }
        return unlink(file);
      },
    },
    () =>
      assert.rejects(
        packsMain([
          'install',
          '--manifest',
          manifestFile,
          '--sha256',
          hash(bytes),
          '--registry',
          f.file,
          '--apply',
        ]),
        (e) =>
          publicOutcome(e, {
            code: 'FILE_WRITE_CLEANUP',
            phase: 'write',
            commit: 'committed',
            lock: 'removed',
          }),
      ),
  );
  assert.equal(links, 1);
  assert.equal(unlinks, 5);
  assert.equal((await fs.stat(f.file)).nlink, 2);
  assert.deepEqual(
    JSON.parse(await fs.readFile(f.file, 'utf8')).packs.map((item) => item.id),
    ['fixture'],
  );
  assert.equal(await fs.stat(f.lock).catch(() => null), null);
  assert.equal(await fs.stat(path.join(f.root, 'pid.txt')).catch(() => null), null);
  assert.deepEqual(f.output, []);
});
