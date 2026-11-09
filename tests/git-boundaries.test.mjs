// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-git-boundaries (OpenAI / GPT-6 Astra Pro; self-reported)
// Disposable repositories only. Fixture filters can create one harmless marker and echo stdin.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const entry = path.resolve(process.env.MTERM_VERIFY_BIN ?? 'bin/mterm-cli.js');
const moduleUrl = (name) => pathToFileURL(path.resolve(path.dirname(entry), '../dist', name)).href;
const { GitService } = await import(moduleUrl('git.js'));
const { childEnvironment } = await import(moduleUrl('processes.js'));
const exec = promisify(execFile);
const gitEnv = {
  ...childEnvironment(),
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
  GIT_TERMINAL_PROMPT: '0',
};
const git = async (cwd, args) =>
  (
    await exec('git', ['-C', cwd, ...args], {
      env: gitEnv,
      windowsHide: true,
      timeout: 10000,
      maxBuffer: 262144,
    })
  ).stdout;
const code = (expected) => (error) => error?.code === expected;
const exists = (file) =>
  fs.stat(file).then(
    () => true,
    () => false,
  );
const shellWord = (value) => "'" + value.replaceAll('\\', '/').replaceAll("'", "'\\''") + "'";
const value = (response) =>
  response.structuredContent ?? JSON.parse(response.content.find((part) => part.type === 'text').text);

async function fixture(t) {
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-git-boundaries-')));
  t.after(() => fs.rm(parent, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }));
  const repository = path.join(parent, 'repository');
  await fs.mkdir(repository);
  await git(repository, ['init']);
  await fs.writeFile(path.join(repository, 'file.txt'), 'original fixture content\n');
  await git(repository, ['add', 'file.txt']);
  await git(repository, [
    '-c',
    'user.name=MTerm fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '--no-gpg-sign',
    '-m',
    'isolated fixture',
  ]);
  return { parent, repository };
}

async function linkedFixture(t, relative = false) {
  const f = await fixture(t);
  f.worktree = path.join(f.parent, 'selected-worktree');
  await git(f.repository, ['worktree', 'add', '--detach', f.worktree]);
  const oldAdmin = (await git(f.worktree, ['rev-parse', '--absolute-git-dir'])).trim();
  f.admin = path.join(f.worktree, 'owned-admin');
  f.common = path.join(f.repository, '.git');
  await fs.rename(oldAdmin, f.admin);
  await fs.writeFile(path.join(f.worktree, '.git'), 'gitdir: ' + f.admin.replaceAll('\\', '/') + '\n');
  await fs.writeFile(
    path.join(f.admin, 'gitdir'),
    path.join(f.worktree, '.git').replaceAll('\\', '/') + '\n',
  );
  await fs.writeFile(
    path.join(f.admin, 'commondir'),
    (relative ? path.relative(f.admin, f.common) : f.common).replaceAll('\\', '/') + '\n',
  );
  await fs.mkdir(path.join(f.worktree, 'nested'));
  return f;
}

async function filterFixture(t, kind = 'clean', driver = 'fixture') {
  const f = await fixture(t);
  f.marker = path.join(f.repository, 'filter-ran.marker');
  const script = path.join(f.repository, 'fixture-filter.mjs');
  await fs.writeFile(
    script,
    "import fs from 'node:fs';fs.writeFileSync(" +
      JSON.stringify(f.marker) +
      ", 'fixture only');" +
      (kind === 'process' ? 'process.exit(0);' : 'process.stdin.pipe(process.stdout);'),
  );
  await fs.writeFile(path.join(f.repository, '.gitattributes'), 'file.txt filter=' + driver + '\n');
  await git(f.repository, [
    'config',
    'filter.' + driver + '.' + kind,
    shellWord(process.execPath) + ' ' + shellWord(script),
  ]);
  await fs.writeFile(path.join(f.repository, 'file.txt'), 'changed fixture content with a different size\n');
  return f;
}

test('ordinary in-root status, staged diff and unstaged diff remain available', async (t) => {
  const f = await fixture(t);
  await git(f.repository, ['config', 'filter.fixture.required', 'false']);
  await git(f.repository, ['config', 'mterm.fixture.clean', 'benign non-filter key']);
  const service = await GitService.create(f.repository);
  await fs.writeFile(path.join(f.repository, 'file.txt'), 'first edit\n');
  assert.match((await service.status({})).stdout, /file.txt/);
  assert.match((await service.diff({})).stdout, /\+first edit/);
  await git(f.repository, ['add', 'file.txt']);
  assert.match((await service.diff({ staged: true })).stdout, /\+first edit/);
});

for (const relative of [false, true]) {
  test(
    'internal git-dir cannot authorize an external ' +
      (relative ? 'relative' : 'absolute') +
      ' common directory',
    async (t) => {
      const f = await linkedFixture(t, relative);
      const reported = (await git(f.worktree, ['rev-parse', '--absolute-git-dir'])).trim();
      assert.equal(await fs.realpath(reported), await fs.realpath(f.admin));
      const service = await GitService.create(f.worktree);
      for (const inspect of [() => service.status({ path: 'nested' }), () => service.diff({ staged: true })])
        await assert.rejects(inspect(), code('GIT_OUTSIDE_ROOT'));
    },
  );
}

test('common metadata reached through an in-root directory alias remains outside scope', async (t) => {
  const f = await linkedFixture(t);
  const alias = path.join(f.worktree, 'common-alias');
  await fs.symlink(f.common, alias, process.platform === 'win32' ? 'junction' : 'dir');
  await fs.writeFile(path.join(f.admin, 'commondir'), alias.replaceAll('\\', '/') + '\n');
  const service = await GitService.create(f.worktree);
  await assert.rejects(service.status({}), code('GIT_OUTSIDE_ROOT'));
});

test('a linked worktree remains usable when all reported metadata is already inside selected roots', async (t) => {
  const f = await linkedFixture(t, true);
  await fs.writeFile(path.join(f.worktree, 'file.txt'), 'allowed linked edit\n');
  for (const roots of [f.parent, [f.worktree, f.repository]]) {
    const service = await GitService.create(roots);
    assert.match((await service.diff({ path: f.worktree })).stdout, /\+allowed linked edit/);
  }
});

test('current request narrowing can deny common metadata even when startup roots include it', async (t) => {
  const f = await linkedFixture(t);
  const service = await GitService.create(f.parent);
  service.policy.setAccessGuard((target) => {
    const relative = path.relative(f.worktree, target);
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative))
      throw Error('fixture scope denial');
  });
  await assert.rejects(service.status({ path: f.worktree }), code('GIT_OUTSIDE_ROOT'));
});

test('the existing direct external git-dir denial remains enforced', async (t) => {
  const f = await fixture(t);
  const worktree = path.join(f.parent, 'worktree');
  await git(f.repository, ['worktree', 'add', '--detach', worktree]);
  const service = await GitService.create(worktree);
  await assert.rejects(service.diff({}), code('GIT_OUTSIDE_ROOT'));
});

test('malformed common metadata fails without exposing raw Git diagnostics', async (t) => {
  const f = await linkedFixture(t);
  await fs.writeFile(path.join(f.admin, 'commondir'), 'missing-private-fixture-directory\n');
  const service = await GitService.create(f.worktree);
  await assert.rejects(service.status({}), (error) => {
    assert.equal(error.code, 'GIT_FAILED');
    assert.doesNotMatch(error.message, /missing-private-fixture-directory|fatal:/);
    return true;
  });
});

test('cancellation during common-directory canonicalization prevents later Git inspection', async (t) => {
  const f = await linkedFixture(t);
  const service = await GitService.create(f.parent);
  const abort = new AbortController();
  const realpath = fs.realpath.bind(fs);
  t.mock.method(fs, 'realpath', async (...args) => {
    const result = await realpath(...args);
    if (path.resolve(args[0]) === path.resolve(f.common)) abort.abort();
    return result;
  });
  await assert.rejects(service.status({ path: f.worktree }, abort.signal), code('CANCELLED'));
});

for (const kind of ['clean', 'process', 'smudge']) {
  test('read-only inspection refuses configured ' + kind + ' filters without executing them', async (t) => {
    const f = await filterFixture(t, kind);
    const service = await GitService.create(f.repository);
    for (const inspect of [() => service.diff({}), () => service.status({})]) {
      const result = await inspect().then(
        (value) => ({ value }),
        (error) => ({ error }),
      );
      assert.equal(await exists(f.marker), false, 'Read-only Git must not run a repository filter');
      assert.equal(result.error?.code, 'GIT_UNSAFE_CONFIG');
      assert.doesNotMatch(result.error.message, /fixture-filter|filter-ran|node.exe/);
    }
  });
}

test('configuration includes cannot hide a command filter from read-only admission', async (t) => {
  const f = await filterFixture(t);
  const configured = await git(f.repository, ['config', '--get', 'filter.fixture.clean']);
  await git(f.repository, ['config', '--unset', 'filter.fixture.clean']);
  const included = path.join(f.parent, 'included-config');
  await git(f.repository, ['config', '--file', included, 'filter.fixture.clean', configured.trim()]);
  await git(f.repository, ['config', 'include.path', included]);
  const service = await GitService.create(f.repository);
  const result = await service.diff({}).then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
  assert.equal(await exists(f.marker), false);
  assert.equal(result.error?.code, 'GIT_UNSAFE_CONFIG');
});

test('a separately enabled worktree configuration cannot introduce a command filter', async (t) => {
  const f = await filterFixture(t);
  const configured = await git(f.repository, ['config', '--get', 'filter.fixture.clean']);
  await git(f.repository, ['config', '--unset', 'filter.fixture.clean']);
  await git(f.repository, ['config', 'extensions.worktreeConfig', 'true']);
  await git(f.repository, ['config', '--worktree', 'filter.fixture.clean', configured.trim()]);
  const service = await GitService.create(f.repository);
  const result = await service.diff({}).then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
  assert.equal(await exists(f.marker), false);
  assert.equal(result.error?.code, 'GIT_UNSAFE_CONFIG');
});

test('mixed-case driver names containing dots do not bypass the filter gate', async (t) => {
  const f = await filterFixture(t, 'clean', 'MiXeD.Driver');
  const service = await GitService.create(f.repository);
  const result = await service.diff({}).then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
  assert.equal(await exists(f.marker), false);
  assert.equal(result.error?.code, 'GIT_UNSAFE_CONFIG');
});

test('conditional configuration includes are explicitly unsupported even when presently inactive', async (t) => {
  const f = await fixture(t);
  await git(f.repository, [
    'config',
    'includeIf.gitdir:/mterm-fixture-never-match/.path',
    'missing-fixture-config',
  ]);
  const service = await GitService.create(f.repository);
  await assert.rejects(service.status({}), code('GIT_UNSAFE_CONFIG'));
});

test('an empty duplicate filter declaration does not make executable configuration supported', async (t) => {
  const f = await filterFixture(t);
  await git(f.repository, ['config', '--add', 'filter.fixture.clean', '']);
  const service = await GitService.create(f.repository);
  await assert.rejects(service.status({}), code('GIT_UNSAFE_CONFIG'));
  assert.equal(await exists(f.marker), false);
});

test('default MCP Git inspection refuses a filter while general process execution stays unavailable', async (t) => {
  const f = await filterFixture(t);
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [entry, 'mcp', '--stdio', '--root', f.repository],
    stderr: 'pipe',
  });
  const client = new Client({ name: 'mterm-git-boundary-fixture', version: '1.0.0' });
  try {
    await client.connect(transport);
    const listed = await client.listTools();
    assert.ok(!listed.tools.some((tool) => tool.name === 'mterm_start_process'));
    const response = await client.callTool({ name: 'mterm_git_diff', arguments: {} });
    assert.equal(await exists(f.marker), false);
    assert.equal(response.isError, true);
    assert.equal(value(response).error.code, 'GIT_UNSAFE_CONFIG');
  } finally {
    await client.close();
    await transport.close().catch(() => {});
  }
});
