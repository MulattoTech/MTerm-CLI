// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-04-local-mcp
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
const mod = await import('../dist/git.js').catch(() => ({}));
async function fixture(t) {
  assert.equal(typeof mod.GitService, 'function', 'GitService must be implemented');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-git-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await run('git', ['init', root]);
  await fs.writeFile(path.join(root, 'file.txt'), 'old\n');
  await run('git', ['-C', root, 'add', 'file.txt']);
  return { root, service: await mod.GitService.create(root) };
}
test('native Git status/diff is read-only and does not invoke external diff', async (t) => {
  const { root, service } = await fixture(t);
  await fs.writeFile(path.join(root, 'file.txt'), 'new\n');
  await run('git', ['-C', root, 'config', 'diff.external', 'mterm-must-never-run']);
  assert.match((await service.status({ path: '.' })).stdout, /file.txt/);
  const r = await service.diff({ path: '.' });
  assert.match(r.stdout, /\+new/);
  assert.equal(r.truncated, false);
});
test('Git inspection rejects parent-repository scope leakage', async (t) => {
  const { root } = await fixture(t);
  await fs.mkdir(path.join(root, 'nested'));
  const service = await mod.GitService.create(path.join(root, 'nested'));
  await assert.rejects(service.status({ path: '.' }), (e) => e.code === 'GIT_OUTSIDE_ROOT');
});
test('Git schema rejects unknown mutation flags', async (t) => {
  const { service } = await fixture(t);
  await assert.rejects(service.diff({ path: '.', commit: true }));
});
