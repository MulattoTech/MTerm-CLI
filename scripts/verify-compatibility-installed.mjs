// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-05-codex-parity-foundation
// Modified: 2026-11-02-directory-contract; verify packed directory contracts and owned exits.
// Modified: 2026-11-02-file-info-contract; qualify actual metadata envelopes and read-only restart.
// Modified: 2026-11-02-aggregate-output; qualify complete UTF-8 batch budgets in a read-only package.
// Modified: 2026-11-02-edit-line-endings; qualify normalized exact edits and byte-preserving refusals.
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
const multipleFileScenarios = [];
const editScenarios = [];
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
  const listedTools = (await client.listTools(undefined, requestOptions)).tools;
  const names = listedTools.map((x) => x.name);
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
  const editTool = listedTools.find((tool) => tool.name === 'edit_block');
  assert.equal(editTool.annotations.readOnlyHint, false);
  assert.equal(editTool.inputSchema.properties.old_string.minLength, 1);
  assert.equal(editTool.inputSchema.properties.expected_replacements.default, 1);
  editScenarios.push('write-enabled-schema-discovery');
  const editRoot = path.join(listingRoot, 'edits');
  await fs.mkdir(editRoot);
  const nativeEol = process.platform === 'win32' ? '\r\n' : '\n';
  for (const [index, [before, search, replacement, after]] of [
    ['prefix\r\none\r\ntwo\r\nsuffix\r\n', 'one\ntwo', 'new\nlines', 'prefix\r\nnew\r\nlines\r\nsuffix\r\n'],
    ['one\ntwo\n', 'one\r\ntwo', 'new\rline', 'new\nline\n'],
    ['one\rtwo\r', 'one\ntwo', 'new\r\nline', 'new\rline\r'],
    ['only', 'only', 'new\rline\nlast', `new${nativeEol}line${nativeEol}last`],
    [
      '\uFEFFα\r\n\tone\r\ntwo\r\nuntouched\nlast\r',
      '\tone\ntwo',
      "\t😀 $&\n$1 $` $'",
      "\uFEFFα\r\n\t😀 $&\r\n$1 $` $'\r\nuntouched\nlast\r",
    ],
  ].entries()) {
    const target = path.join(editRoot, `newline-${index}.txt`);
    await fs.writeFile(target, before);
    const result = await call('edit_block', {
      file_path: target,
      old_string: search,
      new_string: replacement,
    });
    assert.deepEqual(result.content, [{ type: 'text', text: `Successfully applied 1 edit to ${target}` }]);
    assert.equal(result.structuredContent, undefined);
    assert.deepEqual(await fs.readFile(target), Buffer.from(after));
  }
  editScenarios.push('CRLF-LF-CR-native-default-first-style-and-literal-byte-fidelity');
  const editTarget = path.join(editRoot, 'refusal.txt');
  const rejectEdit = async (args, code) => {
    const before = await fs.readFile(editTarget);
    const result = await client.callTool({ name: 'edit_block', arguments: args }, requestOptions);
    assert.equal(result.isError, true);
    const data = result.structuredContent ?? JSON.parse(result.content[0].text);
    assert.equal(data.error.code, code);
    assert.ok(Buffer.byteLength(JSON.stringify(result)) < 8192);
    assert.doesNotMatch(JSON.stringify(result), /EDIT-PRIVATE-SENTINEL/);
    assert.deepEqual(await fs.readFile(editTarget), before);
  };
  await fs.writeFile(editTarget, 'one\r\ntwo\r\none\r\ntwo\r\n');
  await rejectEdit(
    { file_path: editTarget, old_string: 'one\ntwo', new_string: 'changed' },
    'REPLACEMENT_COUNT',
  );
  await call('edit_block', {
    file_path: editTarget,
    old_string: 'one\ntwo',
    new_string: 'new\nlines',
    expected_replacements: 2,
  });
  assert.equal(await fs.readFile(editTarget, 'utf8'), 'new\r\nlines\r\nnew\r\nlines\r\n');
  await rejectEdit(
    { file_path: editTarget, old_string: 'absent', new_string: 'changed' },
    'REPLACEMENT_COUNT',
  );
  const beforeInvalidEdit = await fs.readFile(editTarget);
  const invalidEdit = await client.callTool(
    { name: 'edit_block', arguments: { file_path: editTarget, old_string: '', new_string: 'changed' } },
    requestOptions,
  );
  assert.equal(invalidEdit.isError, true);
  assert.equal(invalidEdit.content.length, 1);
  assert.equal(invalidEdit.content[0].type, 'text');
  assert.match(
    invalidEdit.content[0].text,
    /^Input validation error: Invalid arguments for tool edit_block:/,
  );
  assert.match(invalidEdit.content[0].text, /old_string/);
  assert.ok(Buffer.byteLength(JSON.stringify(invalidEdit)) < 8192);
  assert.deepEqual(await fs.readFile(editTarget), beforeInvalidEdit);
  editScenarios.push('normalized-exact-count-mismatch-and-schema-no-write');
  await fs.writeFile(editTarget, 'x\r\n');
  await call('edit_block', { file_path: editTarget, old_string: 'x', new_string: 'α'.repeat(131070) + '\n' });
  assert.equal((await fs.stat(editTarget)).size, 262144);
  await fs.writeFile(editTarget, 'x\r\n');
  await rejectEdit(
    { file_path: editTarget, old_string: 'x', new_string: 'α'.repeat(131070) + '\nx' },
    'FILE_TOO_LARGE',
  );
  assert.deepEqual(
    (await fs.readdir(editRoot)).filter((name) => name.startsWith('.mterm-')),
    [],
  );
  editScenarios.push('inclusive-UTF8-byte-limit-after-newline-expansion');
  const privateEdit = path.join(editRoot, '.env');
  await fs.writeFile(privateEdit, 'EDIT-PRIVATE-SENTINEL');
  for (const [target, code] of [
    [privateEdit, 'PRIVATE_PATH'],
    [path.join(path.dirname(scope), 'edit-outside.txt'), 'OUTSIDE_ROOT'],
  ]) {
    await rejectEdit({ file_path: target, old_string: 'EDIT-PRIVATE-SENTINEL', new_string: 'changed' }, code);
  }
  assert.equal(await fs.readFile(privateEdit, 'utf8'), 'EDIT-PRIVATE-SENTINEL');
  editScenarios.push('private-and-outside-root-denials-preserve-bytes');
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
const multipleRoot = await fs.mkdtemp(path.join(scope, 'multiple-contract-'));
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
  const multipleTool = listed.tools.find((tool) => tool.name === 'read_multiple_files');
  assert.equal(multipleTool?.annotations?.readOnlyHint, true);
  assert.equal(multipleTool.inputSchema.properties.paths.minItems, 1);
  assert.equal(multipleTool.inputSchema.properties.paths.maxItems, 20);
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
  editScenarios.push('read-only-restart-omits-edit-and-mutation-capabilities');
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
  const batchCall = (paths) =>
    readOnlyClient.callTool({ name: 'read_multiple_files', arguments: { paths } }, requestOptions);
  const textBytes = (result) =>
    result.content.reduce((total, item) => {
      assert.equal(item.type, 'text');
      return total + Buffer.byteLength(item.text, 'utf8');
    }, 0);
  const summary = (file) => file + ': text/plain (text)';
  const body = (file, text) =>
    '\n--- ' + file + ' contents: ---\n[Reading 1 lines from start (total: 1 lines, 0 remaining)]\n\n' + text;
  const assertBatch = (result, texts) => {
    assert.equal(result.isError, false);
    assert.equal(result.structuredContent, undefined);
    assert.deepEqual(
      result.content,
      texts.map((text) => ({ type: 'text', text })),
    );
    assert.ok(textBytes(result) <= 262144);
  };
  const overflow = async (paths) => {
    const result = await batchCall(paths);
    assert.equal(result.isError, true, 'Oversized aggregate must fail as a complete request');
    const data = result.structuredContent ?? JSON.parse(result.content[0].text);
    assert.equal(data.error.code, 'RESPONSE_LIMIT');
    assert.ok(Buffer.byteLength(JSON.stringify(result)) < 8192);
    assert.doesNotMatch(JSON.stringify(result), /contents:|AGGREGATE-CONTENT-SENTINEL/);
  };
  const target = path.join(multipleRoot, 'budget-😀.txt');
  const missing = path.join(multipleRoot, 'missing.txt');
  const shortText = 'AGGREGATE-CONTENT-SENTINEL α😀';
  await fs.writeFile(target, shortText);
  const missingResult = await batchCall([missing]);
  assert.equal(missingResult.isError, false);
  assert.equal(missingResult.content.length, 1);
  const missingSummary = missingResult.content[0].text;
  assert.equal(missingSummary, missing + ': Error - ENOENT Requested path or executable was not found.');
  assertBatch(await batchCall([target, missing, target]), [
    [summary(target), missingSummary, summary(target)].join('\n'),
    body(target, shortText),
    body(target, shortText),
  ]);
  multipleFileScenarios.push('ordered-summary-successes-duplicates-and-safe-partial-error');
  assertBatch(await batchCall(Array(20).fill(target)), [
    Array(20).fill(summary(target)).join('\n'),
    ...Array(20).fill(body(target, shortText)),
  ]);
  for (const paths of [[], Array(21).fill(target), ['']]) {
    const invalid = await batchCall(paths);
    assert.equal(invalid.isError, true);
    assert.ok(Buffer.byteLength(JSON.stringify(invalid)) < 8192);
  }
  multipleFileScenarios.push('published-schema-and-one-to-twenty-path-boundaries');
  // Independent response oracle: one summary plus the published labeled read block.
  // Multibyte padding makes character-count accounting fail the same byte boundary.
  const padding = (bytes) => '😀'.repeat(Math.floor(bytes / 4)) + 'x'.repeat(bytes % 4);
  const overhead = Buffer.byteLength(summary(target) + body(target, ''), 'utf8');
  const exactText = padding(262144 - overhead);
  await fs.writeFile(target, exactText);
  const exact = await batchCall([target]);
  assertBatch(exact, [summary(target), body(target, exactText)]);
  assert.equal(textBytes(exact), 262144);
  await fs.writeFile(target, exactText + 'x');
  await overflow([target]);
  multipleFileScenarios.push('inclusive-full-text-byte-ceiling-and-one-byte-overflow');
  const mixedText = padding(262144 - overhead - Buffer.byteLength(missingSummary, 'utf8') - 1);
  await fs.writeFile(target, mixedText);
  for (const paths of [
    [target, missing],
    [missing, target],
  ]) {
    const exactMixed = await batchCall(paths);
    assertBatch(exactMixed, [
      paths.map((file) => (file === missing ? missingSummary : summary(file))).join('\n'),
      body(target, mixedText),
    ]);
    assert.equal(textBytes(exactMixed), 262144);
  }
  await fs.writeFile(target, mixedText + 'x');
  await overflow([target, missing]);
  await overflow([missing, target]);
  multipleFileScenarios.push('error-summary-and-separator-budget-in-both-orders');
  await fs.writeFile(target, shortText);
  const privateFile = path.join(multipleRoot, '.env');
  const unsupported = path.join(multipleRoot, 'unsupported.pdf');
  const hardlink = path.join(multipleRoot, 'hardlink.txt');
  const link = path.join(multipleRoot, 'link');
  await fs.writeFile(privateFile, 'PRIVATE-BATCH-SENTINEL');
  await fs.writeFile(unsupported, 'FORMAT-BATCH-SENTINEL');
  await fs.link(target, hardlink);
  await fs.symlink(path.join(scope, 'nested'), link, process.platform === 'win32' ? 'junction' : 'dir');
  for (const [file, code] of [
    [privateFile, 'PRIVATE_PATH'],
    [path.dirname(scope), 'OUTSIDE_ROOT'],
    [unsupported, 'UNSUPPORTED_FORMAT'],
    [hardlink, 'LINK_REJECTED'],
    [path.join(link, 'compatibility.txt'), 'LINK_REJECTED'],
  ]) {
    const denied = await batchCall([file]);
    assert.equal(denied.isError, false, 'Individual path failures retain the summary envelope');
    assert.equal(denied.content.length, 1);
    assert.ok(denied.content[0].text.startsWith(file + ': Error - ' + code + ' '));
    assert.doesNotMatch(JSON.stringify(denied), /PRIVATE-BATCH-SENTINEL|FORMAT-BATCH-SENTINEL|contents:/);
    assert.ok(textBytes(denied) <= 262144);
  }
  assert.equal(await fs.readFile(target, 'utf8'), shortText);
  multipleFileScenarios.push('private-outside-format-hardlink-and-symlink-denials-no-mutation');
  multipleFileScenarios.push('read-only-installed-restart-capability-separation');
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
  let exitsConfirmed = true;
  for (const pid of new Set([readOnlyNpmPid, readOnlyProductPid])) {
    try {
      await verifyExit(pid);
    } catch (error) {
      exitsConfirmed = false;
      errors.push(error);
    }
  }
  if (exitsConfirmed) {
    try {
      await fs.rm(multipleRoot, { recursive: true, force: true });
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
assert.equal(
  await fs.stat(multipleRoot).then(
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
    fileInfo: { scenarios: fileInfoScenarios, passed: fileInfoScenarios.length, readOnlyRestart: true },
    multipleFiles: {
      scenarios: multipleFileScenarios,
      passed: multipleFileScenarios.length,
      maxTextBytes: 262144,
      readOnlyRestart: true,
    },
    editBlock: { scenarios: editScenarios, passed: editScenarios.length, readOnlyRestart: true },
    ownedProcessExitsVerified: true,
    directoryFixtureCleanupVerified: true,
    multipleFileFixtureCleanupVerified: true,
    stderrCapturedBytes: stderrBytes,
    fullParity: false,
    modelCalls: 0,
  }),
);
