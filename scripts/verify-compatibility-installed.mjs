// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-05-codex-parity-foundation
// Invoked by verify-package with its isolated npm cache, tarball and workspace.
import path from 'node:path';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
const [npm, tarball, scope] = process.argv.slice(2);
for (const value of [npm, tarball, scope])
  assert.ok(value && path.isAbsolute(value), 'Explicit test-owned absolute path required');
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [
    npm,
    'exec',
    '--offline',
    '--yes',
    '--package',
    tarball,
    '--',
    'mterm-cli',
    'mcp',
    '--stdio',
    '--root',
    scope,
    '--allow-write',
    '--compat-desktop-commander',
  ],
  env: { ...process.env },
  stderr: 'pipe',
});
const client = new Client({ name: 'mterm-packed-compatibility', version: '1' });
try {
  await client.connect(transport);
  const names = (await client.listTools()).tools.map((x) => x.name);
  for (const name of [
    'read_file',
    'read_multiple_files',
    'write_file',
    'create_directory',
    'list_directory',
    'move_file',
    'get_file_info',
    'edit_block',
  ])
    assert.ok(names.includes(name), name);
  assert.ok(!names.includes('write_pdf'), 'No unimplemented tool stubs');
  const call = async (name, args) => {
    const result = await client.callTool({ name, arguments: args });
    assert.equal(result.isError, false, JSON.stringify(result));
    return result;
  };
  const file = path.join(scope, 'compatibility.txt');
  await call('write_file', { path: file, content: 'first\nsecond\n' });
  const tail = await call('read_file', { path: file, offset: -1, length: 0 });
  assert.equal(tail.content[0].text, '[Reading last 1 lines (total: 2 lines)]\n\nsecond');
  const batch = await call('read_multiple_files', { paths: [file, path.join(scope, 'missing.txt')] });
  assert.match(batch.content.map((x) => x.text).join('\n'), /first/);
  await call('create_directory', { path: path.join(scope, 'nested', 'child') });
  await call('create_directory', { path: path.join(scope, 'nested', 'child') });
  const listing = await call('list_directory', { path: scope, depth: 2 });
  assert.match(listing.content[0].text, /nested\/child/);
  const moved = path.join(scope, 'nested', 'compatibility.txt');
  await call('move_file', { source: file, destination: moved });
  await call('edit_block', { file_path: moved, old_string: 'second', new_string: 'changed' });
  const info = await call('get_file_info', { path: moved });
  assert.match(info.content[0].text, /lineCount: 2/);
  assert.equal(
    (
      await client.callTool({
        name: 'read_file',
        arguments: { path: 'https://example.invalid/', isUrl: true },
      })
    ).isError,
    true,
  );
} catch (e) {
  throw e;
} finally {
  await client.close();
  await transport.close().catch(() => {});
}
assert.equal(transport.pid, null);
console.log(
  JSON.stringify({ npmExecMcp: true, compatibilityAliasesExercised: 8, fullParity: false, modelCalls: 0 }),
);
