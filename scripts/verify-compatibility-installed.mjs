// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-05-codex-parity-foundation
// Modified: 2026-11-02-directory-contract; verify packed directory contracts and owned exits.
// Invoked by verify-package with its isolated npm cache, tarball and workspace.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
const [npm, tarball, scope] = process.argv.slice(2);
for (const value of [npm, tarball, scope])
  assert.ok(value && path.isAbsolute(value), 'Explicit test-owned absolute path required');
const requestOptions = { timeout: 10000 };
const listingRoot = await fs.mkdtemp(path.join(scope, 'directory-contract-'));
const directoryScenarios = [];
let npmPid;
let productPid;
let stderrBytes = 0;
let failure;
async function verifyExit(pid) {
  assert.ok(Number.isInteger(pid) && pid > 0, 'Original owned process identity required');
  for (let i = 0; i < 100; i++) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error.code === 'ESRCH') return;
      throw error;
    }
    await delay(50);
  }
  assert.fail('Owned compatibility process did not exit');
}
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
transport.stderr?.on('data', (chunk) => {
  stderrBytes += chunk.length;
});
try {
  const connected = client.connect(transport, requestOptions);
  npmPid = transport.pid;
  await connected;
  assert.ok(Number.isInteger(npmPid) && npmPid > 0, 'Original npm transport process identity required');
  const names = (await client.listTools(undefined, requestOptions)).tools.map((x) => x.name);
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
    const result = await client.callTool({ name, arguments: args }, requestOptions);
    assert.equal(result.isError, false, JSON.stringify(result));
    return result;
  };
  const config = await call('get_config', {});
  assert.ok(config.structuredContent?.config, 'Expected get_config structured envelope');
  productPid = config.structuredContent.config.systemInfo.processInfo.pid;
  assert.ok(Number.isInteger(productPid) && productPid > 0);
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
  const directory = path.join(listingRoot, 'nested');
  await fs.mkdir(directory);
  const directoryNames = Array.from({ length: 103 }, (_, i) => 'file-' + String(i).padStart(4, '0') + '.txt');
  for (let i = 0; i < directoryNames.length; i += 50)
    await Promise.all(
      directoryNames.slice(i, i + 50).map((name) => fs.writeFile(path.join(directory, name), '')),
    );
  await fs.mkdir(path.join(directory, '.ssh'));
  await fs.writeFile(path.join(directory, '.env'), 'PRIVATE-DIRECTORY-FIXTURE');
  const zero = await call('list_directory', { path: listingRoot, depth: 0 });
  assert.equal(zero.content[0].text, '');
  directoryScenarios.push('zero-depth');
  const one = await call('list_directory', { path: listingRoot, depth: 1 });
  assert.equal(one.content[0].text, '[DIR] nested');
  directoryScenarios.push('one-level-depth');
  const expectedDirectory = [
    '[DIR] nested',
    ...directoryNames.slice(0, 100).map((name) => '[FILE] nested/' + name),
    '[WARNING] nested: 3 items hidden (showing first 100 of 103 total)',
  ].join('\n');
  for (let i = 0; i < 2; i++) {
    const result = await call('list_directory', { path: listingRoot });
    assert.equal(result.content.length, 1);
    assert.equal(result.content[0].type, 'text');
    assert.equal(result.structuredContent, undefined);
    assert.equal(result.content[0].text, expectedDirectory);
    assert.ok(Buffer.byteLength(result.content[0].text) <= 262144);
    assert.doesNotMatch(result.content[0].text, /\.ssh|\.env|PRIVATE-DIRECTORY-FIXTURE/);
  }
  directoryScenarios.push('default-depth-stable-exact-visible-overflow');
  const link = path.join(listingRoot, 'link');
  await fs.symlink(directory, link, process.platform === 'win32' ? 'junction' : 'dir');
  const linkListing = await call('list_directory', { path: listingRoot, depth: 2 });
  assert.match(linkListing.content[0].text, /\[DENIED\] link \(link\)/);
  assert.doesNotMatch(linkListing.content[0].text, /link\/file-/);
  directoryScenarios.push('link-not-traversed');
  for (const [args, code] of [
    [{ path: path.dirname(scope) }, 'OUTSIDE_ROOT'],
    [{ path: path.join(directory, '.ssh') }, 'PRIVATE_PATH'],
    [{ path: link }, 'LINK_REJECTED'],
    [{ path: path.join(listingRoot, 'missing') }, 'ENOENT'],
  ]) {
    const result = await client.callTool({ name: 'list_directory', arguments: args }, requestOptions);
    assert.equal(result.isError, true);
    const data = result.structuredContent ?? JSON.parse(result.content[0].text);
    assert.equal(data.error.code, code);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE-DIRECTORY-FIXTURE/);
  }
  directoryScenarios.push('root-private-link-missing-denials');
  const invalidDepth = await client.callTool(
    { name: 'list_directory', arguments: { path: listingRoot, depth: 17 } },
    requestOptions,
  );
  assert.equal(invalidDepth.isError, true);
  assert.ok(Buffer.byteLength(JSON.stringify(invalidDepth)) < 8192);
  directoryScenarios.push('schema-depth-denial');
  const moved = path.join(scope, 'nested', 'compatibility.txt');
  await call('move_file', { source: file, destination: moved });
  await call('edit_block', { file_path: moved, old_string: 'second', new_string: 'changed' });
  const info = await call('get_file_info', { path: moved });
  assert.match(info.content[0].text, /lineCount: 2/);
  assert.equal(
    (
      await client.callTool(
        {
          name: 'read_file',
          arguments: { path: 'https://example.invalid/', isUrl: true },
        },
        requestOptions,
      )
    ).isError,
    true,
  );
} catch (e) {
  failure = e;
} finally {
  const cleanupErrors = [];
  try {
    await client.close();
  } catch (error) {
    cleanupErrors.push(error);
  }
  try {
    await transport.close();
  } catch (error) {
    cleanupErrors.push(error);
  }
  let exitsConfirmed = true;
  for (const pid of new Set([npmPid, productPid].filter((value) => Number.isInteger(value) && value > 0))) {
    try {
      await verifyExit(pid);
    } catch (error) {
      exitsConfirmed = false;
      cleanupErrors.push(error);
    }
  }
  // A failed initialization may never identify the npm-spawned MCP child. Preserve
  // its owned fixture for recovery instead of treating npm's exit as child proof.
  if (Number.isInteger(npmPid) && !Number.isInteger(productPid)) {
    exitsConfirmed = false;
    cleanupErrors.push(new Error('Product process identity unavailable; directory fixture retained.'));
  }
  if (exitsConfirmed) {
    try {
      await fs.rm(listingRoot, { recursive: true, force: true });
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (failure || cleanupErrors.length)
    throw new AggregateError(
      [...(failure ? [failure] : []), ...cleanupErrors],
      'Compatibility verification failed',
    );
}
assert.equal(transport.pid, null);
assert.equal(
  await fs.stat(listingRoot).then(
    () => true,
    () => false,
  ),
  false,
);
console.log(
  JSON.stringify({
    npmExecMcp: true,
    compatibilityAliasesExercised: 8,
    directoryListing: { scenarios: directoryScenarios, passed: directoryScenarios.length },
    ownedProcessExitsVerified: true,
    directoryFixtureCleanupVerified: true,
    stderrCapturedBytes: stderrBytes,
    fullParity: false,
    modelCalls: 0,
  }),
);
