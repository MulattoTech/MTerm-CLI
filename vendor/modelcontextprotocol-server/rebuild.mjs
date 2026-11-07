// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-07-aug002-provenance (OpenAI / GPT-6 Astra Pro; self-reported)
// Rebuild only in a new absolute directory. Never edits an existing checkout.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const inputs = path.dirname(fileURLToPath(import.meta.url));
const [work, ...extra] = process.argv.slice(2);
assert(work && path.isAbsolute(work) && extra.length === 0, 'Provide one new absolute work directory');
assert.equal(process.version, 'v24.21.0', 'Use the recorded Node build version');
assert.equal(process.platform, 'win32', 'Exact archive reproduction is qualified on Windows');
assert.equal(process.arch, 'x64', 'Use the recorded packaging architecture');
assert(!fs.existsSync(work), 'Refuse to overwrite an existing directory');
fs.mkdirSync(work, { recursive: false });
const source = path.join(work, 'source'),
  toolchain = path.join(work, 'tools');
fs.mkdirSync(toolchain);
const patchBytes = fs.readFileSync(path.join(inputs, 'source.patch'));
const noticeBytes = fs.readFileSync(path.join(inputs, 'NOTICE-MTERM.md'));
const licenseBytes = fs.readFileSync(path.join(inputs, 'LICENSE'));
const recipeBytes = fs.readFileSync(fileURLToPath(import.meta.url));
const patchSnapshot = path.join(work, 'source.patch');
fs.writeFileSync(patchSnapshot, patchBytes);

const hash = (data, algorithm = 'sha256', encoding = 'hex') =>
  createHash(algorithm).update(data).digest(encoding);
const env = {
  ...process.env,
  CI: 'true',
  PATH:
    path.dirname(process.execPath) +
    path.delimiter +
    path.join(toolchain, 'node_modules', '.bin') +
    path.delimiter +
    process.env.PATH,
};
const command = (file, args, cwd, label) => {
  const stdout = execFileSync(file, args, {
    cwd,
    env,
    encoding: 'utf8',
    maxBuffer: 16777216,
    timeout: 300000,
    windowsHide: true,
  });
  fs.writeFileSync(path.join(work, label + '.log'), stdout);
  return stdout;
};
command(
  'git',
  [
    'clone',
    '--config',
    'core.autocrlf=false',
    '--config',
    'core.eol=lf',
    '--depth',
    '1',
    '--branch',
    'v2.3.0',
    'https://github.com/modelcontextprotocol/typescript-sdk.git',
    source,
  ],
  work,
  'clone',
);
const commit = command('git', ['rev-parse', 'HEAD'], source, 'head').trim();
assert.equal(commit, 'a202a3621fcb97918e09fa45d0f9efd2dbdee19b');
command('git', ['apply', '--check', patchSnapshot], source, 'patch-check');
command('git', ['apply', patchSnapshot], source, 'patch');
const license = execFileSync('git', ['show', 'HEAD:LICENSE'], { cwd: source, maxBuffer: 1048576 });
assert.equal(hash(license), '0382b0057770ca05e9c350a50aa3b1c1fea84da0bc81d723bf00b9aa841be58a');
assert.deepEqual(license, licenseBytes);
fs.writeFileSync(path.join(source, 'packages/server/LICENSE'), license);
fs.writeFileSync(path.join(source, 'packages/server/NOTICE-MTERM.md'), noticeBytes);
const npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
assert(fs.existsSync(npm), 'Recorded Node distribution must include npm');
assert.equal(
  JSON.parse(fs.readFileSync(path.join(path.dirname(npm), '../package.json'), 'utf8')).version,
  '11.19.0',
);
command(
  process.execPath,
  [
    npm,
    'install',
    '--prefix',
    toolchain,
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--save-exact',
    'pnpm@10.26.1',
  ],
  work,
  'pnpm-install',
);
const pnpmPin = JSON.parse(fs.readFileSync(path.join(toolchain, 'package-lock.json'), 'utf8')).packages[
  'node_modules/pnpm'
];
assert.equal(pnpmPin.version, '10.26.1');
assert.equal(pnpmPin.resolved, 'https://registry.npmjs.org/pnpm/-/pnpm-10.26.1.tgz');
assert.equal(
  pnpmPin.integrity,
  'sha512-ZkB0q8Nn0skyT9wYA3CXzgqPEmA0Fg9wmSjp6fldmHFDRwROXDFk1lvV2mxZxr42KxB1Rikqjuy3mZGW5c5Y+g==',
);
const pnpm = path.join(toolchain, 'node_modules/pnpm/bin/pnpm.cjs');
assert.equal(command(process.execPath, [pnpm, '--version'], source, 'pnpm-version').trim(), '10.26.1');
command(
  process.execPath,
  [pnpm, 'install', '--filter', '@modelcontextprotocol/server...', '--ignore-scripts', '--frozen-lockfile'],
  source,
  'frozen-install',
);
command(
  process.execPath,
  [pnpm, '--filter', '@modelcontextprotocol/core', 'run', 'build'],
  source,
  'core-build',
);
const archive = path.join(work, 'server-2.3.0-mterm.1.tgz');
const intermediate = path.join(work, 'pnpm-server.tgz');
command(
  process.execPath,
  [pnpm, '--dir', 'packages/server', 'pack', '--out', intermediate],
  source,
  'server-pack',
);
const entries = command('tar', ['-tf', intermediate], work, 'tar-entries').trim().split(/\r?\n/);
assert(entries.every((p) => /^package\/[A-Za-z0-9_@./-]+$/.test(p) && !p.split('/').includes('..')));
assert.equal(new Set(entries).size, entries.length);
const verbose = command('tar', ['-tvf', intermediate], work, 'tar-entry-types');
assert(!verbose.split(/\r?\n/).some((line) => line && !line.startsWith('-')), 'Expected only regular files');
const staging = path.join(work, 'repack');
fs.mkdirSync(staging);
command('tar', ['-xf', intermediate, '-C', staging], work, 'extract');
const packageFile = path.join(staging, 'package/package.json');
const metadata = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
const exportConditions = JSON.stringify(metadata.exports);
for (const field of ['dependencies', 'devDependencies']) {
  if (metadata[field])
    metadata[field] = Object.fromEntries(
      Object.entries(metadata[field]).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    );
}
assert.equal(JSON.stringify(metadata.exports), exportConditions, 'Never reorder export conditions');
fs.writeFileSync(packageFile, JSON.stringify(metadata, null, 2) + '\n');
const packed = JSON.parse(
  command(
    process.execPath,
    [npm, 'pack', '--ignore-scripts', '--json', '--pack-destination', work],
    path.join(staging, 'package'),
    'canonical-pack',
  ),
);
assert.equal(packed.length, 1);
assert.equal(packed[0].name, '@modelcontextprotocol/server');
assert.equal(packed[0].version, '2.3.0-mterm.1');
fs.renameSync(path.join(work, packed[0].filename), archive);
command('git', ['diff', '--check'], source, 'diff-check');
const bytes = fs.readFileSync(archive);
const receipt = {
  schemaVersion: 1,
  utc: new Date().toISOString(),
  sourceCommit: commit,
  sourcePatchSha256: hash(patchBytes),
  noticeSha256: hash(noticeBytes),
  licenseSha256: hash(license),
  node: process.version,
  npm: JSON.parse(
    fs.readFileSync(path.join(path.dirname(process.execPath), 'node_modules/npm/package.json'), 'utf8'),
  ).version,
  pnpm: '10.26.1',
  pnpmIntegrity: pnpmPin.integrity,
  rebuildScriptSha256: hash(recipeBytes),
  platform: process.platform,
  arch: process.arch,
  checkoutAutoCrlf: false,
  checkoutEol: 'lf',
  frozenLockfile: true,
  installLifecycleScripts: false,
  finalPackaging: 'pnpm pack; sort only dependency dictionary keys; npm 11.19.0 pack --ignore-scripts',
  exportConditionOrderPreserved: true,
  buildScripts: ['@modelcontextprotocol/core build', '@modelcontextprotocol/server prepack/build'],
  archive: {
    file: path.basename(archive),
    bytes: bytes.length,
    sha256: hash(bytes),
    integrity: 'sha512-' + hash(bytes, 'sha512', 'base64'),
  },
  modelCalls: 0,
};
fs.writeFileSync(path.join(work, 'result.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
