// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { CodeFormatter } from '../dist/quality/formatter.js';
import { CodeLinter } from '../dist/quality/linter.js';
import { TypeChecker } from '../dist/quality/typecheck.js';
import { RefineEngine } from '../dist/quality/refine-pipeline.js';
import { FileService } from '../dist/files.js';

test('CodeFormatter normalizes whitespace and trailing newline', async () => {
  const unformatted = 'function test() {   \n  const x = 1; \n}';
  const { formattedText, engine } = await CodeFormatter.formatText(unformatted, 'sample.ts');
  assert.ok(engine);
  assert.equal(formattedText.endsWith('\n'), true);
  // Ensure lines don't end with trailing spaces
  for (const line of formattedText.split('\n')) {
    assert.equal(/[ \t]+$/.test(line), false);
  }
});

test('CodeLinter produces structured diagnostics for syntax and style issues', async () => {
  const badCode = 'function broken() {\n  const x = ;\n}\n';
  const report = await CodeLinter.lintFile('test.js', badCode);
  assert.equal(report.clean, false);
  assert.ok(report.diagnostics.length > 0);
  assert.equal(report.diagnostics[0].severity, 'error');

  const longLineCode = 'const a = "' + 'x'.repeat(150) + '";\n';
  const reportLong = await CodeLinter.lintFile('long.js', longLineCode);
  assert.ok(reportLong.diagnostics.some((d) => d.ruleId === 'max-line-length'));
});

test('TypeChecker discovers tsconfig.json and reports project status', async () => {
  const report = await TypeChecker.checkProject();
  assert.ok(report.projectPath);
  assert.equal(typeof report.clean, 'boolean');
  assert.equal(typeof report.errorsCount, 'number');
});

test('RefineEngine 5-pass pipeline successfully refines valid code and rejects invalid code', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-refine-test-'));
  try {
    const file = path.join(tmpDir, 'module.js');
    const initial = 'function compute() {\n  return 1;\n}\n';
    await fs.writeFile(file, initial, 'utf8');

    // 1. Valid patch refinement
    const patch = `--- a/module.js
+++ b/module.js
@@ -1,3 +1,3 @@
 function compute() {
-  return 1;
+  return 100;
 }
`;
    const reportValid = await RefineEngine.run({
      path: file,
      originalText: initial,
      proposedPatch: patch,
      autoFormat: true,
      runLinter: true,
    });

    assert.equal(reportValid.ok, true);
    assert.equal(reportValid.syntaxValid, true);
    assert.ok(reportValid.stagesPassed.includes('pass-1:patch-applied'));
    assert.ok(reportValid.stagesPassed.includes('pass-2:syntax-valid'));
    assert.match(reportValid.finalContent, /return 100;/);

    // 2. Invalid syntax patch refinement
    const badPatch = `--- a/module.js
+++ b/module.js
@@ -1,3 +1,3 @@
 function compute() {
-  return 1;
+  return (;;
 }
`;
    const reportBad = await RefineEngine.run({
      path: file,
      originalText: initial,
      proposedPatch: badPatch,
    });

    assert.equal(reportBad.ok, false);
    assert.equal(reportBad.syntaxValid, false);
    assert.match(reportBad.failureReason, /Syntax validation failed/);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('FileService integration exposes format, lint, and refine MCP operations', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-fs-quality-test-'));
  try {
    const service = await FileService.create(tmpDir, { allowWrite: true });
    const target = path.join(tmpDir, 'demo.js');
    await fs.writeFile(target, 'function demo() {  \n return 5;  \n}\n', 'utf8');

    // Format file
    const fmtRes = await service.formatFile({ path: 'demo.js', write: true });
    assert.equal(fmtRes.formatted, true);

    // Lint check
    const lintRes = await service.lintCheck({ path: 'demo.js' });
    assert.ok(lintRes.engine);

    // Refine pipeline
    const refineRes = await service.refine({
      path: 'demo.js',
      patch: `--- a/demo.js\n+++ b/demo.js\n@@ -1,3 +1,3 @@\n function demo() {\n- return 5;\n+ return 10;\n }\n`,
    });
    assert.equal(refineRes.ok, true);
    assert.match(refineRes.finalContent, /return 10;/);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
