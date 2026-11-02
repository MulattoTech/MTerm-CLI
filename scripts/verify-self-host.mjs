// SPDX-License-Identifier: MIT
// Modified: 2026-10-05-codex-parity-foundation; verify actual branch, not obsolete fixture name.
// AI-Change: 2026-10-04-local-mcp
// Real project inspection/typecheck through MTerm's own MCP tools; no models or source mutation.
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
const root = path.resolve('.');
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(root, 'bin', 'mterm-cli.js'), 'mcp', '--stdio', '--root', root, '--allow-exec'],
  stderr: 'pipe',
});
const client = new Client({ name: 'mterm-self-host-verifier', version: '1.0.0' });
const tool = async (name, args = {}) => {
  const r = await client.callTool({ name, arguments: args });
  assert.notEqual(r.isError, true, JSON.stringify(r));
  return r.structuredContent ?? JSON.parse(r.content[0].text);
};
try {
  await client.connect(transport);
  const discovery = await client.listTools();
  const source = await tool('mterm_read_file', { path: 'package.json' });
  assert.equal(JSON.parse(source.text).name, 'mterm-cli');
  const git = await tool('mterm_git_status', { path: '.' });
  // Compare the actual branch/header against independent read-only Git, never a historical branch name.
  const direct = await promisify(execFile)('git', ['-C', root, 'status', '--short', '--branch'], {
    timeout: 10000,
    maxBuffer: 1048576,
    windowsHide: true,
  });
  const expectedHeader = direct.stdout.split(/\r?\n/)[0];
  assert.ok(expectedHeader?.startsWith('## '), 'Independent Git must return its current branch header');
  assert.equal(git.stdout.split(/\r?\n/)[0], expectedHeader);
  const compiler = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  await fs.access(compiler);
  const run = await tool('mterm_start_process', {
    command: process.execPath,
    args: [compiler, '--noEmit', '-p', path.join(root, 'tsconfig.json')],
    cwd: '.',
    timeoutMs: 30000,
  });
  let result;
  const deadline = Date.now() + 35000;
  do {
    result = await tool('mterm_read_process_output', { sessionId: run.sessionId });
    if (!result.running) break;
    await new Promise((r) => setTimeout(r, 100));
  } while (Date.now() < deadline);
  assert.equal(result.running, false);
  assert.equal(result.exitCode, 0);
  const report = {
    actualRepositoryRead: true,
    actualGitStatus: true,
    typecheckExecutedThroughMtermMcp: true,
    typecheckExit: result.exitCode,
    toolCount: discovery.tools.length,
    rootWritesEnabled: false,
    executionExplicitlyEnabled: true,
    modelsInvoked: 0,
    webRelay: false,
    node: process.version,
  };
  await fs.writeFile(path.join(root, 'artifacts', 'self-host-result.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await client.close();
  await transport.close().catch(() => {});
}
