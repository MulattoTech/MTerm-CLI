// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-07-aug013-evidence-matrix
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mod = await import('../scripts/expansion-matrix.mjs').catch(() => ({}));
const sources = JSON.parse(await fs.readFile(path.join(repo, 'docs/expansion/sources.json'), 'utf8'));
const queue = JSON.parse(await fs.readFile(path.join(repo, 'docs/expansion/queue.json'), 'utf8'));
const platforms = ['win32-x64', 'linux-x64', 'darwin-arm64', 'darwin-x64'];
const scenarios = ['success', 'permission_denied', 'cancelled', 'deadline', 'unsupported_platform'];
const normalizedHash = (value) => createHash('sha256').update(value.replace(/\r\n/g, '\n')).digest('hex');
const subject = {
  testedCommit: 'a'.repeat(40),
  subjectFingerprint: 'b'.repeat(64),
  backend: { name: 'isolated-test-fixture', version: '1.0.0' },
  runtime: { name: 'node', version: process.version },
};
const encode = (value) => JSON.stringify(value, null, 2) + '\n';
function ready() {
  assert.equal(typeof mod.inspectMatrix, 'function', 'Executable expansion matrix must exist');
}
async function write(root, name, text) {
  const target = path.join(root, name);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, text);
  return { path: name, sha256: normalizedHash(text) };
}
async function fixture(t) {
  ready();
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-matrix-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const data = {
    sources: structuredClone(sources),
    queue: structuredClone(queue),
    evidence: { schemaVersion: 1, hashMode: 'sha256-utf8-lf', capabilities: {} },
  };
  const save = async () => {
    for (const name of ['sources', 'queue', 'evidence'])
      await write(root, 'docs/expansion/' + name + '.json', encode(data[name]));
  };
  await save();
  return { root, data, save };
}
async function observation(f, platform = 'win32-x64', scenario = 'success') {
  const fixturePin = await write(f.root, 'tests/matrix-fixture.mjs', 'export const fixture = true;\n');
  const receipt = {
    schemaVersion: 1,
    kind: 'mterm-expansion-execution',
    capability: 'AUG-013',
    platform,
    subject,
    observedAt: '2026-11-07T00:00:00.000Z',
    command: 'node --test tests/matrix-fixture.mjs',
    exitCode: 0,
    cases: {
      [scenario]: { status: 'passed', fixtureId: 'matrix-fixture', fixtureSha256: fixturePin.sha256 },
    },
    limitations: ['Synthetic validator fixture; not a product acceptance receipt.'],
  };
  const receiptPin = await write(f.root, 'docs/validation/matrix-fixture.json', encode(receipt));
  f.data.evidence.capabilities['AUG-013'] = {
    scope: 'Synthetic fixture for validating evidence bindings.',
    limitations: ['No product acceptance is asserted.'],
    fixtures: [{ id: 'matrix-fixture', ...fixturePin }],
    references: [],
    platforms: {
      [platform]: {
        support: 'supported',
        subject,
        cases: { [scenario]: { status: 'passed', fixtureId: 'matrix-fixture', receipt: receiptPin } },
      },
    },
    acceptanceReview: null,
  };
  await f.save();
  return { receipt, receiptPin, fixturePin };
}
const code = (expected) => (error) =>
  error?.code === expected && !String(error.message).includes(os.homedir());

test('actual expansion identities and reciprocal graph remain complete without acceptance credit', async (t) => {
  const f = await fixture(t);
  const before = await fs.readFile(path.join(f.root, 'docs/expansion/queue.json'));
  const result = await mod.inspectMatrix(f.root);
  assert.deepEqual(result.summary, {
    sources: 152,
    accountedSources: 152,
    capabilities: 117,
    mappings: 397,
    recordedAccepted: 0,
    caseCounts: { not_run: 2340, passed: 0, failed: 0 },
  });
  assert.equal(result.capabilities.length, 117);
  assert.equal(result.sources.length, 152);
  assert.ok(result.sources.some((item) => item.sourceSha === null && item.version === null));
  for (const item of result.capabilities) {
    assert.deepEqual(Object.keys(item.platforms), platforms);
    for (const cell of Object.values(item.platforms)) {
      assert.equal(cell.support, 'unknown');
      assert.deepEqual(Object.keys(cell.cases), scenarios);
      assert.ok(Object.values(cell.cases).every((value) => value.status === 'not_run'));
    }
    assert.equal(item.accepted, false);
  }
  assert.ok(!Object.hasOwn(result.summary, 'percent'));
  assert.deepEqual(await fs.readFile(path.join(f.root, 'docs/expansion/queue.json')), before);
});

test('duplicate, missing, dangling and one-sided mappings fail closed', async (t) => {
  const variants = [
    (f) => {
      f.data.sources.sources.pop();
    },
    (f) => {
      f.data.sources.sources[1].repository = f.data.sources.sources[0].repository.toUpperCase();
    },
    (f) => {
      f.data.queue.issues[1].id = f.data.queue.issues[0].id;
    },
    (f) => {
      f.data.sources.sources[0].issues.push(9999);
    },
    (f) => {
      f.data.sources.sources[0].issues.push(f.data.sources.sources[0].issues[0]);
    },
    (f) => {
      f.data.sources.sources[0].issues.pop();
    },
    (f) => {
      f.data.queue.issues[0].sourceRepositories.push('unknown/source');
    },
  ];
  for (const mutate of variants) {
    const f = await fixture(t);
    mutate(f);
    await f.save();
    await assert.rejects(mod.inspectMatrix(f.root), code('INVALID_LEDGER'));
  }
});

test('all original source and issue identities are frozen independently of row counts', async (t) => {
  const f = await fixture(t);
  const old = f.data.sources.sources[0].repository;
  f.data.sources.sources[0].repository = 'different/repository';
  f.data.sources.sources[0].url = 'https://github.com/different/repository';
  for (const item of f.data.queue.issues)
    item.sourceRepositories = item.sourceRepositories.map((name) =>
      name === old ? 'different/repository' : name,
    );
  await f.save();
  await assert.rejects(mod.inspectMatrix(f.root), code('INVALID_LEDGER'));
});

test('reference-only sources cannot acquire imported paths or a copied-code state', async (t) => {
  const f = await fixture(t);
  const item = f.data.sources.sources.find(
    (entry) => entry.repository === 'desktop-commander/remote-desktop-commander',
  );
  item.localImportedPaths = ['vendor/proprietary'];
  item.reuseStatus = 'retained-security-rebuild';
  await f.save();
  await assert.rejects(mod.inspectMatrix(f.root), code('RIGHTS_RESTRICTION'));
});

test('a justified unmapped source retains its denominator and a pinned disposition review', async (t) => {
  const f = await fixture(t);
  const item = f.data.sources.sources[0];
  for (const row of f.data.queue.issues)
    row.sourceRepositories = row.sourceRepositories.filter((name) => name !== item.repository);
  item.issues = [];
  const review = {
    schemaVersion: 1,
    kind: 'mterm-source-disposition',
    repository: item.repository,
    disposition: 'not_applicable',
    duplicateOf: null,
    reason: 'Synthetic fixture: no applicable product behavior.',
    reviewer: 'test-reviewer',
    reviewedAt: '2026-11-07T00:00:00.000Z',
  };
  item.disposition = {
    kind: 'not_applicable',
    duplicateOf: null,
    reason: review.reason,
    review: await write(f.root, 'docs/validation/disposition.json', encode(review)),
  };
  await f.save();
  const result = await mod.inspectMatrix(f.root);
  assert.equal(result.summary.sources, 152);
  assert.equal(result.summary.accountedSources, 152);
  assert.equal(result.summary.recordedAccepted, 0);
  item.disposition.reason = '';
  await f.save();
  await assert.rejects(mod.inspectMatrix(f.root), code('INVALID_LEDGER'));
});

test('duplicate dispositions reject missing targets and cycles', async (t) => {
  const f = await fixture(t);
  const pair = f.data.sources.sources.slice(0, 2);
  for (const item of pair) {
    for (const row of f.data.queue.issues)
      row.sourceRepositories = row.sourceRepositories.filter((name) => name !== item.repository);
    item.issues = [];
    item.disposition = {
      kind: 'duplicate',
      duplicateOf: pair[1 - pair.indexOf(item)].repository,
      reason: 'Synthetic cycle must fail',
      review: { path: 'docs/validation/absent.json', sha256: 'f'.repeat(64) },
    };
  }
  await f.save();
  await assert.rejects(mod.inspectMatrix(f.root), code('INVALID_LEDGER'));
  pair[0].disposition.duplicateOf = 'missing/target';
  await f.save();
  await assert.rejects(mod.inspectMatrix(f.root), code('INVALID_LEDGER'));
});

test('recorded success is pinned to its exact platform, fixture, subject and execution receipt', async (t) => {
  const f = await fixture(t);
  await observation(f);
  const result = await mod.inspectMatrix(f.root);
  assert.equal(result.summary.caseCounts.passed, 1);
  assert.equal(result.summary.recordedAccepted, 0);
  const row = result.capabilities.find((entry) => entry.id === 'AUG-013');
  assert.equal(row.platforms['win32-x64'].cases.success.status, 'passed');
  assert.equal(row.platforms['linux-x64'].cases.success.status, 'not_run');
  assert.equal(row.platforms['win32-x64'].subject.testedCommit, subject.testedCommit);
  const cell = f.data.evidence.capabilities['AUG-013'].platforms['win32-x64'];
  f.data.evidence.capabilities['AUG-013'].platforms['linux-x64'] = cell;
  await f.save();
  await assert.rejects(mod.inspectMatrix(f.root), code('INVALID_EVIDENCE'));
});

test('fixture tamper, receipt tamper and documentation masquerading as execution fail', async (t) => {
  for (const variant of ['fixture', 'receipt', 'markdown', 'subject']) {
    const f = await fixture(t);
    await observation(f);
    if (variant === 'fixture')
      await fs.appendFile(path.join(f.root, 'tests/matrix-fixture.mjs'), '// changed');
    if (variant === 'receipt')
      await fs.appendFile(path.join(f.root, 'docs/validation/matrix-fixture.json'), ' ');
    if (variant === 'markdown') {
      const pin = await write(f.root, 'docs/validation/claim.md', '# All tests passed\n');
      f.data.evidence.capabilities['AUG-013'].platforms['win32-x64'].cases.success.receipt = pin;
    }
    if (variant === 'subject')
      f.data.evidence.capabilities['AUG-013'].platforms['win32-x64'].subject = {
        ...subject,
        testedCommit: 'c'.repeat(40),
      };
    await f.save();
    await assert.rejects(mod.inspectMatrix(f.root), code('INVALID_EVIDENCE'));
  }
});

test('a refreshed fixture pin cannot reuse an old execution receipt', async (t) => {
  const f = await fixture(t);
  await observation(f);
  const pin = await write(f.root, 'tests/matrix-fixture.mjs', 'export const fixture = false;\n');
  f.data.evidence.capabilities['AUG-013'].fixtures[0] = { id: 'matrix-fixture', ...pin };
  await f.save();
  await assert.rejects(mod.inspectMatrix(f.root), code('INVALID_EVIDENCE'));
});

test('acceptance requires current subject, full declared scenario coverage and a distinct pinned review', async (t) => {
  const f = await fixture(t);
  const { receipt, fixturePin } = await observation(f);
  const entry = f.data.evidence.capabilities['AUG-013'];
  const issue = f.data.queue.issues.find((item) => item.id === 'AUG-013');
  issue.platformScope = platforms;
  for (const platform of platforms) {
    const cases = Object.fromEntries(
      scenarios.map((scenario) => [
        scenario,
        { status: 'passed', fixtureId: 'matrix-fixture', fixtureSha256: fixturePin.sha256 },
      ]),
    );
    const pin = await write(
      f.root,
      'docs/validation/receipt-' + platform + '.json',
      encode({ ...receipt, platform, cases }),
    );
    entry.platforms[platform] = {
      support: 'supported',
      subject,
      cases: Object.fromEntries(
        scenarios.map((scenario) => [
          scenario,
          { status: 'passed', fixtureId: 'matrix-fixture', receipt: pin },
        ]),
      ),
    };
  }
  await f.save();
  const draft = await mod.inspectMatrix(f.root, { subjectFingerprint: subject.subjectFingerprint });
  const scopeDigest = draft.capabilities.find((item) => item.id === 'AUG-013').scopeDigest;
  const evidenceDigest = draft.capabilities.find((item) => item.id === 'AUG-013').evidenceDigest;
  const review = {
    executorTask: 'fixture/executor',
    reviewerTask: 'fixture/independent-reviewer',
    testedCommit: subject.testedCommit,
    subjectFingerprint: subject.subjectFingerprint,
    scopeDigest,
    evidenceDigest,
    acceptedAt: '2026-11-07T00:00:00.000Z',
    allCriteriaSatisfied: true,
  };
  const pin = await write(
    f.root,
    'docs/validation/review.json',
    encode({
      schemaVersion: 1,
      kind: 'mterm-expansion-review',
      capability: 'AUG-013',
      verdict: 'accepted',
      ...review,
    }),
  );
  entry.acceptanceReview = { ...review, report: pin };
  issue.accepted = true;
  f.data.queue.counts.accepted = 1;
  await f.save();
  const result = await mod.inspectMatrix(f.root, { subjectFingerprint: subject.subjectFingerprint });
  assert.equal(result.summary.recordedAccepted, 1);
  assert.equal(result.facts.reviewerIdentityAuthenticated, false);
  await assert.rejects(
    mod.inspectMatrix(f.root, { subjectFingerprint: 'c'.repeat(64) }),
    code('INVALID_ACCEPTANCE'),
  );
  entry.acceptanceReview.reviewerTask = entry.acceptanceReview.executorTask;
  await f.save();
  await assert.rejects(
    mod.inspectMatrix(f.root, { subjectFingerprint: subject.subjectFingerprint }),
    code('INVALID_ACCEPTANCE'),
  );
  entry.acceptanceReview.reviewerTask = review.reviewerTask;
  const priorCase = entry.platforms['linux-x64'].cases.cancelled;
  entry.platforms['linux-x64'].cases.cancelled = { status: 'not_run', fixtureId: null, receipt: null };
  await f.save();
  await assert.rejects(
    mod.inspectMatrix(f.root, { subjectFingerprint: subject.subjectFingerprint }),
    code('INVALID_ACCEPTANCE'),
  );
  entry.platforms['linux-x64'].cases.cancelled = priorCase;
  for (const [field, value] of [
    ['bodySha256', 'd'.repeat(64)],
    ['testPlan', 'Different mandatory acceptance scope'],
    ['declaredCliDependencies', ['CLI-222', 'CLI-231', 'CLI-033']],
    ['declaredIssueDependencies', [53]],
  ]) {
    const original = issue[field];
    issue[field] = value;
    await f.save();
    await assert.rejects(
      mod.inspectMatrix(f.root, { subjectFingerprint: subject.subjectFingerprint }),
      code('INVALID_ACCEPTANCE'),
    );
    issue[field] = original;
  }
  await f.save();
  assert.equal(
    (await mod.inspectMatrix(f.root, { subjectFingerprint: subject.subjectFingerprint })).summary
      .recordedAccepted,
    1,
  );
  const updatedSubject = { ...subject, backend: { name: subject.backend.name, version: '2.0.0' } };
  const updatedReceipt = {
    ...receipt,
    platform: 'linux-x64',
    subject: updatedSubject,
    observedAt: '2026-11-07T00:01:00.000Z',
    command: 'node --test replaced-command.mjs',
    cases: Object.fromEntries(
      scenarios.map((scenario) => [
        scenario,
        { status: 'passed', fixtureId: 'matrix-fixture', fixtureSha256: fixturePin.sha256 },
      ]),
    ),
  };
  const replacementPin = await write(
    f.root,
    'docs/validation/receipt-linux-x64.json',
    encode(updatedReceipt),
  );
  entry.platforms['linux-x64'].subject = updatedSubject;
  for (const scenario of scenarios) entry.platforms['linux-x64'].cases[scenario].receipt = replacementPin;
  await f.save();
  await assert.rejects(
    mod.inspectMatrix(f.root, { subjectFingerprint: subject.subjectFingerprint }),
    code('INVALID_ACCEPTANCE'),
  );
});

test('unknown values and forged acceptance cannot silently become PASS', async (t) => {
  const variants = [
    (f) => {
      f.data.evidence.capabilities['AUG-999'] = {};
    },
    (f) => {
      f.data.evidence.capabilities['AUG-013'].platforms['plan9-x64'] = {};
    },
    (f) => {
      f.data.evidence.capabilities['AUG-013'].platforms['win32-x64'].support = 'pass';
    },
    (f) => {
      f.data.evidence.capabilities['AUG-013'].platforms['win32-x64'].cases.success.status = 'skipped';
    },
    (f) => {
      f.data.queue.issues.find((x) => x.id === 'AUG-013').accepted = true;
      f.data.queue.counts.accepted = 1;
    },
  ];
  for (const mutate of variants) {
    const f = await fixture(t);
    await observation(f);
    mutate(f);
    await f.save();
    await assert.rejects(mod.inspectMatrix(f.root));
  }
});

test('unsupported support is visible and cannot borrow another platforms observations', async (t) => {
  const f = await fixture(t);
  f.data.evidence.capabilities['AUG-013'] = {
    scope: 'Synthetic support distinction',
    limitations: ['Not a product support statement'],
    fixtures: [],
    references: [],
    acceptanceReview: null,
    platforms: {
      'darwin-x64': {
        support: 'unsupported',
        reason: 'Fixture backend has no Darwin build',
        subject: null,
        cases: {},
      },
    },
  };
  await f.save();
  const result = await mod.inspectMatrix(f.root);
  const row = result.capabilities.find((x) => x.id === 'AUG-013');
  assert.equal(row.platforms['darwin-x64'].support, 'unsupported');
  assert.equal(row.platforms['darwin-arm64'].support, 'unknown');
  assert.equal(result.summary.caseCounts.passed, 0);
});

test('outside-root evidence and ambiguous paths are denied without exposing outside bytes', async (t) => {
  const f = await fixture(t);
  await observation(f);
  const external = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-matrix-outside-'));
  t.after(() => fs.rm(external, { recursive: true, force: true }));
  const outsideFile = path.join(external, 'sentinel.mjs');
  await fs.writeFile(outsideFile, 'PRIVATE_MATRIX_SENTINEL');
  for (const unsafe of [
    outsideFile,
    '../sentinel.mjs',
    'tests/../sentinel.mjs',
    'tests\\sentinel.mjs',
    'tests/file:stream',
  ]) {
    f.data.evidence.capabilities['AUG-013'].fixtures[0].path = unsafe;
    await f.save();
    await assert.rejects(
      mod.inspectMatrix(f.root),
      (error) => error.code === 'PERMISSION_DENIED' && !error.message.includes('PRIVATE_MATRIX_SENTINEL'),
    );
  }
  assert.equal(await fs.readFile(outsideFile, 'utf8'), 'PRIVATE_MATRIX_SENTINEL');
});

test('real directory links and hard-linked evidence are refused', async (t) => {
  const f = await fixture(t);
  await observation(f);
  const target = path.join(f.root, 'tests');
  await fs.symlink(target, path.join(f.root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  f.data.evidence.capabilities['AUG-013'].fixtures[0].path = 'linked/matrix-fixture.mjs';
  await f.save();
  await assert.rejects(mod.inspectMatrix(f.root), code('PERMISSION_DENIED'));
  await fs.link(path.join(target, 'matrix-fixture.mjs'), path.join(target, 'alias.mjs'));
  f.data.evidence.capabilities['AUG-013'].fixtures[0].path = 'tests/alias.mjs';
  await f.save();
  await assert.rejects(mod.inspectMatrix(f.root), code('PERMISSION_DENIED'));
});

test('pre-abort and cancellation after a real read stop further reads', async (t) => {
  const f = await fixture(t);
  const early = new AbortController();
  early.abort();
  let reads = 0;
  await assert.rejects(
    mod.inspectMatrix(f.root, { signal: early.signal, onRead: () => reads++ }),
    code('CANCELLED'),
  );
  assert.equal(reads, 0);
  const active = new AbortController();
  await assert.rejects(
    mod.inspectMatrix(f.root, {
      signal: active.signal,
      onRead: () => {
        reads++;
        active.abort();
      },
    }),
    code('CANCELLED'),
  );
  assert.equal(reads, 1);
});

test('deadline expires around actual file I/O without fabricating a scenario result', async (t) => {
  const f = await fixture(t);
  let now = 0;
  let reads = 0;
  await assert.rejects(
    mod.inspectMatrix(f.root, {
      timeoutMs: 5,
      now: () => now,
      onRead: () => {
        reads++;
        now = 6;
      },
    }),
    code('DEADLINE'),
  );
  assert.equal(reads, 1);
});

test('unsupported host is rejected before reading and malformed limits are rejected', async (t) => {
  const f = await fixture(t);
  let reads = 0;
  await assert.rejects(
    mod.inspectMatrix(f.root, { platform: 'freebsd-x64', onRead: () => reads++ }),
    code('UNSUPPORTED_PLATFORM'),
  );
  assert.equal(reads, 0);
  for (const timeoutMs of [0, 30001, NaN, Infinity, 1.5])
    await assert.rejects(mod.inspectMatrix(f.root, { timeoutMs }), code('INVALID_ARGUMENT'));
});

test('malformed, oversized and non-UTF8 input is bounded and rejected', async (t) => {
  const f = await fixture(t);
  const filename = path.join(f.root, 'docs/expansion/evidence.json');
  for (const bytes of [
    Buffer.from('{'),
    Buffer.from([0xff, 0xfe, 0x00]),
    Buffer.alloc(2 * 1024 * 1024 + 1, 32),
  ]) {
    await fs.writeFile(filename, bytes);
    await assert.rejects(mod.inspectMatrix(f.root));
  }
});

test('LF-normalized pins survive CRLF checkouts but not content changes', async (t) => {
  const f = await fixture(t);
  await observation(f);
  for (const filename of ['tests/matrix-fixture.mjs', 'docs/validation/matrix-fixture.json']) {
    const absolute = path.join(f.root, filename);
    const bytes = await fs.readFile(absolute, 'utf8');
    await fs.writeFile(absolute, bytes.replace(/\n/g, '\r\n'));
  }
  assert.equal((await mod.inspectMatrix(f.root)).summary.caseCounts.passed, 1);
});

test('actual script runs from outside the checkout with one bounded JSON result and no mutation', async (t) => {
  const f = await fixture(t);
  const script = path.join(repo, 'scripts/expansion-matrix.mjs');
  const before = await Promise.all(
    ['sources', 'queue', 'evidence'].map((name) =>
      fs.readFile(path.join(f.root, 'docs/expansion/' + name + '.json')),
    ),
  );
  for (const operation of ['--check', '--report']) {
    const child = spawnSync(process.execPath, [script, operation, '--root', f.root], {
      cwd: os.tmpdir(),
      encoding: 'utf8',
      timeout: 30000,
      maxBuffer: 2 * 1024 * 1024,
    });
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stderr, '');
    const result = JSON.parse(child.stdout);
    assert.equal(result.ok, true);
    assert.equal(result.summary.recordedAccepted, 0);
    assert.ok(Buffer.byteLength(child.stdout) <= 2 * 1024 * 1024);
  }
  const after = await Promise.all(
    ['sources', 'queue', 'evidence'].map((name) =>
      fs.readFile(path.join(f.root, 'docs/expansion/' + name + '.json')),
    ),
  );
  assert.deepEqual(after, before);
  const bad = spawnSync(process.execPath, [script, '--check', '--root', f.root, '--timeout-ms', '0'], {
    encoding: 'utf8',
  });
  assert.equal(bad.status, 1);
  assert.equal(JSON.parse(bad.stdout).error.code, 'INVALID_ARGUMENT');
});

test('actual CLI source-review hashing rejects linked, nonregular and oversized source before reading it', async (t) => {
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-matrix-source-outside-'));
  t.after(() => fs.rm(outside, { recursive: true, force: true }));
  await fs.writeFile(path.join(outside, 'private.mjs'), 'PRIVATE_SOURCE_SENTINEL');
  const script = path.join(repo, 'scripts/expansion-matrix.mjs');
  for (const variant of ['linked-root', 'hardlink', 'directory-single', 'oversized']) {
    const f = await fixture(t);
    await write(f.root, 'docs/roadmap/review.json', encode({ sourceFingerprint: 'b'.repeat(64) }));
    if (variant === 'linked-root')
      await fs.symlink(
        outside,
        path.join(f.root, 'scripts'),
        process.platform === 'win32' ? 'junction' : 'dir',
      );
    if (variant === 'hardlink')
      await fs.link(path.join(outside, 'private.mjs'), path.join(f.root, 'package.json'));
    if (variant === 'directory-single') await fs.mkdir(path.join(f.root, 'package.json'));
    if (variant === 'oversized') {
      await fs.mkdir(path.join(f.root, 'scripts'));
      const file = await fs.open(path.join(f.root, 'scripts/oversized.mjs'), 'w');
      try {
        await file.truncate(8 * 1024 * 1024 + 1);
      } finally {
        await file.close();
      }
    }
    const child = spawnSync(
      process.execPath,
      [script, '--check', '--root', f.root, '--timeout-ms', '30000'],
      { encoding: 'utf8', timeout: 35000 },
    );
    assert.equal(child.status, 1);
    const result = JSON.parse(child.stdout);
    assert.equal(
      result.error.code,
      variant === 'oversized' ? 'LIMIT_EXCEEDED' : 'PERMISSION_DENIED',
      variant + ': ' + child.stdout,
    );
    assert.ok(!child.stdout.includes('PRIVATE_SOURCE_SENTINEL'));
  }
  assert.equal(await fs.readFile(path.join(outside, 'private.mjs'), 'utf8'), 'PRIVATE_SOURCE_SENTINEL');
});
