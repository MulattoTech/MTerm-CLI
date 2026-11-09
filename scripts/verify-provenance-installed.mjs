// SPDX-License-Identifier: MIT
// Modified: 2026-11-09-package-isolation; measure actual canonical installed/runtime locations.
// AI-Change: 2026-11-07-aug002-provenance (OpenAI / GPT-6 Astra Pro; self-reported)
// Qualification helper: test-owned manifests and actual installed CLI, no model requests.
import fs from 'node:fs/promises';
import { inspectPackageLocations } from './package-workspace.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
const exec = promisify(execFile);
const repo = fileURLToPath(new URL('../', import.meta.url));
const [entryInput, prefixInput, outputInput, sourceCommit] = process.argv.slice(2);
assert.match(sourceCommit ?? '', /^[a-f0-9]{40}$/);
const entry = await fs.realpath(entryInput),
  prefix = await fs.realpath(prefixInput),
  output = await fs.realpath(outputInput);
const executionLocations = await inspectPackageLocations(repo, {
  entry,
  prefix,
  output,
  configuredCwd: output,
});
assert.equal(executionLocations.outsideCheckout, true, 'Installed provenance must run outside the checkout');
const platform = process.platform + '-' + process.arch;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const pin = async (root, name, hashMode = 'bytes') => {
  const bytes = await fs.readFile(path.join(root, name));
  return {
    path: name,
    sha256: hash(hashMode === 'utf8-lf' ? bytes.toString('utf8').replace(/\r\n/g, '\n') : bytes),
    hashMode,
  };
};
const moduleBindings = [];
for (const name of ['cli.js', 'provenance.js', 'files.js', 'policy.js', 'errors.js']) {
  const installed = await fs.readFile(path.resolve(path.dirname(entry), '../dist', name));
  assert.deepEqual(installed, await fs.readFile(path.join(repo, 'dist', name)));
  moduleBindings.push({ path: 'dist/' + name, sha256: hash(installed) });
}
const acceptance = await exec(
  process.execPath,
  [
    '--test',
    '--test-reporter=tap',
    '--test-concurrency=1',
    path.join(repo, 'tests/provenance.test.mjs'),
    path.join(repo, 'tests/bundled-runtime.test.mjs'),
  ],
  {
    cwd: output,
    env: { ...process.env, MTERM_VERIFY_BIN: entry },
    timeout: 90000,
    maxBuffer: 2097152,
    windowsHide: true,
  },
);
await fs.writeFile(path.join(output, 'provenance-tests.tap'), acceptance.stdout);
const testCount = Number(acceptance.stdout.match(/^# tests (\d+)$/m)?.[1]);
assert.ok(testCount >= 18);
for (const field of ['fail', 'skipped', 'cancelled'])
  assert.match(acceptance.stdout, new RegExp('^# ' + field + ' 0$', 'm'));

function semanticSpdx(doc) {
  assert.equal(doc.spdxVersion, 'SPDX-2.3');
  assert.equal(doc.dataLicense, 'CC0-1.0');
  assert.equal(doc.SPDXID, 'SPDXRef-DOCUMENT');
  const namespace = new URL(doc.documentNamespace);
  assert.equal(namespace.protocol, 'https:');
  assert.equal(namespace.hash, '');
  assert.match(doc.creationInfo.created, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.ok(Number.isFinite(Date.parse(doc.creationInfo.created)));
  assert.deepEqual(doc.creationInfo.creators, ['Tool: MTerm-Provenance-1']);
  const ids = new Set(['SPDXRef-DOCUMENT']);
  for (const item of doc.packages) {
    assert.match(item.SPDXID, /^SPDXRef-[A-Za-z0-9.-]+$/);
    assert.ok(!ids.has(item.SPDXID));
    ids.add(item.SPDXID);
    assert.equal(item.filesAnalyzed, false);
    assert.equal(item.hasFiles, undefined);
    assert.equal(item.packageVerificationCode, undefined);
    for (const checksum of item.checksums ?? []) {
      assert.equal(checksum.algorithm, 'SHA512');
      assert.match(checksum.checksumValue, /^[0-9a-f]{128}$/);
    }
  }
  for (const id of doc.documentDescribes) assert.ok(ids.has(id));
  for (const edge of doc.relationships) {
    assert.ok(ids.has(edge.spdxElementId));
    assert.ok(ids.has(edge.relatedSpdxElement));
  }
}
async function runManifest(root, filename, manifest, expectedExit) {
  const manifestPath = path.join(root, filename);
  await fs.writeFile(manifestPath, json(manifest));
  const manifestSha256 = hash(await fs.readFile(manifestPath));
  let result;
  try {
    result = {
      ...(await exec(
        process.execPath,
        [
          entry,
          'provenance',
          'inspect',
          '--root',
          root,
          '--manifest',
          manifestPath,
          '--sha256',
          manifestSha256,
        ],
        {
          cwd: output,
          timeout: 15000,
          maxBuffer: 1048576,
          windowsHide: true,
        },
      )),
      code: 0,
    };
  } catch (error) {
    if (typeof error.code !== 'number') throw error;
    result = error;
  }
  assert.equal(result.code, expectedExit, result.stderr);
  assert.equal(result.stderr, '');
  const report = JSON.parse(result.stdout);
  semanticSpdx(report.sbom);
  await fs.writeFile(path.join(output, filename.replace('.json', '.report.json')), json(report));
  await fs.writeFile(path.join(output, filename.replace('.json', '.spdx.json')), json(report.sbom));
  return report;
}
const review = {
  reviewer: 'OpenAI / GPT-6 Astra Pro; self-reported retained source review',
  reviewedAt: '2026-11-07T00:00:00Z',
  rationale:
    'Qualification binds retained source/license pins and installed metadata. Pending SDK bundled-code rights stay blocked; this is not a legal attestation or runtime integrity attestation.',
};
const baseline = JSON.parse(await fs.readFile(path.join(repo, 'docs/parity/baseline.json'), 'utf8'));
const referenceRoot = await fs.mkdtemp(path.join(output, 'reference-'));
const reference = {
  schemaVersion: 1,
  name: 'desktop-commander-reference',
  version: baseline.version,
  platforms: [platform],
  review,
  sources: [
    {
      id: 'desktop-commander',
      repository: 'https://github.com/' + baseline.repository,
      commit: baseline.commit,
      version: baseline.version,
      license: 'MIT',
      copyright: 'See retained upstream LICENSE.',
      licenseFiles: [],
      notices: { status: 'none-at-pin', files: [] },
      transitiveReview: 'reference-only',
    },
  ],
  files: [],
  packages: [],
};
for (const file of baseline.files) {
  const name = 'snapshot/' + file.upstreamPath;
  await fs.mkdir(path.dirname(path.join(referenceRoot, name)), { recursive: true });
  await fs.copyFile(path.join(repo, 'docs/parity', file.path), path.join(referenceRoot, name));
  reference.files.push({
    path: name,
    sha256: file.sha256,
    hashMode: 'utf8-lf',
    source: 'desktop-commander',
    upstreamPath: file.upstreamPath,
    upstreamSha256: file.sha256,
    modification: { kind: 'unmodified' },
  });
}
reference.sources[0].licenseFiles = [await pin(referenceRoot, 'snapshot/LICENSE', 'utf8-lf')];
const referenceReport = await runManifest(referenceRoot, 'reference-provenance.json', reference, 0);
assert.equal(referenceReport.attribution.files.length, 7);
assert.equal(referenceReport.eligible, true);

const versions = JSON.parse(await fs.readFile(path.join(repo, 'versions.json'), 'utf8'));
const lock = JSON.parse(await fs.readFile(path.join(prefix, 'package-lock.json'), 'utf8'));
const rootLocation = 'node_modules/mterm-cli';
const bundledReview = JSON.parse(
  await fs.readFile(path.join(repo, 'docs/provenance/sdk-bundled-review.json'), 'utf8'),
);
const thirdParty = (await fs.readFile(path.join(prefix, rootLocation, 'THIRD_PARTY.md'), 'utf8')).replace(
  /\r\n/g,
  '\n',
);
assert.deepEqual(
  thirdParty,
  (await fs.readFile(path.join(repo, 'THIRD_PARTY.md'), 'utf8')).replace(/\r\n/g, '\n'),
);
assert.equal(bundledReview.components.length, 9);
for (const component of bundledReview.components) {
  const begin = '<!-- MTERM-LICENSE ' + component.marker + ' BEGIN -->\n```text\n';
  const end = '```\n<!-- MTERM-LICENSE ' + component.marker + ' END -->';
  const start = thirdParty.indexOf(begin),
    finish = thirdParty.indexOf(end, start + begin.length);
  assert.ok(
    start >= 0 && finish > start && thirdParty.indexOf(begin, start + begin.length) === -1,
    'Missing/duplicate retained license section',
  );
  assert.equal(
    hash(thirdParty.slice(start + begin.length, finish)),
    component.retainedLicenseSha256,
    'Retained bundled license text changed',
  );
}
for (const pin of bundledReview.serverArtifactPins) {
  const bytes = await fs.readFile(path.join(prefix, 'node_modules/@modelcontextprotocol/server', pin.path));
  assert.equal(
    hash(bytes),
    pin.sha256,
    'Installed SDK artifact differs from the reviewed bundled source evidence',
  );
}
const production = {
  schemaVersion: 1,
  name: 'mterm-installed-runtime',
  version: versions.productVersion,
  platforms: [platform],
  review,
  sources: [],
  files: [],
  packages: [],
  lockfile: { file: await pin(prefix, 'package-lock.json'), root: rootLocation },
};
const sourceMap = new Map();
for (const [location, locked] of Object.entries(lock.packages)) {
  if (!location) continue;
  const metadata = JSON.parse(await fs.readFile(path.join(prefix, location, 'package.json'), 'utf8'));
  const own = metadata.name === 'mterm-cli';
  const reviewed = versions.packages.find((p) => p.name === metadata.name && p.runtime);
  if (!own) {
    assert.ok(reviewed);
    assert.equal(metadata.version, reviewed.version);
    assert.equal(locked.integrity, reviewed.integrity);
  }
  const sdk = metadata.name.startsWith('@modelcontextprotocol/');
  const id = own ? 'mterm' : sdk ? 'mcp-sdk' : 'zod';
  const license = await pin(prefix, location + '/LICENSE', own ? 'utf8-lf' : 'bytes');
  if (own) assert.equal(license.sha256, (await pin(repo, 'LICENSE', 'utf8-lf')).sha256);
  else assert.equal(license.sha256, reviewed.sourceLicenseSha256);
  if (!sourceMap.has(id))
    sourceMap.set(id, {
      id,
      repository: own
        ? 'https://github.com/MulattoTech/MTerm-CLI'
        : sdk
          ? 'https://github.com/modelcontextprotocol/typescript-sdk'
          : 'https://github.com/colinhacks/zod',
      commit: own ? sourceCommit : reviewed.sourceCommit,
      version: sdk ? '2.3.0 with MTerm server 2.3.0-mterm.1 rebuild' : metadata.version,
      license: sdk ? 'Apache-2.0 AND MIT' : 'MIT',
      copyright: 'See retained pinned LICENSE file(s).',
      licenseFiles: [],
      notices: { status: 'none-at-pin', files: [] },
      transitiveReview: sdk ? 'pending' : 'complete',
    });
  sourceMap.get(id).licenseFiles.push(license);
  production.packages.push({
    location,
    name: metadata.name,
    version: metadata.version,
    source: id,
    packageJson: await pin(prefix, location + '/package.json'),
    ...(locked.integrity ? { integrity: locked.integrity } : {}),
  });
}
production.sources = [...sourceMap.values()];
sourceMap.get('mcp-sdk').notices = {
  status: 'retained',
  files: [
    await pin(prefix, rootLocation + '/THIRD_PARTY.md', 'utf8-lf'),
    await pin(prefix, 'node_modules/@modelcontextprotocol/server/NOTICE-MTERM.md'),
  ],
};
const runtimeReport = await runManifest(prefix, 'runtime-provenance.json', production, 2);
assert.equal(runtimeReport.eligible, false);
assert.deepEqual(
  runtimeReport.blockers.map((x) => [x.code, x.source]),
  [['TRANSITIVE_REVIEW_PENDING', 'mcp-sdk']],
);
assert.equal(runtimeReport.dependencyClosure.packageCount, 4);
assert.equal(runtimeReport.dependencyClosure.edgeCount, 5);
assert.deepEqual(runtimeReport.dependencyClosure.packages.map((p) => p.name).sort(), [
  '@modelcontextprotocol/core',
  '@modelcontextprotocol/server',
  'mterm-cli',
  'zod',
]);
console.log(
  json({
    ok: true,
    tests: testCount,
    failed: 0,
    skipped: 0,
    cancelled: 0,
    moduleBindings,
    fromOutsideCheckout: executionLocations.outsideCheckout,
    executionLocations,
    referenceFilesVerified: 7,
    productionPackages: 4,
    productionEdges: 5,
    productionRedistributionEligible: false,
    retainedBundledNotices: 9,
    reviewedSdkArtifactPins: bundledReview.serverArtifactPins.length,
    sdkArtifactCommit: '8e6f2336d995b5c1cb5ff044071ed186cce03567',
    embeddedFastUri: '3.1.9',
    blockedSources: runtimeReport.blockers,
    spdxSemanticChecks: true,
    fullSpdxSchemaValidatedHere: false,
    modelCalls: 0,
    referenceReport: path.join(output, 'reference-provenance.report.json'),
    runtimeReport: path.join(output, 'runtime-provenance.report.json'),
  }),
);
