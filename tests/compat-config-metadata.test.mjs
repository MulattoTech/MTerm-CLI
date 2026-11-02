// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-config-metadata (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { CompatibilityConfig, compatibilityConfigSchemas } from '../dist/compat-config.js';

// Keys, value types and binary memory formatting from DesktopCommanderMCP
// c774c3b505de990219637ecdc9a830c8772fae9d: src/tools/config.ts and
// src/config-field-definitions.ts. The upstream bootstrap is never executed.
const fields = [
  ['blockedCommands', 'array'],
  ['allowedDirectories', 'array'],
  ['defaultShell', 'string'],
  ['telemetryEnabled', 'boolean'],
  ['fileReadLineLimit', 'number'],
  ['fileWriteLineLimit', 'number'],
];
const memory = {
  rss: '1.00 MB',
  heapTotal: '2.50 MB',
  heapUsed: '0.13 MB',
  external: '0.00 MB',
  arrayBuffers: '1024.00 MB',
};
async function fixture(t, allowConfigWrite = false) {
  const home = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-config-metadata-')));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const root = path.join(home, 'workspace');
  await fs.mkdir(root);
  const file = path.join(home, 'config', 'compat.json');
  const shells = ['owner-approved-shell', 'second-owner-shell'];
  const config = await CompatibilityConfig.create({
    roots: [root],
    file,
    allowedShells: shells,
    allowConfigWrite,
  });
  return { home, root, file, shells, config };
}

test('get_config preserves the pinned envelope and six field types/order within owner authority', async (t) => {
  const f = await fixture(t);
  const client = { name: 'metadata-contract-client', version: '1.2.3' };
  const result = await f.config.run(() => f.config.describe(client));
  const { config, entries, uiHints } = result.structuredContent;
  assert.equal(result.content.length, 1);
  assert.deepEqual(result.content[0], {
    type: 'text',
    text: 'Current configuration:\n' + JSON.stringify(config, null, 2),
  });
  assert.deepEqual(config.currentClient, client);
  assert.deepEqual(config.featureFlags, {}, 'MTerm has no experiment flag provider');
  assert.deepEqual(
    entries,
    fields.map(([key, valueType]) => ({ key, value: config[key], valueType, editable: false })),
  );
  assert.deepEqual(uiHints.availableShells, f.shells);
  assert.deepEqual(config.allowedDirectories, [f.root]);
  assert.deepEqual(config.mterm.ownerAllowedDirectories, [f.root]);
  assert.equal(config.mterm.shellCommandTools, false);
  assert.equal(config.telemetryEnabled, false);
  assert.equal(config.mterm.effectiveTelemetryEnabled, false);
  assert.equal(config.mterm.telemetryTransport, 'none');
  assert.equal(config.mterm.osSandbox, false);
  assert.ok(Buffer.byteLength(JSON.stringify(result)) < 16384, 'ordinary metadata stays small');
  await assert.rejects(fs.stat(f.file), { code: 'ENOENT' }, 'inspection never persists defaults');
});

test('get_config formats all five memory values from one current process snapshot', async (t) => {
  const f = await fixture(t);
  const sample = t.mock.method(process, 'memoryUsage', () => ({
    rss: 1024 * 1024,
    heapTotal: 2.5 * 1024 * 1024,
    heapUsed: 0.125 * 1024 * 1024,
    external: 0,
    arrayBuffers: 1024 * 1024 * 1024,
  }));
  const first = await f.config.run(() => f.config.describe());
  assert.deepEqual(first.structuredContent.config.systemInfo.memory, memory);
  assert.equal(sample.mock.callCount(), 1, 'text and structured data share the same measurement');
  sample.mock.mockImplementation(() => ({ rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 }));
  const second = await f.config.run(() => f.config.describe());
  assert.deepEqual(
    second.structuredContent.config.systemInfo.memory,
    Object.fromEntries(Object.keys(memory).map((key) => [key, '0.00 MB'])),
  );
  assert.equal(sample.mock.callCount(), 2, 'a new call samples memory again');
});

test('get_config reports the actual Node/process identity while retaining legacy aliases', async (t) => {
  const f = await fixture(t);
  const result = await f.config.run(() => f.config.describe());
  const info = result.structuredContent.config.systemInfo;
  assert.equal(info.platform, process.platform);
  assert.equal(info.architecture, process.arch);
  assert.equal(info.nodeVersion, process.version);
  assert.equal(info.release, os.release());
  assert.deepEqual(info.nodeInfo, { version: process.version.slice(1) });
  assert.deepEqual(info.processInfo, {
    pid: process.pid,
    arch: process.arch,
    platform: process.platform,
    versions: process.versions,
  });
  assert.notEqual(
    info.processInfo.versions,
    process.versions,
    'returned metadata is a snapshot, not a mutable runtime object',
  );
});

test('get_config maps platform guidance without scanning user paths or expanding the selected shell', async (t) => {
  const f = await fixture(t, true);
  await f.config.set('defaultShell', f.shells[1]);
  for (const [platform, platformName, home, temp, absolute] of [
    ['win32', 'Windows', 'C:\\Users\\username', 'C:\\Temp', 'C:\\path\\to\\file.txt'],
    ['darwin', 'macOS', '/Users/username', '/tmp', '/path/to/file.txt'],
    ['linux', 'Linux', '/home/username', '/tmp', '/path/to/file.txt'],
    ['freebsd', 'Unix', '/home/username', '/tmp', '/path/to/file.txt'],
  ]) {
    await t.test(platform, async () => {
      // This is deterministic field mapping, not an assertion of native execution
      // on the mocked OS. Create/read the real fixture before the platform override.
      const result = await f.config.run(() => {
        const descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
        try {
          Object.defineProperty(process, 'platform', { ...descriptor, value: platform });
          return f.config.describe();
        } finally {
          Object.defineProperty(process, 'platform', descriptor);
        }
      });
      const { config, uiHints, entries } = result.structuredContent;
      const info = config.systemInfo;
      assert.equal(info.platformName, platformName);
      assert.equal(info.pathSeparator, platform === 'win32' ? '\\' : '/');
      assert.equal(info.isWindows, platform === 'win32');
      assert.equal(info.isMacOS, platform === 'darwin');
      assert.equal(info.isLinux, platform === 'linux');
      assert.deepEqual(info.examplePaths, { home, temp, absolute });
      assert.equal(
        info.defaultShell,
        f.shells[1],
        'the effective owner preference replaces the upstream unverified OS shell hint',
      );
      assert.equal(info.defaultShell, config.defaultShell);
      assert.deepEqual(uiHints.availableShells, f.shells);
      assert.ok(entries.every((entry) => entry.editable));
    });
  }
});

test('get_config emits only bounded client identity and labels unavailable identity explicitly', async (t) => {
  const f = await fixture(t);
  const sentinel = 'MTERM_METADATA_EXTRA_SENTINEL';
  const client = {
    name: 'accepted-name',
    version: '1.0',
    title: sentinel,
    websiteUrl: sentinel,
    icons: [{ src: sentinel }],
    extra: { secret: sentinel },
  };
  const accepted = await f.config.run(() => f.config.describe(client));
  assert.deepEqual(accepted.structuredContent.config.currentClient, {
    name: client.name,
    version: client.version,
  });
  assert.equal(accepted.structuredContent.config.mterm.clientInfoStatus, 'available');
  assert.ok(!JSON.stringify(accepted).includes(sentinel));
  const maximum = { name: 'n'.repeat(256), version: 'v'.repeat(256) };
  assert.deepEqual(
    (await f.config.run(() => f.config.describe(maximum))).structuredContent.config.currentClient,
    maximum,
  );
  for (const invalid of [
    { name: 'n'.repeat(257), version: '1' },
    { name: 'name', version: 'v'.repeat(257) },
    { name: 'name\nforged output', version: '1' },
    { name: '', version: '1' },
    { name: 'name', version: 7 },
  ]) {
    const result = await f.config.run(() => f.config.describe(invalid));
    assert.equal(result.structuredContent.config.currentClient, null);
    assert.equal(result.structuredContent.config.mterm.clientInfoStatus, 'omitted-invalid');
    assert.ok(Buffer.byteLength(JSON.stringify(result)) < 16384);
  }
  const absent = await f.config.run(() => f.config.describe());
  assert.equal(absent.structuredContent.config.currentClient, null);
  assert.equal(absent.structuredContent.config.mterm.clientInfoStatus, 'unavailable');
});

test('get_config reports omissions without environment, argv, filesystem, subprocess or network probes', async (t) => {
  const f = await fixture(t);
  const sentinel = 'MTERM_METADATA_PRIVATE_SENTINEL';
  const keys = ['MCP_DXT', 'npm_version', 'HOSTNAME', 'POD_NAME', 'KUBERNETES_NAMESPACE', 'SHELL'];
  const before = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const previousArgv = process.argv;
  const guards = [];
  try {
    for (const key of keys) process.env[key] = sentinel;
    process.argv = [...previousArgv, '--private-argument=' + sentinel];
    const result = await f.config.run(() => {
      // Install after admission reads the fixture policy. The metadata formatter
      // itself must not start another probe, log raw values, or contact a vendor.
      for (const [owner, method] of [
        [fsSync, 'readFileSync'],
        [fsSync, 'readdirSync'],
        [fs, 'readFile'],
        [os, 'homedir'],
        [os, 'hostname'],
        [os, 'userInfo'],
        [childProcess, 'execSync'],
        [childProcess, 'spawnSync'],
        [childProcess, 'spawn'],
        [globalThis, 'fetch'],
        [console, 'error'],
        [console, 'log'],
      ]) {
        const guard = t.mock.method(owner, method, () => {
          throw new Error('metadata probe denied');
        });
        guards.push(guard);
        assert.throws(() => owner[method](), /metadata probe denied/);
        guard.mock.resetCalls();
      }
      syncBuiltinESMExports();
      return f.config.describe();
    });
    for (const guard of guards) assert.equal(guard.mock.callCount(), 0);
    const { config } = result.structuredContent;
    assert.deepEqual(config.featureFlags, {});
    assert.deepEqual(config.mterm.omittedSystemInfo, [
      'docker',
      'pythonInfo',
      'isDXT',
      'nodeInfo.path',
      'nodeInfo.npmVersion',
      'examplePaths.accessible',
    ]);
    assert.equal(config.mterm.featureFlagsSource, 'none');
    for (const key of ['docker', 'pythonInfo', 'isDXT']) assert.ok(!(key in config.systemInfo));
    assert.ok(!('path' in config.systemInfo.nodeInfo));
    assert.ok(!('npmVersion' in config.systemInfo.nodeInfo));
    assert.ok(!JSON.stringify(result).includes(sentinel));
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
    process.argv = previousArgv;
    for (const key of keys) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
});

test('get_config admits the pinned origin schema and fails closed on malformed policy', async (t) => {
  for (const input of [{}, { origin: 'ui' }, { origin: 'llm' }])
    assert.ok(compatibilityConfigSchemas.get.safeParse(input).success);
  for (const input of [{ origin: 'other' }, { origin: 1 }, { origin: null }])
    assert.equal(compatibilityConfigSchemas.get.safeParse(input).success, false);
  const f = await fixture(t, true);
  await f.config.set('fileReadLineLimit', 4);
  await fs.writeFile(f.file, '{invalid policy');
  await assert.rejects(
    f.config.run(() => f.config.describe()),
    { code: 'CONFIG_INVALID' },
  );
  assert.equal(await fs.readFile(f.file, 'utf8'), '{invalid policy');
});
