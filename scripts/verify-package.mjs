// SPDX-License-Identifier: MIT
// Modified: 2026-11-08-aug005-lifecycle-observation; require both causal deadline phases from the installed runtime.
// Modified: 2026-11-08-aug012-resource-budgets; exercise all resource fixtures against exact installed admission modules.
// Modified: 2026-11-08-aug003-pack-catalog; bind the installed final spawn guard and require all catalog fixtures.
// Modified: 2026-11-07-aug002-provenance; qualify pinned attribution and exact production closure.
// Modified: 2026-11-07-aug001-pack-boundary; qualify optional packs through the exact installed runtime.
// AI-Change: 2026-10-04-local-mcp
// Modified: 2026-11-02-config-installed-qualification; qualify shared runtime preferences from the installed package.
// Modified: 2026-11-02-file-info-contract; retain installed compatibility scenario and cleanup evidence.
// Modified: 2026-11-02-windows-dpapi-bounds; bind synthetic remote-state checks to the installed package.
// Fresh pack/install/link and official MCP round trip; only test-owned prefix/home/cache are used.
import fs from 'node:fs/promises';
import { resolveNpmEntry } from './npm-runtime.mjs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
const exec = promisify(execFile);
const root = path.resolve('.');
const npm = await resolveNpmEntry();
await fs.mkdir(path.join(root, 'artifacts'), { recursive: true });
const output = await fs.mkdtemp(path.join(root, 'artifacts', 'package-verify-'));
const prefix = path.join(output, 'install'),
  linkPrefix = path.join(output, 'links'),
  home = path.join(output, 'home');
await fs.mkdir(home);
const empty = path.join(output, 'empty.npmrc');
await fs.writeFile(empty, '');
const globalEmpty = path.join(output, 'global.npmrc');
await fs.writeFile(globalEmpty, '');
const env = {
  ...process.env,
  HOME: home,
  USERPROFILE: home,
  CODEX_HOME: path.join(home, 'codex'),
  MTERM_CONFIG_PATH: path.join(home, 'mterm.json'),
  npm_config_userconfig: empty,
  npm_config_globalconfig: globalEmpty,
  npm_config_cache: path.join(output, 'cache'),
  npm_config_audit: 'false',
  npm_config_fund: 'false',
};
for (const key of Object.keys(env)) if (/token|secret|password/i.test(key)) delete env[key];
const npmRun = async (args, cwd = root) =>
  exec(process.execPath, [npm, ...args], {
    cwd,
    env,
    timeout: 120000,
    maxBuffer: 2097152,
    windowsHide: true,
  });
assert.equal(
  await fs.readFile(path.join(root, 'package-lock.json'), 'utf8'),
  await fs.readFile(path.join(root, 'npm-shrinkwrap.json'), 'utf8'),
  'Runtime shrinkwrap must match source lock',
);
// Snapshot public compiled inputs before packing; the verifier must import these exact installed bytes.
const remoteSourceFiles = [];
for (const name of (await fs.readdir(path.join(root, 'dist', 'remote')))
  .filter((p) => p.endsWith('.js'))
  .sort()) {
  const file = path.join(root, 'dist', 'remote', name);
  assert.ok((await fs.lstat(file)).isFile(), 'Remote runtime inputs must be regular files');
  const bytes = await fs.readFile(file);
  remoteSourceFiles.push({
    path: 'dist/remote/' + name,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}
assert.ok(remoteSourceFiles.some((f) => f.path === 'dist/remote/state.js'));
const remoteSourceSnapshot = path.join(output, 'remote-source-snapshot.json');
await fs.writeFile(
  remoteSourceSnapshot,
  JSON.stringify({ schemaVersion: 1, files: remoteSourceFiles }, null, 2) + '\n',
);
const packs = JSON.parse(
  (await npmRun(['pack', '--ignore-scripts', '--json', '--pack-destination', output])).stdout,
);
assert.equal(packs.length, 1);
const pack = packs[0];
const allowed = (p) =>
  p === 'package.json' ||
  p === 'npm-shrinkwrap.json' ||
  ['README.md', 'LICENSE', 'THIRD_PARTY.md', 'versions.json'].includes(p) ||
  p.startsWith('bin/') ||
  p.startsWith('dist/');
for (const f of pack.files) {
  assert.ok(allowed(f.path), 'Unexpected package entry: ' + f.path);
  assert.ok(!/\.(map|ts)$/.test(f.path) || f.path.endsWith('.d.ts'), 'Source map/source accidentally packed');
}
const tarball = path.join(output, pack.filename);
await npmRun([
  'install',
  tarball,
  '--prefix',
  prefix,
  '--omit=dev',
  '--ignore-scripts',
  '--no-audit',
  '--no-fund',
]);
const installed = path.join(prefix, 'node_modules', 'mterm-cli', 'bin', 'mterm-cli.js');
const version = await exec(process.execPath, [installed, '--version'], { cwd: home, env, timeout: 10000 });
assert.equal(version.stdout.trim(), '0.0.1-preview.1');
// npm exec is npx's modern execution path; use the already cached exact tarball offline.
const npx = await npmRun(
  ['exec', '--offline', '--yes', '--package', tarball, '--', 'mterm-cli', '--version'],
  home,
);
assert.equal(npx.stdout.trim(), '0.0.1-preview.1');
const timings = [];
for (let i = 0; i < 5; i++) {
  const start = performance.now();
  const help = await exec(process.execPath, [installed, '--help'], { cwd: home, env, timeout: 10000 });
  assert.match(help.stdout, /mcp --stdio/);
  timings.push(performance.now() - start);
}
const scope = path.join(output, 'scope');
await fs.mkdir(scope);
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [installed, 'mcp', '--stdio', '--root', scope, '--allow-write'],
  env,
  stderr: 'pipe',
});
const client = new Client({ name: 'mterm-packaged-acceptance', version: '1.0.0' });
try {
  await client.connect(transport);
  const tools = await client.listTools();
  assert.ok(tools.tools.some((t) => t.name === 'mterm_write_file'));
  const write = await client.callTool({
    name: 'mterm_write_file',
    arguments: { path: 'proof.txt', text: 'installed MCP works', expectedVersion: 'missing' },
  });
  assert.equal(write.isError, false);
  const read = await client.callTool({ name: 'mterm_read_file', arguments: { path: 'proof.txt' } });
  const data = read.structuredContent ?? JSON.parse(read.content[0].text);
  assert.equal(data.text, 'installed MCP works');
} finally {
  await client.close();
  await transport.close().catch(() => {});
}
const compatibility = JSON.parse(
  (
    await exec(
      process.execPath,
      [path.join(root, 'scripts/verify-compatibility-installed.mjs'), npm, tarball, scope],
      { cwd: home, env, timeout: 40000, maxBuffer: 1048576, windowsHide: true },
    )
  ).stdout,
);
assert.equal(compatibility.compatibilityAliasesExercised, 8);
const configuration = JSON.parse(
  (
    await exec(
      process.execPath,
      [
        path.join(root, 'scripts/verify-configuration-installed.mjs'),
        installed,
        prefix,
        output,
        pack.version,
      ],
      { cwd: home, env, timeout: 60000, maxBuffer: 1048576, windowsHide: true },
    )
  ).stdout,
);
assert.equal(configuration.ok, true);
assert.equal(configuration.concurrentMcpProcesses, 2);
assert.equal(configuration.shutdownVerified, true);
assert.equal(configuration.telemetryNetworkGuard.observedProductAttempts, 0);
const remoteState = JSON.parse(
  (
    await exec(
      process.execPath,
      [
        path.join(root, 'scripts/verify-remote-state-installed.mjs'),
        installed,
        prefix,
        output,
        pack.version,
        remoteSourceSnapshot,
      ],
      { cwd: home, env, timeout: 90000, maxBuffer: 1048576, windowsHide: true },
    )
  ).stdout,
);
assert.equal(remoteState.ok, true);
assert.deepEqual(remoteState.moduleBindings, remoteSourceFiles);
assert.equal(remoteState.syntheticCredentialRoundtrip, true);
assert.equal(remoteState.windowsDpapiExercised, process.platform === 'win32');
assert.equal(remoteState.ownedProcessExitsVerified, process.platform === 'win32' ? true : null);
assert.equal(remoteState.fixtureCleanupVerified, true);
assert.equal(remoteState.syntheticOnly, true);
assert.equal(remoteState.actualRemoteEnrollment, false);
assert.equal(remoteState.modelCalls, 0);
const packBindings = [];
for (const name of [
  'cli.js',
  'mcp.js',
  'tool-packs.js',
  'processes.js',
  'resource-budgets.js',
  'resource-budget-policy.js',
  'policy.js',
]) {
  const source = await fs.readFile(path.join(root, 'dist', name));
  const installedBytes = await fs.readFile(path.resolve(path.dirname(installed), '../dist', name));
  assert.deepEqual(installedBytes, source, 'Installed pack boundary differs from compiled source');
  packBindings.push({
    path: 'dist/' + name,
    sha256: createHash('sha256').update(installedBytes).digest('hex'),
  });
}
const packAcceptance = await exec(
  process.execPath,
  ['--test', '--test-reporter=tap', '--test-concurrency=1', path.join(root, 'tests/tool-packs.test.mjs')],
  {
    cwd: home,
    env: { ...env, MTERM_VERIFY_BIN: installed },
    timeout: 90000,
    maxBuffer: 2097152,
    windowsHide: true,
  },
);
await fs.writeFile(path.join(output, 'optional-pack-tests.tap'), packAcceptance.stdout);
const packTestCount = Number(packAcceptance.stdout.match(/^# tests (\d+)$/m)?.[1]);
assert.ok(packTestCount >= 29, 'Installed optional-pack acceptance did not run');
assert.match(packAcceptance.stdout, /^# fail 0$/m);
assert.match(packAcceptance.stdout, /^# skipped 0$/m);
assert.match(packAcceptance.stdout, /^# cancelled 0$/m);
const installedOptionalPacks = {
  ok: true,
  tests: packTestCount,
  failed: 0,
  skipped: 0,
  cancelled: 0,
  moduleBindings: packBindings,
  syntheticOnly: true,
  modelCalls: 0,
  osSandbox: false,
  realClientConsent: false,
  log: path.join(output, 'optional-pack-tests.tap'),
};
const budgetAcceptance = await exec(
  process.execPath,
  [
    '--test',
    '--test-reporter=tap',
    '--test-concurrency=1',
    path.join(root, 'tests/resource-budgets.test.mjs'),
  ],
  {
    cwd: home,
    env: { ...env, MTERM_VERIFY_BIN: installed },
    timeout: 90000,
    maxBuffer: 2097152,
    windowsHide: true,
  },
).then(
  (result) => ({ ...result, exit: 0 }),
  (error) => ({
    stdout: error.stdout ?? '',
    stderr: error.stderr ?? '',
    exit: error.code ?? 'unknown',
  }),
);
const budgetLog = path.join(output, 'resource-budget-tests.tap');
await fs.writeFile(budgetLog, budgetAcceptance.stdout + budgetAcceptance.stderr);
assert.equal(budgetAcceptance.exit, 0, 'Installed resource-budget acceptance failed; see retained log');
const budgetTestCount = Number(budgetAcceptance.stdout.match(/^# tests (\d+)$/m)?.[1]);
assert.ok(budgetTestCount >= 24, 'Installed resource-budget acceptance did not run');
assert.match(budgetAcceptance.stdout, /^# fail 0$/m);
assert.match(budgetAcceptance.stdout, /^# skipped 0$/m);
assert.match(budgetAcceptance.stdout, /^# cancelled 0$/m);
const installedResourceBudgets = {
  ok: true,
  tests: budgetTestCount,
  failed: 0,
  skipped: 0,
  cancelled: 0,
  moduleBindings: packBindings,
  scope: 'host-instance',
  realStatfsAndOwnedProcesses: true,
  injectedBackendFailuresLabeled: true,
  syntheticOnly: true,
  modelCalls: 0,
  crossHostEnforcement: false,
  hardCpuGpuRamOrDiskWriteQuotas: false,
  log: budgetLog,
};
const isolationBindings = [];
for (const name of [
  'cli.js',
  'mcp.js',
  'processes.js',
  'policy.js',
  'resource-budget-policy.js',
  'resource-budgets.js',
  'isolation-policy.js',
  'isolation-http.js',
  'isolation-engine.js',
  'isolation.js',
  'errors.js',
]) {
  const source = await fs.readFile(path.join(root, 'dist', name));
  const bytes = await fs.readFile(path.resolve(path.dirname(installed), '../dist', name));
  assert.deepEqual(bytes, source, 'Installed isolation boundary differs from compiled source');
  isolationBindings.push({ path: 'dist/' + name, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const isolationAcceptance = await exec(
  process.execPath,
  ['--test', '--test-reporter=tap', '--test-concurrency=1', path.join(root, 'tests/isolation.test.mjs')],
  {
    cwd: home,
    env: { ...env, MTERM_VERIFY_BIN: installed },
    timeout: 90000,
    maxBuffer: 4194304,
    windowsHide: true,
  },
).then(
  (r) => ({ ...r, exit: 0 }),
  (e) => ({ stdout: e.stdout ?? '', stderr: e.stderr ?? '', exit: e.code ?? 'unknown' }),
);
const isolationLog = path.join(output, 'isolation-protocol-tests.tap');
await fs.writeFile(isolationLog, isolationAcceptance.stdout + isolationAcceptance.stderr);
if (process.env.MTERM_ISOLATION_REQUIRE_LIVE === '1') {
  const retained = path.join(root, 'artifacts/aug005/ci-evidence');
  await fs.mkdir(retained, { recursive: true });
  await fs.copyFile(isolationLog, path.join(retained, 'installed-isolation-protocol.tap'));
  await fs.writeFile(
    path.join(retained, 'installed-isolation-protocol.json'),
    JSON.stringify(
      {
        exitCode: isolationAcceptance.exit,
        tests: Number(isolationAcceptance.stdout.match(/^# tests (\d+)$/m)?.[1]) || null,
        moduleBindings: isolationBindings,
        sha256: createHash('sha256')
          .update(isolationAcceptance.stdout + isolationAcceptance.stderr)
          .digest('hex'),
        syntheticOnly: true,
        modelCalls: 0,
      },
      null,
      2,
    ),
  );
}
assert.equal(
  isolationAcceptance.exit,
  0,
  'Installed isolation protocol/denial tests failed; see retained log',
);
const isolationTestCount = Number(isolationAcceptance.stdout.match(/^# tests (\d+)$/m)?.[1]);
assert.ok(isolationTestCount >= 29);
for (const field of ['fail', 'skipped', 'cancelled'])
  assert.match(isolationAcceptance.stdout, new RegExp('^# ' + field + ' 0$', 'm'));
let isolationLive = null;
if (process.env.MTERM_ISOLATION_REQUIRE_LIVE === '1') {
  const liveOutput = path.join(root, 'artifacts/aug005/ci-evidence/installed');
  const executed = await exec(
    process.execPath,
    [path.join(root, 'scripts/verify-isolation-live.mjs'), installed, liveOutput],
    {
      cwd: home,
      env: { ...env, MTERM_ISOLATION_REQUIRE_LIVE: '1' },
      timeout: 300000,
      maxBuffer: 4194304,
      windowsHide: true,
    },
  );
  isolationLive = JSON.parse(executed.stdout);
  assert.equal(isolationLive.passed, true);
  assert.equal(isolationLive.installedPackage, true);
  assert.equal(isolationLive.fromOutsideCheckout, true);
}
const installedIsolation = {
  ok: true,
  protocolTests: isolationTestCount,
  moduleBindings: isolationBindings,
  protocolIsSynthetic: true,
  actualUnsupportedHostDenial: process.platform !== 'linux' || process.arch !== 'x64',
  live: isolationLive,
  fullRuntimeImageRedistributionEligible: false,
  modelCalls: 0,
  log: isolationLog,
};
const sourceCommit = (
  await exec('git', ['rev-parse', 'HEAD'], { cwd: root, timeout: 10000, windowsHide: true })
).stdout.trim();
const installedProvenance = JSON.parse(
  (
    await exec(
      process.execPath,
      [path.join(root, 'scripts/verify-provenance-installed.mjs'), installed, prefix, output, sourceCommit],
      { cwd: home, env, timeout: 90000, maxBuffer: 2097152, windowsHide: true },
    )
  ).stdout,
);
assert.equal(installedProvenance.ok, true);
assert.equal(installedProvenance.productionRedistributionEligible, false);
assert.equal(installedProvenance.productionPackages, 4);
assert.equal(installedProvenance.productionEdges, 5);
// CLI --prefix changes npm's local package root; environment prefix selects an isolated global link destination.
env.npm_config_prefix = linkPrefix;
assert.equal((await npmRun(['prefix', '--global'])).stdout.trim(), linkPrefix);
await npmRun(['link', '--ignore-scripts', '--no-audit', '--no-fund']);
delete env.npm_config_prefix;
const linkedPackage =
  process.platform === 'win32'
    ? path.join(linkPrefix, 'node_modules', 'mterm-cli')
    : path.join(linkPrefix, 'lib', 'node_modules', 'mterm-cli');
assert.equal(await fs.realpath(linkedPackage), await fs.realpath(root));
const shim =
  process.platform === 'win32'
    ? path.join(linkPrefix, 'mterm-cli.cmd')
    : path.join(linkPrefix, 'bin', 'mterm-cli');
await fs.access(shim);
let linked;
if (process.platform === 'win32') {
  assert.ok(!/[&|<>^%]/.test(shim));
  linked = await exec(
    path.join(process.env.SystemRoot, 'System32', 'cmd.exe'),
    ['/d', '/s', '/c', `""${shim}" --version"`],
    { cwd: home, env, timeout: 10000, windowsVerbatimArguments: true },
  );
} else linked = await exec(shim, ['--version'], { cwd: home, env, timeout: 10000 });
assert.equal(linked.stdout.trim(), '0.0.1-preview.1');
let productionBytes = 0,
  productionFiles = 0;
const deps = [];
async function measure(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.isSymbolicLink()) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await measure(p);
    else {
      productionBytes += (await fs.stat(p)).size;
      productionFiles++;
    }
  }
}
await measure(path.join(prefix, 'node_modules'));
assert.ok(productionBytes < 50000000, 'Installed standalone core exceeds 50,000,000 bytes');
const reviewedLicenses = {
  'mterm-cli': 'MIT',
  '@modelcontextprotocol/core': 'Apache-2.0',
  '@modelcontextprotocol/server': 'Apache-2.0',
  zod: 'MIT',
};
const installedLock = JSON.parse(await fs.readFile(path.join(prefix, 'package-lock.json'), 'utf8'));
const productionLicenseEvidence = [];
for (const [location, locked] of Object.entries(installedLock.packages)) {
  if (!location) continue;
  assert.ok(location.startsWith('node_modules/') && !location.split('/').includes('..'));
  const directory = path.join(prefix, location);
  const metadata = JSON.parse(await fs.readFile(path.join(directory, 'package.json'), 'utf8'));
  assert.ok(Object.hasOwn(reviewedLicenses, metadata.name), 'Unreviewed production package');
  assert.equal(metadata.license, reviewedLicenses[metadata.name], 'Unreviewed production package license');
  assert.equal(metadata.version, locked.version);
  const sourceDirectory =
    metadata.name === 'mterm-cli' ? root : path.join(root, 'node_modules', metadata.name);
  const notices = (await fs.readdir(sourceDirectory)).filter((name) =>
    /^(licen[cs]e|notice|copying)(?:\.|$)/i.test(name),
  );
  assert.ok(
    notices.some((name) => /^licen[cs]e(?:\.|$)/i.test(name)),
    'Missing production license',
  );
  const files = [];
  for (const name of notices) {
    const source = await fs.readFile(path.join(sourceDirectory, name));
    const installedNotice = await fs.readFile(path.join(directory, name));
    assert.deepEqual(installedNotice, source, 'Installed license/notice differs from reviewed package');
    files.push({ path: name, sha256: createHash('sha256').update(installedNotice).digest('hex') });
  }
  productionLicenseEvidence.push({
    name: metadata.name,
    version: metadata.version,
    license: metadata.license,
    integrity: locked.integrity ?? null,
    files,
  });
}
assert.equal(
  productionLicenseEvidence.length,
  4,
  'Production dependency set changed; review its rights and footprint',
);
for (const name of ['electron', '@modelcontextprotocol/client', 'typescript', 'prettier', '@types/node'])
  assert.equal(
    await fs
      .stat(path.join(prefix, 'node_modules', name))
      .then(() => true)
      .catch(() => false),
    false,
    'Unexpected production dependency ' + name,
  );
const report = {
  packageVersion: pack.version,
  archiveBytes: pack.size,
  packageUnpackedBytes: pack.unpackedSize,
  installedProductionBytes: productionBytes,
  installedStandaloneCoreUnder50MB: true,
  productionLicenseEvidence,
  productionFiles,
  packagedMcpRoundTrip: true,
  ownedPrefixNpmLink: true,
  offlineNpmExecFromTarball: true,
  npmExecMcpCompatibilityTools: compatibility.compatibilityAliasesExercised,
  installedCompatibility: compatibility,
  installedConfiguration: configuration,
  installedRemoteState: remoteState,
  installedOptionalPacks,
  installedResourceBudgets,
  installedIsolation,
  installedProvenance,
  fullTransitiveLicenseClearance: false,
  fullDesktopCommanderParity: false,
  fromOutsideCheckout: true,
  helpExternalLaunchSamplesMs: timings.map((x) => Math.round(x * 100) / 100),
  helpMedianMs: [...timings].sort((a, b) => a - b)[2],
  nodeVersion: process.version,
  nodePrerequisiteBytes: (await fs.stat(process.execPath)).size,
  nodeBundled: false,
  codexBundled: false,
  webBundled: false,
  quotaAdapterBundled: false,
  fullThreeComponentUnder50MB: 'NOT VERIFIED; this is a dependency-reuse local host, not that bundle',
  modelCalls: 0,
  userGlobalPrefixModified: false,
  evidence: output,
};
await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
