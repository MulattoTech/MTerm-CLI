// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUnifiedDiff, applyHunks, createDiffPreview } from '../dist/editing/semantic-editor.js';
import { SyntaxValidator } from '../dist/editing/syntax-validator.js';

test('parseUnifiedDiff parses standard unified diff header and hunks', () => {
  const diff = `--- a/src/sample.ts
+++ b/src/sample.ts
@@ -1,4 +1,5 @@
 const a = 1;
-const b = 2;
+const b = 20;
+const c = 30;
 const d = 4;
`;
  const parsed = parseUnifiedDiff(diff);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].oldPath, 'src/sample.ts');
  assert.equal(parsed[0].newPath, 'src/sample.ts');
  assert.equal(parsed[0].hunks.length, 1);
  assert.equal(parsed[0].hunks[0].oldStart, 1);
  assert.equal(parsed[0].hunks[0].oldLines, 4);
});

test('applyHunks accurately applies changes with line-ending preservation', () => {
  const original = 'const a = 1;\r\nconst b = 2;\r\nconst d = 4;\r\n';
  const diff = `--- a/test.ts
+++ b/test.ts
@@ -1,3 +1,4 @@
 const a = 1;
-const b = 2;
+const b = 20;
+const c = 30;
 const d = 4;
`;
  const parsed = parseUnifiedDiff(diff);
  const result = applyHunks(original, parsed[0].hunks);
  assert.equal(result.ok, true);
  assert.equal(result.hunksApplied, 1);
  assert.equal(result.patchedText, 'const a = 1;\r\nconst b = 20;\r\nconst c = 30;\r\nconst d = 4;\r\n');
});

test('applyHunks fails gracefully on conflicting hunks', () => {
  const original = 'const a = 1;\nconst mismatch = 999;\nconst d = 4;\n';
  const diff = `--- a/test.ts
+++ b/test.ts
@@ -1,3 +1,3 @@
 const a = 1;
-const b = 2;
+const b = 20;
 const d = 4;
`;
  const parsed = parseUnifiedDiff(diff);
  const result = applyHunks(original, parsed[0].hunks);
  assert.equal(result.ok, false);
  assert.equal(result.hunksApplied, 0);
  assert.match(result.error, /Hunk #1 failed to match target lines/);
});

test('SyntaxValidator catches JavaScript/TypeScript syntax errors', () => {
  const brokenJs = 'function broken() {\n  const x = ;\n}\n';
  const validJs = 'function ok() {\n  const x = 10;\n  return x;\n}\n';

  const resBroken = SyntaxValidator.validate(brokenJs, 'test.js');
  assert.equal(resBroken.valid, false);
  assert.ok(resBroken.diagnostics.length > 0);

  const resOk = SyntaxValidator.validate(validJs, 'test.js');
  assert.equal(resOk.valid, true);
  assert.equal(resOk.diagnostics.length, 0);
});

test('SyntaxValidator catches unclosed and mismatched delimiters', () => {
  const unclosed = 'function test() {\n  const arr = [1, 2, 3;\n}\n';
  const res = SyntaxValidator.validate(unclosed, 'script.py');
  assert.equal(res.valid, false);
  assert.match(res.diagnostics[0].message, /Mismatched delimiter|Unclosed delimiter/);
});

test('SyntaxValidator catches invalid JSON', () => {
  const badJson = '{\n  "key": "value",\n}';
  const res = SyntaxValidator.validate(badJson, 'config.json');
  assert.equal(res.valid, false);
  assert.ok(res.diagnostics.length > 0);
});

test('FileService.applyPatch performs dry-run and atomic patch application with syntax check', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const os = await import('node:os');
  const { FileService } = await import('../dist/files.js');

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-patch-test-'));
  try {
    const filePath = path.join(tmpDir, 'service.js');
    await fs.writeFile(filePath, 'function run() {\n  return 1;\n}\n', 'utf8');

    const service = await FileService.create(tmpDir, { allowWrite: true });

    // 1. Dry run
    const patch = `--- a/service.js
+++ b/service.js
@@ -1,3 +1,3 @@
 function run() {
-  return 1;
+  return 42;
 }
`;
    const dryRunRes = await service.applyPatch({ path: 'service.js', patch, dryRun: true });
    assert.equal(dryRunRes.ok, true);
    assert.equal(dryRunRes.dryRun, true);
    assert.equal(dryRunRes.hunksApplied, 1);
    assert.match(dryRunRes.diffPreview, /\+  return 42;/);

    // Verify file on disk wasn't changed by dry run
    const contentAfterDryRun = await fs.readFile(filePath, 'utf8');
    assert.equal(contentAfterDryRun, 'function run() {\n  return 1;\n}\n');

    // 2. Syntax rejection
    const badSyntaxPatch = `--- a/service.js
+++ b/service.js
@@ -1,3 +1,3 @@
 function run() {
-  return 1;
+  return [1, 2, ;
 }
`;
    await assert.rejects(
      async () => {
        await service.applyPatch({ path: 'service.js', patch: badSyntaxPatch, dryRun: false });
      },
      (err) => err.code === 'SYNTAX_ERROR'
    );

    // Verify file on disk was NOT corrupted
    const contentAfterBadPatch = await fs.readFile(filePath, 'utf8');
    assert.equal(contentAfterBadPatch, 'function run() {\n  return 1;\n}\n');

    // 3. Live clean patch
    const liveRes = await service.applyPatch({ path: 'service.js', patch, dryRun: false });
    assert.equal(liveRes.ok, true);
    assert.equal(liveRes.dryRun, false);
    assert.equal(liveRes.hunksApplied, 1);

    const finalContent = await fs.readFile(filePath, 'utf8');
    assert.equal(finalContent, 'function run() {\n  return 42;\n}\n');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
