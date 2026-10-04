// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-04-local-mcp
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const mod = await import('../scripts/roadmap.mjs').catch(() => ({}));
function ready() {
  assert.equal(typeof mod.summarize, 'function', 'Roadmap implementation must exist');
}
const row = (id, stage, weight = 1) => ({
  id,
  title: 'Feature ' + id,
  section: 'Tools',
  acceptance: 'Exact tested requirement',
  stage,
  weight,
  remainingHours: [1, 4],
  eta: 'Unscheduled',
  blocker: null,
  evidence: stage === 'not_started' ? [] : ['tests/x.test.mjs'],
  notes: 'Reviewed explicitly',
});
test('weighted stages are deterministic and blockers retain earned credit', () => {
  ready();
  const a = row('CLI-001', 'complete', 1),
    b = row('CLI-002', 'implementation', 3);
  b.blocker = 'integration unavailable';
  const s = mod.summarize({ items: [a, b] });
  assert.equal(s.percent, 55);
  assert.equal(s.blocked, 1);
  assert.equal(s.complete, 1);
});
test('invalid stage, weight, duplicate or evidence-less completion is rejected', () => {
  ready();
  for (const items of [
    [row('CLI-001', 'made-up')],
    [row('CLI-001', 'complete', 0)],
    [row('CLI-001', 'not_started'), row('CLI-001', 'not_started')],
    [{ ...row('CLI-001', 'complete'), evidence: [] }],
  ])
    assert.throws(() => mod.validateCatalog({ schemaVersion: 1, baseline: 'test', items }));
});
test('HTML labels and embedded data cannot inject markup or script', () => {
  ready();
  const item = row('CLI-001', 'planned');
  item.title = '</script><script>alert(1)</script>';
  const html = mod.renderHtml({ items: [item] }, mod.summarize({ items: [item] }));
  assert.ok(!html.includes(item.title));
  assert.ok(html.includes('textContent'));
  assert.ok(!html.includes('https://'));
});
test('review and generated files detect source, catalog and output drift independently', async (t) => {
  ready();
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-roadmap-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'src'));
  await fs.mkdir(path.join(root, 'docs/roadmap'), { recursive: true });
  await fs.mkdir(path.join(root, 'docs/ai/changes'), { recursive: true });
  await fs.mkdir(path.join(root, 'tests'));
  await fs.writeFile(path.join(root, 'src/a.ts'), 'export const a=1;');
  await fs.writeFile(path.join(root, 'tests/x.test.mjs'), 'test fixture');
  const c = {
    schemaVersion: 1,
    baseline: 'test',
    reviewedAt: '2026-10-04T00:00:00Z',
    items: [row('CLI-001', 'planned')],
  };
  await fs.writeFile(path.join(root, 'docs/roadmap/progress.json'), JSON.stringify(c));
  await fs.writeFile(
    path.join(root, 'docs/ai/changes/test.json'),
    JSON.stringify({
      change_id: 'test',
      provider: 'test',
      model: 'fixture',
      tests: [{ result: 'fixture' }],
      roadmap_updates: [{ id: 'CLI-001', note: 'unchanged planned stage' }],
    }),
  );
  await assert.rejects(mod.check(root));
  await mod.review(root, 'test');
  await mod.render(root);
  await mod.check(root);
  await fs.appendFile(path.join(root, 'src/a.ts'), '// changed');
  await assert.rejects(mod.check(root), /stale/i);
  await assert.rejects(mod.render(root), /stale/i);
  await mod.review(root, 'test');
  await mod.render(root);
  await mod.check(root);
  c.items[0].stage = 'integrated';
  await fs.writeFile(path.join(root, 'docs/roadmap/progress.json'), JSON.stringify(c));
  await assert.rejects(mod.check(root), /stale/i);
  await mod.review(root, 'test');
  await mod.render(root);
  await fs.appendFile(path.join(root, 'docs/ROADMAP.md'), 'altered');
  await assert.rejects(mod.check(root), /generated/i);
});
