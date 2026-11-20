// SPDX-License-Identifier: MIT
// Supplemental scoped package evidence; this does not replace the full hosted package gate.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { withPackageWorkspace, inspectPackageLocations } from '../../../scripts/package-workspace.mjs';
import { resolveNpmEntry } from '../../../scripts/npm-runtime.mjs';

const exec = promisify(execFile);
const root = await fs.realpath(new URL('../../../', import.meta.url));
const npm = await resolveNpmEntry();
const sha = (value) => createHash('sha256').update(value).digest('hex');
const sourceFiles = [
  'bin/mterm-cli.js', 'dist/mcp.js', 'dist/files.js', 'dist/desktop-commander-files.js',
  'dist/errors.js', 'dist/policy.js', 'dist/compat-config.js', 'dist/config.js', 'dist/processes.js',
];
const fixtures = [
  'tests/compat-read-cancellation.test.mjs',
  'tests/compat-read-cancellation-mcp.test.mjs',
  'tests/compat-read-cancellation-fixture.mjs',
];
const report = await withPackageWorkspace(root, async ({ output, evidence, prefix, home, env }) => {
  const startedAt = new Date().toISOString();
  const before = Object.fromEntries(await Promise.all([...sourceFiles, ...fixtures].map(async (file) =>
    [file, sha(await fs.readFile(path.join(root, file)))])));
  const run = (args, cwd = home) => exec(process.execPath, args, {
    cwd, env, timeout: 120000, maxBuffer: 1048576, windowsHide: true,
  });
  // The repository's ordinary reviewed build ran first. Preserve full-check limitations separately.
  // This is the same scoped pack/install mechanism used inside scripts/verify-package.mjs.
  const pack = JSON.parse((await run([npm, 'pack', '--ignore-scripts', '--json', '--pack-destination', output], root)).stdout)[0];
  const tarball = path.join(output, pack.filename);
  const installedRoot = path.join(prefix, 'node_modules', 'mterm-cli');
  await run([npm, 'install', tarball, '--prefix', prefix, '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund']);
  const installed = path.join(installedRoot, 'bin', 'mterm-cli.js');
  const locations = await inspectPackageLocations(root, { prefix, installed, home, cache: env.npm_config_cache });
  assert.equal(locations.outsideCheckout, true);
  for (const file of sourceFiles) assert.equal(sha(await fs.readFile(path.join(installedRoot, file))), before[file]);
  const selected = ['--test', '--test-reporter=tap', '--test-concurrency=1', ...fixtures.slice(0, 2).map((file) => path.join(root, file))];
  const result = await exec(process.execPath, selected, {
    cwd: home, env: { ...env, MTERM_VERIFY_BIN: installed }, timeout: 90000,
    maxBuffer: 1048576, windowsHide: true,
  }).then(
    (value) => ({ ...value, exitCode: 0 }),
    (error) => ({ stdout: error.stdout ?? '', stderr: error.stderr ?? '', exitCode: error.code ?? 'UNKNOWN' }),
  );
  const log = result.stdout + result.stderr;
  await fs.writeFile(path.join(output, 'installed-focus.tap'), log);
  const counts = Object.fromEntries([...result.stdout.matchAll(/^# (tests|pass|fail|skipped|cancelled|todo) (\d+)$/gm)].map((match) => [match[1], Number(match[2])]));
  const after = Object.fromEntries(await Promise.all([...sourceFiles, ...fixtures].map(async (file) =>
    [file, sha(await fs.readFile(path.join(root, file)))])));
  const receipt = {
    schemaVersion: 1, startedAt, finishedAt: new Date().toISOString(), node: process.version,
    selectedEntry: installed, command: [process.execPath, ...selected], cwd: home,
    counts, exitCode: result.exitCode, locations, before, after,
    tarball: { bytes: (await fs.stat(tarball)).size, sha256: sha(await fs.readFile(tarball)) },
    logSha256: sha(log), stderrBytes: Buffer.byteLength(result.stderr),
    fullPackageGate: false, modelCalls: 0, evidence,
  };
  await fs.writeFile(path.join(output, 'installed-focus-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  assert.equal(result.exitCode, 0);
  assert.deepEqual(counts, { tests: 27, pass: 27, fail: 0, cancelled: 0, skipped: 0, todo: 0 });
  assert.deepEqual(after, before);
  for (const file of sourceFiles) assert.equal(sha(await fs.readFile(path.join(installedRoot, file))), before[file]);
  return receipt;
});
console.log(JSON.stringify(report, null, 2));
