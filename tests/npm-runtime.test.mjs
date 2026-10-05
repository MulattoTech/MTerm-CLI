// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-05-codex-parity-foundation
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const mod = await import('../scripts/npm-runtime.mjs').catch(() => ({}));
test('npm resolver recognizes Windows adjacent and Unix lib installation layouts', async (t) => {
  assert.equal(typeof mod.resolveNpmEntry, 'function');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-npm-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const win = path.join(root, 'windows', 'node_modules', 'npm', 'bin', 'npm-cli.js');
  await fs.mkdir(path.dirname(win), { recursive: true });
  await fs.writeFile(win, 'fixture');
  assert.equal(await mod.resolveNpmEntry({ execPath: path.join(root, 'windows', 'node.exe'), env: {} }), win);
  const unix = path.join(root, 'unix', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js');
  await fs.mkdir(path.dirname(unix), { recursive: true });
  await fs.writeFile(unix, 'fixture');
  assert.equal(
    await mod.resolveNpmEntry({ execPath: path.join(root, 'unix', 'bin', 'node'), env: {} }),
    unix,
  );
});
test('npm resolver gives actionable absence and respects an explicit existing npm_execpath', async (t) => {
  assert.equal(typeof mod.resolveNpmEntry, 'function');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-npm-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await assert.rejects(
    mod.resolveNpmEntry({ execPath: path.join(root, 'none', 'node'), env: {} }),
    /npm.*locat|npm.*found/i,
  );
  const file = path.join(root, 'npm-cli.js');
  await fs.writeFile(file, 'fixture');
  assert.equal(
    await mod.resolveNpmEntry({ execPath: path.join(root, 'none', 'node'), env: { npm_execpath: file } }),
    file,
  );
});
