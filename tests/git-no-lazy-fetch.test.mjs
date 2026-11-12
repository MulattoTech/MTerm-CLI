// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-git-no-lazy-fetch (OpenAI / GPT-6 Astra Pro; self-reported)
// Real SDK calls and native Git calibration use only disposable repositories and local markers.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const entry = path.resolve(process.env.MTERM_VERIFY_BIN ?? 'bin/mterm-cli.js');
const checkout = await fs.realpath(new URL('../', import.meta.url));
const { resolveExecutable } = await import(
  pathToFileURL(path.resolve(path.dirname(entry), '../dist/executables.js')).href
);
const exec = promisify(execFile);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const markerText = 'MTERM_237_LOCAL_UPLOAD_PACK_INVOKED\n';
const baseText = 'HEAD_ONLY_237\n';
const indexText = 'INDEX_ONLY_237_DIFFERENT_LENGTH\n';
const worktreeText = 'WORKTREE_ONLY_237_A_THIRD_DIFFERENT_LENGTH\n';
const readonlyTools = [
  'mterm_ai_review_diff',
  'mterm_audit_list',
  'mterm_capabilities',
  'mterm_file_info',
  'mterm_fleet_status',
  'mterm_git_diff',
  'mterm_git_status',
  'mterm_lint_check',
  'mterm_list_directory',
  'mterm_lsp_definition',
  'mterm_lsp_references',
  'mterm_lsp_symbols',
  'mterm_read_file',
  'mterm_repo_map',
  'mterm_search_content',
  'mterm_search_files',
  'mterm_system_info',
  'mterm_validate_syntax',
];
const operations = [
  ['mterm_git_status', {}],
  ['mterm_git_diff', { staged: false }],
  ['mterm_git_diff', { staged: true }],
];
const missingCases = [
  {
    title: 'SDK status refuses a promised missing HEAD tree without invoking upload-pack',
    selector: ['extensions.partialclone', 'origin'],
    missing: 'tree',
    operation: operations[0],
  },
  {
    title: 'SDK unstaged diff refuses a promised missing index blob without invoking upload-pack',
    selector: ['remote.origin.promisor', 'true'],
    missing: 'index-blob',
    operation: operations[1],
  },
  {
    title: 'SDK staged diff refuses a promised missing HEAD blob without invoking upload-pack',
    selector: ['remote.origin.partialclonefilter', 'blob:none'],
    missing: 'head-blob',
    operation: operations[2],
  },
];
const declarationCases = [
  {
    title: 'SDK Git refuses complete repositories declaring extensions.partialclone',
    declarations: [['ExTeNsIoNs.PaRtIaLcLoNe', 'origin']],
  },
  {
    title: 'SDK Git refuses complete repositories declaring remote promisor true',
    declarations: [['remote.origin.promisor', 'true']],
  },
  {
    title: 'SDK Git refuses complete repositories declaring a partial clone filter',
    declarations: [['remote.origin.partialclonefilter', 'blob:none']],
  },
  {
    title: 'SDK Git refuses false promisor declarations on unused dotted remote names',
    declarations: [['ReMoTe.Unused.Remote.PRoMiSoR', 'false']],
  },
  {
    title: 'SDK Git refuses empty promisor declarations on unused remote names',
    declarations: [['remote.unused.promisor', '']],
  },
  {
    title: 'SDK Git refuses duplicate promisor declarations in complete repositories',
    declarations: [
      ['remote.origin.promisor', 'true'],
      ['remote.origin.promisor', 'false'],
    ],
  },
  {
    title: 'SDK Git refuses empty partial clone filters on unused dotted remote names',
    declarations: [['remote.Unused.Remote.partialCloneFilter', '']],
  },
  {
    title: 'SDK Git refuses duplicate partial clone filters in complete repositories',
    declarations: [
      ['remote.origin.partialclonefilter', 'blob:none'],
      ['remote.origin.partialclonefilter', 'blob:limit=1'],
    ],
  },
];

function environment(home) {
  const inherited = new Set(['systemroot', 'windir', 'comspec', 'path', 'pathext', 'lang', 'lc_all']);
  return {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        ([key, value]) => value !== undefined && inherited.has(key.toLowerCase()),
      ),
    ),
    HOME: home,
    USERPROFILE: home,
    APPDATA: path.join(home, 'appdata'),
    LOCALAPPDATA: path.join(home, 'localappdata'),
    XDG_CONFIG_HOME: path.join(home, 'xdg'),
    CODEX_HOME: path.join(home, 'codex'),
    TEMP: path.join(home, 'temp'),
    TMP: path.join(home, 'temp'),
    TMPDIR: path.join(home, 'temp'),
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
    GIT_TERMINAL_PROMPT: '0',
  };
}
const shellWord = (value) =>
  "'" + (process.platform === 'win32' ? value.replaceAll('\\', '/') : value).replaceAll("'", "'\\''") + "'";
const inside = (root, target) => {
  const relative = path.relative(root, target);
  return (
    relative === '' ||
    (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep))
  );
};
async function absent(file) {
  try {
    await fs.lstat(file);
    return false;
  } catch (error) {
    if (error.code === 'ENOENT') return true;
    throw error;
  }
}
async function bounded(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(label + ' exceeded its owned deadline')), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function nativeGit(f, cwd, args, { input = '', lazyFetch = false } = {}) {
  const pending = exec(
    f.gitExecutable,
    [
      '--no-pager',
      '--no-optional-locks',
      '-c',
      'core.autocrlf=false',
      '-c',
      'core.fsmonitor=false',
      '-c',
      'core.hooksPath=' + f.hooks,
      '-c',
      'protocol.allow=never',
      '-c',
      'protocol.file.allow=always',
      '-C',
      cwd,
      ...args,
    ],
    {
      env: {
        ...f.env,
        GIT_NO_LAZY_FETCH: lazyFetch ? '0' : '1',
        GIT_AUTHOR_DATE: '2000-01-01T00:00:00Z',
        GIT_COMMITTER_DATE: '2000-01-01T00:00:00Z',
      },
      windowsHide: true,
      shell: false,
      timeout: 10000,
      maxBuffer: 262144,
    },
  );
  const child = pending.child;
  const record = { kind: 'native-git', closed: false, kills: [] };
  f.children.push(record);
  const closed = new Promise((resolve) =>
    child.once('close', (code, signal) => {
      Object.assign(record, { closed: true, code, signal });
      resolve();
    }),
  );
  const kill = child.kill.bind(child);
  child.kill = (...args) => {
    record.kills.push(args[0] ?? 'SIGTERM');
    return kill(...args);
  };
  const inputErrors = [];
  child.stdin.on('error', (error) => inputErrors.push(error.code ?? error.name));
  // end('') still writes a chunk; a short-lived command may already have closed its input.
  // Only pack-objects receives actual input. Other commands need EOF without a write.
  if (input === '') child.stdin.end();
  else child.stdin.end(input);
  let output;
  try {
    output = await bounded(pending, 12000, 'Native Git command');
  } catch (error) {
    output = { stdout: error.stdout ?? '', stderr: error.stderr ?? '', error: error.code ?? error.name };
  } finally {
    if (!record.closed) {
      try {
        await bounded(closed, 2000, 'Native Git close');
      } catch {
        child.kill('SIGKILL');
        await bounded(closed, 3000, 'Owned native fallback close');
      }
    }
  }
  return { ...output, ...record, inputErrors };
}
async function git(f, cwd, args, options) {
  const result = await nativeGit(f, cwd, args, options);
  assert.equal(result.code, 0, 'Fixture setup failed: ' + JSON.stringify({ args, ...result }));
  assert.equal(result.signal, null);
  assert.deepEqual(result.kills, []);
  assert.deepEqual(result.inputErrors, []);
  return result.stdout;
}

async function manifest(f) {
  const entries = [];
  let bytes = 0;
  async function walk(directory) {
    for (const name of (await fs.readdir(directory)).sort()) {
      const full = path.join(directory, name);
      // Only the explicit observer output directory is excluded; repository/home/helper bytes remain covered.
      if (full === f.observations) continue;
      const info = await fs.lstat(full);
      assert.ok(!info.isSymbolicLink(), 'Owned fixture must contain no links');
      assert.ok(entries.length < 512, 'Owned manifest is bounded');
      const item = {
        path: path.relative(f.parent, full).split(path.sep).join('/'),
        mode: info.mode,
        type: info.isDirectory() ? 'directory' : 'file',
      };
      if (info.isDirectory()) {
        entries.push(item);
        await walk(full);
      } else {
        assert.ok(info.isFile());
        assert.equal(info.nlink, 1, 'Owned objects must not be hardlinked to another store');
        assert.ok(info.size <= 1048576);
        const contents = await fs.readFile(full);
        bytes += contents.length;
        assert.ok(bytes <= 4194304);
        entries.push({ ...item, bytes: contents.length, sha256: sha(contents) });
      }
    }
  }
  await walk(f.parent);
  return entries;
}
function manifestEvidence(before, after) {
  const beforeSha256 = sha(JSON.stringify(before)),
    afterSha256 = sha(JSON.stringify(after));
  return {
    excluded: ['observations/ (owned observer marker only)'],
    beforeSha256,
    afterSha256,
    unchanged: beforeSha256 === afterSha256,
    before,
    // Equality is checked on actual complete arrays. Avoid duplicating identical TAP payloads.
    ...(beforeSha256 === afterSha256 ? {} : { after }),
  };
}
async function marker(f) {
  if (await absent(f.marker)) return { exists: false };
  const info = await fs.lstat(f.marker);
  assert.ok(info.isFile() && !info.isSymbolicLink() && info.size <= 128);
  return { exists: true, text: await fs.readFile(f.marker, 'utf8') };
}

async function fixture(t, { declarations = [], missing = null } = {}) {
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm git lazy fetch ')));
  const f = {
    parent,
    children: [],
    repository: path.join(parent, 'repository'),
    donor: path.join(parent, 'complete local donor'),
    home: path.join(parent, 'owned home'),
    cwd: path.join(parent, 'external cwd'),
    hooks: path.join(parent, 'empty hooks'),
    template: path.join(parent, 'empty template'),
    observations: path.join(parent, 'observations'),
    helper: path.join(parent, 'marker only helper.mjs'),
    gitExecutable: await resolveExecutable('git'),
    missing,
    declarations,
  };
  f.marker = path.join(f.observations, 'upload-pack.marker');
  f.env = environment(f.home);
  t.after(async () => {
    assert.ok(
      f.children.every((child) => child.closed),
      'Retain fixture while an owned close is unobserved: ' + parent,
    );
    await fs.rm(parent, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  });
  assert.ok(!inside(checkout, parent));
  assert.ok(!inside(path.resolve(path.dirname(entry), '..'), f.cwd));
  for (const dir of [
    f.repository,
    f.home,
    f.cwd,
    f.hooks,
    f.template,
    f.observations,
    ...['appdata', 'localappdata', 'xdg', 'codex', 'temp'].map((name) => path.join(f.home, name)),
  ])
    await fs.mkdir(dir, { recursive: true });
  f.gitVersion = (await git(f, f.cwd, ['--version'])).trim();
  await git(f, f.repository, ['init', '--initial-branch=fixture', '--template=' + f.template]);
  await fs.writeFile(path.join(f.repository, 'file.txt'), baseText);
  await git(f, f.repository, ['add', 'file.txt']);
  await git(f, f.repository, [
    '-c',
    'user.name=MTerm synthetic fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '--no-gpg-sign',
    '-m',
    'owned fixture only',
  ]);
  const commit = (await git(f, f.repository, ['rev-parse', 'HEAD'])).trim();
  const tree = (await git(f, f.repository, ['rev-parse', 'HEAD^{tree}'])).trim();
  const blob = (await git(f, f.repository, ['rev-parse', 'HEAD:file.txt'])).trim();
  for (const oid of [commit, tree, blob]) assert.match(oid, /^[a-f0-9]{40}$/);
  // An actual local transport copies the complete donor before any custom command is configured.
  await git(f, parent, [
    'clone',
    '--no-local',
    '--no-hardlinks',
    '--template=' + f.template,
    f.repository,
    f.donor,
  ]);
  for (const repo of [f.repository, f.donor])
    for (const name of ['alternates', 'http-alternates'])
      assert.ok(await absent(path.join(repo, '.git', 'objects', 'info', name)));
  if (missing !== 'tree' && missing !== 'index-blob') {
    await fs.writeFile(path.join(f.repository, 'file.txt'), indexText);
    await git(f, f.repository, ['add', 'file.txt']);
  }
  await fs.writeFile(path.join(f.repository, 'file.txt'), worktreeText);
  const index = (await git(f, f.repository, ['ls-files', '--stage', '--', 'file.txt'])).trim();
  assert.match(index, /^100644 [a-f0-9]{40} 0\tfile\.txt$/);
  f.indexBlob = index.split(' ')[1];
  if (missing === 'index-blob') assert.equal(f.indexBlob, blob);
  if (missing === 'head-blob') assert.notEqual(f.indexBlob, blob);
  const promised = missing === 'tree' ? [commit] : [commit, tree];
  const pack = (
    await git(f, f.repository, ['pack-objects', '.git/objects/pack/pack'], {
      input: promised.join('\n') + '\n',
    })
  ).trim();
  assert.match(pack, /^[a-f0-9]{40}$/);
  const packPrefix = path.join(f.repository, '.git', 'objects', 'pack', 'pack-' + pack);
  await fs.writeFile(packPrefix + '.promisor', '', { flag: 'wx' });
  const packed = await git(f, f.repository, ['verify-pack', '-v', packPrefix + '.idx']);
  const packedIds = packed
    .split(/\r?\n/)
    .filter((line) => /^[a-f0-9]{40} /.test(line))
    .map((line) => line.slice(0, 40))
    .sort();
  assert.deepEqual(packedIds, [...promised].sort(), 'Pack only the objects that promise the missing target');
  await fs.writeFile(
    f.helper,
    "import fs from 'node:fs';\ntry { fs.writeFileSync(" +
      JSON.stringify(f.marker) +
      ', ' +
      JSON.stringify(markerText) +
      ", { flag: 'wx' }); } catch (error) { if (error.code !== 'EEXIST') throw error; }\nprocess.exit(73);\n",
    { flag: 'wx' },
  );
  f.uploadPack = shellWord(process.execPath) + ' ' + shellWord(f.helper);
  for (const [key, value] of [
    ['core.repositoryformatversion', '1'],
    ['gc.auto', '0'],
    ['maintenance.auto', 'false'],
    ['protocol.allow', 'never'],
    ['protocol.file.allow', 'always'],
    ['remote.origin.url', f.donor],
    ['remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*'],
    ['remote.origin.uploadpack', f.uploadPack],
    ['mterm.fixture.promisor', 'benign non-remote key'],
    ['mterm.fixture.partialclonefilter', 'benign non-remote key'],
    ...declarations,
  ])
    await git(f, f.repository, ['config', '--add', key, value]);
  const keyOutput = await git(f, f.repository, [
    'config',
    '--null',
    '--name-only',
    '--list',
    '--no-includes',
  ]);
  assert.ok(keyOutput.endsWith('\0'));
  const keys = keyOutput.slice(0, -1).split('\0');
  assert.ok(!keys.some((key) => /^(?:include\.|includeif\.|filter\.|url\.)/i.test(key)));
  const promisorKey = (key) =>
    /^extensions\.partialclone$/i.test(key) || /^remote\..+\.(?:promisor|partialclonefilter)$/i.test(key);
  assert.deepEqual(
    keys
      .filter(promisorKey)
      .map((key) => key.toLowerCase())
      .sort(),
    declarations.map(([key]) => key.toLowerCase()).sort(),
  );
  assert.equal((await git(f, f.repository, ['config', '--get-all', 'remote.origin.url'])).trim(), f.donor);
  f.preconditions = {
    commit,
    tree,
    headBlob: blob,
    indexBlob: f.indexBlob,
    packedIds,
    pack,
    declarations,
    markerInitiallyAbsent: await absent(f.marker),
    localDonorOnly: true,
    noAlternates: true,
  };
  assert.equal(f.preconditions.markerInitiallyAbsent, true);
  if (missing) {
    f.target = missing === 'tree' ? tree : blob;
    f.targetFile = path.join(f.repository, '.git', 'objects', f.target.slice(0, 2), f.target.slice(2));
    assert.ok(!packedIds.includes(f.target));
    const info = await fs.lstat(f.targetFile);
    assert.ok(info.isFile() && !info.isSymbolicLink() && info.nlink === 1);
    assert.equal(
      (await git(f, f.repository, ['cat-file', '-t', f.target])).trim(),
      missing === 'tree' ? 'tree' : 'blob',
    );
    await fs.unlink(f.targetFile); // Exactly one validated owned loose object, never a prune or object-store sweep.
    assert.ok(await absent(f.targetFile));
    const missingList = await git(f, f.repository, ['rev-list', '--objects', '--missing=print', 'HEAD']);
    assert.ok(missingList.split(/\r?\n/).some((line) => line === '?' + f.target));
    assert.ok(await absent(f.marker), 'Non-fetching setup must not invoke the marker helper');
    Object.assign(f.preconditions, { missing: f.target, missingKind: missing, missingList });
  }
  return f;
}

async function calibrate(t, spec) {
  for (const lazyFetch of [true, false]) {
    const f = await fixture(t, { declarations: [spec.selector], missing: spec.missing });
    const before = await manifest(f);
    const result = await nativeGit(f, f.repository, ['cat-file', '-e', f.target], { lazyFetch });
    const observation = {
      phase: 'native-calibration',
      selector: spec.selector,
      lazyFetch,
      gitExecutable: f.gitExecutable,
      gitVersion: f.gitVersion,
      preconditions: f.preconditions,
      native: result,
      marker: await marker(f),
      targetStillMissing: await absent(f.targetFile),
      manifest: manifestEvidence(before, await manifest(f)),
    };
    t.diagnostic(JSON.stringify(observation));
    assert.equal(result.closed, true, 'Invalid calibration: native close not observed');
    assert.equal(result.signal, null);
    assert.deepEqual(result.kills, []);
    assert.deepEqual(result.inputErrors, []);
    assert.notEqual(result.code, 0, 'Marker helper never provides an object');
    assert.equal(observation.targetStillMissing, true);
    assert.equal(
      observation.marker.exists,
      lazyFetch,
      'Invalid calibration: local upload-pack route or suppression did not behave as required',
    );
    if (lazyFetch) assert.equal(observation.marker.text, markerText);
    else assert.equal(observation.manifest.unchanged, true);
  }
}

function value(response) {
  assert.equal(response.content.length, 1);
  assert.equal(response.content[0].type, 'text');
  const parsed = JSON.parse(response.content[0].text);
  assert.deepEqual(response.structuredContent, parsed);
  return parsed;
}
const call = (client, name, args = {}) => client.callTool({ name, arguments: args }, { timeout: 10000 });
async function observe(t, f, selectedOperations) {
  const before = await manifest(f),
    observations = [];
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [entry, 'mcp', '--stdio', '--root', f.repository],
    cwd: f.cwd,
    env: f.env,
    stderr: 'pipe',
    maxBufferSize: 1048576,
  });
  const client = new Client({ name: 'mterm-no-lazy-fetch-fixture', version: '1.0.0' });
  let child,
    closed,
    closeResult,
    primary,
    stderrBytes = 0;
  const kills = [],
    processErrors = [],
    settlement = [];
  transport.stderr.on('data', (chunk) => {
    stderrBytes += chunk.length;
  });
  const start = transport.start.bind(transport);
  transport.start = async () => {
    const starting = start();
    child = transport._process; // Observe the actual ChildProcess exposed by the pinned SDK2.3.0.
    assert.ok(child && typeof child.once === 'function');
    const record = { kind: 'mcp', closed: false };
    f.children.push(record);
    closed = new Promise((resolve) =>
      child.once('close', (code, signal) => {
        record.closed = true;
        closeResult = { code, signal };
        resolve(closeResult);
      }),
    );
    child.on('error', (error) => processErrors.push(error.code ?? error.name));
    const kill = child.kill.bind(child);
    child.kill = (...args) => {
      kills.push(args[0] ?? 'SIGTERM');
      return kill(...args);
    };
    await starting;
  };
  try {
    await bounded(client.connect(transport), 10000, 'SDK initialization');
    assert.ok(Number.isSafeInteger(child.pid) && child.pid > 0 && child.exitCode === null);
    const listed = await bounded(client.listTools(), 10000, 'Tool inventory');
    assert.deepEqual(listed.tools.map((tool) => tool.name).sort(), readonlyTools);
    assert.ok(
      listed.tools.every(
        (tool) => tool.annotations?.readOnlyHint === true && tool.annotations?.destructiveHint === false,
      ),
    );
    const capabilityResponse = await call(client, 'mterm_capabilities');
    assert.equal(capabilityResponse.isError, false);
    const capabilities = value(capabilityResponse);
    assert.deepEqual(capabilities.ownerRoots, [f.repository]);
    assert.deepEqual(capabilities.effectiveRoots, [f.repository]);
    assert.equal(capabilities.root, f.repository);
    for (const name of ['writeEnabled', 'executionEnabled', 'configWriteEnabled', 'networkListener'])
      assert.equal(capabilities[name], false);
    for (const [name, args] of selectedOperations) {
      const response = await call(client, name, args);
      const bytes = Buffer.byteLength(JSON.stringify(response));
      observations.push({
        name,
        args,
        ...(bytes <= 32768 ? { response } : { oversizedResponseSha256: sha(JSON.stringify(response)) }),
        bytes,
      });
      assert.ok(bytes <= 32768, 'Fixture response must be bounded');
    }
  } catch (error) {
    primary = error;
  }
  try {
    assert.ok(child && closed, 'SDK must create an observable child');
    child.stdin.end();
    assert.deepEqual(await bounded(closed, 10000, 'Natural MCP close'), { code: 0, signal: null });
    assert.deepEqual(kills, []);
    assert.deepEqual(processErrors, []);
    assert.equal(stderrBytes, 0);
    assert.equal(transport.pid, null);
  } catch (error) {
    settlement.push(error);
  } finally {
    try {
      await bounded(client.close(), 6000, 'SDK cleanup');
      await bounded(transport.close(), 6000, 'Transport cleanup');
      if (child && !closeResult) {
        child.kill('SIGKILL');
        await bounded(closed, 5000, 'Owned MCP fallback close');
      }
    } catch (error) {
      settlement.push(error);
    }
  }
  // Capture the side effect, response and complete state before semantic assertions can abort a RED.
  const evidence = {
    phase: 'actual-sdk',
    selectedEntry: entry,
    gitExecutable: f.gitExecutable,
    gitVersion: f.gitVersion,
    preconditions: f.preconditions,
    observations,
    marker: await marker(f),
    targetStillMissing: f.targetFile ? await absent(f.targetFile) : null,
    naturalClose: closeResult ?? null,
    ownedChildPid: child?.pid ?? null,
    killAttempts: kills,
    stderrBytes,
    processErrors,
    manifest: manifestEvidence(before, await manifest(f)),
    primaryError: primary ? String(primary) : null,
    settlementErrors: settlement.map(String),
  };
  t.diagnostic(JSON.stringify(evidence));
  if (primary || settlement.length)
    throw new AggregateError([...(primary ? [primary] : []), ...settlement], 'Owned MCP observation failed');
  assert.deepEqual(kills, [], 'Cleanup cannot hide a termination attempt');
  assert.equal(
    evidence.manifest.unchanged,
    true,
    'MCP must preserve owned repository, donor, helper and home bytes',
  );
  assert.equal(evidence.marker.exists, false, 'Readonly SDK operation invoked the local upload-pack helper');
  if (f.targetFile) assert.equal(evidence.targetStillMissing, true);
  return observations;
}
function refused(observation, f) {
  const response = observation.response;
  assert.equal(response.isError, true);
  const data = value(response);
  assert.deepEqual(Object.keys(data).sort(), ['error', 'ok']);
  assert.equal(data.ok, false);
  assert.deepEqual(Object.keys(data.error).sort(), ['code', 'message']);
  assert.equal(data.error.code, 'GIT_UNSAFE_CONFIG');
  assert.equal(typeof data.error.message, 'string');
  assert.ok(data.error.message.length > 0 && data.error.message.length < 256);
  const output = JSON.stringify(response);
  for (const forbidden of [
    f.parent,
    f.repository,
    f.donor,
    f.helper,
    f.uploadPack,
    baseText.trim(),
    indexText.trim(),
    worktreeText.trim(),
    ...f.declarations.flatMap(([key]) => [key]),
  ])
    assert.ok(
      !output.includes(JSON.stringify(forbidden).slice(1, -1)),
      'Denial must not disclose a fixture path, key, command or content',
    );
  assert.doesNotMatch(output, /fatal:|diff --git|stdout/);
}

for (const spec of missingCases)
  test(spec.title, { timeout: 90000 }, async (t) => {
    await calibrate(t, spec);
    const f = await fixture(t, { declarations: [spec.selector], missing: spec.missing });
    const observations = await observe(t, f, [spec.operation]);
    assert.equal(observations.length, 1);
    refused(observations[0], f);
  });
for (const spec of declarationCases)
  test(spec.title, { timeout: 45000 }, async (t) => {
    const f = await fixture(t, spec);
    const observations = await observe(t, f, operations);
    assert.equal(observations.length, 3);
    for (const observation of observations) refused(observation, f);
  });
test(
  'SDK Git keeps ordinary remote configuration and complete local status/diffs usable',
  { timeout: 45000 },
  async (t) => {
    const f = await fixture(t);
    const observations = await observe(t, f, operations);
    assert.equal(observations.length, 3);
    const results = observations.map(({ response }) => {
      assert.equal(response.isError, false);
      const result = value(response);
      assert.deepEqual(Object.keys(result).sort(), ['path', 'stdout', 'truncated']);
      assert.equal(result.path, '.');
      assert.equal(result.truncated, false);
      return result.stdout;
    });
    const status = results[0].split('\n');
    assert.equal(status.pop(), '');
    assert.match(status.shift(), /^## /);
    assert.deepEqual(status, ['MM file.txt']);
    assert.ok(results[1].includes('\n+' + worktreeText));
    assert.ok(results[1].includes('\n-' + indexText));
    assert.ok(!results[1].includes(baseText.trim()));
    assert.ok(results[2].includes('\n+' + indexText));
    assert.ok(results[2].includes('\n-' + baseText));
    assert.ok(!results[2].includes(worktreeText.trim()));
    for (const diff of results.slice(1)) assert.equal((diff.match(/^diff --git /gm) ?? []).length, 1);
  },
);
