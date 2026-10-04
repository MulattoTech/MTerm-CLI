// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-04-local-mcp
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
const entry = path.resolve('bin/mterm-cli.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function connect(t, flags = []) {
  assert.ok(await fs.stat(entry).catch(() => false), 'MCP executable must exist');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-sdk-client-'));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [entry, 'mcp', '--stdio', '--root', root, ...flags],
    stderr: 'pipe',
  });
  const client = new Client({ name: 'mterm-integration-tests', version: '1.0.0' });
  let stderr = '';
  transport.stderr?.on('data', (b) => (stderr += b.toString()));
  t.after(async () => {
    await client.close();
    await transport.close().catch(() => {});
    await fs.rm(root, { recursive: true, force: true });
  });
  await client.connect(transport);
  return { root, client, transport, stderr: () => stderr };
}
const value = (r) => r.structuredContent ?? JSON.parse(r.content.find((c) => c.type === 'text').text);
const call = (client, name, args = {}) => client.callTool({ name, arguments: args });
test('official client negotiates protocol and discovery, ping and least privilege', async (t) => {
  const { client } = await connect(t);
  await client.ping();
  const list = await client.listTools();
  assert.ok(list.tools.some((t) => t.name === 'mterm_read_file'));
  assert.ok(!list.tools.some((t) => t.name === 'mterm_start_process'));
  assert.ok(!list.tools.some((t) => t.name === 'mterm_write_file'));
  const caps = value(await call(client, 'mterm_capabilities'));
  assert.equal(caps.executionEnabled, false);
  assert.equal(caps.writeEnabled, false);
  assert.equal(caps.networkListener, false);
});
test('official MCP file tools perform create/read/move and policy denials', async (t) => {
  const { root, client } = await connect(t, ['--allow-write']);
  const write = await call(client, 'mterm_write_file', {
    path: 'first.txt',
    text: 'MCP real round trip',
    expectedVersion: 'missing',
  });
  assert.equal(write.isError, false);
  assert.equal(
    value(await call(client, 'mterm_read_file', { path: 'first.txt' })).text,
    'MCP real round trip',
  );
  await call(client, 'mterm_move', { source: 'first.txt', destination: 'second.txt' });
  assert.equal(await fs.readFile(path.join(root, 'second.txt'), 'utf8'), 'MCP real round trip');
  const denied = await call(client, 'mterm_read_file', { path: '../outside.txt' });
  assert.equal(denied.isError, true);
  assert.equal(value(denied).error.code, 'OUTSIDE_ROOT');
  const malformed = await call(client, 'mterm_write_file', {
    path: 'second.txt',
    text: 42,
    expectedVersion: 'missing',
  });
  assert.equal(malformed.isError, true);
  assert.equal(await fs.readFile(path.join(root, 'second.txt'), 'utf8'), 'MCP real round trip');
});
test('official MCP owned process accepts input, polls output and exits', async (t) => {
  const { client } = await connect(t, ['--allow-exec']);
  const started = value(
    await call(client, 'mterm_start_process', {
      command: process.execPath,
      args: ['-e', "process.stdin.once('data',b=>{console.log('ECHO:'+b);process.exit(0)})"],
    }),
  );
  assert.ok(started.sessionId);
  await call(client, 'mterm_process_input', { sessionId: started.sessionId, text: 'test\n' });
  let result;
  for (let i = 0; i < 100; i++) {
    result = value(await call(client, 'mterm_read_process_output', { sessionId: started.sessionId }));
    if (!result.running) break;
    await sleep(20);
  }
  assert.equal(result.exitCode, 0);
  assert.match(result.events.map((e) => e.text).join(''), /ECHO:test/);
});
test('server stdin EOF stops its owned process without leaving a resident host', async (t) => {
  const { client, transport } = await connect(t, ['--allow-exec']);
  const started = value(
    await call(client, 'mterm_start_process', {
      command: process.execPath,
      args: ['-e', 'setInterval(()=>{},1000)'],
    }),
  );
  await client.close();
  let alive = true;
  for (let i = 0; i < 100; i++) {
    try {
      process.kill(started.pid, 0);
    } catch {
      alive = false;
      break;
    }
    await sleep(25);
  }
  assert.equal(alive, false);
  assert.equal(transport.pid, null);
});
test('oversized stdio request closes promptly instead of unbounded buffering', async (t) => {
  assert.ok(await fs.stat(entry).catch(() => false), 'MCP executable must exist');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-size-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const p = spawn(process.execPath, [entry, 'mcp', '--stdio', '--root', root], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  t.after(() => p.kill());
  p.stdin.on('error', () => {});
  p.stdout.resume();
  p.stderr.resume();
  const exited = new Promise((r) => p.once('exit', r));
  p.stdin.write('x'.repeat(3 * 1024 * 1024));
  await Promise.race([exited, sleep(4000).then(() => assert.fail('oversized frame did not terminate'))]);
});
