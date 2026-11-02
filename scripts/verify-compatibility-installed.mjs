// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-05-codex-parity-foundation
// Modified: 2026-11-02-directory-contract; verify packed directory contracts and owned exits.
// Modified: 2026-11-02-file-info-contract; qualify actual metadata envelopes and read-only restart.
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
const fileInfoScenarios = [];
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
  const metadataRoot = path.join(listingRoot, 'metadata');
  await fs.mkdir(metadataRoot);
  const inspect = async (file) => {
    const result = await call('get_file_info', { path: file });
    assert.equal(result.content.length, 1);
    assert.equal(result.content[0].type, 'text');
    assert.equal(result.structuredContent, undefined);
    const entries = result.content[0].text.split('\n').map((line) => {
      const at = line.indexOf(': ');
      assert.ok(at > 0);
      return [line.slice(0, at), line.slice(at + 2)];
    });
    assert.equal(new Set(entries.map(([key]) => key)).size, entries.length);
    return Object.fromEntries(entries);
  };
  const expectedStat = (st) => ({
    size: String(st.size),
    created: JSON.stringify(st.birthtime),
    modified: JSON.stringify(st.mtime),
    accessed: JSON.stringify(st.atime),
    isDirectory: String(st.isDirectory()),
    isFile: String(st.isFile()),
    permissions: st.mode.toString(8).slice(-3),
  });
  for (const [index, [content, count]] of [
    ['', 0],
    ['one', 1],
    ['one\n', 1],
    ['\n', 1],
    ['one\r\ntwo\r\n', 2],
    ['one\rtwo\r', 1],
    ['\uFEFFα\n😀\nlast', 3],
  ].entries()) {
    const target = path.join(metadataRoot, 'text-' + index + '.txt');
    await fs.writeFile(target, content);
    const expected = {
      ...expectedStat(await fs.stat(target)),
      fileType: 'text',
      lineCount: String(count),
      lastLine: String(count - 1),
      appendPosition: String(count),
    };
    const actual = await inspect(target);
    assert.deepEqual(Object.keys(actual), Object.keys(expected));
    assert.deepEqual(actual, expected);
    assert.equal(await fs.readFile(target, 'utf8'), content);
  }
  fileInfoScenarios.push('text-stat-order-dates-empty-LF-CRLF-CR-BOM-Unicode');
  const metadataDir = path.join(metadataRoot, 'folder.pdf');
  await fs.mkdir(metadataDir);
  assert.deepEqual(await inspect(metadataDir), {
    ...expectedStat(await fs.stat(metadataDir)),
    fileType: 'text',
  });
  fileInfoScenarios.push('directory-handler-discriminator-no-lines');
  const maxText = path.join(metadataRoot, 'limit.txt');
  await fs.writeFile(maxText, 'x'.repeat(262144));
  const atLimit = await inspect(maxText);
  assert.equal(atLimit.size, '262144');
  assert.equal(atLimit.lineCount, '1');
  fileInfoScenarios.push('unchanged-inclusive-262144-byte-ceiling');
  for (const [label, bytes] of [
    ['binary', Buffer.from([65, 0, 66])],
    ['invalid-utf8', Buffer.from([0xc3, 0x28])],
    ['oversize', Buffer.alloc(262145, 120)],
  ]) {
    const target = path.join(metadataRoot, label + '.dat');
    await fs.writeFile(target, bytes);
    const actual = await inspect(target);
    assert.equal(actual.size, String(bytes.length));
    assert.equal(actual.textMetadata, 'unavailable');
    for (const key of ['fileType', 'lineCount', 'lastLine', 'appendPosition'])
      assert.equal(actual[key], undefined);
    assert.deepEqual(await fs.readFile(target), bytes);
  }
  fileInfoScenarios.push('binary-invalid-utf8-oversize-safe-omissions');
  for (const ext of ['pdf', 'docx', 'xlsx', 'PNG']) {
    const target = path.join(metadataRoot, 'unsupported.' + ext);
    await fs.writeFile(target, 'UNSUPPORTED-FORMAT-FIXTURE');
    assert.deepEqual(await inspect(target), expectedStat(await fs.stat(target)));
  }
  fileInfoScenarios.push('unsupported-formats-stat-only');
  const hardlink = path.join(metadataRoot, 'hardlink.txt');
  await fs.link(maxText, hardlink);
  for (const [target, code] of [
    [path.dirname(scope), 'OUTSIDE_ROOT'],
    [path.join(directory, '.ssh'), 'PRIVATE_PATH'],
    [link, 'LINK_REJECTED'],
    [hardlink, 'LINK_REJECTED'],
    [path.join(metadataRoot, 'missing.txt'), 'ENOENT'],
  ]) {
    const result = await client.callTool(
      { name: 'get_file_info', arguments: { path: target } },
      requestOptions,
    );
    assert.equal(result.isError, true);
    const data = result.structuredContent ?? JSON.parse(result.content[0].text);
    assert.equal(data.error.code, code);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE-DIRECTORY-FIXTURE|UNSUPPORTED-FORMAT-FIXTURE/);
  }
  fileInfoScenarios.push('outside-private-link-hardlink-missing-denials');
  const invalidInfo = await client.callTool(
    { name: 'get_file_info', arguments: { path: '' } },
    requestOptions,
  );
  assert.equal(invalidInfo.isError, true);
  assert.ok(Buffer.byteLength(JSON.stringify(invalidInfo)) < 8192);
  fileInfoScenarios.push('schema-path-denial');
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
// A second installed process starts without mutation capabilities. Metadata must
// remain available independently of the earlier write-enabled round-trip fixture.
const readOnlyTransport = new StdioClientTransport({
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
    '--compat-desktop-commander',
  ],
  env: { ...process.env },
  stderr: 'pipe',
});
const readOnlyClient = new Client({ name: 'mterm-packed-read-only-metadata', version: '1' });
readOnlyTransport.stderr?.on('data', (chunk) => {
  stderrBytes += chunk.length;
});
let readOnlyNpmPid;
let readOnlyProductPid;
let readOnlyFailure;
try {
  const connected = readOnlyClient.connect(readOnlyTransport, requestOptions);
  readOnlyNpmPid = readOnlyTransport.pid;
  await connected;
  // Capture child ownership before assertions that may fail during discovery.
  const config = await readOnlyClient.callTool({ name: 'get_config', arguments: {} }, requestOptions);
  assert.equal(config.isError, false);
  readOnlyProductPid = config.structuredContent?.config?.systemInfo?.processInfo?.pid;
  assert.ok(Number.isInteger(readOnlyProductPid) && readOnlyProductPid > 0);
  const listed = await readOnlyClient.listTools(undefined, requestOptions);
  const metadataTool = listed.tools.find((tool) => tool.name === 'get_file_info');
  assert.equal(metadataTool?.annotations?.readOnlyHint, true);
  for (const name of [
    'write_file',
    'create_directory',
    'move_file',
    'edit_block',
    'set_config_value',
    'mterm_write_file',
    'mterm_create_directory',
    'mterm_move',
    'mterm_start_process',
    'mterm_process_input',
    'mterm_stop_process',
    'mterm_read_process_output',
    'mterm_list_sessions',
  ])
    assert.ok(!listed.tools.some((tool) => tool.name === name), name + ' must be absent');
  const capabilities = await readOnlyClient.callTool(
    { name: 'mterm_capabilities', arguments: {} },
    requestOptions,
  );
  assert.equal(capabilities.isError, false);
  for (const key of ['writeEnabled', 'executionEnabled', 'configWriteEnabled'])
    assert.equal(capabilities.structuredContent?.[key], false, key);
  const result = await readOnlyClient.callTool(
    {
      name: 'get_file_info',
      arguments: { path: path.join(scope, 'nested', 'compatibility.txt') },
    },
    requestOptions,
  );
  assert.equal(result.isError, false);
  assert.equal(result.structuredContent, undefined);
  assert.match(result.content[0].text, /\nlineCount: 2\nlastLine: 1\nappendPosition: 2$/);
  assert.match(result.content[0].text, /\nmodified: "[^"\n]+Z"\n/);
  fileInfoScenarios.push('read-only-installed-restart-independent-capabilities');
} catch (error) {
  readOnlyFailure = error;
} finally {
  const errors = [];
  for (const close of [() => readOnlyClient.close(), () => readOnlyTransport.close()]) {
    try {
      await close();
    } catch (error) {
      errors.push(error);
    }
  }
  for (const pid of new Set([readOnlyNpmPid, readOnlyProductPid])) {
    try {
      await verifyExit(pid);
    } catch (error) {
      errors.push(error);
    }
  }
  if (readOnlyFailure || errors.length)
    throw new AggregateError(
      [...(readOnlyFailure ? [readOnlyFailure] : []), ...errors],
      'Read-only metadata verification failed',
    );
}
assert.equal(readOnlyTransport.pid, null);
console.log(
  JSON.stringify({
    npmExecMcp: true,
    compatibilityAliasesExercised: 8,
    directoryListing: { scenarios: directoryScenarios, passed: directoryScenarios.length },
    fileInfo: { scenarios: fileInfoScenarios, passed: fileInfoScenarios.length, readOnlyRestart: true },
    ownedProcessExitsVerified: true,
    directoryFixtureCleanupVerified: true,
    stderrCapturedBytes: stderrBytes,
    fullParity: false,
    modelCalls: 0,
  }),
);
