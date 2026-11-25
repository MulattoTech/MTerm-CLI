// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-25-compact-repo-context
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { FileService } from '../dist/files.js';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const byteSize = (value) => Buffer.byteLength(JSON.stringify(value), 'utf8');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-compact-map-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const lines = Array.from(
    { length: 120 },
    (_, i) => 'export function symbol_' + i + '(parameter_' + 'x'.repeat(90) + ': string) { return 1; }',
  );
  await fs.writeFile(path.join(root, 'sample.ts'), lines.join('\n'), 'utf8');
  return root;
}

test('compact repository map preserves navigation and caps the serialized report', async (t) => {
  const root = await fixture(t);
  const service = await FileService.create(root);
  const full = await service.repoMap({});
  const compact = await service.repoMap({ compact: { maxOutputBytes: 1024 } });
  assert.ok(full.outlines.length);
  assert.equal(compact.format, 'compact-v1');
  assert.equal('outlines' in compact, false);
  assert.equal(compact.filesIndexed, full.filesIndexed);
  assert.equal(compact.totalSymbols, full.totalSymbols);
  assert.match(compact.markdownSummary, /sample\.ts/);
  assert.match(compact.markdownSummary, /symbol_0.*L1/);
  assert.equal(compact.omittedSymbols, compact.totalSymbols - compact.symbolsReturned);
  assert.equal(compact.omittedFiles, compact.filesIndexed - compact.filesReturned);
  assert.equal(compact.truncated, true);
  assert.ok(byteSize(compact) <= 1024);
  assert.ok(byteSize(compact) < byteSize(full) / 4);
  assert.equal(compact.cacheHit, false);
  assert.doesNotMatch(compact.markdownSummary, /parameter_/);
  t.diagnostic(JSON.stringify({ fullBytes: byteSize(full), compactBytes: byteSize(compact) }));
});

test('compact mode bounds whole lines, observes uncommitted edits, and preserves read policy', async (t) => {
  const root = await fixture(t);
  const service = await FileService.create(root);
  const before = await service.repoMap({ maxLines: 10, compact: {} });
  assert.ok(before.markdownSummary.split('\n').length <= 10);
  await fs.writeFile(path.join(root, 'sample.ts'), 'export function changed() {}', 'utf8');
  const after = await service.repoMap({ compact: {} });
  assert.match(after.markdownSummary, /changed/);
  assert.doesNotMatch(after.markdownSummary, /symbol_0/);
  assert.equal(after.truncated, false);
  await assert.rejects(service.repoMap({ path: '..', compact: {} }), { code: 'OUTSIDE_ROOT' });
  await assert.rejects(service.repoMap({ compact: { maxOutputBytes: 100 } }));
  const signal = AbortSignal.abort();
  await assert.rejects(service.repoMap({ compact: {} }, signal), { code: 'CANCELLED' });
});

test('official MCP client receives compact JSON without altering least privilege', async (t) => {
  const root = await fixture(t);
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve('bin/mterm-cli.js'), 'mcp', '--stdio', '--root', root],
    stderr: 'pipe',
  });
  const client = new Client({ name: 'compact-context-test', version: '1.0.0' });
  t.after(async () => {
    await client.close();
    await transport.close().catch(() => {});
  });
  await client.connect(transport);
  const tools = await client.listTools();
  assert.ok(tools.tools.some((x) => x.name === 'mterm_repo_map'));
  assert.ok(!tools.tools.some((x) => x.name === 'mterm_write_file'));
  const full = await client.callTool({ name: 'mterm_repo_map', arguments: {} });
  const result = await client.callTool({
    name: 'mterm_repo_map',
    arguments: { compact: { maxOutputBytes: 1024 } },
  });
  assert.equal(full.isError, false);
  assert.equal(result.isError, false);
  const data = result.structuredContent;
  assert.equal(data.format, 'compact-v1');
  assert.deepEqual(JSON.parse(result.content[0].text), data);
  assert.ok(byteSize(data) <= 1024);
  assert.ok(byteSize(result) < byteSize(full) / 4);
  t.diagnostic(
    JSON.stringify({ fullMcpResultBytes: byteSize(full), compactMcpResultBytes: byteSize(result) }),
  );
});
