// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-05-codex-parity-foundation
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const mod = await import('../scripts/parity-baseline.mjs').catch(() => ({}));
const root = path.resolve('.');
test('pinned manifest has26 Codex tools and source integrity is verified offline', async () => {
  assert.equal(typeof mod.verifyBaseline, 'function');
  const r = await mod.verifyBaseline(root);
  assert.equal(r.toolCount, 26);
  assert.equal(r.commit, 'c774c3b505de990219637ecdc9a830c8772fae9d');
});
test('changed schema source fails even when the tool-name list is unchanged', async (t) => {
  assert.equal(typeof mod.verifyBaseline, 'function');
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-baseline-'));
  t.after(() => fs.rm(tmp, { recursive: true, force: true }));
  await fs.cp(path.join(root, 'docs/parity'), path.join(tmp, 'docs/parity'), { recursive: true });
  await fs.appendFile(path.join(tmp, 'docs/parity/upstream/src/tools/schemas.ts'), '\n// schema drift\n');
  await assert.rejects(mod.verifyBaseline(tmp), /hash|drift|changed/i);
});
test('explicit upstream probe reports drift without rewriting the pinned target', async () => {
  assert.equal(typeof mod.probeUpstream, 'function');
  const before = await fs.readFile('docs/parity/baseline.json');
  const mock = async (url) => {
    assert.equal(url, 'https://api.github.com/repos/wonderwhy-er/DesktopCommanderMCP/commits/main');
    return new Response(JSON.stringify({ sha: 'a'.repeat(40) }));
  };
  const result = await mod.probeUpstream(root, mock);
  assert.equal(result.drift, true);
  assert.deepEqual(await fs.readFile('docs/parity/baseline.json'), before);
});
test('parity closure count and PASS cannot be asserted without issue evidence and release gates', async () => {
  assert.equal(typeof mod.validateParity, 'function');
  const p = JSON.parse(await fs.readFile('docs/roadmap/desktop-commander-parity.json', 'utf8'));
  assert.equal(mod.validateParity(p).pass, false);
  assert.throws(() => mod.validateParity({ ...p, pass: true }), /PASS|gate/i);
  const duplicate = structuredClone(p);
  duplicate.gaps[1].id = duplicate.gaps[0].id;
  assert.throws(() => mod.validateParity(duplicate), /duplicate|identity/i);
  const fake = structuredClone(p);
  fake.gaps[0].state = 'closed';
  fake.closedGapCount = 1;
  assert.throws(() => mod.validateParity(fake), /evidence/i);
  fake.gaps[0].evidence = ['tests/fixture-acceptance.md'];
  assert.throws(() => mod.validateParity(fake), /acceptance|evidence/i);
  fake.gaps[0].acceptanceReview = {
    allCriteriaSatisfied: true,
    reviewer: 'test-fixture-only',
    testedCommit: 'a'.repeat(40),
    upstreamCommit: fake.upstream.commit,
    acceptedAt: '2026-10-05T00:00:00Z',
    report: 'tests/fixture-acceptance.md',
  };
  assert.equal(mod.validateParity(fake).closed, 1);
  assert.equal(mod.validateParity(fake).pass, false);
  fake.gaps[0].acceptanceReview.upstreamCommit = 'b'.repeat(40);
  assert.throws(() => mod.validateParity(fake), /acceptance|evidence/i);
});
