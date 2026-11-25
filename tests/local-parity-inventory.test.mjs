// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-25-local-parity
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const inventory = JSON.parse(
  await fs.readFile(new URL('../docs/parity/local-0.3.4.json', import.meta.url), 'utf8'),
);
test('current upstream manifest has exactly one explicitly classified parity row per tool', () => {
  assert.equal(inventory.references.local.version, '0.3.4');
  assert.equal(inventory.manifestTools.length, 25);
  assert.equal(new Set(inventory.manifestTools).size, 25);
  assert.deepEqual(
    inventory.tools.map((x) => x.name),
    inventory.manifestTools,
  );
  for (const row of inventory.tools) {
    assert.ok(['partial_alias', 'native_partial', 'missing', 'excluded_external'].includes(row.status));
    assert.ok(row.dcp.length && row.gap);
    if (row.status === 'partial_alias') assert.ok(['read', 'write', 'config'].includes(row.gate));
    else assert.equal(row.gate, null);
  }
});
test('real stdio tool discovery agrees with classified aliases and native equivalents', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-parity-inventory-'));
  const clients = [];
  t.after(async () => {
    for (const { client, transport } of clients) {
      await client.close();
      await transport.close().catch(() => {});
    }
    await fs.rm(root, { recursive: true, force: true });
  });
  const discover = async (flags) => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [path.resolve('bin/mterm-cli.js'), 'mcp', '--stdio', '--root', root, ...flags],
      stderr: 'pipe',
    });
    const client = new Client({ name: 'mterm-parity-inventory', version: '1.0.0' });
    clients.push({ client, transport });
    await client.connect(transport);
    return new Set((await client.listTools()).tools.map((x) => x.name));
  };
  const plain = await discover([]);
  const read = await discover(['--compat-desktop-commander']);
  const full = await discover([
    '--compat-desktop-commander',
    '--allow-write',
    '--allow-exec',
    '--compat-config',
    path.join(root, 'compat.json'),
    '--allow-config-write',
  ]);
  for (const row of inventory.tools) {
    assert.ok(!plain.has(row.name), row.name + ' opt-in');
    assert.equal(read.has(row.name), row.gate === 'read', row.name + ' read-only');
    assert.equal(full.has(row.name), row.status === 'partial_alias', row.name + ' full compatibility');
    for (const name of row.native) assert.ok(full.has(name), name + ' native equivalent');
  }
  assert.equal(inventory.tools.filter((r) => full.has(r.name)).length, 12);
  t.diagnostic(
    '25 upstream manifest rows: 12 partial aliases discovered, 6 native-partial, 6 missing, 1 excluded external',
  );
});
