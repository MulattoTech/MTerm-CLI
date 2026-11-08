// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-08-aug005-container-isolation (OpenAI / GPT-6 Astra Pro; self-reported)
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.resolve(process.argv[2] ?? path.join(root, 'bin/mterm-cli.js'));
const output = path.resolve(process.argv[3] ?? path.join(root, 'artifacts/aug005/ci-evidence/source'));
assert.equal(process.env.MTERM_ISOLATION_REQUIRE_LIVE, '1');
assert.equal(process.platform, 'linux');
assert.equal(process.arch, 'x64');
await fs.mkdir(output, { recursive: true });
const sourceCommit = (await exec('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
assert.match(sourceCommit, /^[a-f0-9]{40}$/);
const names = [
  'cli.js',
  'mcp.js',
  'processes.js',
  'policy.js',
  'resource-budget-policy.js',
  'resource-budgets.js',
  'isolation-policy.js',
  'isolation-http.js',
  'isolation-engine.js',
  'isolation.js',
  'errors.js',
];
const bindings = [];
for (const name of names) {
  const source = await fs.readFile(path.join(root, 'dist', name));
  const tested = await fs.readFile(path.resolve(path.dirname(entry), '../dist', name));
  assert.deepEqual(tested, source, 'Live qualification entry does not match reviewed compiled bytes');
  bindings.push({
    path: 'dist/' + name,
    sha256: createHash('sha256').update(tested).digest('hex'),
    bytes: tested.length,
  });
}
const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-isolation-outside-'));
const receiptFile = path.join(output, 'live-receipt.json');
let run;
try {
  run = await exec(
    process.execPath,
    ['--test', '--test-reporter=tap', '--test-concurrency=1', path.join(root, 'tests/isolation-live.mjs')],
    {
      cwd,
      timeout: 240000,
      maxBuffer: 4194304,
      env: {
        ...process.env,
        MTERM_VERIFY_BIN: entry,
        MTERM_ISOLATION_RECEIPT: receiptFile,
        MTERM_TESTED_COMMIT: sourceCommit,
      },
    },
  ).then(
    (r) => ({ ...r, exitCode: 0 }),
    (e) => ({ stdout: e.stdout ?? '', stderr: e.stderr ?? '', exitCode: e.code ?? 'unknown' }),
  );
  await fs.writeFile(path.join(output, 'live-tests.tap'), run.stdout + run.stderr);
  assert.equal(
    run.exitCode,
    0,
    'Mandatory live source/installed qualification failed; retained TAP has details',
  );
  for (const [field, count] of [
    ['tests', 12],
    ['pass', 12],
    ['fail', 0],
    ['skipped', 0],
    ['cancelled', 0],
  ])
    assert.match(run.stdout, new RegExp('^# ' + field + ' ' + count + '$', 'm'));
  const receipt = JSON.parse(await fs.readFile(receiptFile, 'utf8'));
  assert.equal(receipt.passed, true);
  assert.equal(receipt.syntheticOnly, false);
  assert.equal(receipt.sourceCommit, sourceCommit);
  assert.equal(receipt.scenarios.length, 12);
  assert.ok(receipt.scenarios.every((s) => s.passed && s.cleanupVerified));
  const result = {
    ...receipt,
    moduleBindings: bindings,
    fromOutsideCheckout: true,
    installedPackage: entry !== path.join(root, 'bin/mterm-cli.js'),
    fullRuntimeImageRedistributionEligible: false,
    tapSha256: createHash('sha256')
      .update(run.stdout + run.stderr)
      .digest('hex'),
  };
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} finally {
  await fs.rm(cwd, { recursive: true, force: true });
}
