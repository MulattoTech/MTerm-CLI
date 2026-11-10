// SPDX-License-Identifier: MIT
// Regressions found in the 2026-11-10 Gemini modernization audit.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { FileService } from '../dist/files.js';
import { ShadowJournal } from '../dist/journaling/shadow-journal.js';
import { ModelRouter } from '../dist/ai/router.js';
import { SyntaxValidator } from '../dist/editing/syntax-validator.js';
import { FleetSupervisor } from '../dist/orchestration/fleet-manager.js';
import { CodeFormatter } from '../dist/quality/formatter.js';
import { RepoMapGenerator } from '../dist/intelligence/repomap.js';

test('journal snapshots never leak across trusted roots or accept traversal', async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-audit-roots-'));
  const oldEnv = process.env.MTERM_JOURNAL_DIR;
  process.env.MTERM_JOURNAL_DIR = path.join(base, 'journals');
  try {
    const a = path.join(base, 'a');
    const b = path.join(base, 'b');
    await fs.mkdir(a);
    await fs.mkdir(b);
    const journalA = new ShadowJournal(a);
    const journalB = new ShadowJournal(b);
    await journalA.recordSnapshot('notes.txt', 'private notes', 'write');
    assert.equal((await journalB.listSnapshots()).length, 0);
    await assert.rejects(journalA.recordSnapshot('../escape.txt', 'do not write here', 'write'));
  } finally {
    if (oldEnv === undefined) delete process.env.MTERM_JOURNAL_DIR;
    else process.env.MTERM_JOURNAL_DIR = oldEnv;
    await fs.rm(base, { recursive: true, force: true });
  }
});

test('rollback refuses a file modified since the recorded write', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-audit-conflict-'));
  const oldEnv = process.env.MTERM_JOURNAL_DIR;
  process.env.MTERM_JOURNAL_DIR = path.join(root, '.journals');
  try {
    const service = await FileService.create(root, { allowWrite: true });
    const original = await service.write({
      path: 'file.txt',
      text: 'original\n',
      expectedVersion: 'missing',
    });
    await service.write({ path: 'file.txt', text: 'changed\n', expectedVersion: original.version });
    await fs.writeFile(path.join(root, 'file.txt'), 'external edit\n');
    await assert.rejects(service.rollback({ file: 'file.txt' }), (e) => e.code === 'ROLLBACK_CONFLICT');
    assert.equal(await fs.readFile(path.join(root, 'file.txt'), 'utf8'), 'external edit\n');
  } finally {
    if (oldEnv === undefined) delete process.env.MTERM_JOURNAL_DIR;
    else process.env.MTERM_JOURNAL_DIR = oldEnv;
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('patch tool refuses a wrong target, multiple targets, or malformed hunk length', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-audit-patch-'));
  try {
    const service = await FileService.create(root, { allowWrite: true });
    await fs.writeFile(path.join(root, 'good.js'), 'const value = 1;\n');
    const wrong = '--- a/other.js\n+++ b/other.js\n@@ -1 +1 @@\n-const value = 1;\n+const value = 2;\n';
    await assert.rejects(
      service.applyPatch({ path: 'good.js', patch: wrong }),
      (e) => e.code === 'PATCH_PATH_MISMATCH',
    );

    const valid = '--- a/good.js\n+++ b/good.js\n@@ -1 +1 @@\n-const value = 1;\n+const value = 2;\n';
    await assert.rejects(
      service.applyPatch({ path: 'good.js', patch: valid + wrong }),
      (e) => e.code === 'MULTI_FILE_PATCH',
    );

    const invalidLength =
      '--- a/good.js\n+++ b/good.js\n@@ -1,200 +1,200 @@\n-const value = 1;\n+const value = 2;\n';
    await assert.rejects(
      service.applyPatch({ path: 'good.js', patch: invalidLength }),
      (e) => e.code === 'PATCH_CONFLICT',
    );
    assert.equal(await fs.readFile(path.join(root, 'good.js'), 'utf8'), 'const value = 1;\n');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('unsupported syntax checks fail closed instead of certifying invalid TypeScript', () => {
  const result = SyntaxValidator.validate('const value: = 4;\n', 'invalid.ts');
  assert.equal(result.valid, false);
});

test('a requested unconfigured cloud AI provider is never silently substituted', async () => {
  const router = new ModelRouter();
  await assert.rejects(router.reviewDiff('--- a/a\n+++ b/a\n', { provider: 'gemini' }), /not configured/i);
});

test('emergency halt includes checkpointed records and reports no real executors stopped', () => {
  const fleet = new FleetSupervisor();
  const task = fleet.submitTask({ sessionId: 'one', clientLabel: 'test', name: 'task' });
  assert.equal(fleet.saveCheckpoint(task.id, { progress: 1 }), true);
  assert.equal(fleet.getStatus().checkpointedTasks, 1);
  const result = fleet.emergencyHalt();
  assert.equal(task.status, 'cancelled');
  assert.equal(result.executorsStopped, 0);
  assert.equal(fleet.getStatus().mode, 'ledger-only');
});

test('formatting is deterministic and never delegates to npx or project scripts', async () => {
  const result = await CodeFormatter.formatText('const value = 1;  ', 'sample.ts');
  assert.equal(result.engine, 'builtin-normalizer');
  assert.equal(result.formattedText, 'const value = 1;\n');
});

test('repository mapping does not change a clean workspace and refreshes uncommitted edits', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-audit-map-'));
  try {
    const file = path.join(root, 'test.ts');
    await fs.writeFile(file, 'export function first() {}\n');
    const first = await RepoMapGenerator.generate(root);
    assert.match(first.markdownSummary, /first/);
    await fs.writeFile(file, 'export function second() {}\n');
    const second = await RepoMapGenerator.generate(root);
    assert.match(second.markdownSummary, /second/);
    assert.equal(second.cacheHit, false);
    assert.deepEqual((await fs.readdir(root)).sort(), ['test.ts']);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
