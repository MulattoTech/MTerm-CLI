// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-gateway-source (OpenAI / GPT-6 Astra Pro; self-reported)
// Real disposable Git repositories and the installed pinned compiler; no network or deployment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
const exec = promisify(execFile);
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sources = path.resolve(process.env.MTERM_GATEWAY_FIXTURE_SOURCE ?? project);
const require = createRequire(import.meta.url);
const compiler = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
const modules = [
  'gateway/app.mjs',
  'gateway/dashboard.mjs',
  'gateway/registry.mjs',
  'gateway/security.mjs',
  'gateway/worker.mjs',
  'dist/remote/protocol.js',
];
const material = [
  ...modules.slice(0, 5),
  'src/remote/protocol.ts',
  'tsconfig.json',
  'package.json',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'scripts/build-gateway.mjs',
];
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !/^GIT_|^NODE_OPTIONS$|token|secret|password/i.test(key)),
);
Object.assign(env, {
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
  GIT_TERMINAL_PROMPT: '0',
});
const git = async (root, args) =>
  (
    await exec('git', ['-C', root, ...args], { env, timeout: 10000, maxBuffer: 1048576, windowsHide: true })
  ).stdout.trim();
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function commit(f) {
  await git(f.root, ['add', '.']);
  await git(f.root, [
    '-c',
    'user.name=MTerm fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '--no-gpg-sign',
    '-m',
    'owned fixture',
  ]);
  f.sha = await git(f.root, ['rev-parse', 'HEAD']);
  return f.sha;
}
async function fixture(t) {
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-gateway-artifact-')));
  t.after(() => fs.rm(parent, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }));
  const root = path.join(parent, 'repository');
  const temporary = path.join(parent, 'compiler-temporary');
  await fs.mkdir(root);
  await fs.mkdir(temporary);
  const inputs = [...material];
  if (
    await fs.stat(path.join(sources, 'scripts/gateway-source.mjs')).catch((error) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    })
  )
    inputs.push('scripts/gateway-source.mjs');
  for (const file of inputs) {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.copyFile(path.join(sources, file), path.join(root, file));
  }
  await fs.writeFile(path.join(root, '.gitignore'), 'node_modules/\ndist/\nartifacts/\n');
  await fs.writeFile(path.join(root, 'README.fixture'), 'committed unrelated fixture\n');
  await fs.symlink(
    path.join(project, 'node_modules'),
    path.join(root, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  await git(root, ['init']);
  await git(root, ['config', 'core.autocrlf', 'false']);
  const f = { root, parent, inputs, temporary };
  await commit(f);
  await exec(process.execPath, [compiler, '-p', path.join(root, 'tsconfig.json')], {
    cwd: root,
    env,
    timeout: 30000,
    maxBuffer: 1048576,
    windowsHide: true,
  });
  return f;
}
async function build(f, sha = f.sha, extraEnv = {}) {
  const result = await exec(process.execPath, [path.join(f.root, 'scripts/build-gateway.mjs'), sha], {
    cwd: f.parent,
    env: { ...env, TMPDIR: f.temporary, TMP: f.temporary, TEMP: f.temporary, ...extraEnv },
    timeout: 30000,
    maxBuffer: 1048576,
    windowsHide: true,
  }).then(
    (result) => ({ ...result, exit: 0 }),
    (error) => ({ stdout: error.stdout ?? '', stderr: error.stderr ?? '', exit: error.code ?? 'unknown' }),
  );
  assert.deepEqual(
    (await fs.readdir(f.temporary)).filter((name) => name.startsWith('mterm-gateway-compile-')),
    [],
    'Owned compiler directories must be removed before settlement',
  );
  return result;
}
async function artifactDirectories(f) {
  return fs.readdir(path.join(f.root, 'artifacts/gateway')).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
}
async function refused(f, result) {
  assert.notEqual(result.exit, 0, 'Builder must refuse unverified provenance before artifact writes');
  assert.deepEqual(await artifactDirectories(f), []);
}
async function payload(result) {
  assert.equal(result.exit, 0, result.stderr + result.stdout);
  const summary = JSON.parse(result.stdout);
  return {
    summary,
    manifest: JSON.parse(await fs.readFile(path.join(summary.destination, 'manifest.json'), 'utf8')),
    modules: JSON.parse(await fs.readFile(path.join(summary.destination, 'modules.json'), 'utf8')),
  };
}

test('gateway builder preserves exact six modules and byte-identical immutable repeat', async (t) => {
  const f = await fixture(t);
  const first = await payload(await build(f));
  assert.equal(first.manifest.sourceCommit, f.sha);
  assert.deepEqual(
    first.modules.map((module) => module.name),
    modules,
  );
  assert.deepEqual(
    first.manifest.files,
    first.modules.map((module) => ({
      path: module.name,
      bytes: Buffer.byteLength(module.content),
      sha256: digest(module.content),
    })),
  );
  assert.equal(first.manifest.artifactSha256, digest(JSON.stringify(first.manifest.files)));
  const verification = first.manifest.sourceVerification;
  assert.ok(verification, 'Artifact must retain its source verification evidence');
  assert.equal(
    verification.compiler.version,
    JSON.parse(await fs.readFile(path.join(f.root, 'package.json'), 'utf8')).devDependencies.typescript,
  );
  assert.equal(verification.testsExecutedByBuilder, false);
  assert.equal(verification.deploymentVerified, false);
  assert.deepEqual(
    verification.inputs.map((input) => input.path),
    f.inputs,
  );
  for (const input of verification.inputs) {
    const bytes = (await fs.readFile(path.join(f.root, input.path), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(input.bytes, Buffer.byteLength(bytes));
    assert.equal(input.sha256, digest(bytes));
  }
  const second = await payload(await build(f));
  assert.deepEqual(second, first);
  assert.equal((await artifactDirectories(f)).length, 1);
});

test('gateway builder refuses a nonexistent source commit label', async (t) => {
  const f = await fixture(t);
  await refused(f, await build(f, '0'.repeat(40)));
});

test('gateway builder refuses a different existing commit than current HEAD', async (t) => {
  const f = await fixture(t);
  const previous = f.sha;
  await fs.writeFile(path.join(f.root, 'README.fixture'), 'another committed revision');
  await commit(f);
  await refused(f, await build(f, previous));
});

for (const file of [
  'gateway/worker.mjs',
  'src/remote/protocol.ts',
  'scripts/build-gateway.mjs',
  'scripts/gateway-source.mjs',
  'tsconfig.json',
  'package.json',
]) {
  test('gateway builder refuses uncommitted material drift in ' + file, async (t) => {
    const f = await fixture(t);
    const target = path.join(f.root, file);
    if (file.endsWith('.json')) {
      const value = JSON.parse(await fs.readFile(target, 'utf8'));
      value.fixtureDrift = true;
      await fs.writeFile(target, JSON.stringify(value, null, 2) + '\n');
    } else await fs.appendFile(target, '\n// owned fixture source drift\n');
    await refused(f, await build(f));
  });
}

test('gateway builder refuses stale compiled protocol after a source commit', async (t) => {
  const f = await fixture(t);
  const compiled = path.join(f.root, 'dist/remote/protocol.js');
  const old = await fs.readFile(compiled);
  const source = path.join(f.root, 'src/remote/protocol.ts');
  await fs.writeFile(
    source,
    (await fs.readFile(source, 'utf8')).replace('WIRE_VERSION = 1', 'WIRE_VERSION = 2'),
  );
  await commit(f);
  await refused(f, await build(f));
  assert.deepEqual(await fs.readFile(compiled), old, 'Builder cannot repair or overwrite tested dist');
});

test('gateway builder refuses missing tested protocol without recreating shared dist', async (t) => {
  const f = await fixture(t);
  const compiled = path.join(f.root, 'dist/remote/protocol.js');
  await fs.unlink(compiled);
  await refused(f, await build(f));
  await assert.rejects(fs.stat(compiled), (error) => error.code === 'ENOENT');
});

test('gateway builder accepts equivalent CRLF inputs and unrelated working files', async (t) => {
  const f = await fixture(t);
  const before = await payload(await build(f));
  for (const file of [...f.inputs, 'dist/remote/protocol.js']) {
    const target = path.join(f.root, file);
    await fs.writeFile(
      target,
      (await fs.readFile(target, 'utf8')).replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'),
    );
  }
  await fs.writeFile(path.join(f.root, 'README.fixture'), 'unrelated user work remains allowed');
  await fs.mkdir(path.join(f.root, 'artifacts', 'other'), { recursive: true });
  await fs.writeFile(path.join(f.root, 'artifacts', 'other', 'keep'), 'owned unrelated artifact');
  const after = await payload(await build(f));
  assert.deepEqual(after, before);
  assert.equal(
    await fs.readFile(path.join(f.root, 'README.fixture'), 'utf8'),
    'unrelated user work remains allowed',
  );
});

test('gateway builder ignores inherited Git repository overrides', async (t) => {
  const f = await fixture(t);
  const result = await payload(
    await build(f, f.sha, {
      GIT_DIR: path.join(f.parent, 'not-the-repository'),
      GIT_WORK_TREE: f.parent,
      GIT_INDEX_FILE: path.join(f.parent, 'not-the-index'),
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'core.repositoryformatversion',
      GIT_CONFIG_VALUE_0: '999',
    }),
  );
  assert.equal(result.manifest.sourceCommit, f.sha);
});

test('gateway builder refuses unsupported committed compiler routing without changing dist', async (t) => {
  const f = await fixture(t);
  const compiled = path.join(f.root, 'dist/remote/protocol.js');
  const old = await fs.readFile(compiled);
  const config = path.join(f.root, 'tsconfig.json');
  const value = JSON.parse(await fs.readFile(config, 'utf8'));
  value.extends = '../outside-config.json';
  await fs.writeFile(config, JSON.stringify(value, null, 2) + '\n');
  await commit(f);
  await refused(f, await build(f));
  assert.deepEqual(await fs.readFile(compiled), old);
});

test('gateway builder refuses mismatched committed compiler pins before artifacts', async (t) => {
  const f = await fixture(t);
  const file = path.join(f.root, 'package.json');
  const value = JSON.parse(await fs.readFile(file, 'utf8'));
  value.devDependencies.typescript = '7.0.3';
  await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n');
  await commit(f);
  await refused(f, await build(f));
});

test('gateway builder refuses invalid committed TypeScript instead of packaging old output', async (t) => {
  const f = await fixture(t);
  const compiled = path.join(f.root, 'dist/remote/protocol.js');
  const old = await fs.readFile(compiled);
  await fs.appendFile(
    path.join(f.root, 'src/remote/protocol.ts'),
    '\nconst fixtureInvalid: number = "not a number";\n',
  );
  await commit(f);
  await refused(f, await build(f));
  assert.deepEqual(await fs.readFile(compiled), old);
});

test('gateway builder cannot attribute replacement-object bytes to the original commit', async (t) => {
  const f = await fixture(t);
  const original = f.sha;
  const file = path.join(f.root, 'gateway/worker.mjs');
  const changed = (await fs.readFile(file, 'utf8')) + '\n// replacement object fixture\n';
  await fs.writeFile(file, changed);
  const replacement = await commit(f);
  await git(f.root, ['switch', '--detach', original]);
  await git(f.root, ['replace', original, replacement]);
  await fs.writeFile(file, changed);
  await refused(f, await build(f, original));
});

for (const file of ['manifest.json', 'modules.json']) {
  test('gateway builder preserves tampered existing ' + file + ' and refuses overwrite', async (t) => {
    const f = await fixture(t);
    const original = await payload(await build(f));
    const target = path.join(original.summary.destination, file);
    await fs.writeFile(target, 'owned fixture tamper\n');
    assert.notEqual((await build(f)).exit, 0);
    assert.equal(await fs.readFile(target, 'utf8'), 'owned fixture tamper\n');
    assert.equal((await artifactDirectories(f)).length, 1);
  });
}
