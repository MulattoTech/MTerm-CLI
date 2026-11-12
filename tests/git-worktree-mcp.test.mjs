// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-installed-worktree (OpenAI / GPT-6 Astra Pro; self-reported)
// Actual SDK/stdio inspection of disposable, untouched Git-created linked worktrees.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const entry = path.resolve(process.env.MTERM_VERIFY_BIN ?? 'bin/mterm-cli.js');
const checkout = await fs.realpath(new URL('../', import.meta.url));
const exec = promisify(execFile);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const inside = (root, candidate) => {
  const relative = path.relative(root, candidate);
  return (
    relative === '' ||
    (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep))
  );
};
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

function environment(home) {
  const inherited = new Set(['systemroot', 'windir', 'comspec', 'path', 'pathext', 'lang', 'lc_all']);
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key, value]) => value !== undefined && inherited.has(key.toLowerCase()),
    ),
  );
  return {
    ...env,
    HOME: home,
    USERPROFILE: home,
    APPDATA: path.join(home, 'appdata'),
    LOCALAPPDATA: path.join(home, 'localappdata'),
    XDG_CONFIG_HOME: path.join(home, 'xdg'),
    CODEX_HOME: path.join(home, 'codex'),
    TEMP: path.join(home, 'temp'),
    TMP: path.join(home, 'temp'),
    TMPDIR: path.join(home, 'temp'),
    ...(process.platform === 'win32'
      ? {
          HOMEDRIVE: path.parse(home).root.slice(0, -1),
          HOMEPATH: home.slice(path.parse(home).root.length - 1),
        }
      : {}),
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
    GIT_TERMINAL_PROMPT: '0',
  };
}

// No setup Git command occurs between the before/after observation manifests.
async function git(f, cwd, args) {
  return (
    await exec('git', ['-c', 'core.autocrlf=false', '-c', 'core.hooksPath=' + f.hooks, '-C', cwd, ...args], {
      env: f.env,
      windowsHide: true,
      timeout: 10000,
      maxBuffer: 262144,
    })
  ).stdout;
}

async function manifest(root) {
  const entries = [];
  let bytes = 0;
  async function walk(directory) {
    for (const name of (await fs.readdir(directory)).sort()) {
      const full = path.join(directory, name);
      const info = await fs.lstat(full);
      assert.ok(!info.isSymbolicLink(), 'Owned fixture must not contain an unreviewed link');
      const item = {
        path: path.relative(root, full).split(path.sep).join('/'),
        mode: info.mode,
        type: info.isDirectory() ? 'directory' : 'file',
      };
      assert.ok(entries.length < 512, 'Owned fixture manifest is bounded');
      if (info.isDirectory()) {
        entries.push(item);
        await walk(full);
      } else {
        assert.ok(info.isFile(), 'Owned fixture contains only directories and regular files');
        assert.equal(info.nlink, 1, 'Independent clone must not borrow hardlinked objects or files');
        assert.ok(info.size <= 1048576, 'Owned fixture file is bounded');
        const contents = await fs.readFile(full);
        bytes += contents.length;
        assert.ok(bytes <= 4194304, 'Owned fixture total is bounded');
        entries.push({ ...item, bytes: contents.length, sha256: sha(contents) });
      }
    }
  }
  await walk(root);
  return entries;
}

async function topology(f, root) {
  const reported = {};
  for (const [name, args] of [
    ['top', ['rev-parse', '--show-toplevel']],
    ['private', ['rev-parse', '--absolute-git-dir']],
    ['common', ['rev-parse', '--path-format=absolute', '--git-common-dir']],
  ]) {
    const output = (await git(f, root, args)).replace(/\r?\n$/, '');
    assert.ok(path.isAbsolute(output));
    reported[name] = await fs.realpath(output);
  }
  assert.equal(reported.top, root);
  return reported;
}

async function fixture(t) {
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-worktree-sdk-')));
  const children = [];
  t.after(async () => {
    assert.ok(
      children.every((record) => record.closed),
      'Retain owned fixture until every child close is observed: ' + parent,
    );
    await fs.rm(parent, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  });
  const f = {
    parent,
    children,
    seed: path.join(parent, 'seed'),
    repository: path.join(parent, 'normal clone'),
    worktree: path.join(parent, 'selected worktree'),
    unrelated: path.join(parent, 'unrelated repository'),
    home: path.join(parent, 'owned home'),
    cwd: path.join(parent, 'external cwd'),
    hooks: path.join(parent, 'empty hooks'),
    template: path.join(parent, 'empty template'),
  };
  f.env = environment(f.home);
  for (const directory of [
    f.seed,
    f.unrelated,
    f.home,
    f.cwd,
    f.hooks,
    f.template,
    ...['appdata', 'localappdata', 'xdg', 'codex', 'temp'].map((name) => path.join(f.home, name)),
  ])
    await fs.mkdir(directory, { recursive: true });
  assert.ok(!inside(checkout, parent), 'MCP fixture and cwd must be outside the source checkout');
  assert.ok(
    !inside(path.resolve(path.dirname(entry), '..'), f.cwd),
    'MCP cwd must be outside its selected package',
  );
  await git(f, f.seed, ['init', '--initial-branch=fixture', '--template=' + f.template]);
  await fs.mkdir(path.join(f.seed, 'nested'));
  for (const name of ['staged', 'unstaged', 'unchanged'])
    await fs.writeFile(path.join(f.seed, 'nested', name + '.txt'), 'SEED_' + name.toUpperCase() + '\n');
  await git(f, f.seed, ['add', 'nested']);
  await git(f, f.seed, [
    '-c',
    'user.name=MTerm worktree fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '--no-gpg-sign',
    '-m',
    'owned fixture only',
  ]);
  // --no-local transfers local objects independently, without hardlinks or alternates.
  await git(f, parent, [
    'clone',
    '--no-local',
    '--no-hardlinks',
    '--template=' + f.template,
    f.seed,
    f.repository,
  ]);
  await git(f, f.repository, ['worktree', 'add', '--detach', f.worktree, 'HEAD']);
  await git(f, f.unrelated, ['init', '--initial-branch=unrelated', '--template=' + f.template]);
  assert.equal(
    (await git(f, f.seed, ['rev-parse', 'HEAD'])).trim(),
    (await git(f, f.repository, ['rev-parse', 'HEAD'])).trim(),
  );
  for (const name of ['alternates', 'http-alternates'])
    await assert.rejects(
      fs.lstat(path.join(f.repository, '.git', 'objects', 'info', name)),
      (error) => error.code === 'ENOENT',
    );
  f.normalTopology = await topology(f, f.repository);
  f.linkedTopology = await topology(f, f.worktree);
  assert.ok((await fs.lstat(path.join(f.repository, '.git'))).isDirectory());
  assert.ok((await fs.lstat(path.join(f.worktree, '.git'))).isFile());
  assert.equal(f.normalTopology.private, path.join(f.repository, '.git'));
  assert.equal(f.normalTopology.common, f.normalTopology.private);
  assert.equal(f.linkedTopology.common, f.normalTopology.common);
  assert.notEqual(f.linkedTopology.private, f.linkedTopology.common);
  assert.equal(path.dirname(f.linkedTopology.private), path.join(f.linkedTopology.common, 'worktrees'));
  const pointer = await fs.readFile(path.join(f.worktree, '.git'), 'utf8');
  const selected = /^gitdir: ([^\r\n]+)\r?\n$/.exec(pointer);
  assert.ok(selected, 'Git must create the linked-worktree pointer');
  assert.equal(await fs.realpath(path.resolve(f.worktree, selected[1])), f.linkedTopology.private);
  const gitdir = (await fs.readFile(path.join(f.linkedTopology.private, 'gitdir'), 'utf8')).replace(
    /\r?\n$/,
    '',
  );
  const common = (await fs.readFile(path.join(f.linkedTopology.private, 'commondir'), 'utf8')).replace(
    /\r?\n$/,
    '',
  );
  assert.equal(
    await fs.realpath(path.resolve(f.linkedTopology.private, gitdir)),
    path.join(f.worktree, '.git'),
  );
  assert.equal(await fs.realpath(path.resolve(f.linkedTopology.private, common)), f.linkedTopology.common);
  f.markers = {};
  for (const [name, root] of [
    ['normal', f.repository],
    ['linked', f.worktree],
  ]) {
    const markers = {
      staged: 'INDEX_ONLY_' + name.toUpperCase() + '_235',
      unstaged: 'WORKTREE_ONLY_' + name.toUpperCase() + '_235',
      untracked: 'UNTRACKED_' + name.toUpperCase() + '_235',
    };
    f.markers[name] = markers;
    await fs.writeFile(path.join(root, 'nested', 'staged.txt'), markers.staged + '\n');
    await git(f, root, ['add', 'nested/staged.txt']);
    await fs.writeFile(path.join(root, 'nested', 'unstaged.txt'), markers.unstaged + '\n');
    await fs.writeFile(path.join(root, 'nested', 'untracked.txt'), markers.untracked + '\n');
  }
  return f;
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

function value(response) {
  assert.ok(Buffer.byteLength(JSON.stringify(response)) <= 32768, 'Fixture response must be bounded');
  assert.equal(response.content.length, 1);
  assert.equal(response.content[0].type, 'text');
  const parsed = JSON.parse(response.content[0].text);
  assert.deepEqual(response.structuredContent, parsed, 'SDK text and structured payload must agree');
  return parsed;
}
const call = (client, name, args = {}) => client.callTool({ name, arguments: args }, { timeout: 10000 });

async function observe(t, f, roots, inspect) {
  const before = await manifest(f.parent);
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [entry, 'mcp', '--stdio', ...roots.flatMap((root) => ['--root', root])],
    cwd: f.cwd,
    env: f.env,
    stderr: 'pipe',
    maxBufferSize: 1048576,
  });
  const client = new Client({ name: 'mterm-ordinary-worktree-fixture', version: '1.0.0' });
  let child,
    closed,
    closeResult,
    stderr = '',
    stderrBytes = 0,
    primary;
  const kills = [],
    processErrors = [];
  transport.stderr.on('data', (chunk) => {
    stderrBytes += chunk.length;
    if (stderrBytes <= 16384) stderr += chunk.toString();
  });
  const start = transport.start.bind(transport);
  transport.start = async () => {
    const starting = start();
    // Pinned SDK2.3.0 exposes this test-observed ChildProcess; no server behavior is replaced.
    child = transport._process;
    assert.ok(child && typeof child.once === 'function', 'Observe the actual SDK-owned child');
    const record = { closed: false };
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
    assert.ok(Number.isSafeInteger(child.pid) && child.pid > 0);
    assert.equal(child.exitCode, null);
    const listed = await bounded(client.listTools(), 10000, 'Tool inventory');
    assert.deepEqual(listed.tools.map((tool) => tool.name).sort(), readonlyTools);
    assert.ok(
      listed.tools.every(
        (tool) => tool.annotations?.readOnlyHint === true && tool.annotations?.destructiveHint === false,
      ),
    );
    const response = await call(client, 'mterm_capabilities');
    assert.equal(response.isError, false);
    const capabilities = value(response);
    assert.deepEqual(capabilities.ownerRoots, roots);
    assert.deepEqual(capabilities.effectiveRoots, roots);
    assert.equal(capabilities.root, roots[0]);
    assert.equal(capabilities.writeEnabled, false);
    assert.equal(capabilities.executionEnabled, false);
    assert.equal(capabilities.configWriteEnabled, false);
    assert.equal(capabilities.networkListener, false);
    await inspect(client);
  } catch (error) {
    primary = error;
  }
  const settlement = [];
  try {
    assert.ok(child && closed, 'SDK must create an observable child');
    child.stdin.end();
    const result = await bounded(closed, 10000, 'Natural child close');
    assert.deepEqual(result, { code: 0, signal: null });
    assert.deepEqual(kills, [], 'Natural close must not rely on a termination signal');
    assert.deepEqual(processErrors, []);
    assert.equal(stderrBytes, 0, 'Owned MCP child must have empty stderr');
    assert.equal(stderr, '');
    assert.equal(transport.pid, null);
  } catch (error) {
    settlement.push(error);
  } finally {
    // Failure cleanup may terminate only this captured child; it cannot turn failure into PASS.
    try {
      await bounded(client.close(), 6000, 'SDK cleanup');
      await bounded(transport.close(), 6000, 'Transport cleanup');
      if (child && !closeResult) {
        child.kill('SIGKILL');
        await bounded(closed, 5000, 'Owned fallback close');
      }
    } catch (error) {
      settlement.push(error);
    }
  }
  try {
    assert.deepEqual(
      await manifest(f.parent),
      before,
      'MCP inspection must preserve all owned worktree and Git metadata bytes',
    );
    assert.deepEqual(kills, [], 'No termination attempt may be hidden by SDK cleanup');
  } catch (error) {
    settlement.push(error);
  }
  if (primary || settlement.length)
    throw primary && !settlement.length
      ? primary
      : new AggregateError([...(primary ? [primary] : []), ...settlement], 'Owned MCP observation failed');
  t.diagnostic(
    JSON.stringify({
      naturalClose: closeResult,
      ownedChildPid: child.pid,
      killAttempts: kills.length,
      stderrBytes,
      unchangedManifestEntries: before.length,
      unchangedManifestSha256: sha(JSON.stringify(before)),
      unchangedManifest: before,
      nativeTopology: Object.fromEntries(
        [
          ['normal', f.normalTopology],
          ['linked', f.linkedTopology],
        ].map(([name, identities]) => [
          name,
          Object.fromEntries(
            Object.entries(identities).map(([kind, full]) => [
              kind,
              path.relative(f.parent, full).split(path.sep).join('/'),
            ]),
          ),
        ]),
      ),
    }),
  );
}

async function inspectGit(client, markers, requestedPath) {
  const args = requestedPath === undefined ? {} : { path: requestedPath };
  const statusResponse = await call(client, 'mterm_git_status', args);
  assert.equal(statusResponse.isError, false);
  const status = value(statusResponse);
  assert.deepEqual(Object.keys(status).sort(), ['path', 'stdout', 'truncated']);
  assert.equal(status.path, requestedPath ?? '.');
  assert.equal(status.truncated, false);
  const lines = status.stdout.split('\n');
  assert.equal(lines.pop(), '');
  assert.match(lines.shift(), /^## /);
  assert.deepEqual(
    lines.sort(),
    [' M nested/unstaged.txt', 'M  nested/staged.txt', '?? nested/untracked.txt'].sort(),
  );
  for (const staged of [false, true]) {
    const response = await call(client, 'mterm_git_diff', { ...args, staged });
    assert.equal(response.isError, false);
    const result = value(response);
    assert.deepEqual(Object.keys(result).sort(), ['path', 'stdout', 'truncated']);
    assert.equal(result.path, requestedPath ?? '.');
    assert.equal(result.truncated, false);
    assert.ok(Buffer.byteLength(result.stdout) < 8192);
    assert.ok(result.stdout.includes('\n+' + (staged ? markers.staged : markers.unstaged) + '\n'));
    for (const marker of [staged ? markers.unstaged : markers.staged, markers.untracked])
      assert.ok(
        !result.stdout.includes(marker),
        'Distinct Git index/worktree content must not leak into the wrong diff',
      );
    assert.equal((result.stdout.match(/^diff --git /gm) ?? []).length, 1);
  }
}

function denied(response, expectedCode, f) {
  assert.equal(response.isError, true);
  const data = value(response);
  assert.deepEqual(Object.keys(data).sort(), ['error', 'ok']);
  assert.equal(data.ok, false);
  assert.deepEqual(Object.keys(data.error).sort(), ['code', 'message']);
  assert.equal(data.error.code, expectedCode);
  assert.equal(typeof data.error.message, 'string');
  assert.ok(data.error.message.length > 0 && data.error.message.length < 256);
  const output = JSON.stringify(response);
  for (const forbidden of [
    f.parent,
    f.repository,
    f.worktree,
    f.linkedTopology.private,
    f.linkedTopology.common,
    ...Object.values(f.markers).flatMap(Object.values),
  ]) {
    assert.ok(
      !data.error.message.includes(forbidden),
      'Denial must not return private fixture paths or file contents',
    );
    assert.ok(
      !output.includes(JSON.stringify(forbidden).slice(1, -1)),
      'Escaped denial must not disclose a private path or sentinel',
    );
  }
  assert.doesNotMatch(output, /fatal:|gitdir:|diff --git|stdout/);
}

test(
  'SDK Git inspection preserves an ordinary clone with one explicit root',
  { timeout: 45000 },
  async (t) => {
    const f = await fixture(t);
    await observe(t, f, [f.repository], (client) => inspectGit(client, f.markers.normal));
  },
);

test(
  'SDK Git inspection preserves an untouched linked worktree with both explicit roots',
  { timeout: 45000 },
  async (t) => {
    const f = await fixture(t);
    await observe(t, f, [f.worktree, f.repository], (client) => inspectGit(client, f.markers.linked));
  },
);

test(
  'SDK Git inspection from a nested linked directory keeps staged and unstaged content distinct',
  { timeout: 45000 },
  async (t) => {
    const f = await fixture(t);
    await observe(t, f, [f.worktree, f.repository], (client) =>
      inspectGit(client, f.markers.linked, 'nested'),
    );
  },
);

for (const unrelated of [false, true]) {
  test(
    'SDK Git inspection denies linked metadata with ' +
      (unrelated ? 'an unrelated repository grant' : 'only the worktree grant'),
    { timeout: 45000 },
    async (t) => {
      const f = await fixture(t);
      const roots = unrelated ? [f.worktree, f.unrelated] : [f.worktree];
      await observe(t, f, roots, async (client) => {
        for (const [name, args] of [
          ['mterm_git_status', {}],
          ['mterm_git_diff', { path: 'nested' }],
          ['mterm_git_diff', { staged: true }],
        ])
          denied(await call(client, name, args), 'GIT_OUTSIDE_ROOT', f);
      });
    },
  );
}

test(
  'SDK ordinary linked Git metadata remains private with both roots authorized',
  { timeout: 45000 },
  async (t) => {
    const f = await fixture(t);
    await observe(t, f, [f.worktree, f.repository], async (client) => {
      for (const file of ['.git', path.join(f.repository, '.git', 'config')])
        denied(await call(client, 'mterm_read_file', { path: file }), 'PRIVATE_PATH', f);
    });
  },
);
