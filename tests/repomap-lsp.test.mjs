// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { RepoMapGenerator } from '../dist/intelligence/repomap.js';
import { LspManager } from '../dist/lsp/manager.js';
import { FileService } from '../dist/files.js';

test('RepoMapGenerator builds outline and markdown summary of workspace', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-repomap-test-'));
  try {
    const srcDir = path.join(tmpDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    await fs.writeFile(
      path.join(srcDir, 'math.ts'),
      'export function add(a: number, b: number): number {\n  return a + b;\n}\nexport class Calculator {\n  compute() {}\n}\n',
      'utf8'
    );

    const report = await RepoMapGenerator.generate(tmpDir);
    assert.equal(report.filesIndexed >= 1, true);
    assert.equal(report.totalSymbols >= 2, true);
    assert.match(report.markdownSummary, /math\.ts/);
    assert.match(report.markdownSummary, /add/);
    assert.match(report.markdownSummary, /Calculator/);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('LspManager finds definitions, references, and document symbols', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-lsp-test-'));
  try {
    const fileA = path.join(tmpDir, 'service.ts');
    const fileB = path.join(tmpDir, 'consumer.ts');

    await fs.writeFile(fileA, 'export function executeJob() {\n  return 42;\n}\n', 'utf8');
    await fs.writeFile(fileB, 'import { executeJob } from "./service.js";\nexecuteJob();\n', 'utf8');

    // 1. Definition lookup
    const def = await LspManager.findDefinition(fileA, 'executeJob', tmpDir);
    assert.ok(def);
    assert.equal(def.line, 1);
    assert.match(def.contextText, /function executeJob/);

    // 2. References lookup
    const refs = await LspManager.findReferences('executeJob', tmpDir);
    assert.equal(refs.length, 3);
    assert.ok(refs.some((r) => r.file.includes('service.ts')));
    assert.ok(refs.some((r) => r.file.includes('consumer.ts')));

    // 3. Document symbols
    const syms = await LspManager.getDocumentSymbols(fileA);
    assert.equal(syms.length, 1);
    assert.equal(syms[0].name, 'executeJob');
    assert.equal(syms[0].kind, 'function');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('FileService exposes repo_map and lsp operations over MCP interface', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-fs-lsp-test-'));
  try {
    const service = await FileService.create(tmpDir, { allowWrite: true });
    const file = path.join(tmpDir, 'helper.ts');
    await fs.writeFile(file, 'export class Helper {}\n', 'utf8');

    const map = await service.repoMap({});
    assert.ok(map.markdownSummary);

    const syms = await service.lspSymbols({ path: 'helper.ts' });
    assert.equal(syms.length, 1);
    assert.equal(syms[0].name, 'Helper');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
