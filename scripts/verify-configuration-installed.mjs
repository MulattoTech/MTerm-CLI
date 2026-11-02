// SPDX-License-Identifier: MIT
// Modified: 2026-11-02-config-metadata; inspect the installed get_config metadata and response contract.
// AI-Change: 2026-11-02-config-installed-qualification
// Installed-package proof only. Every policy, process and network canary is fixture-owned.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const exec = promisify(execFile);
const requestOptions = { timeout: 5000 };
async function verifyProcessExit(pid) {
  assert.ok(Number.isInteger(pid) && pid > 0, 'The original owned process ID must be captured');
  const deadline = Date.now() + 5000;
  do {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error.code === 'ESRCH') return;
      throw error;
    }
    await delay(25);
  } while (Date.now() < deadline);
  // Never signal a numeric PID after ownership may have changed. An ambiguous/reused PID fails proof.
  throw new Error('Owned process exit was not independently observed before the deadline');
}
const [selectedEntry, selectedPrefix, selectedEvidence, expectedVersion] = process.argv.slice(2);
for (const value of [selectedEntry, selectedPrefix, selectedEvidence])
  assert.ok(value && path.isAbsolute(value), 'Explicit test-owned absolute paths are required');
assert.match(expectedVersion ?? '', /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
const prefix = await fs.realpath(selectedPrefix);
const entry = await fs.realpath(selectedEntry);
const expectedEntry = path.join(prefix, 'node_modules', 'mterm-cli', 'bin', 'mterm-cli.js');
assert.equal(entry, expectedEntry, 'Configuration proof must use the package installed in its owned prefix');
assert.ok((await fs.lstat(selectedEntry)).isFile(), 'Installed entry must be a regular file');
const installedPackage = path.dirname(path.dirname(entry));
const manifest = JSON.parse(await fs.readFile(path.join(installedPackage, 'package.json'), 'utf8'));
assert.equal(manifest.name, 'mterm-cli');
assert.equal(manifest.version, expectedVersion);
assert.equal(manifest.bin?.['mterm-cli'], 'bin/mterm-cli.js');
const evidenceParent = await fs.realpath(selectedEvidence);
const evidence = await fs.mkdtemp(path.join(evidenceParent, 'configuration-'));
const workspace = path.join(evidence, 'fixtures');
await fs.mkdir(workspace);
const roots = [path.join(workspace, 'root one'), path.join(workspace, 'root two')];
const configurationFile = path.join(workspace, 'state', 'compat-policy.json');
for (const root of roots) await fs.mkdir(root);
const originalText = 'alpha\nβeta\ngamma\n';
for (const root of roots) await fs.writeFile(path.join(root, 'fixture.txt'), originalText);

// This is an observation boundary for ordinary Node transports, not an OS sandbox.
// Attempts are recorded before throwing, including attempts caught by product code.
const guard = path.join(evidence, 'deny-network.mjs');
await fs.writeFile(
  guard,
  String.raw`import { appendFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import http2 from 'node:http2';
import dgram from 'node:dgram';
import dns from 'node:dns';
const file = process.env.MTERM_NETWORK_AUDIT_FILE;
if (!file) throw new Error('A fixture-owned network audit path is required');
let attempts = 0;
const deny = (api) => function () {
  if (attempts++ < 128)
    appendFileSync(file, JSON.stringify({ api }) + '\n', { mode: 0o600 });
  const error = new Error('Fixture network transport denied: ' + api);
  error.code = 'MTERM_FIXTURE_NETWORK_DENIED';
  throw error;
};
net.Socket.prototype.connect = deny('net.Socket.connect');
tls.connect = deny('tls.connect');
http.request = deny('http.request');
http.get = deny('http.get');
https.request = deny('https.request');
https.get = deny('https.get');
http2.connect = deny('http2.connect');
dgram.Socket.prototype.send = deny('dgram.Socket.send');
dgram.Socket.prototype.connect = deny('dgram.Socket.connect');
for (const key of Object.keys(dns))
  if (/^(lookup|resolve|reverse)/.test(key) && typeof dns[key] === 'function')
    dns[key] = deny('dns.' + key);
for (const key of Object.keys(dns.promises))
  if (/^(lookup|resolve|reverse)/.test(key) && typeof dns.promises[key] === 'function')
    dns.promises[key] = deny('dns.promises.' + key);
for (const Resolver of [dns.Resolver, dns.promises.Resolver])
  for (const key of Object.getOwnPropertyNames(Resolver.prototype))
    if (/^(lookup|resolve|reverse)/.test(key))
      Resolver.prototype[key] = deny('dns.Resolver.' + key);
globalThis.fetch = deny('fetch');
globalThis.WebSocket = deny('WebSocket');
syncBuiltinESMExports();
`,
);
const canary = path.join(evidence, 'network-canary.mjs');
await fs.writeFile(
  canary,
  String.raw`import assert from 'node:assert/strict';
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import http2 from 'node:http2';
import dgram from 'node:dgram';
import dns from 'node:dns';
const udp = dgram.createSocket('udp4');
try {
  for (const attempt of [
    () => net.connect({ host: '127.0.0.1', port: 9 }),
    () => tls.connect({ host: '127.0.0.1', port: 9 }),
    () => http.get('http://example.invalid/'),
    () => https.request('https://example.invalid/'),
    () => http2.connect('https://example.invalid/'),
    () => udp.send(Buffer.from('synthetic-canary'), 9, '127.0.0.1'),
    () => dns.lookup('example.invalid', () => {}),
    () => dns.promises.lookup('example.invalid'),
    () => fetch('https://example.invalid/'),
    () => new WebSocket('wss://example.invalid/'),
  ]) await assert.rejects(async () => attempt(), { code: 'MTERM_FIXTURE_NETWORK_DENIED' });
} finally { udp.close(); }
`,
);
const env = { ...process.env };
for (const key of Object.keys(env))
  if (/token|secret|password|api[_-]?key|authorization/i.test(key)) delete env[key];
delete env.NODE_OPTIONS;
env.CODEX_HOME = path.join(workspace, 'synthetic-codex');
env.MTERM_CONFIG_PATH = path.join(workspace, 'state', 'mterm.json');
const canaryAudit = path.join(evidence, 'network-canary.ndjson');
await fs.writeFile(canaryAudit, '');
await exec(process.execPath, ['--import', pathToFileURL(guard).href, canary], {
  cwd: workspace,
  env: { ...env, MTERM_NETWORK_AUDIT_FILE: canaryAudit },
  timeout: 10000,
  maxBuffer: 65536,
  windowsHide: true,
});
const readAudit = async (file) =>
  (await fs.readFile(file, 'utf8'))
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
const canaryAttempts = await readAudit(canaryAudit);
assert.equal(canaryAttempts.length, 10, 'Every network canary must be intercepted and recorded');
assert.equal(new Set(canaryAttempts.map((x) => x.api)).size, 10);

const plain = (result) =>
  result.content
    .filter((item) => item.type === 'text')
    .map((item) => item.text)
    .join('\n');
const clients = [];
const steps = [];
const fixtureProcesses = [];
const clientMetadataSentinel = 'MTERM_GET_CONFIG_PRIVATE_EXTRA_SENTINEL';
async function connect({ allowConfigWrite = true } = {}) {
  const index = clients.length;
  const audit = path.join(evidence, `network-child-${index}.ndjson`);
  await fs.writeFile(audit, '');
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      '--import',
      pathToFileURL(guard).href,
      entry,
      'mcp',
      '--stdio',
      '--root',
      roots[0],
      '--root',
      roots[1],
      '--compat-desktop-commander',
      '--compat-config',
      configurationFile,
      '--allow-write',
      '--allow-exec',
      ...(allowConfigWrite ? ['--allow-config-write'] : []),
    ],
    cwd: workspace,
    env: { ...env, MTERM_NETWORK_AUDIT_FILE: audit },
    stderr: 'pipe',
  });
  const client = new Client({
    name: 'mterm-installed-config-fixture',
    version: '1.0.0',
    title: clientMetadataSentinel,
  });
  const connection = { client, transport, audit, pid: null, stderrBytes: 0, stderrTail: '', closed: false };
  clients.push(connection);
  // Register cleanup before connecting so startup/initialization failures cannot leak a child.
  transport.stderr?.on('data', (chunk) => {
    connection.stderrBytes += chunk.length;
    connection.stderrTail = (connection.stderrTail + chunk.toString('utf8')).slice(-4096);
  });
  const connected = client.connect(transport, requestOptions);
  connection.pid = transport.pid;
  await connected;
  assert.ok(Number.isInteger(connection.pid) && connection.pid > 0);
  connection.call = (name, args = {}) => client.callTool({ name, arguments: args }, requestOptions);
  connection.list = () => client.listTools(undefined, requestOptions);
  return connection;
}
async function close(connection) {
  if (connection.closed) return;
  try {
    await connection.client.close();
  } finally {
    await connection.transport.close();
  }
  assert.equal(connection.transport.pid, null, 'Owned MCP child must be stopped');
  if (connection.pid !== null) await verifyProcessExit(connection.pid);
  connection.closed = true;
}
async function call(connection, name, args = {}) {
  const result = await connection.call(name, args);
  assert.equal(result.isError, false, `${name}: ${plain(result)}`);
  return result;
}
async function denied(connection, name, args, code) {
  const result = await connection.call(name, args);
  assert.equal(result.isError, true, `${name} must reject this fixture request`);
  if (code) assert.equal(result.structuredContent?.error?.code, code);
  return result;
}
const get = async (connection) => {
  const result = await call(connection, 'get_config');
  const { config, entries, uiHints } = result.structuredContent;
  assert.deepEqual(result.content, [
    { type: 'text', text: 'Current configuration:\n' + JSON.stringify(config, null, 2) },
  ]);
  assert.deepEqual(config.currentClient, { name: 'mterm-installed-config-fixture', version: '1.0.0' });
  assert.equal(config.mterm.clientInfoStatus, 'available');
  assert.ok(!JSON.stringify(result).includes(clientMetadataSentinel));
  assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 524288, 'Installed MCP response byte cap');
  assert.deepEqual(config.featureFlags, {});
  assert.equal(config.mterm.featureFlagsSource, 'none');
  const info = config.systemInfo;
  assert.deepEqual(info.processInfo, {
    pid: connection.pid,
    arch: process.arch,
    platform: process.platform,
    versions: process.versions,
  });
  assert.deepEqual(info.nodeInfo, { version: process.version.slice(1) });
  assert.equal(info.platform, process.platform);
  assert.equal(info.architecture, process.arch);
  assert.equal(info.nodeVersion, process.version);
  assert.equal(typeof info.release, 'string');
  assert.equal(info.isWindows, process.platform === 'win32');
  assert.equal(info.isMacOS, process.platform === 'darwin');
  assert.equal(info.isLinux, process.platform === 'linux');
  assert.equal(
    info.platformName,
    info.isWindows ? 'Windows' : info.isMacOS ? 'macOS' : info.isLinux ? 'Linux' : 'Unix',
  );
  assert.equal(info.pathSeparator, info.isWindows ? '\\' : '/');
  assert.equal(info.defaultShell, config.defaultShell);
  assert.deepEqual(
    info.examplePaths,
    info.isWindows
      ? { home: 'C:\\Users\\username', temp: 'C:\\Temp', absolute: 'C:\\path\\to\\file.txt' }
      : {
          home: info.isMacOS ? '/Users/username' : '/home/username',
          temp: '/tmp',
          absolute: '/path/to/file.txt',
        },
  );
  assert.deepEqual(Object.keys(info.memory).sort(), [
    'arrayBuffers',
    'external',
    'heapTotal',
    'heapUsed',
    'rss',
  ]);
  for (const value of Object.values(info.memory)) assert.match(value, /^\d+\.\d{2} MB$/);
  assert.ok(Buffer.byteLength(JSON.stringify(info)) < 8192, 'Process metadata remains bounded');
  assert.deepEqual(config.mterm.omittedSystemInfo, [
    'docker',
    'pythonInfo',
    'isDXT',
    'nodeInfo.path',
    'nodeInfo.npmVersion',
    'examplePaths.accessible',
  ]);
  for (const key of ['docker', 'pythonInfo', 'isDXT']) assert.ok(!(key in info));
  assert.deepEqual(uiHints.availableShells, config.mterm.allowedShells);
  assert.deepEqual(
    entries,
    [
      ['blockedCommands', 'array'],
      ['allowedDirectories', 'array'],
      ['defaultShell', 'string'],
      ['telemetryEnabled', 'boolean'],
      ['fileReadLineLimit', 'number'],
      ['fileWriteLineLimit', 'number'],
    ].map(([key, valueType]) => ({
      key,
      value: config[key],
      valueType,
      editable: config.mterm.configWriteEnabled,
    })),
  );
  return config;
};
const set = (connection, key, value) => call(connection, 'set_config_value', { key, value });
async function noWriteDebris() {
  const names = await fs.readdir(path.dirname(configurationFile));
  assert.ok(
    !names.some((name) => name.endsWith('.lock') || name.endsWith('.tmp')),
    'No stale owned lock/temp',
  );
  assert.deepEqual(names.sort(), ['compat-policy.json', 'compat-policy.json.previous']);
}

let failure;
let result;
try {
  const a = await connect();
  const b = await connect();
  assert.notEqual(a.pid, b.pid, 'Concurrent clients must be distinct real MCP processes');
  for (const connection of [a, b]) {
    const tools = (await connection.list()).tools.map((tool) => tool.name);
    for (const name of ['get_config', 'set_config_value', 'read_file', 'write_file', 'mterm_read_file'])
      assert.ok(tools.includes(name), `Installed discovery is missing ${name}`);
    const config = await get(connection);
    assert.deepEqual(config.allowedDirectories, roots);
    assert.equal(config.currentClient.name, 'mterm-installed-config-fixture');
    assert.equal(config.mterm.configFile, configurationFile);
    assert.equal(config.telemetryEnabled, false);
    assert.equal(config.mterm.effectiveTelemetryEnabled, false);
    assert.equal(config.mterm.telemetryTransport, 'none');
    for (const root of roots) await call(connection, 'read_file', { path: path.join(root, 'fixture.txt') });
  }
  steps.push('two-installed-processes-discovery-and-owner-roots');
  steps.push('get-config-envelope-memory-process-metadata-and-omissions');

  await set(a, 'fileReadLineLimit', 1);
  assert.equal((await get(b)).fileReadLineLimit, 1);
  const read = await call(b, 'read_file', { path: path.join(roots[0], 'fixture.txt') });
  assert.equal(plain(read), '[Reading 1 lines from start (total: 3 lines, 2 remaining)]\n\nalpha');
  const native = await call(b, 'mterm_read_file', { path: path.join(roots[0], 'fixture.txt') });
  assert.equal(native.structuredContent.text, 'alpha');
  const batch = await call(b, 'read_multiple_files', {
    paths: roots.map((root) => path.join(root, 'fixture.txt')),
  });
  const batchChunks = batch.content.filter((item) => item.type === 'text').slice(1);
  assert.equal(batchChunks.length, 2);
  for (const chunk of batchChunks) {
    assert.match(chunk.text, /\[Reading 1 lines from start \(total: 3 lines, 2 remaining\)\]\n\nalpha$/);
    assert.doesNotMatch(chunk.text, /βeta|gamma/);
  }
  await set(a, 'fileWriteLineLimit', 1);
  const appended = 'delta\nεpsilon';
  const append = await call(b, 'write_file', {
    path: path.join(roots[0], 'fixture.txt'),
    mode: 'append',
    content: appended,
  });
  assert.match(plain(append), /Performance tip: consider smaller chunks/);
  assert.deepEqual(
    await fs.readFile(path.join(roots[0], 'fixture.txt')),
    Buffer.from(originalText + appended),
  );
  await set(a, 'fileWriteLineLimit', 2);
  const rewrite = await call(b, 'write_file', {
    path: path.join(roots[1], 'written.txt'),
    mode: 'rewrite',
    content: 'one\ntwo',
  });
  assert.doesNotMatch(plain(rewrite), /Performance tip/);
  assert.deepEqual(await fs.readFile(path.join(roots[1], 'written.txt')), Buffer.from('one\ntwo'));
  steps.push('cross-process-read-defaults-and-write-warning-byte-fidelity');

  for (let round = 0; round < 3; round++) {
    await Promise.all([set(a, 'fileReadLineLimit', 3 + round), set(b, 'fileWriteLineLimit', 2 + round)]);
    for (const connection of [a, b]) {
      const config = await get(connection);
      assert.equal(config.fileReadLineLimit, 3 + round);
      assert.equal(config.fileWriteLineLimit, 2 + round);
    }
    await noWriteDebris();
  }
  steps.push('three-concurrent-distinct-key-writes-without-lost-updates');

  await set(a, 'allowedDirectories', [roots[1]]);
  assert.deepEqual((await get(b)).allowedDirectories, [roots[1]]);
  await call(b, 'read_file', { path: path.join(roots[1], 'fixture.txt') });
  await denied(b, 'mterm_read_file', { path: path.join(roots[0], 'fixture.txt') }, 'OUTSIDE_ROOT');
  await denied(b, 'mterm_git_status', { path: roots[0] }, 'OUTSIDE_ROOT');
  const beforeRejectedWrites = await fs.readFile(configurationFile);
  for (const [key, value] of [
    ['allowedDirectories', [workspace]],
    ['allowExec', true],
    ['defaultShell', 'fixture-unapproved-shell'],
    ['fileReadLineLimit', 0],
    ['fileWriteLineLimit', 10001],
  ]) {
    await denied(a, 'set_config_value', { key, value });
    assert.deepEqual(await fs.readFile(configurationFile), beforeRejectedWrites);
  }
  await set(a, 'allowedDirectories', []);
  assert.deepEqual((await get(b)).allowedDirectories, []);
  for (const root of roots) {
    await denied(b, 'read_file', { path: path.join(root, 'fixture.txt') }, 'OUTSIDE_ROOT');
    await denied(b, 'mterm_list_directory', { path: root }, 'OUTSIDE_ROOT');
    await denied(
      b,
      'write_file',
      { path: path.join(root, 'denied.txt'), content: 'never-written' },
      'OUTSIDE_ROOT',
    );
    await assert.rejects(fs.stat(path.join(root, 'denied.txt')), { code: 'ENOENT' });
  }
  await set(a, 'allowedDirectories', roots);
  steps.push('runtime-root-narrowing-empty-denial-and-owner-ceiling-preservation');

  for (const preference of [true, false]) {
    await set(a, 'telemetryEnabled', preference);
    const config = await get(b);
    assert.equal(config.telemetryEnabled, preference);
    assert.equal(config.mterm.effectiveTelemetryEnabled, false);
    assert.equal(config.mterm.telemetryTransport, 'none');
    await call(b, 'read_file', { path: path.join(roots[1], 'fixture.txt') });
  }
  steps.push('telemetry-preference-has-no-observed-node-network-transport');

  const started = (
    await call(a, 'mterm_start_process', {
      command: process.execPath,
      args: ['-e', 'setInterval(() => {}, 1000)'],
      cwd: roots[1],
      timeoutMs: 15000,
    })
  ).structuredContent;
  fixtureProcesses.push({ connection: a, sessionId: started.sessionId, pid: started.pid });
  assert.ok(Number.isInteger(started.pid));
  await set(b, 'blockedCommands', ['node']);
  await denied(
    a,
    'mterm_start_process',
    { command: process.execPath, args: ['-e', 'process.exit(0)'], cwd: roots[1] },
    'COMMAND_BLOCKED',
  );
  const beforeCorrupt = await fs.readFile(configurationFile);
  await fs.writeFile(configurationFile, '{fixture-malformed');
  for (const connection of [a, b]) {
    await denied(connection, 'get_config', {}, 'CONFIG_INVALID');
    await denied(connection, 'read_file', { path: path.join(roots[1], 'fixture.txt') }, 'CONFIG_INVALID');
    await denied(connection, 'set_config_value', { key: 'fileReadLineLimit', value: 2 }, 'CONFIG_INVALID');
  }
  assert.equal(await fs.readFile(configurationFile, 'utf8'), '{fixture-malformed');
  await call(a, 'mterm_list_sessions');
  await call(a, 'mterm_read_process_output', { sessionId: started.sessionId });
  const stopped = await call(a, 'mterm_stop_process', { sessionId: started.sessionId });
  assert.equal(stopped.structuredContent.running, false);
  await verifyProcessExit(started.pid);
  fixtureProcesses.length = 0;
  // Only this fixture driver repairs its deliberately corrupted policy; MCP must not do so.
  await fs.writeFile(configurationFile, beforeCorrupt);
  await noWriteDebris();
  steps.push('malformed-policy-denial-and-owned-process-cleanup');

  await close(a);
  await close(b);
  const restarted = await connect({ allowConfigWrite: false });
  const persisted = await get(restarted);
  assert.equal(persisted.fileReadLineLimit, 5);
  assert.equal(persisted.fileWriteLineLimit, 4);
  assert.deepEqual(persisted.allowedDirectories, roots);
  assert.equal(persisted.telemetryEnabled, false);
  assert.ok(persisted.blockedCommands.includes('node'));
  assert.equal(persisted.mterm.configWriteEnabled, false);
  assert.ok(!(await restarted.list()).tools.some((tool) => tool.name === 'set_config_value'));
  assert.equal(
    (await call(restarted, 'mterm_read_file', { path: path.join(roots[0], 'fixture.txt') })).structuredContent
      .text,
    originalText + appended,
  );
  steps.push('restart-persistence-without-inheriting-config-write-authority');
  result = {
    ok: true,
    packageVersion: manifest.version,
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    installedEntryUnderOwnedPrefix: true,
    installedEntrySha256: createHash('sha256')
      .update(await fs.readFile(entry))
      .digest('hex'),
    installedConfigModuleSha256: createHash('sha256')
      .update(await fs.readFile(path.join(installedPackage, 'dist', 'compat-config.js')))
      .digest('hex'),
    concurrentMcpProcesses: 2,
    restartedMcpProcesses: 1,
    compatibilityToolsDiscovered: ['get_config', 'set_config_value'],
    getConfigMetadata: {
      textMatchesStructuredConfig: true,
      processIdentityMatchesOwnedChild: true,
      boundedMemoryAndRuntimeFields: true,
      orderedPreferenceTypes: true,
      clientExtrasOmitted: true,
      unsupportedProbesExplicitlyOmitted: true,
      featureFlagProvider: 'none',
    },
    steps,
    telemetryNetworkGuard: {
      interceptedCanaryAttempts: canaryAttempts.length,
      canaryApis: canaryAttempts.map((item) => item.api),
      observedProductAttempts: 0,
      maximumRetainedAttemptsPerChild: 128,
      preferenceValuesExercised: [true, false],
      scope:
        'Instrumented standard Node network APIs in the three MCP children; not an OS sandbox or a descendant-process network monitor.',
    },
    actualCodexAgentToolInvocation: false,
    processExitProof:
      'Bounded signal-0 polling observed ESRCH for each captured MCP PID and owned fixture process; no numeric-PID termination fallback.',
    fullConfigurationParity: false,
    modelCalls: 0,
    realUserConfigChanged: false,
    evidence,
  };
} catch (error) {
  failure = error;
} finally {
  const cleanupErrors = [];
  for (const owned of fixtureProcesses) {
    try {
      await call(owned.connection, 'mterm_stop_process', { sessionId: owned.sessionId });
      await verifyProcessExit(owned.pid);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  for (const connection of clients) {
    try {
      await close(connection);
    } catch (error) {
      cleanupErrors.push(error);
    }
    await fs.writeFile(
      path.join(evidence, `stderr-${clients.indexOf(connection)}.log`),
      connection.stderrTail,
    );
  }
  if (cleanupErrors.length)
    failure = new AggregateError(
      [...(failure ? [failure] : []), ...cleanupErrors],
      'Owned fixture cleanup failed',
    );
}
const productAttempts = (await Promise.all(clients.map((connection) => readAudit(connection.audit)))).flat();
if (productAttempts.length)
  failure = new Error(
    'Installed MCP attempted a network transport: ' + productAttempts.map((item) => item.api).join(', '),
  );
if (failure) {
  await fs.writeFile(
    path.join(evidence, 'result.json'),
    JSON.stringify(
      { ok: false, steps, message: failure.message, productNetworkAttempts: productAttempts, evidence },
      null,
      2,
    ),
  );
  throw failure;
}
assert.equal(clients.length, 3);
assert.ok(clients.every((connection) => connection.closed && connection.transport.pid === null));
await fs.rm(workspace, { recursive: true });
result.shutdownVerified = true;
result.ownedFixtureCleanup = true;
result.stderrCapturedBytes = clients.map((connection) => connection.stderrBytes);
await fs.writeFile(path.join(evidence, 'result.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
