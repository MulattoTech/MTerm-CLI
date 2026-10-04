// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-04-local-mcp
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const entry = path.resolve('bin/mterm-cli.js');
async function invoke(args, options = {}) {
  try {
    const r = await exec(process.execPath, [entry, ...args], {
      timeout: 8000,
      maxBuffer: 1048576,
      ...options,
    });
    return { ...r, code: 0 };
  } catch (e) {
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', code: e.code };
  }
}
async function home(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-cli-home-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}
test('help/version work offline without loading providers', async (t) => {
  const dir = await home(t);
  const env = {
    ...process.env,
    MTERM_CONFIG_PATH: path.join(dir, 'absent.json'),
    MTERM_CODEX_EXECUTABLE: path.join(dir, 'absent.exe'),
  };
  const r = await invoke(['--help'], { env });
  assert.equal(r.code, 0);
  assert.match(r.stdout, /mcp/);
  assert.equal((await invoke(['--version'], { env })).stdout.trim(), '0.0.1-preview.1');
  assert.equal((await fs.readdir(dir)).length, 0);
});
test('Codex passthrough owns flags after delimiter and preserves exit and cwd', async (t) => {
  const dir = await home(t);
  const env = {
    ...process.env,
    MTERM_CODEX_EXECUTABLE: process.execPath,
    MTERM_CONFIG_PATH: path.join(dir, 'config.json'),
  };
  const version = await invoke(['--', '--version'], { env, cwd: dir });
  assert.equal(version.stdout.trim(), process.version);
  const r = await invoke(
    [
      'run',
      '--',
      '-e',
      'console.log(JSON.stringify({cwd:process.cwd(),args:process.argv.slice(1)}));process.exitCode=7',
      '--',
      '--help',
      'space value',
      '文',
    ],
    { env, cwd: dir },
  );
  assert.equal(r.code, 7);
  const data = JSON.parse(r.stdout);
  assert.equal(data.cwd, dir);
  assert.deepEqual(data.args, ['--help', 'space value', '文']);
});
test('missing configured Codex fails without hidden installation or fallback', async (t) => {
  const dir = await home(t);
  const r = await invoke(['--', '--version'], {
    env: {
      ...process.env,
      MTERM_CODEX_EXECUTABLE: path.join(dir, 'missing.exe'),
      MTERM_CONFIG_PATH: path.join(dir, 'config.json'),
    },
  });
  assert.notEqual(r.code, 0);
  assert.doesNotMatch(r.stderr, /Bearer|refresh_token/);
  assert.equal((await fs.readdir(dir)).length, 0);
});
test('typed config writes and invalid values preserve last valid document', async (t) => {
  const dir = await home(t),
    file = path.join(dir, 'config.json'),
    env = { ...process.env, MTERM_CONFIG_PATH: file };
  const show = await invoke(['config', 'show', '--json'], { env });
  assert.equal(show.code, 0);
  assert.equal(JSON.parse(show.stdout).settings.schemaVersion, 1);
  const set = await invoke(['config', 'set', 'trustedRoot', dir], { env });
  assert.equal(set.code, 0);
  const before = await fs.readFile(file, 'utf8');
  for (const key of ['__proto__', 'accessToken', 'allowExec']) {
    const r = await invoke(['config', 'set', key, 'unsafe'], { env });
    assert.notEqual(r.code, 0);
    assert.equal(await fs.readFile(file, 'utf8'), before);
  }
  const get = await invoke(['config', 'get', 'trustedRoot'], { env });
  assert.equal(JSON.parse(get.stdout).value, dir);
});
test('doctor JSON separates local host capability, provider and remote-Web readiness', async (t) => {
  const dir = await home(t);
  const r = await invoke(['doctor', '--json', '--root', dir], {
    env: {
      ...process.env,
      MTERM_CODEX_EXECUTABLE: process.execPath,
      MTERM_CONFIG_PATH: path.join(dir, 'config.json'),
    },
  });
  assert.equal(r.code, 0);
  const d = JSON.parse(r.stdout);
  assert.equal(d.localMcp.ready, true);
  assert.equal(d.remoteWebRelay.ready, false);
  assert.equal(d.networkChecked, false);
});
test('status JSON is explicit unavailable data, not fake quota', async (t) => {
  const r = await invoke(['status', '--json']);
  assert.notEqual(r.code, 0);
  const data = JSON.parse(r.stdout);
  assert.equal(data.ok, false);
  assert.equal(data.provider, 'codex');
  assert.equal(data.error.code, 'NOT_IMPLEMENTED');
  assert.equal(data.credits, null);
});
test('setup Codex prints a reversible plan, never edits auth/config by default', async (t) => {
  const dir = await home(t);
  const r = await invoke(['setup', 'codex', '--root', dir, '--allow-write'], {
    env: { ...process.env, CODEX_HOME: dir, MTERM_CONFIG_PATH: path.join(dir, 'config.json') },
  });
  assert.equal(r.code, 0);
  const plan = JSON.parse(r.stdout);
  assert.equal(plan.applied, false);
  assert.ok(plan.add.args.includes('--stdio'));
  assert.ok(plan.add.args.includes('--allow-write'));
  assert.ok(!plan.add.args.includes('--allow-exec'));
  assert.equal(plan.remove.args[0], 'mcp');
  assert.equal((await fs.readdir(dir)).length, 0);
});
test('MCP refuses missing root and unknown transport flags', async () => {
  for (const args of [
    ['mcp', '--stdio'],
    ['mcp', '--stdio', '--root'],
    ['mcp', '--http', '--root', '.'],
  ]) {
    const r = await invoke(args);
    assert.equal(r.code, 2);
  }
});
