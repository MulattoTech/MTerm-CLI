// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-config-installed-qualification
// Prevent source-path or wrong-package substitutions from supplying installed acceptance evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const verifier = path.resolve('scripts/verify-configuration-installed.mjs');

test('installed configuration verifier rejects a source entry without launching it', async (t) => {
  const fixture = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-verify-entry-')));
  t.after(() => fs.rm(fixture, { recursive: true, force: true }));
  await assert.rejects(
    exec(process.execPath, [verifier, path.resolve('bin/mterm-cli.js'), fixture, fixture, '0.0.1-preview.1']),
    (error) => error.code !== 0 && /must use the package installed in its owned prefix/.test(error.stderr),
  );
  assert.deepEqual(
    await fs.readdir(fixture),
    [],
    'Rejected source input must create no fixture/evidence state',
  );
});

test('installed configuration verifier rejects a mismatched package before executing its bin', async (t) => {
  const fixture = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-verify-manifest-')));
  t.after(() => fs.rm(fixture, { recursive: true, force: true }));
  const packageRoot = path.join(fixture, 'node_modules', 'mterm-cli');
  const entry = path.join(packageRoot, 'bin', 'mterm-cli.js');
  const marker = path.join(fixture, 'unexpected-execution');
  await fs.mkdir(path.dirname(entry), { recursive: true });
  await fs.writeFile(entry, `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'unsafe');`);
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({
      name: 'mterm-cli',
      version: '0.0.0-wrong-fixture',
      bin: { 'mterm-cli': 'bin/mterm-cli.js' },
    }),
  );
  await assert.rejects(
    exec(process.execPath, [verifier, entry, fixture, fixture, '0.0.1-preview.1']),
    (error) => error.code !== 0 && /0\.0\.0-wrong-fixture/.test(error.stderr),
  );
  await assert.rejects(fs.stat(marker), { code: 'ENOENT' });
  assert.deepEqual(await fs.readdir(fixture), ['node_modules']);
});
