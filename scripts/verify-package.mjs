// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-04-local-mcp
// Fresh pack/install/link and official MCP round trip; only test-owned prefix/home/cache are used.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
const exec = promisify(execFile);
const root = path.resolve('.');
const npm = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
await fs.access(npm);
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
  productionFiles,
  packagedMcpRoundTrip: true,
  ownedPrefixNpmLink: true,
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
