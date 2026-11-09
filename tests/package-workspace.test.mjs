// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-package-isolation (OpenAI / GPT-6 Astra Pro; self-reported)
// Real Node resolution in constructed owned packages; actual npm installation remains a hosted gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { withPackageWorkspace } from '../scripts/package-workspace.mjs';
import { resolveNpmEntry } from '../scripts/npm-runtime.mjs';

const exec = promisify(execFile);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const boundedClose = (closed) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Owned fixture child close was not observed')), 5000);
    closed.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
const outside = (root, selected) => {
  const relative = path.relative(root, selected);
  return relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative);
};

async function fixture(t) {
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-package-layout-')));
  const root = path.join(parent, 'checkout');
  const temporaryRoot = path.join(parent, 'temporary');
  const children = [];
  t.after(async () => {
    t.mock.restoreAll();
    const failures = [];
    for (const { child, closed } of children) {
      child.stdin.end();
      try {
        await boundedClose(closed);
      } catch (error) {
        // Only this captured fixture ChildProcess may be signalled; no numeric PID fallback.
        child.kill();
        try {
          await boundedClose(closed);
        } catch {
          failures.push(error);
        }
      }
    }
    if (failures.length)
      throw new AggregateError(failures, 'Retaining fixture with unconfirmed child: ' + parent);
    await fs.rm(parent, { recursive: true, force: true, maxRetries: 5 });
  });
  await fs.mkdir(root);
  await fs.mkdir(temporaryRoot);
  const sentinel = 'mterm-checkout-only-' + path.basename(parent).toLowerCase();
  const save = async (file, contents) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, contents);
  };
  const packageAt = async (directory, name, marker) => {
    await save(
      path.join(directory, 'package.json'),
      JSON.stringify({ name, version: '1.0.0', main: 'index.cjs', exports: './index.cjs' }),
    );
    await save(path.join(directory, 'index.cjs'), 'module.exports = ' + JSON.stringify(marker) + ';\n');
  };
  await packageAt(path.join(root, 'node_modules', sentinel), sentinel, 'checkout-only');
  const probeAt = async (directory, mode) => {
    const file = path.join(directory, 'probe.' + mode);
    const load =
      mode === 'cjs'
        ? 'const value = require(name); const resolved = require.resolve(name);'
        : 'const value = (await import(name)).default; const resolved = import.meta.resolve(name);';
    await save(
      file,
      `const name = process.argv[2];
try { ${load} console.log(JSON.stringify({ ok: true, value, resolved, cwd: process.cwd() })); }
catch (error) { console.log(JSON.stringify({ ok: false, code: error.code, cwd: process.cwd() })); }
`,
    );
    return file;
  };
  const cleanEnv = { ...process.env };
  for (const key of Object.keys(cleanEnv)) if (/^node_(?:path|options)$/i.test(key)) delete cleanEnv[key];
  const pathKey = Object.keys(cleanEnv).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
  cleanEnv[pathKey] = path.dirname(process.execPath) + path.delimiter + (cleanEnv[pathKey] ?? '');
  const run = async (file, name, cwd, env = cleanEnv) =>
    JSON.parse(
      (
        await exec(process.execPath, [file, name], {
          cwd,
          env,
          timeout: 10000,
          maxBuffer: 65536,
          windowsHide: true,
        })
      ).stdout,
    );
  const use = (verify, options = {}) =>
    withPackageWorkspace(root, verify, { temporaryRoot, inheritedEnv: cleanEnv, ...options });
  return { parent, root, temporaryRoot, sentinel, save, packageAt, probeAt, run, use, cleanEnv, children };
}

for (const mode of ['cjs', 'mjs']) {
  test('checkout-only dependency control resolves from a nested ' + mode + ' package', async (t) => {
    const f = await fixture(t);
    const probe = await f.probeAt(path.join(f.root, 'artifacts', 'install', 'node_modules', 'product'), mode);
    const result = await f.run(probe, f.sentinel, f.temporaryRoot);
    assert.equal(result.ok, true);
    assert.equal(result.value, 'checkout-only');
    assert.equal(await fs.realpath(result.cwd), f.temporaryRoot);
  });

  test('standalone ' + mode + ' package cannot borrow a checkout-only dependency', async (t) => {
    const f = await fixture(t);
    await f.use(async ({ prefix, home, env }) => {
      const probe = await f.probeAt(path.join(prefix, 'node_modules', 'product'), mode);
      const result = await f.run(probe, f.sentinel, home, env);
      assert.deepEqual(result, {
        ok: false,
        code: mode === 'cjs' ? 'MODULE_NOT_FOUND' : 'ERR_MODULE_NOT_FOUND',
        cwd: await fs.realpath(home),
      });
    });
  });

  test('standalone ' + mode + ' package resolves its declared installed dependency', async (t) => {
    const f = await fixture(t);
    await f.use(async ({ prefix, home, env }) => {
      const product = path.join(prefix, 'node_modules', 'product');
      const dependency = path.join(product, 'node_modules', 'mterm-installed-positive');
      await f.packageAt(dependency, 'mterm-installed-positive', 'installed-positive');
      await f.save(
        path.join(product, 'package.json'),
        JSON.stringify({
          name: 'product',
          version: '1.0.0',
          dependencies: { 'mterm-installed-positive': '1.0.0' },
        }),
      );
      const probe = await f.probeAt(product, mode);
      const result = await f.run(probe, 'mterm-installed-positive', home, env);
      assert.equal(result.ok, true);
      assert.equal(result.value, 'installed-positive');
      const resolved = mode === 'mjs' ? new URL(result.resolved) : result.resolved;
      assert.equal(await fs.realpath(resolved), await fs.realpath(path.join(dependency, 'index.cjs')));
    });
  });
}

test('standalone workspace, home and declared prefixes are external; evidence remains separate', async (t) => {
  const f = await fixture(t);
  await f.use(async ({ root, output, evidence, prefix, linkPrefix, home, env }) => {
    for (const directory of [output, prefix, linkPrefix, home, env.npm_config_cache]) {
      await fs.mkdir(directory, { recursive: true });
      assert.equal(outside(await fs.realpath(root), await fs.realpath(directory)), true);
    }
    assert.notEqual(output, evidence);
    assert.equal(outside(await fs.realpath(root), await fs.realpath(evidence)), false);
    assert.equal(env.HOME, home);
    assert.equal(env.USERPROFILE, home);
    assert.equal(env.CODEX_HOME, path.join(home, 'codex'));
  });
});

for (const alias of [false, true]) {
  test(
    'checkout-owned temporary parent is refused' + (alias ? ' through a directory alias' : ''),
    async (t) => {
      const f = await fixture(t);
      const inside = path.join(f.root, 'temporary');
      await fs.mkdir(inside);
      const selected = alias ? path.join(f.parent, 'outside-alias') : inside;
      if (alias) await fs.symlink(inside, selected, process.platform === 'win32' ? 'junction' : 'dir');
      let invoked = false;
      await assert.rejects(
        f.use(
          () => {
            invoked = true;
          },
          { temporaryRoot: selected },
        ),
        /temporary.*outside.*checkout/i,
      );
      assert.equal(invoked, false);
      assert.deepEqual(await fs.readdir(inside), []);
    },
  );
}

test('inherited NODE_PATH cannot supply a dependency to an already external CJS probe', async (t) => {
  const f = await fixture(t);
  const probe = await f.probeAt(path.join(f.temporaryRoot, 'external-probe'), 'cjs');
  await f.use(
    async ({ env, home }) => {
      const result = await f.run(probe, f.sentinel, home, env);
      assert.equal(result.ok, false);
      assert.equal(result.code, 'MODULE_NOT_FOUND');
    },
    { inheritedEnv: { ...f.cleanEnv, NODE_PATH: path.join(f.root, 'node_modules') } },
  );
});

test('inherited NODE_OPTIONS preload is removed but an explicit fixture import still executes', async (t) => {
  const f = await fixture(t);
  const inheritedMarker = path.join(f.parent, 'inherited-marker');
  const explicitMarker = path.join(f.parent, 'explicit-marker');
  const preload = path.join(f.parent, 'owned preload.cjs');
  const guard = path.join(f.parent, 'explicit guard.mjs');
  await f.save(
    preload,
    'require("node:fs").writeFileSync(' + JSON.stringify(inheritedMarker) + ', "loaded");',
  );
  await f.save(
    guard,
    'import fs from "node:fs"; fs.writeFileSync(' + JSON.stringify(explicitMarker) + ', "loaded");',
  );
  await f.use(
    async ({ env, home }) => {
      await exec(
        process.execPath,
        ['--import', pathToFileURL(guard).href, '-e', 'process.stdout.write("ok")'],
        {
          cwd: home,
          env,
          timeout: 10000,
          maxBuffer: 65536,
          windowsHide: true,
        },
      );
      assert.equal(await fs.readFile(explicitMarker, 'utf8'), 'loaded');
      await assert.rejects(fs.stat(inheritedMarker), { code: 'ENOENT' });
    },
    { inheritedEnv: { ...f.cleanEnv, NODE_OPTIONS: '--require="' + preload.replaceAll('\\', '/') + '"' } },
  );
});

test('inherited npm node-options cannot reconstruct a preload in a real npm script', async (t) => {
  const f = await fixture(t);
  const npm = await resolveNpmEntry();
  const marker = path.join(f.parent, 'npm-preload-marker');
  const preload = path.join(f.parent, 'npm preload.cjs');
  await f.save(preload, 'require("node:fs").writeFileSync(' + JSON.stringify(marker) + ', "loaded");');
  await f.use(
    async ({ env, home }) => {
      await f.save(
        path.join(home, 'package.json'),
        JSON.stringify({ name: 'owned-npm-probe', version: '1.0.0', scripts: { probe: 'node probe.cjs' } }),
      );
      await f.save(path.join(home, 'probe.cjs'), 'process.stdout.write("owned-script-ran");');
      const result = await exec(
        process.execPath,
        [npm, 'run', 'probe', '--ignore-scripts=false', '--offline'],
        {
          cwd: home,
          env,
          timeout: 15000,
          maxBuffer: 65536,
          windowsHide: true,
        },
      );
      assert.match(result.stdout, /owned-script-ran/);
      await assert.rejects(fs.stat(marker), { code: 'ENOENT' });
    },
    {
      inheritedEnv: {
        ...f.cleanEnv,
        npm_config_node_options: '--require="' + preload.replaceAll('\\', '/') + '"',
      },
    },
  );
});

test('environment scrub handles key case while preserving explicit native-lane inputs', async (t) => {
  const f = await fixture(t);
  const selected = {
    ...f.cleanEnv,
    NoDe_PaTh: 'owned-fixture-path',
    node_options: '--owned-fixture-option',
    NPM_CONFIG_NODE_OPTIONS: '--owned-fixture-option',
    'npm_config_node-options': '--owned-fixture-option',
    MTERM_ISOLATION_REQUIRE_LIVE: '1',
    MTERM_ISOLATION_IMAGE_ID: 'owned-fixture-image',
    MTERM_ISOLATION_DOCKER_CONFIG: 'owned-fixture-config',
  };
  await f.use(
    ({ env }) => {
      assert.equal(
        Object.keys(env).some((key) => /^(?:node_(?:path|options)|npm_config_node[-_]options)$/i.test(key)),
        false,
      );
      for (const key of [
        'MTERM_ISOLATION_REQUIRE_LIVE',
        'MTERM_ISOLATION_IMAGE_ID',
        'MTERM_ISOLATION_DOCKER_CONFIG',
      ])
        assert.equal(env[key], selected[key]);
    },
    { inheritedEnv: selected },
  );
});

test('success retains the external workspace and mirrors regular evidence without following links', async (t) => {
  const f = await fixture(t);
  let owned;
  const result = await f.use(async (workspace) => {
    owned = workspace;
    await f.save(path.join(workspace.output, 'case.tap'), 'owned evidence\n');
    for (const directory of [
      'install',
      'links',
      'home',
      'cache',
      'scope',
      'configuration-owned/fixtures',
      'remote-state-owned',
    ])
      await f.save(path.join(workspace.output, directory, 'private-fixture.json'), 'excluded owned marker');
    await f.save(path.join(workspace.output, 'configuration-owned', 'result.json'), '{"owned":true}\n');
    await fs.mkdir(path.join(workspace.output, 'fixture-link'));
    await f.save(path.join(workspace.output, 'fixture-link', 'unrelated.json'), 'owned exclusion control');
    await fs.symlink(
      f.root,
      path.join(workspace.output, 'checkout-link'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    return 'verified';
  });
  assert.equal(result, 'verified');
  assert.equal(await fs.readFile(path.join(owned.output, 'case.tap'), 'utf8'), 'owned evidence\n');
  assert.equal(await fs.readFile(path.join(owned.evidence, 'case.tap'), 'utf8'), 'owned evidence\n');
  await assert.rejects(fs.lstat(path.join(owned.evidence, 'checkout-link')), { code: 'ENOENT' });
  for (const directory of [
    'install',
    'links',
    'home',
    'cache',
    'scope',
    'configuration-owned/fixtures',
    'remote-state-owned',
  ])
    await assert.rejects(fs.stat(path.join(owned.evidence, directory, 'private-fixture.json')), {
      code: 'ENOENT',
    });
  assert.equal(
    await fs.readFile(path.join(owned.evidence, 'configuration-owned', 'result.json'), 'utf8'),
    '{"owned":true}\n',
  );
  const receipt = JSON.parse(await fs.readFile(path.join(owned.evidence, 'workspace.json'), 'utf8'));
  assert.equal(receipt.outcome, 'passed');
  assert.equal(receipt.runtimeRetained, true);
  assert.equal(receipt.cleanupAttempted, false);
  assert.equal(receipt.copiedFiles.find((file) => file.path === 'case.tap').sha256, hash('owned evidence\n'));
});

for (const thrown of [
  Object.assign(new Error('failure before installation'), {
    stdout: 'owned stdout\n',
    stderr: 'owned stderr\n',
  }),
  null,
]) {
  test(
    'early ' +
      (thrown === null ? 'falsy' : 'error') +
      ' failure retains its exact identity without requiring an installed prefix',
    async (t) => {
      const f = await fixture(t);
      let owned;
      let rejected = false;
      try {
        await f.use((workspace) => {
          owned = workspace;
          throw thrown;
        });
      } catch (error) {
        rejected = true;
        assert.equal(error, thrown);
      }
      assert.equal(rejected, true);
      await assert.rejects(fs.stat(owned.prefix), { code: 'ENOENT' });
      const receipt = JSON.parse(await fs.readFile(path.join(owned.evidence, 'workspace.json'), 'utf8'));
      assert.equal(receipt.outcome, 'failed');
      assert.equal(receipt.runtimeRetained, true);
      assert.equal(receipt.cleanupAttempted, false);
      if (thrown !== null) {
        for (const stream of ['stdout', 'stderr']) {
          assert.equal(
            await fs.readFile(path.join(owned.evidence, 'failed-command.' + stream + '.log'), 'utf8'),
            thrown[stream],
          );
          assert.equal(receipt.failedCommandOutput.find((entry) => entry.stream === stream).truncated, false);
        }
      }
    },
  );
}

test('a failed verifier with a real held child retains workspace and mirrors evidence before rejecting', async (t) => {
  const f = await fixture(t);
  const primary = new Error('owned verification failure');
  let owned;
  await assert.rejects(
    f.use(async (workspace) => {
      owned = workspace;
      const child = spawn(
        process.execPath,
        [
          '-e',
          'require("node:fs").writeFileSync("held.txt", "owned child");process.stdin.resume();process.stdout.write("ready");',
        ],
        {
          cwd: workspace.output,
          env: workspace.env,
          windowsHide: true,
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );
      const ownedChild = { child, closed: null, closeObserved: false, exitObserved: false };
      child.once('exit', () => {
        ownedChild.exitObserved = true;
      });
      ownedChild.closed = once(child, 'close').then((value) => {
        ownedChild.closeObserved = true;
        return value;
      });
      f.children.push(ownedChild);
      const [ready] = await once(child.stdout, 'data', { signal: AbortSignal.timeout(10000) });
      assert.equal(ready.toString(), 'ready');
      await f.save(path.join(workspace.output, 'failure.tap'), 'causal failure evidence\n');
      throw primary;
    }),
    (error) => error === primary,
  );
  assert.equal(f.children[0].child.exitCode, null);
  assert.equal(f.children[0].child.signalCode, null);
  assert.equal(f.children[0].closeObserved, false);
  assert.equal(f.children[0].exitObserved, false);
  assert.equal(await fs.readFile(path.join(owned.output, 'held.txt'), 'utf8'), 'owned child');
  assert.equal(
    await fs.readFile(path.join(owned.evidence, 'failure.tap'), 'utf8'),
    'causal failure evidence\n',
  );
  const receipt = JSON.parse(await fs.readFile(path.join(owned.evidence, 'workspace.json'), 'utf8'));
  assert.equal(receipt.outcome, 'failed');
  assert.equal(receipt.runtimeRetained, true);
  assert.equal(receipt.cleanupAttempted, false);
});

for (const verifyFails of [true, false]) {
  test(
    'evidence copy failure ' +
      (verifyFails ? 'preserves the primary verification error' : 'prevents a success result'),
    async (t) => {
      const f = await fixture(t);
      const primary = new Error('owned primary verification failure');
      const copyFailure = Object.assign(new Error('owned evidence copy failure'), { code: 'EIO' });
      const original = fs.copyFile;
      t.mock.method(fs, 'copyFile', async (...args) => {
        if (path.basename(args[0]) === 'copy-failure.tap') throw copyFailure;
        return original(...args);
      });
      let owned;
      await assert.rejects(
        f.use(async (workspace) => {
          owned = workspace;
          await f.save(path.join(workspace.output, 'copy-failure.tap'), 'retained original\n');
          if (verifyFails) throw primary;
          return 'must not pass';
        }),
        (error) => error === (verifyFails ? primary : copyFailure),
      );
      assert.equal(
        await fs.readFile(path.join(owned.output, 'copy-failure.tap'), 'utf8'),
        'retained original\n',
      );
      const receipt = JSON.parse(await fs.readFile(path.join(owned.evidence, 'workspace.json'), 'utf8'));
      assert.equal(receipt.outcome, 'failed');
      assert.equal(receipt.retentionErrors[0].code, 'EIO');
      assert.equal(receipt.cleanupAttempted, false);
    },
  );
}
