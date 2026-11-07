// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-07-aug002-provenance (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL, fileURLToPath } from 'node:url';
const exec = promisify(execFile);
const entry = path.resolve(process.env.MTERM_VERIFY_BIN ?? 'bin/mterm-cli.js');
const repo = fileURLToPath(new URL('../', import.meta.url));
const sha = (data) => createHash('sha256').update(data).digest('hex');
const platform = process.platform + '-' + process.arch;
const json = (x) => JSON.stringify(x, null, 2) + '\n';
async function put(root, name, data) {
  await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
  await fs.writeFile(path.join(root, name), data);
}
async function pin(root, name, hashMode = 'bytes') {
  const bytes = await fs.readFile(path.join(root, name));
  return {
    path: name,
    sha256: sha(hashMode === 'utf8-lf' ? bytes.toString('utf8').replace(/\r\n/g, '\n') : bytes),
    hashMode,
  };
}
async function fixture(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-provenance-')));
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }));
  await put(
    root,
    'LICENSE',
    'MIT License\nCopyright (c) 2026 Synthetic Fixture\nPermission is hereby granted, free of charge.\n',
  );
  await put(root, 'payload.mjs', 'export const answer = 42;\n');
  const payload = await pin(root, 'payload.mjs');
  const manifest = {
    schemaVersion: 1,
    name: 'reference-fixture',
    version: '1.0.0',
    platforms: [platform],
    review: {
      reviewer: 'synthetic test fixture',
      reviewedAt: '2026-11-07T00:00:00Z',
      rationale: 'Fixture-only trusted review record; no actual upstream rights claim.',
    },
    sources: [
      {
        id: 'fixture',
        repository: 'https://github.com/MulattoTech/MTerm-CLI',
        commit: 'a'.repeat(40),
        version: '1.0.0',
        license: 'MIT',
        copyright: 'Copyright (c) 2026 Synthetic Fixture',
        licenseFiles: [await pin(root, 'LICENSE')],
        notices: { status: 'none-at-pin', files: [] },
        transitiveReview: 'reference-only',
      },
    ],
    files: [
      {
        ...payload,
        source: 'fixture',
        upstreamPath: 'payload.mjs',
        upstreamSha256: payload.sha256,
        modification: { kind: 'unmodified' },
      },
    ],
    packages: [],
  };
  const f = { root, manifest };
  await save(f);
  return f;
}
async function save(f) {
  await put(f.root, 'provenance.json', json(f.manifest));
  f.manifestPath = path.join(f.root, 'provenance.json');
  f.manifestSha256 = sha(await fs.readFile(f.manifestPath));
}
async function cli(args, cwd) {
  try {
    return {
      ...(await exec(process.execPath, [entry, ...args], { cwd, timeout: 15000, maxBuffer: 1048576 })),
      code: 0,
    };
  } catch (e) {
    return { code: e.code, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}
function args(f, extra = []) {
  return [
    'provenance',
    'inspect',
    '--root',
    f.root,
    '--manifest',
    f.manifestPath,
    '--sha256',
    f.manifestSha256,
    ...extra,
  ];
}
async function check(f, extra = []) {
  return cli(args(f, extra), os.tmpdir());
}
async function denied(f, code) {
  const result = await check(f);
  assert.notEqual(result.code, 0, result.stdout);
  assert.match(result.stderr, new RegExp(code));
  return result;
}
function parsed(result) {
  assert.equal(result.code, 0, result.stderr);
  return JSON.parse(result.stdout);
}
async function runtimeFixture(t) {
  const f = await fixture(t);
  f.manifest.name = 'runtime-fixture';
  f.manifest.files = [];
  f.manifest.sources[0].transitiveReview = 'complete';
  const locations = [
    '',
    'node_modules/@modelcontextprotocol/server',
    'node_modules/@modelcontextprotocol/core',
    'node_modules/zod',
  ];
  const names = ['mterm-cli', '@modelcontextprotocol/server', '@modelcontextprotocol/core', 'zod'];
  const versions = ['0.0.1-preview.1', '2.3.0', '2.3.0', '4.6.7'];
  const deps = [
    { '@modelcontextprotocol/server': '2.3.0', zod: '4.6.7' },
    { '@modelcontextprotocol/core': '2.3.0', zod: '4.6.7' },
    { zod: '4.6.7' },
    {},
  ];
  const packages = {};
  for (let i = 0; i < locations.length; i++) {
    const location = locations[i],
      name = names[i],
      version = versions[i];
    const packagePath = (location ? location + '/' : '') + 'package.json';
    await put(f.root, packagePath, json({ name, version, license: 'MIT', dependencies: deps[i] }));
    const integrity = i ? 'sha512-' + Buffer.alloc(64, i).toString('base64') : undefined;
    packages[location] = {
      name,
      version,
      dependencies: deps[i],
      ...(integrity
        ? { integrity, resolved: 'https://registry.npmjs.org/example/-/example-' + i + '.tgz' }
        : {}),
    };
    f.manifest.packages.push({
      location,
      name,
      version,
      source: 'fixture',
      packageJson: await pin(f.root, packagePath),
      ...(integrity ? { integrity } : {}),
    });
  }
  await put(f.root, 'package-lock.json', json({ lockfileVersion: 3, packages }));
  f.manifest.lockfile = { file: await pin(f.root, 'package-lock.json'), root: '' };
  f.lock = { lockfileVersion: 3, packages };
  await save(f);
  return f;
}
test('provenance CLI verifies pinned files and generates an explicitly MTerm SPDX document without writes', async (t) => {
  const f = await fixture(t);
  const before = await fs.readFile(f.manifestPath);
  const report = parsed(await check(f));
  assert.equal(report.eligible, true);
  assert.equal(report.readOnly, true);
  assert.equal(report.attribution.files[0].rawSha256, f.manifest.files[0].sha256);
  assert.equal(report.sbom.spdxVersion, 'SPDX-2.3');
  assert.equal(report.sbom.dataLicense, 'CC0-1.0');
  assert.equal(report.sbom.SPDXID, 'SPDXRef-DOCUMENT');
  assert.match(report.sbom.creationInfo.creators[0], /^Tool: MTerm-Provenance-/);
  assert.match(report.sbom.creationInfo.created, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.ok(Number.isFinite(Date.parse(report.sbom.creationInfo.created)));
  assert.equal(new URL(report.sbom.documentNamespace).hash, '');
  assert.equal(report.licenseAuthorityAuthenticated, false);
  assert.equal(report.packAdmissionGranted, false);
  assert.deepEqual(await fs.readFile(f.manifestPath), before);
  assert.deepEqual((await fs.readdir(f.root)).sort(), ['LICENSE', 'payload.mjs', 'provenance.json']);
});
test('manifest and actual payload/license pins are enforced', async (t) => {
  const f = await fixture(t);
  f.manifestSha256 = '0'.repeat(64);
  await denied(f, 'PROVENANCE_PIN');
  await save(f);
  await put(f.root, 'payload.mjs', 'tampered');
  await denied(f, 'PROVENANCE_HASH');
  await put(f.root, 'payload.mjs', 'export const answer = 42;\n');
  await put(f.root, 'LICENSE', 'tampered');
  await denied(f, 'PROVENANCE_HASH');
});
test('license declarations cannot bypass absent evidence, unknown/proprietary rights or copyleft review', async (t) => {
  for (const license of ['UNLICENSED', 'Proprietary', 'LicenseRef-Unknown', 'GPL-3.0-only']) {
    const f = await fixture(t);
    f.manifest.sources[0].license = license;
    await save(f);
    const result = await check(f);
    assert.equal(result.code, 2, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.eligible, false);
    assert.ok(
      report.blockers.some(
        (x) => x.code === (license.startsWith('GPL') ? 'REDISTRIBUTION_REVIEW_REQUIRED' : 'LICENSE_DENIED'),
      ),
    );
  }
  const f = await fixture(t);
  f.manifest.sources[0].licenseFiles = [];
  await save(f);
  await denied(f, 'PROVENANCE_MANIFEST');
  const empty = await fixture(t);
  await put(empty.root, 'LICENSE', '');
  empty.manifest.sources[0].licenseFiles = [await pin(empty.root, 'LICENSE')];
  await save(empty);
  await denied(empty, 'PROVENANCE_LICENSE_EVIDENCE');
});
test('required NOTICE and upstream source identity cannot be omitted', async (t) => {
  const f = await fixture(t);
  f.manifest.sources[0].notices.status = 'retained';
  await save(f);
  await denied(f, 'PROVENANCE_NOTICE');
  await put(f.root, 'NOTICE', 'Synthetic attribution notice\n');
  f.manifest.sources[0].notices.files = [await pin(f.root, 'NOTICE')];
  await save(f);
  parsed(await check(f));
  await put(f.root, 'NOTICE', 'changed');
  await denied(f, 'PROVENANCE_HASH');
  await put(f.root, 'NOTICE', '  \n');
  f.manifest.sources[0].notices.files = [await pin(f.root, 'NOTICE')];
  await save(f);
  await denied(f, 'PROVENANCE_NOTICE');
  f.manifest.sources[0].commit = '';
  await save(f);
  await denied(f, 'PROVENANCE_MANIFEST');
});
test('patch records bind the upstream base, retained diff, rationale and regression evidence', async (t) => {
  const f = await fixture(t);
  await put(f.root, 'base.mjs', 'export const answer = 41;\n');
  await put(f.root, 'change.patch', '-export const answer = 41;\n+export const answer = 42;\n');
  await put(f.root, 'regression.txt', 'A separately recorded test of the fixture change.\n');
  f.manifest.files[0].upstreamSha256 = (await pin(f.root, 'base.mjs')).sha256;
  f.manifest.files[0].modification = {
    kind: 'patched',
    base: await pin(f.root, 'base.mjs'),
    patch: await pin(f.root, 'change.patch'),
    rationale: 'Synthetic test change',
    regressionEvidence: [await pin(f.root, 'regression.txt')],
  };
  await save(f);
  const report = parsed(await check(f));
  assert.equal(report.patchReplayed, false);
  f.manifest.files[0].modification.regressionEvidence = [];
  await save(f);
  await denied(f, 'PROVENANCE_MANIFEST');
});
test('UTF-8 LF snapshot pins stay distinct from raw byte hashes', async (t) => {
  const f = await fixture(t);
  await put(f.root, 'payload.mjs', 'first\r\nsecond\r\n');
  const p = await pin(f.root, 'payload.mjs', 'utf8-lf');
  Object.assign(f.manifest.files[0], p, { upstreamSha256: p.sha256 });
  await save(f);
  const report = parsed(await check(f));
  assert.equal(report.attribution.files[0].verifiedSha256, p.sha256);
  assert.notEqual(report.attribution.files[0].rawSha256, p.sha256);
});
test('actual separately installed dependency closure contains all four packages and five edges', async (t) => {
  const f = await runtimeFixture(t);
  const report = parsed(await check(f));
  assert.equal(report.dependencyClosure.packageCount, 4);
  assert.equal(report.dependencyClosure.edgeCount, 5);
  assert.equal(report.sbom.packages.length, 4);
  assert.equal(report.sbom.relationships.filter((x) => x.relationshipType === 'DEPENDS_ON').length, 5);
  assert.ok(
    report.sbom.packages.every((x) => x.filesAnalyzed === false && !x.hasFiles && !x.packageVerificationCode),
  );
  assert.equal(
    report.sbom.packages.filter((x) => x.checksums?.some((c) => c.algorithm === 'SHA512')).length,
    3,
  );
});
test('missing, duplicate, wrong-version and wrong-integrity package records cannot pass closure', async (t) => {
  for (const mutate of [
    (m) => m.packages.splice(2, 1),
    (m) => m.packages.push(m.packages[1]),
    (m) => {
      m.packages[2].version = '9.9.9';
    },
    (m) => {
      m.packages[2].integrity = 'sha512-' + Buffer.alloc(64, 9).toString('base64');
    },
  ]) {
    const f = await runtimeFixture(t);
    mutate(f.manifest);
    await save(f);
    await denied(f, 'PROVENANCE_CLOSURE');
  }
});

test('decoy package metadata and dependency target names cannot impersonate an installed package', async (t) => {
  const f = await runtimeFixture(t);
  const item = f.manifest.packages[2];
  await put(f.root, 'decoy/package.json', await fs.readFile(path.join(f.root, item.packageJson.path)));
  item.packageJson = await pin(f.root, 'decoy/package.json');
  await save(f);
  await denied(f, 'PROVENANCE_CLOSURE');

  const other = await runtimeFixture(t);
  const target = other.manifest.packages[2];
  const metadata = JSON.parse(await fs.readFile(path.join(other.root, target.packageJson.path), 'utf8'));
  metadata.name = 'wrong-target';
  target.name = metadata.name;
  await put(other.root, target.packageJson.path, json(metadata));
  target.packageJson = await pin(other.root, target.packageJson.path);
  await save(other);
  await denied(other, 'PROVENANCE_CLOSURE');
});
test('a successful producer or same-size SBOM cannot bypass exact identities, integrity and edges', async (t) => {
  const f = await runtimeFixture(t);
  const generated = parsed(await check(f)).sbom;
  const variants = [
    (s) => {
      s.packages = s.packages.slice(0, 2);
    },
    (s) => {
      s.packages[2].versionInfo = '9.9.9';
    },
    (s) => {
      s.packages[2].SPDXID = s.packages[1].SPDXID;
    },
    (s) => {
      s.relationships = s.relationships
        .filter((x) => x.relationshipType !== 'DEPENDS_ON')
        .concat(s.relationships.filter((x) => x.relationshipType === 'DEPENDS_ON').slice(1));
    },
    (s) => {
      s.packages
        .find((x) => x.checksums)
        ?.checksums.forEach((c) => {
          c.checksumValue = '0'.repeat(128);
        });
    },
  ];
  for (const mutate of variants) {
    const sbom = structuredClone(generated);
    mutate(sbom);
    await put(f.root, 'supplied.spdx.json', json(sbom));
    f.manifest.sbom = await pin(f.root, 'supplied.spdx.json');
    await save(f);
    await denied(f, 'PROVENANCE_SBOM');
  }
  await put(f.root, 'supplied.spdx.json', json(generated));
  f.manifest.sbom = await pin(f.root, 'supplied.spdx.json');
  await save(f);
  assert.equal(parsed(await check(f)).suppliedSbomVerified, true);
});
test('the retained real npm11.19 incomplete SBOM is rejected', async (t) => {
  const f = await runtimeFixture(t);
  const original = await fs.readFile(
    path.join(repo, 'tests/fixtures/provenance/npm-11.19-incomplete.spdx.json'),
  );
  await put(f.root, 'npm.spdx.json', original);
  f.manifest.sbom = await pin(f.root, 'npm.spdx.json');
  await save(f);
  await denied(f, 'PROVENANCE_SBOM');
});
test('pending bundled-code review blocks distribution even when npm closure is complete', async (t) => {
  const f = await runtimeFixture(t);
  f.manifest.sources[0].transitiveReview = 'pending';
  await save(f);
  const result = await check(f);
  assert.equal(result.code, 2, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.dependencyClosure.packageCount, 4);
  assert.equal(report.eligible, false);
  assert.ok(report.blockers.some((x) => x.code === 'TRANSITIVE_REVIEW_PENDING'));
});
test('owner root, hardlinks and junctions constrain every evidence read', async (t) => {
  const f = await fixture(t);
  const other = await fixture(t);
  const out = await cli([
    'provenance',
    'inspect',
    '--root',
    other.root,
    '--manifest',
    f.manifestPath,
    '--sha256',
    f.manifestSha256,
  ]);
  assert.notEqual(out.code, 0);
  assert.match(out.stderr, /OUTSIDE_ROOT/);
  await fs.link(path.join(f.root, 'payload.mjs'), path.join(f.root, 'linked.mjs'));
  await denied(f, 'LINK_REJECTED');
  await fs.unlink(path.join(f.root, 'linked.mjs'));
  await fs.symlink(other.root, path.join(f.root, 'alias'), process.platform === 'win32' ? 'junction' : 'dir');
  f.manifest.files[0].path = 'alias/payload.mjs';
  await save(f);
  await denied(f, 'LINK_REJECTED');
});
test('unsupported platforms and bounded document/count limits fail explicitly', async (t) => {
  const f = await fixture(t);
  f.manifest.platforms = ['unsupported-os'];
  await save(f);
  await denied(f, 'PROVENANCE_PLATFORM');
  f.manifest.platforms = [platform];
  f.manifest.files = Array(65).fill(f.manifest.files[0]);
  await save(f);
  await denied(f, 'PROVENANCE_MANIFEST');
  f.manifest.files = [];
  f.manifest.review.rationale = 'x'.repeat(70000);
  await save(f);
  await denied(f, 'PROVENANCE_LIMIT');
});
test('actual pinned seven-file reference snapshot retains upstream attribution without runtime execution', async (t) => {
  const f = await fixture(t);
  const baseline = JSON.parse(await fs.readFile(path.join(repo, 'docs/parity/baseline.json'), 'utf8'));
  f.manifest.name = 'desktop-commander-reference';
  f.manifest.version = baseline.version;
  f.manifest.sources[0].repository = 'https://github.com/' + baseline.repository;
  f.manifest.sources[0].commit = baseline.commit;
  f.manifest.sources[0].version = baseline.version;
  f.manifest.files = [];
  for (const file of baseline.files) {
    const target = 'snapshot/' + file.upstreamPath;
    await put(f.root, target, await fs.readFile(path.join(repo, 'docs/parity', file.path)));
    f.manifest.files.push({
      path: target,
      sha256: file.sha256,
      hashMode: 'utf8-lf',
      source: 'fixture',
      upstreamPath: file.upstreamPath,
      upstreamSha256: file.sha256,
      modification: { kind: 'unmodified' },
    });
  }
  f.manifest.sources[0].licenseFiles = [await pin(f.root, 'snapshot/LICENSE', 'utf8-lf')];
  f.manifest.sources[0].copyright =
    (await fs.readFile(path.join(f.root, 'snapshot/LICENSE'), 'utf8'))
      .split('\n')
      .find((x) => x.startsWith('Copyright')) ?? 'See retained pinned LICENSE.';
  f.manifest.review.rationale =
    'Pinned reference snapshot only; existing canonical baseline; not executed or distributed as a runtime dependency.';
  await save(f);
  const report = parsed(await check(f));
  assert.equal(report.attribution.files.length, 7);
  assert.equal(report.attribution.sources[0].commit, baseline.commit);
  assert.equal(report.modelCalls, 0);
  assert.equal(report.upstreamFetched, false);
});

test('pre-aborted and in-flight verification cancels without modifying evidence', async (t) => {
  const { verifyProvenance } = await import(
    pathToFileURL(path.resolve(path.dirname(entry), '../dist/provenance.js')).href
  );
  const f = await fixture(t);
  const before = await fs.readFile(f.manifestPath);
  const first = new AbortController();
  first.abort();
  await assert.rejects(verifyProvenance({ ...f, signal: first.signal }), { code: 'CANCELLED' });
  const second = new AbortController();
  const pending = verifyProvenance({ ...f, signal: second.signal });
  queueMicrotask(() => second.abort());
  await assert.rejects(pending, { code: 'CANCELLED' });
  const { FileService } = await import(
    pathToFileURL(path.resolve(path.dirname(entry), '../dist/files.js')).href
  );
  const originalRead = FileService.prototype.read,
    observed = [],
    duringEvidence = new AbortController();
  // Observe real reads; do not replace their data. Abort at the first completed evidence read.
  FileService.prototype.read = async function (input) {
    const result = await originalRead.call(this, input);
    observed.push(input.path);
    if (input.path !== f.manifestPath) duringEvidence.abort();
    return result;
  };
  try {
    await assert.rejects(verifyProvenance({ ...f, signal: duringEvidence.signal }), { code: 'CANCELLED' });
  } finally {
    FileService.prototype.read = originalRead;
  }
  assert.deepEqual(observed, [f.manifestPath, 'LICENSE']);
  assert.deepEqual(await fs.readFile(f.manifestPath), before);
  assert.deepEqual((await fs.readdir(f.root)).sort(), ['LICENSE', 'payload.mjs', 'provenance.json']);
});

test('a real I/O deadline and invalid timeout values fail without helper processes', async (t) => {
  const f = await fixture(t);
  f.manifest.files = [];
  for (let i = 0; i < 48; i++) {
    const name = 'evidence-' + i + '.txt';
    await put(f.root, name, 'x'.repeat(65536));
    const p = await pin(f.root, name);
    f.manifest.files.push({
      ...p,
      source: 'fixture',
      upstreamPath: name,
      upstreamSha256: p.sha256,
      modification: { kind: 'unmodified' },
    });
  }
  await save(f);
  const expired = await check(f, ['--timeout-ms', '1']);
  assert.notEqual(expired.code, 0);
  assert.match(expired.stderr, /PROVENANCE_TIMEOUT/);
  for (const value of ['0', '-1', '30001', 'NaN', '1.5']) {
    const result = await check(f, ['--timeout-ms', value]);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /USAGE/);
  }
});
