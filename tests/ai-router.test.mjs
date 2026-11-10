// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ModelRouter } from '../dist/ai/router.js';
import { FileService } from '../dist/files.js';

test('ModelRouter provides deterministic diff review and catches secrets', async () => {
  const router = ModelRouter.getInstance();

  const dirtyDiff = `--- a/config.ts
+++ b/config.ts
@@ -1,2 +1,3 @@
 const env = "prod";
+const apiKey = "sk-1234567890abcdef123456";
+debugger;
`;

  const report = await router.reviewDiff(dirtyDiff);
  assert.equal(report.ok, false, 'critical findings cannot be reported as a successful review');
  assert.equal(report.issues.length, 2);
  assert.equal(report.issues[0].severity, 'critical');
  assert.match(report.issues[0].message, /hardcoded API key/i);
  assert.equal(report.issues[1].severity, 'warning');
  assert.match(report.issues[1].message, /debugger/i);
});

test('ModelRouter tracks token usage and budget status', () => {
  const router = ModelRouter.getInstance();
  const status = router.getBudgetStatus();
  assert.equal(typeof status.dailyTokensUsed, 'number');
  assert.equal(typeof status.dailyTokenLimit, 'number');
  assert.ok(status.dailyTokenLimit > 0);
});

test('FileService exposes ai_review_diff tool', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-ai-review-test-'));
  try {
    const service = await FileService.create(tmpDir, { allowWrite: true });
    const cleanDiff = `--- a/math.ts
+++ b/math.ts
@@ -1,2 +1,2 @@
-return a - b;
+return a + b;
`;
    const res = await service.aiReviewDiff({ diff: cleanDiff });
    assert.equal(res.ok, true);
    assert.equal(res.issues.length, 0);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
