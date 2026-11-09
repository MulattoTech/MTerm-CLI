// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-prepack-order (OpenAI / GPT-6 Astra Pro; self-reported)
// Real offline npm lifecycle/archive/install; compiler and check leaves are explicit fixture stand-ins.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolveNpmEntry } from '../scripts/npm-runtime.mjs';

const exec = promisify(execFile);
const npm = await resolveNpmEntry();
const actual = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const moduleText = (result, generation) =>
  'export const result = ' + JSON.stringify(result) + ';\nexport const generation = ' + generation + ';\n';
const leaf = `import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const log = event => fs.appendFile('lifecycle.jsonl', JSON.stringify(event) + '\\n');
const mode = process.argv[2];
if (mode === 'build:code') {
  const bytes = await fs.readFile('source/probe.mjs');
  await fs.mkdir('dist', { recursive: true });
  await fs.writeFile('dist/probe.mjs', bytes);
  await log({ phase: mode, sha256: hash(bytes) });
} else if (mode === 'test') {
  const bytes = await fs.readFile('dist/probe.mjs');
  const probe = await import('../dist/probe.mjs');
  await log({ phase: mode, sha256: hash(bytes), generation: probe.generation });
  assert.equal(probe.result, 'pass', 'Freshly compiled fixture must satisfy its test');
} else {
  await log({ phase: mode });
  const settings = JSON.parse(await fs.readFile('fixture.json', 'utf8'));
  if (settings.failGate === mode) process.exitCode = 1;
}
`;

async function fixture(t, { source = 'pass', stale, failGate } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-prepack-'));
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }));
  const packageRoot = path.join(root, 'package');
  const packed = path.join(root, 'packed');
  const installed = path.join(root, 'installed');
  const configRoot = path.join(root, 'npm');
  const save = async (relative, bytes) => {
    const target = path.join(packageRoot, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);
  };
  for (const dir of [packed, installed, configRoot]) await fs.mkdir(dir);
  const scripts = {};
  for (const name of ['prepack', 'build', 'check']) {
    assert.equal(typeof actual.scripts[name], 'string');
    scripts[name] = actual.scripts[name];
  }
  for (const name of ['roadmap:check', 'parity:check', 'build:code', 'typecheck', 'format:check', 'test'])
    scripts[name] = 'node scripts/leaf.mjs ' + name;
  await save(
    'package.json',
    JSON.stringify({
      name: 'mterm-prepack-fixture',
      version: '1.0.0',
      private: true,
      type: 'module',
      files: ['dist/'],
      scripts,
    }),
  );
  await save('scripts/leaf.mjs', leaf);
  await save('fixture.json', JSON.stringify({ failGate }));
  const sourceBytes = Buffer.from(moduleText(source, 2));
  await save('source/probe.mjs', sourceBytes);
  if (stale !== undefined) await save('dist/probe.mjs', moduleText(stale, 1));
  const userConfig = path.join(configRoot, 'user.npmrc');
  const globalConfig = path.join(configRoot, 'global.npmrc');
  await fs.writeFile(userConfig, '');
  await fs.writeFile(globalConfig, '');
  const env = {};
  for (const [key, value] of Object.entries(process.env))
    if (/^(?:path|systemroot|windir|comspec|pathext|temp|tmp|tmpdir|lang|lc_all)$/i.test(key))
      env[key] = value;
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
  env[pathKey] = path.dirname(process.execPath) + path.delimiter + (env[pathKey] ?? '');
  Object.assign(env, {
    npm_config_userconfig: userConfig,
    npm_config_globalconfig: globalConfig,
    npm_config_cache: path.join(configRoot, 'cache'),
    npm_config_prefix: path.join(configRoot, 'prefix'),
    npm_config_ignore_scripts: 'false',
    npm_config_offline: 'true',
    npm_config_audit: 'false',
    npm_config_fund: 'false',
    npm_config_update_notifier: 'false',
    npm_config_progress: 'false',
  });
  const run = async (args, cwd = packageRoot) => {
    try {
      return {
        ...(await exec(process.execPath, [npm, ...args], {
          cwd,
          env,
          windowsHide: true,
          timeout: 45000,
          maxBuffer: 524288,
        })),
        code: 0,
      };
    } catch (error) {
      return { code: error.code, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
    }
  };
  const pack = () =>
    run([
      'pack',
      '--ignore-scripts=false',
      '--offline',
      '--no-audit',
      '--no-fund',
      '--pack-destination',
      packed,
    ]);
  const archives = async () =>
    (
      await Promise.all(
        [packageRoot, packed].map(async (dir) =>
          (await fs.readdir(dir)).filter((name) => name.endsWith('.tgz')).map((name) => path.join(dir, name)),
        ),
      )
    ).flat();
  const events = async () =>
    (await fs.readFile(path.join(packageRoot, 'lifecycle.jsonl'), 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
  return { packageRoot, packed, installed, sourceBytes, run, pack, archives, events };
}

async function assertPackedFresh(f) {
  const result = await f.pack();
  assert.equal(result.code, 0, result.stderr);
  const archives = await f.archives();
  assert.equal(archives.length, 1);
  assert.equal(path.dirname(archives[0]), f.packed);
  const events = await f.events();
  const built = events.filter((event) => event.phase === 'build:code');
  const tested = events.filter((event) => event.phase === 'test');
  assert.equal(built.length, 1);
  assert.equal(tested.length, 1);
  assert.equal(tested[0].sha256, hash(f.sourceBytes));
  assert.equal(built[0].sha256, tested[0].sha256);
  assert.equal(tested[0].generation, 2);
  const install = await f.run(
    [
      'install',
      archives[0],
      '--prefix',
      f.installed,
      '--ignore-scripts',
      '--offline',
      '--no-audit',
      '--no-fund',
    ],
    f.installed,
  );
  assert.equal(install.code, 0, install.stderr);
  const installedModule = path.join(f.installed, 'node_modules/mterm-prepack-fixture/dist/probe.mjs');
  assert.deepEqual(await fs.readFile(installedModule), f.sourceBytes);
  const probe = await import(pathToFileURL(installedModule).href);
  assert.equal(probe.result, 'pass');
  assert.equal(probe.generation, 2);
}

test('normal prepack builds a clean package and installs exactly the tested bytes', async (t) => {
  const f = await fixture(t);
  await assert.rejects(fs.stat(path.join(f.packageRoot, 'dist')), { code: 'ENOENT' });
  await assertPackedFresh(f);
});

test('stale passing output cannot allow newly failing source into an archive', async (t) => {
  const f = await fixture(t, { source: 'fail', stale: 'pass' });
  const result = await f.pack();
  assert.equal(result.code, 1, result.stdout + result.stderr);
  assert.deepEqual(await f.archives(), []);
  const tested = (await f.events()).filter((event) => event.phase === 'test');
  assert.equal(tested.length, 1);
  assert.equal(tested[0].sha256, hash(f.sourceBytes));
  assert.equal(tested[0].generation, 2);
});

test('stale failing output cannot block newly passing source from normal packing', async (t) => {
  await assertPackedFresh(await fixture(t, { source: 'pass', stale: 'fail' }));
});

test('a failed post-build check prevents any new package archive', async (t) => {
  const f = await fixture(t, { failGate: 'format:check' });
  const result = await f.pack();
  assert.equal(result.code, 1, result.stdout + result.stderr);
  assert.deepEqual(await f.archives(), []);
  const events = await f.events();
  assert.equal(events.filter((event) => event.phase === 'build:code').length, 1);
  assert.equal(events.filter((event) => event.phase === 'format:check').length, 1);
  assert.equal(events.filter((event) => event.phase === 'test').length, 0);
});

for (const gate of ['roadmap:check', 'parity:check']) {
  test('failed ' + gate + ' prevents compilation and publication', async (t) => {
    const f = await fixture(t, { failGate: gate });
    const result = await f.pack();
    assert.equal(result.code, 1, result.stdout + result.stderr);
    assert.deepEqual(await f.archives(), []);
    assert.equal(
      (await f.events()).some((event) => event.phase === 'build:code'),
      false,
    );
    await assert.rejects(fs.stat(path.join(f.packageRoot, 'dist')), { code: 'ENOENT' });
  });
}
