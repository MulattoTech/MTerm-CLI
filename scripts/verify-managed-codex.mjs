// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-05-codex-parity-foundation
// Real Codex only receives isolated synthetic config. No model calls or auth access.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { resolveCodex } from '../dist/codex.js';
const exec = promisify(execFile),
  root = path.resolve('.');

// CI must select the pinned test-owned native binary, never a user/global wrapper
// discovered through PATH or APPDATA. This selection belongs to verification only.
async function selectTestCodex() {
  const requestedPrefix = process.env.MTERM_CODEX_TEST_PREFIX;
  const expectedVersion = process.env.MTERM_CODEX_EXPECTED_VERSION;
  const ci =
    process.env.GITHUB_ACTIONS === 'true' || (!!process.env.CI && !['false', '0'].includes(process.env.CI));
  if (!requestedPrefix && !expectedVersion) {
    assert.ok(!ci, 'CI requires MTERM_CODEX_TEST_PREFIX and MTERM_CODEX_EXPECTED_VERSION');
    return undefined;
  }
  assert.ok(requestedPrefix && expectedVersion, 'Provide both Codex test prefix and expected version');
  assert.match(expectedVersion, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  const contains = (parent, candidate) => {
    const relative = path.relative(parent, candidate);
    return (
      relative !== '' &&
      !path.isAbsolute(relative) &&
      relative !== '..' &&
      !relative.startsWith('..' + path.sep)
    );
  };
  const artifacts = await fs.realpath(path.join(root, 'artifacts'));
  const prefix = await fs.realpath(path.resolve(root, requestedPrefix));
  assert.ok(
    contains(artifacts, prefix),
    'Codex test prefix must be inside this checkout artifacts directory',
  );
  const packageRoot = async (name) => {
    const directory = await fs.realpath(path.join(prefix, 'node_modules', ...name.split('/')));
    assert.ok(contains(prefix, directory), 'Codex fixture package escapes its test prefix');
    const manifest = JSON.parse(await fs.readFile(path.join(directory, 'package.json'), 'utf8'));
    assert.equal(manifest.name, name, 'Unexpected Codex fixture package');
    assert.equal(manifest.version, expectedVersion, 'Codex fixture package version differs from the pin');
    return directory;
  };
  await packageRoot('@openai/codex');
  const platformPackage = '@openai/codex-' + process.platform + '-' + process.arch;
  const nativeRoot = await packageRoot(platformPackage);
  const vendor = await fs.realpath(path.join(nativeRoot, 'vendor'));
  assert.ok(contains(nativeRoot, vendor), 'Codex vendor directory escapes its platform package');
  const executableName = process.platform === 'win32' ? 'codex.exe' : 'codex';
  const candidates = [];
  for (const triple of await fs.readdir(vendor, { withFileTypes: true })) {
    if (!triple.isDirectory() || triple.isSymbolicLink()) continue;
    try {
      const executable = await fs.realpath(path.join(vendor, triple.name, 'bin', executableName));
      assert.ok(contains(nativeRoot, executable), 'Codex native executable escapes its platform package');
      if ((await fs.stat(executable)).isFile()) candidates.push(executable);
    } catch (error) {
      if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error;
    }
  }
  assert.equal(candidates.length, 1, 'Expected exactly one test-owned platform-native Codex executable');
  process.env.MTERM_CODEX_EXECUTABLE = candidates[0];
  return { prefix, executable: candidates[0], expectedVersion };
}

const testCodex = await selectTestCodex();
await fs.mkdir(path.join(root, 'artifacts'), { recursive: true });
const evidence = await fs.mkdtemp(path.join(root, 'artifacts', 'managed-codex-'));
const home = path.join(evidence, 'home'),
  workspace = path.join(evidence, 'workspace spaces');
await fs.mkdir(home);
await fs.mkdir(workspace);
const original =
  '# untouched CRLF comment\r\n[mcp_servers.unrelated]\r\ncommand = "fixture-only-never-run"\r\n';
const config = path.join(home, 'config.toml');
await fs.writeFile(config, original);
const env = { ...process.env, CODEX_HOME: home, MTERM_CONFIG_PATH: path.join(evidence, 'mterm.json') };
const codex = await resolveCodex();
if (testCodex) assert.equal(await fs.realpath(codex.command), testCodex.executable);
const codexRun = async (args) =>
  exec(codex.command, [...codex.prefix, ...args], {
    env,
    timeout: 20000,
    maxBuffer: 1048576,
    windowsHide: true,
  });
const bin = process.env.MTERM_VERIFY_BIN
  ? path.resolve(process.env.MTERM_VERIFY_BIN)
  : path.join(root, 'bin', 'mterm-cli.js');
const mterm = async (args) =>
  JSON.parse(
    (
      await exec(process.execPath, [bin, ...args], {
        env,
        cwd: workspace,
        timeout: 40000,
        maxBuffer: 1048576,
        windowsHide: true,
      })
    ).stdout,
  );
const version = (await codexRun(['--version'])).stdout.trim();
if (testCodex)
  assert.equal(
    /^codex(?:-cli)? (\S+)$/.exec(version)?.[1],
    testCodex.expectedVersion,
    'Native Codex --version differs from the test pin',
  );
const args = [
  'setup',
  'codex',
  '--root',
  workspace,
  '--allow-write',
  '--allow-exec',
  '--compat-desktop-commander',
  '--apply',
];
assert.equal((await mterm(args)).changed, true);
const installed = await fs.readFile(config, 'utf8');
assert.ok(installed.startsWith(original));
assert.equal((await mterm(args)).changed, false);
assert.equal(await fs.readFile(config, 'utf8'), installed);
const parsed = JSON.parse((await codexRun(['mcp', 'get', 'mterm-local', '--json'])).stdout);
const spec = parsed.transport ?? parsed;
assert.equal(spec.type, 'stdio');
assert.equal(spec.command, process.execPath);
assert.equal(path.resolve(spec.args[0]), bin);
// Launch twice from the actual config Codex parsed. No independent foreground server is needed.
for (let iteration = 0; iteration < 2; iteration++) {
  const transport = new StdioClientTransport({ command: spec.command, args: spec.args, env, stderr: 'pipe' });
  const client = new Client({ name: 'mterm-managed-codex-fixture', version: '1.0.0' });
  try {
    await client.connect(transport);
    await client.ping();
    const toolList = await client.listTools();
    assert.ok(toolList.tools.some((x) => x.name === 'mterm_write_file'));
    assert.ok(toolList.tools.some((x) => x.name === 'read_file'));
    const response = await client.callTool({ name: 'mterm_read_file', arguments: { path: 'fixture.txt' } });
    if (iteration === 0) {
      assert.equal(response.isError, true);
      assert.equal(
        (
          await client.callTool({
            name: 'mterm_write_file',
            arguments: { path: 'fixture.txt', text: 'configured MCP works', expectedVersion: 'missing' },
          })
        ).isError,
        false,
      );
    } else {
      assert.equal(response.isError, false);
      assert.equal(response.structuredContent.text, 'configured MCP works');
      const compatible = await client.callTool({
        name: 'read_file',
        arguments: { path: path.join(workspace, 'fixture.txt') },
      });
      assert.equal(compatible.isError, false);
      assert.match(compatible.content[0].text, /configured MCP works/);
    }
  } finally {
    await client.close();
    await transport.close().catch(() => {});
  }
  assert.equal(transport.pid, null);
}
const extra = '\n[mcp_servers.after_setup]\ncommand="another-unrelated"\n';
await fs.appendFile(config, extra);
assert.equal((await mterm(['remove', 'codex'])).applied, false);
assert.equal(await fs.readFile(config, 'utf8'), installed + extra);
assert.equal((await mterm(['remove', 'codex', '--apply'])).removed, true);
assert.equal(await fs.readFile(config, 'utf8'), original + extra);
assert.equal((await mterm(['remove', 'codex', '--apply'])).changed, false);
const list = JSON.parse((await codexRun(['mcp', 'list', '--json'])).stdout);
assert.ok(list.some((x) => x.name === 'unrelated'));
assert.ok(list.some((x) => x.name === 'after_setup'));
assert.ok(!list.some((x) => x.name === 'mterm-local'));
const report = {
  codexVersion: version,
  codexExpectedVersion: testCodex?.expectedVersion ?? null,
  testOwnedCodex: !!testCodex,
  codexTestPrefix: testCodex ? path.relative(root, testCodex.prefix).split(path.sep).join('/') : null,
  codexNativeExecutable: testCodex
    ? path.relative(testCodex.prefix, testCodex.executable).split(path.sep).join('/')
    : null,
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  setupApplied: true,
  setupIdempotent: true,
  configurationParsedByCodex: true,
  registeredCommandMcpRounds: 2,
  compatibilityProfilePersisted: true,
  shutdownVerified: true,
  removalPreservesUnrelatedBytes: true,
  backupsRetained: true,
  actualCodexAgentToolInvocation: false,
  realUserConfigChanged: false,
  modelCalls: 0,
  installedEntry: !!process.env.MTERM_VERIFY_BIN,
  evidence,
};
await fs.writeFile(path.join(evidence, 'result.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
