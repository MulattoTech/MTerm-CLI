// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-installer-review (OpenAI / GPT-6 Astra Pro; self-reported)
// Review-only fixtures: PowerShell text is never executed and user configuration is untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { review, render, check } from '../scripts/roadmap.mjs';
import { sourceFingerprint } from '../scripts/review-source.mjs';

const installer = 'Install-MTermCLI.ps1';
const change = 'installer-fixture';
const initial = "# Harmless fixture, never executed.\nWrite-Output 'reviewed'\n";

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-installer-review-'));
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  const save = async (relative, value) => {
    const file = path.join(root, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
  };
  await save(installer, initial);
  await save('docs/roadmap/progress.json', {
    schemaVersion: 1,
    baseline: 'isolated installer review fixture',
    reviewedAt: '2026-11-09T00:00:00Z',
    items: [
      {
        id: 'CLI-001',
        title: 'Fixture requirement',
        section: 'Fixture',
        acceptance: 'Explicit review stays mandatory',
        stage: 'planned',
        weight: 1,
        remainingHours: [1, 2],
        eta: 'Unscheduled',
        blocker: null,
        evidence: [],
        notes: 'No acceptance credit',
      },
    ],
  });
  await save('docs/roadmap/desktop-commander-parity.json', {
    closedGapCount: 0,
    gaps: [{ id: 'DCP-001' }],
    pass: false,
    upstream: {
      repository: 'fixture/upstream',
      version: 'fixture',
      commit: 'fixture',
      publishedToolCount: 1,
    },
    epic: { issue: 1, url: 'https://example.invalid/issues/1' },
  });
  await save('docs/ai/changes/' + change + '.json', {
    change_id: change,
    provider: 'fixture',
    model: 'fixture',
    tests: [{ result: 'Isolated review fixture; installer never executed' }],
    roadmap_updates: [{ id: 'CLI-001', note: 'Unchanged stage and weight' }],
  });
  return { root, save };
}

for (const [name, operation] of [
  ['check', check],
  ['render', render],
]) {
  test('an installer edit makes ' + name + ' refuse stale review without changing approval', async (t) => {
    const { root, save } = await fixture(t);
    const assessed = await review(root, change);
    await render(root);
    await check(root);
    const protectedFiles = ['docs/roadmap/review.json', 'docs/ROADMAP.md', 'docs/roadmap/progress.json'];
    const before = await Promise.all(protectedFiles.map((file) => fs.readFile(path.join(root, file))));
    await save(installer, initial.replace('reviewed', 'changed'));

    await assert.rejects(operation(root), { message: /^Roadmap review is stale:/ });
    for (const [index, file] of protectedFiles.entries())
      assert.deepEqual(await fs.readFile(path.join(root, file)), before[index]);
    assert.match(assessed.sourceFiles[installer], /^[a-f0-9]{64}$/);

    const reassessed = await review(root, change);
    assert.notEqual(reassessed.sourceFingerprint, assessed.sourceFingerprint);
    await render(root);
    await check(root);
    assert.deepEqual(await fs.readFile(path.join(root, 'docs/roadmap/progress.json')), before[2]);
  });
}

test('adding or removing the supported installer changes reviewed manifest membership', async (t) => {
  const { root, save } = await fixture(t);
  await fs.unlink(path.join(root, installer));
  const absent = await sourceFingerprint(root);
  assert.equal(Object.hasOwn(absent.files, installer), false);
  await save(installer, initial);
  const present = await sourceFingerprint(root);
  assert.match(present.files[installer], /^[a-f0-9]{64}$/);
  assert.notEqual(present.hash, absent.hash);
  await fs.unlink(path.join(root, installer));
  assert.deepEqual(await sourceFingerprint(root), absent);
});

test('equivalent LF and CRLF installer checkouts preserve the actual reviewed manifest', async (t) => {
  const { root, save } = await fixture(t);
  await review(root, change);
  await render(root);
  const lf = await sourceFingerprint(root);
  assert.match(lf.files[installer], /^[a-f0-9]{64}$/);
  const approval = await fs.readFile(path.join(root, 'docs/roadmap/review.json'));
  await save(installer, initial.replaceAll('\n', '\r\n'));
  assert.deepEqual(await sourceFingerprint(root), lf);
  await check(root);
  assert.deepEqual(await fs.readFile(path.join(root, 'docs/roadmap/review.json')), approval);
});
