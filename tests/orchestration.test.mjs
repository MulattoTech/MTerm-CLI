// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-21-orchestrator-ready (OpenAI / GPT-6)
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function run(script, flags) {
  return spawnSync(process.execPath, [path.join(root, 'scripts', 'orchestration', script), ...flags], {
    cwd: root,
    windowsHide: true,
    timeout: 15000,
    encoding: 'utf8',
  });
}
test('AO worktree setup preview is deterministic and does not invoke install', () => {
  const r = run('post-create.mjs', ['--dry-run']);
  assert.equal(r.status, 0, r.stderr);
  const plan = JSON.parse(r.stdout);
  assert.equal(plan.dryRun, true);
  assert.equal(plan.touchesCodexConfig, false);
  assert.equal(plan.invokesModels, false);
  assert.deepEqual(
    plan.steps.map((x) => x.args.slice(1, 3)),
    [
      ['ci', '--ignore-scripts'],
      ['run', 'build:code'],
    ],
  );
  assert.equal(plan.cwd, root);
});
test('AO postCreate preview permits dependency-only mode', () => {
  const r = run('post-create.mjs', ['--dry-run', '--no-build']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).steps.length, 1);
});
test('AO setup refuses unrecognized control flags', () => {
  const r = run('post-create.mjs', ['--skip-lockfile']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Usage/);
});
test('AO verify quick and full plans are explicit, model-free', () => {
  const quick = run('verify.mjs', ['--quick', '--dry-run']);
  const full = run('verify.mjs', ['--full', '--dry-run']);
  assert.equal(quick.status, 0, quick.stderr);
  assert.equal(full.status, 0, full.stderr);
  const q = JSON.parse(quick.stdout),
    f = JSON.parse(full.stdout);
  assert.deepEqual(
    q.steps.map((x) => x.name),
    ['reviewed build', 'normal acceptance tests'],
  );
  assert.deepEqual(
    f.steps.map((x) => x.name),
    ['reviewed build', 'normal acceptance tests', 'portable package', 'isolated Codex registration'],
  );
  assert.equal(q.realModelCalls, 0);
  assert.equal(f.changesLiveCodexConfig, false);
  assert.equal(f.skipLinkedWorktreeSelfHost, true);
});
test('AO verify rejects conflicting gates and unsupported flags', () => {
  for (const flags of [['--full', '--quick'], ['--force-green']]) {
    const r = run('verify.mjs', flags);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /Usage/);
  }
});
