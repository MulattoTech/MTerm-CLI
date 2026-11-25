// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-25-local-parity
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

async function connect(t, flags = []) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-local-parity-'));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve('bin/mterm-cli.js'), 'mcp', '--stdio', '--root', root, ...flags],
    stderr: 'pipe',
  });
  const client = new Client({ name: 'local-parity-fixture', version: '1.0.0' });
  t.after(async () => {
    await client.close();
    await transport.close().catch(() => {});
    await fs.rm(root, { recursive: true, force: true });
  });
  await client.connect(transport);
  return { root, client };
}
const call = (client, name, args = {}) => client.callTool({ name, arguments: args });

test('local audit aliases are opt-in and do not grant writes or execution', async (t) => {
  const native = await connect(t);
  const compat = await connect(t, ['--compat-desktop-commander']);
  const a = (await native.client.listTools()).tools.map((x) => x.name);
  const b = (await compat.client.listTools()).tools.map((x) => x.name);
  for (const name of ['get_recent_tool_calls', 'get_usage_stats']) {
    assert.ok(!a.includes(name), name + ' absent from native profile');
    assert.ok(b.includes(name), name + ' in compatibility profile');
  }
  for (const name of ['write_file', 'start_process', 'mterm_write_file', 'mterm_start_process']) {
    assert.ok(!b.includes(name), name + ' not granted');
  }
});

test('local history filters and usage counts reflect completed calls without retaining payloads', async (t) => {
  const { root, client } = await connect(t, ['--compat-desktop-commander']);
  const marker = 'SYNTHETIC_PAYLOAD_MUST_NOT_ENTER_AUDIT';
  const file = path.join(root, 'sample.txt');
  await fs.writeFile(file, marker);
  const ok = await call(client, 'read_file', { path: file });
  assert.equal(ok.isError, false);
  assert.match(ok.content[0].text, new RegExp(marker));
  const bad = await call(client, 'read_file', { path: path.join(root, 'missing.txt') });
  assert.equal(bad.isError, true);
  const history = await call(client, 'get_recent_tool_calls', { toolName: 'read_file', maxResults: 1000 });
  assert.equal(history.isError, false);
  const report = history.structuredContent;
  assert.equal(report.persistent, false);
  assert.equal(report.capacity, 256);
  assert.equal(report.events.length, 2);
  assert.equal(report.events[0].outcome, 'ok');
  assert.notEqual(report.events[1].outcome, 'ok');
  for (const event of report.events)
    assert.deepEqual(Object.keys(event).sort(), ['at', 'durationMs', 'outcome', 'tool']);
  const latest = await call(client, 'get_recent_tool_calls', { toolName: 'read_file', maxResults: 1 });
  assert.deepEqual(latest.structuredContent.events, [report.events[1]]);
  const future = await call(client, 'get_recent_tool_calls', { since: '2999-01-01T00:00:00Z' });
  assert.deepEqual(future.structuredContent.events, []);
  const stats = await call(client, 'get_usage_stats');
  assert.equal(stats.isError, false);
  assert.equal(stats.structuredContent.scope, 'retained-window');
  assert.equal(stats.structuredContent.persistent, false);
  const counts = stats.structuredContent.byTool.find((x) => x.tool === 'read_file');
  assert.deepEqual(
    { calls: counts.calls, successful: counts.successful, failed: counts.failed },
    { calls: 2, successful: 1, failed: 1 },
  );
  for (const result of [history, latest, future, stats]) {
    const output = JSON.stringify(result);
    assert.ok(!output.includes(marker));
    assert.ok(!output.includes('missing.txt'));
    assert.ok(!output.includes('sample.txt'));
  }
  for (const args of [{ maxResults: 0 }, { maxResults: 1001 }, { since: 'invalid' }, { extra: true }]) {
    const result = await call(client, 'get_recent_tool_calls', args);
    assert.equal(result.isError, true);
  }
});
