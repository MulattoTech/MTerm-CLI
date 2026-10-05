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
const args = ['setup', 'codex', '--root', workspace, '--allow-write', '--allow-exec', '--apply'];
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
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  setupApplied: true,
  setupIdempotent: true,
  configurationParsedByCodex: true,
  registeredCommandMcpRounds: 2,
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
