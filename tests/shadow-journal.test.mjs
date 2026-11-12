// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ShadowJournal } from '../dist/journaling/shadow-journal.js';
import { FileService } from '../dist/files.js';

test('ShadowJournal records pre-mutation snapshots and restores previous content', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-journal-test-'));
  try {
    const journal = new ShadowJournal(tmpDir);
    const testFile = 'app.js';
    const originalText = 'const version = 1;\n';
    const modifiedText = 'const version = 2;\n';

    await fs.writeFile(path.join(tmpDir, testFile), originalText, 'utf8');

    // Record snapshot
    const txId = await journal.recordSnapshot(testFile, originalText, 'write', undefined, modifiedText);
    assert.ok(txId);

    // Apply mutation
    await fs.writeFile(path.join(tmpDir, testFile), modifiedText, 'utf8');

    // Rollback
    const res = await journal.rollback({ file: testFile, rootDir: tmpDir });
    assert.equal(res.ok, true);
    assert.deepEqual(res.restoredFiles, [testFile]);

    const restoredContent = await fs.readFile(path.join(tmpDir, testFile), 'utf8');
    assert.equal(restoredContent, originalText);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('FileService automatic snapshotting and mterm_rollback restores modified file', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-fs-rollback-test-'));
  try {
    const service = await FileService.create(tmpDir, { allowWrite: true });
    const testFile = 'index.ts';
    const initialText = 'export const initial = true;\n';
    const updatedText = 'export const initial = false;\n';

    // 1. Initial write
    const write1 = await service.write({ path: testFile, text: initialText, expectedVersion: 'missing' });

    // 2. Update write (automatically triggers shadow snapshot)
    const write2 = await service.write({
      path: testFile,
      text: updatedText,
      expectedVersion: write1.version,
    });

    const currentText = (await service.read({ path: testFile })).text;
    assert.equal(currentText, updatedText);

    // 3. Rollback
    const rollbackRes = await service.rollback({ file: testFile });
    assert.equal(rollbackRes.ok, true);
    assert.deepEqual(rollbackRes.restoredFiles, [testFile]);

    // 4. Verify original text is back
    const reverted = await service.read({ path: testFile });
    assert.equal(reverted.text, initialText);
    assert.equal(reverted.version, write1.version);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
