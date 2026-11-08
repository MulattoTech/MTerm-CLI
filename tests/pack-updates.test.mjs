// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-08-aug011-update-check (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const exec = promisify(execFile);
const entry = path.resolve(process.env.MTERM_VERIFY_BIN ?? 'bin/mterm-cli.js');
const moduleUrl = (name) => pathToFileURL(path.resolve(path.dirname(entry), '../dist', name)).href;
const sha = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const platform = process.platform + '-' + process.arch;
const object = { type: 'object', properties: {}, required: [], additionalProperties: false };
const worker = "import fs from 'node:fs';fs.writeFileSync('EXECUTED', 'unsafe');\n";
async function put(root, name, text) {
  await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
  await fs.writeFile(path.join(root, name), text);
}
async function pin(root, name, hashMode = 'bytes') {
  const bytes = await fs.readFile(path.join(root, name));
  return {
    path: name,
    sha256: sha(hashMode === 'bytes' ? bytes : bytes.toString('utf8').replace(/\r\n/g, '\n')),
    hashMode,
  };
}
async function savePack(f, which = 'candidate') {
  const pack = f[which];
  await put(f.root, which + '/pack.json', json(pack));
  f[which + 'Path'] = path.join(f.root, which, 'pack.json');
  f[which + 'Sha256'] = sha(await fs.readFile(f[which + 'Path']));
}
async function saveReview(f) {
  await put(f.root, 'review.json', json(f.review));
  f.provenancePath = path.join(f.root, 'review.json');
  f.provenanceSha256 = sha(await fs.readFile(f.provenancePath));
}
async function register(f, which = 'current') {
  f.registration = {
    id: f[which].id,
    version: f[which].version,
    manifestPath: f[which + 'Path'],
    manifestSha256: f[which + 'Sha256'],
  };
  await put(f.root, 'registry.json', json({ schemaVersion: 1, packs: [f.registration] }));
}
async function fixture(t, options = {}) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-update-')));
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }));
  const manifest = {
    manifestVersion: 1,
    abiVersion: 1,
    id: 'fixture',
    version: '2.0.0',
    source: { url: 'https://github.com/MulattoTech/MTerm-CLI', commit: 'a'.repeat(40), license: 'MIT' },
    runtime: { kind: 'node-stdio-once', nodeMajor: 24, entry: 'worker.mjs' },
    platforms: ['win32-x64', 'linux-x64', 'darwin-arm64', 'darwin-x64'],
    dependencies: [],
    permissions: ['execute-unsandboxed'],
    files: [
      { path: 'worker.mjs', sha256: sha(worker) },
      { path: 'helper.mjs', sha256: sha('export const added = true;\n') },
    ],
    tools: [
      {
        name: 'echo',
        description: 'Synthetic no-execution fixture.',
        inputSchema: object,
        outputSchema: object,
        timeoutMs: 1000,
      },
    ],
  };
  const f = {
    root,
    candidate: manifest,
    current: structuredClone(manifest),
    registry: path.join(root, 'registry.json'),
  };
  f.current.version = '1.0.0';
  f.current.files = [
    { path: 'worker.mjs', sha256: sha(worker + '// old\n') },
    { path: 'removed.mjs', sha256: sha('export const removed = true;\n') },
  ];
  await put(root, 'candidate/worker.mjs', worker);
  await put(root, 'candidate/helper.mjs', 'export const added = true;\n');
  await put(root, 'current/worker.mjs', worker + '// old\n');
  await put(root, 'current/removed.mjs', 'export const removed = true;\n');
  await put(
    root,
    'evidence/LICENSE',
    'MIT License\nCopyright (c) 2026 Synthetic fixture\nPermission is hereby granted, free of charge.\n',
  );
  await put(root, 'evidence/NOTICE', 'Synthetic fixture attribution notice.\n');
  await put(root, 'isolated-home/codex/auth.json', '{"synthetic":"unchanged"}\n');
  await put(root, 'isolated-home/codex/config.toml', '# synthetic unchanged configuration\n');
  await savePack(f);
  await savePack(f, 'current');
  f.review = {
    schemaVersion: 1,
    name: manifest.id,
    version: manifest.version,
    platforms: [platform],
    review: {
      reviewer: 'synthetic fixture',
      reviewedAt: '2026-11-08T00:00:00Z',
      rationale: 'Test evidence only; no claim of actual upstream rights.',
    },
    sources: [
      {
        id: 'fixture',
        repository: manifest.source.url,
        commit: manifest.source.commit,
        version: manifest.version,
        license: 'MIT',
        copyright: 'Copyright (c) 2026 Synthetic fixture',
        licenseFiles: [await pin(root, 'evidence/LICENSE')],
        notices: { status: 'retained', files: [await pin(root, 'evidence/NOTICE')] },
        transitiveReview: 'complete',
      },
    ],
    files: [],
    packages: [],
  };
  for (const item of manifest.files) {
    const p = await pin(root, 'candidate/' + item.path);
    f.review.files.push({
      ...p,
      source: 'fixture',
      upstreamPath: item.path,
      upstreamSha256: p.sha256,
      modification: { kind: 'unmodified' },
    });
  }
  await saveReview(f);
  if (options.register !== false) await register(f);
  return f;
}
const options = (f, extra = {}) => ({
  root: f.root,
  registry: f.registry,
  manifestPath: f.candidatePath,
  manifestSha256: f.candidateSha256,
  provenancePath: f.provenancePath,
  provenanceSha256: f.provenanceSha256,
  ...extra,
});
async function check(f, extra = {}) {
  const { checkPackUpdate } = await import(moduleUrl('pack-updates.js'));
  return checkPackUpdate(options(f, extra));
}
const args = (f) => [
  'packs',
  'update',
  '--check',
  '--root',
  f.root,
  '--manifest',
  f.candidatePath,
  '--sha256',
  f.candidateSha256,
  '--registry',
  f.registry,
  '--provenance',
  f.provenancePath,
  '--provenance-sha256',
  f.provenanceSha256,
];
async function cli(f, argv = args(f)) {
  try {
    return {
      ...(await exec(process.execPath, [entry, ...argv], {
        cwd: os.tmpdir(),
        timeout: 15000,
        maxBuffer: 1048576,
        env: {
          ...process.env,
          CODEX_HOME: path.join(f.root, 'isolated-home/codex'),
          MTERM_CONFIG_PATH: path.join(f.root, 'isolated-home/mterm.json'),
        },
      })),
      code: 0,
    };
  } catch (e) {
    return { code: e.code, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}
async function inventory(root) {
  const result = {};
  async function walk(relative) {
    for (const name of (await fs.readdir(path.join(root, relative))).sort()) {
      const file = relative ? relative + '/' + name : name;
      const info = await fs.lstat(path.join(root, file));
      result[file] = info.isDirectory()
        ? 'directory'
        : info.isSymbolicLink()
          ? 'link'
          : sha(await fs.readFile(path.join(root, file)));
      if (info.isDirectory()) await walk(file);
    }
  }
  await walk('');
  return result;
}
const hasBlocker = (report, code) => {
  assert.equal(report.eligible, false);
  assert.equal(report.outcome, 'blocked');
  assert.ok(
    report.blockers.some((b) => b.code === code),
    JSON.stringify(report.blockers),
  );
};

test('update CLI reports exact changes, rights and conditional rollback without writing or executing', async (t) => {
  const f = await fixture(t),
    before = await inventory(f.root);
  const result = await cli(f);
  assert.equal(result.code, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.readOnly, true);
  assert.equal(report.eligible, true);
  assert.equal(report.outcome, 'differences');
  assert.equal(report.operation, 'replace');
  assert.equal(report.current.registration.manifestSha256, f.currentSha256);
  assert.equal(report.candidate.manifestSha256, f.candidateSha256);
  assert.equal(
    report.candidate.payloadBytes,
    Buffer.byteLength(worker) + Buffer.byteLength('export const added = true;\n'),
  );
  assert.deepEqual(
    report.differences.files.map((x) => [x.path, x.change]),
    [
      ['helper.mjs', 'added'],
      ['removed.mjs', 'removed'],
      ['worker.mjs', 'changed'],
    ],
  );
  assert.deepEqual(report.candidate.permissions, ['execute-unsandboxed']);
  assert.equal(report.integrity.signatureAuthenticated, false);
  assert.equal(report.rights.coveredPayloadFiles, 2);
  assert.equal(report.rights.contributingSources[0].transitiveReview, 'complete');
  assert.equal(report.rights.contributingSources[0].notices.files.length, 1);
  assert.equal(report.rollback.previousPayloadVerified, true);
  assert.deepEqual(report.rollback.previousRegistration, f.registration);
  assert.equal(report.rollback.backupCreated, false);
  assert.equal(report.rollback.executed, false);
  assert.equal(report.executionGranted, false);
  assert.equal(report.modelCalls, 0);
  assert.deepEqual(await inventory(f.root), before);
});

test('missing registry is an explicit add plan and stays absent', async (t) => {
  const f = await fixture(t, { register: false }),
    before = await inventory(f.root);
  const r = await check(f);
  assert.equal(r.registry.version, 'missing');
  assert.equal(r.current, null);
  assert.equal(r.operation, 'add');
  assert.equal(r.rollback.previousRegistration, null);
  assert.equal(r.rollback.previousPayloadVerified, false);
  assert.deepEqual(await inventory(f.root), before);
});

test('exact current candidate is no-change and digest ignores generated SPDX UUID/time', async (t) => {
  const f = await fixture(t);
  await register(f, 'candidate');
  const a = await check(f),
    b = await check(f);
  assert.equal(a.outcome, 'no-change');
  assert.equal(a.operation, 'none');
  assert.equal(a.planSha256, b.planSha256);
  assert.match(a.planSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(a.differences.files, []);
});

test('same version with a different pin remains a visible replacement', async (t) => {
  const f = await fixture(t);
  f.current.version = f.candidate.version;
  await savePack(f, 'current');
  await register(f);
  const r = await check(f);
  assert.equal(r.operation, 'replace');
  assert.equal(r.differences.sameVersionDifferentPin, true);
  assert.notEqual(r.current.manifestSha256, r.candidate.manifestSha256);
});

test('captured UTF-8 payload preserves BOM, CRLF and Unicode with immutable text snapshots', async (t) => {
  const f = await fixture(t);
  const body = '\ufeff// café \u{1f310}\r\n' + worker.replace(/\n/g, '\r\n');
  await put(f.root, 'candidate/worker.mjs', body);
  f.candidate.files[0].sha256 = sha(body);
  await savePack(f);
  const p = await pin(f.root, 'candidate/worker.mjs', 'utf8-lf');
  f.review.files[0] = { ...f.review.files[0], ...p, upstreamSha256: p.sha256 };
  await saveReview(f);
  const { capturePack } = await import(moduleUrl('tool-packs.js'));
  const snapshot = await capturePack({ manifestPath: f.candidatePath, manifestSha256: f.candidateSha256 });
  assert.equal(snapshot.payload[0].text, body);
  assert.equal(snapshot.payload[0].bytes, Buffer.byteLength(body));
  assert.equal(snapshot.payload[0].sha256, sha(body));
  assert.ok(Object.isFrozen(snapshot.payload));
  assert.ok(Object.isFrozen(snapshot.payload[0]));
  assert.throws(() => {
    snapshot.payload[0].text = 'changed';
  }, TypeError);
  const r = await check(f);
  const row = r.candidate.files.find((x) => x.path === 'worker.mjs');
  assert.equal(row.sha256, sha(body));
  assert.equal(row.bytes, Buffer.byteLength(body));
  assert.notEqual(p.sha256, row.sha256);
  assert.ok(!JSON.stringify(r).includes(worker));
  row.sha256 = 'changed';
  assert.equal(snapshot.payload[0].sha256, sha(body));
});

for (const [name, mutate, code] of [
  [
    'candidate pin',
    async (f) => {
      f.candidateSha256 = '0'.repeat(64);
    },
    'PACK_PIN',
  ],
  [
    'review pin',
    async (f) => {
      f.provenanceSha256 = '0'.repeat(64);
    },
    'PROVENANCE_PIN',
  ],
  ['payload bytes', async (f) => put(f.root, 'candidate/worker.mjs', 'changed'), 'PACK_INTEGRITY'],
  ['license bytes', async (f) => put(f.root, 'evidence/LICENSE', 'changed'), 'PROVENANCE_HASH'],
  ['notice bytes', async (f) => put(f.root, 'evidence/NOTICE', 'changed'), 'PROVENANCE_HASH'],
])
  test('update rejects changed ' + name, async (t) => {
    const f = await fixture(t);
    await mutate(f);
    const before = await inventory(f.root);
    await assert.rejects(check(f), { code });
    assert.deepEqual(await inventory(f.root), before);
  });

for (const kind of ['empty', 'partial', 'decoy'])
  test('review coverage rejects ' + kind + ' payload attribution', async (t) => {
    const f = await fixture(t);
    if (kind === 'empty') f.review.files = [];
    else if (kind === 'partial') f.review.files.pop();
    else {
      await put(f.root, 'decoy/worker.mjs', worker);
      f.review.files[0].path = 'decoy/worker.mjs';
    }
    await saveReview(f);
    hasBlocker(await check(f), 'PACK_REVIEW_COVERAGE');
  });

for (const field of ['name', 'version', 'repository', 'commit', 'license'])
  test('review binds candidate identity field ' + field, async (t) => {
    const f = await fixture(t);
    if (field === 'name') f.review.name = 'different';
    else if (field === 'version') f.review.version = '3.0.0';
    else if (field === 'repository') f.review.sources[0].repository += '-other';
    else if (field === 'commit') f.review.sources[0].commit = 'b'.repeat(40);
    else f.review.sources[0].license = 'BSD-3-Clause';
    await saveReview(f);
    hasBlocker(await check(f), 'PACK_REVIEW_IDENTITY');
  });

for (const review of ['reference-only', 'pending'])
  test('candidate contribution needs complete bundled review: ' + review, async (t) => {
    const f = await fixture(t);
    f.review.sources[0].transitiveReview = review;
    await saveReview(f);
    hasBlocker(await check(f), 'PACK_REVIEW_INCOMPLETE');
  });

test('additional contributing sources must be complete and attribution cannot use an unrelated primary', async (t) => {
  const f = await fixture(t);
  f.review.sources.push({
    ...structuredClone(f.review.sources[0]),
    id: 'secondary',
    repository: 'https://github.com/example/secondary',
    transitiveReview: 'reference-only',
  });
  f.review.files[1].source = 'secondary';
  await saveReview(f);
  hasBlocker(await check(f), 'PACK_REVIEW_INCOMPLETE');
  f.review.sources[1].transitiveReview = 'complete';
  for (const file of f.review.files) file.source = 'secondary';
  await saveReview(f);
  hasBlocker(await check(f), 'PACK_REVIEW_IDENTITY');
});

test('missing required notice and duplicate alias attribution fail closed', async (t) => {
  const f = await fixture(t);
  f.review.sources[0].notices.files = [];
  await saveReview(f);
  await assert.rejects(check(f), { code: 'PROVENANCE_NOTICE' });
  const other = await fixture(t);
  other.review.files.push({ ...other.review.files[0], path: 'CANDIDATE/WORKER.MJS' });
  await saveReview(other);
  await assert.rejects(check(other), { code: 'PROVENANCE_MANIFEST' });
});

test('root ceiling rejects existing outside-root candidate, registry and provenance paths', async (t) => {
  const f = await fixture(t),
    outside = await fixture(t);
  for (const extra of [
    { manifestPath: outside.candidatePath, manifestSha256: outside.candidateSha256 },
    { registry: outside.registry },
    { provenancePath: outside.provenancePath, provenanceSha256: outside.provenanceSha256 },
  ])
    await assert.rejects(check(f, extra), { code: 'OUTSIDE_ROOT' });
});

test('outside or tampered old payload blocks the plan and cannot be called a rollback backup', async (t) => {
  const f = await fixture(t),
    outside = await fixture(t);
  await put(f.root, 'registry.json', json({ schemaVersion: 1, packs: [outside.registration] }));
  let r = await check(f);
  hasBlocker(r, 'PACK_CURRENT_UNVERIFIED');
  assert.equal(r.current.error.code, 'OUTSIDE_ROOT');
  assert.equal(r.rollback.previousPayloadVerified, false);
  await register(f);
  await put(f.root, 'current/worker.mjs', 'tampered');
  r = await check(f);
  hasBlocker(r, 'PACK_CURRENT_UNVERIFIED');
  assert.equal(r.current.error.code, 'PACK_INTEGRITY');
});

test('root policy rejects nested directory links and multiply-linked payloads', async (t) => {
  const f = await fixture(t),
    outside = await fixture(t);
  await fs.symlink(
    path.dirname(outside.candidatePath),
    path.join(f.root, 'linked'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  await assert.rejects(check(f, { manifestPath: path.join(f.root, 'linked/pack.json') }), {
    code: 'LINK_REJECTED',
  });
  await fs.unlink(path.join(f.root, 'candidate/worker.mjs'));
  await fs.link(path.join(outside.root, 'candidate/worker.mjs'), path.join(f.root, 'candidate/worker.mjs'));
  await assert.rejects(check(f), { code: 'LINK_REJECTED' });
});

for (const [name, mutate, code] of [
  [
    'traversal',
    (f) => {
      f.candidate.files[0].path = '../worker.mjs';
    },
    'PACK_MANIFEST',
  ],
  [
    'ABI',
    (f) => {
      f.candidate.abiVersion = 2;
    },
    'PACK_ABI',
  ],
  [
    'runtime',
    (f) => {
      f.candidate.runtime.nodeMajor = 25;
    },
    'PACK_RUNTIME',
  ],
  [
    'platform',
    (f) => {
      f.candidate.platforms = ['unsupported'];
    },
    'PACK_PLATFORM',
  ],
  [
    'permission',
    (f) => {
      f.candidate.permissions = ['write'];
    },
    'PACK_PERMISSION',
  ],
  [
    'external dependency',
    (f) => {
      f.candidate.dependencies = [{ name: 'unreviewed', version: '1.0.0', license: 'MIT' }];
    },
    'PACK_DEPENDENCY',
  ],
  [
    'missing entry',
    (f) => {
      f.candidate.runtime.entry = 'missing.mjs';
    },
    'PACK_MANIFEST',
  ],
])
  test('unsupported ' + name + ' remains explicit and nonmutating', async (t) => {
    const f = await fixture(t);
    mutate(f);
    await savePack(f);
    const before = await inventory(f.root);
    await assert.rejects(check(f), { code });
    assert.deepEqual(await inventory(f.root), before);
  });

test('oversized and malformed documents are refused before a plan is returned', async (t) => {
  const f = await fixture(t);
  for (const [value, code] of [
    ['x'.repeat(65537), 'FILE_TOO_LARGE'],
    ['{invalid', 'PACK_MANIFEST'],
  ]) {
    await fs.writeFile(f.candidatePath, value);
    f.candidateSha256 = sha(value);
    await assert.rejects(check(f), { code });
  }
});

test('ambiguous and private selected paths are denied', async (t) => {
  const f = await fixture(t);
  await assert.rejects(check(f, { manifestPath: path.join(f.root, '.codex/pack.json') }), {
    code: 'PRIVATE_PATH',
  });
  await assert.rejects(check(f, { registry: path.join(f.root, 'CON.json') }), { code: 'INVALID_PATH' });
});

for (const initiallyMissing of [false, true])
  test(
    'registry raw-version race is refused after actual evidence I/O: missing=' + initiallyMissing,
    async (t) => {
      const f = await fixture(t, { register: !initiallyMissing });
      const { FileService } = await import(moduleUrl('files.js'));
      const original = FileService.prototype.read;
      let observed = false;
      t.mock.method(FileService.prototype, 'read', async function (input) {
        const actual = await original.call(this, input);
        if (!observed && path.resolve(this.policy.root, input.path) === f.provenancePath) {
          observed = true;
          if (initiallyMissing) await register(f);
          else await fs.appendFile(f.registry, ' ');
        }
        return actual;
      });
      await assert.rejects(check(f), { code: 'PACK_UPDATE_STALE' });
      assert.equal(observed, true);
      const retained = await fs.readFile(f.registry, 'utf8');
      assert.equal(initiallyMissing || retained.endsWith(' '), true);
    },
  );

test('pre-cancel and cancellation after a real payload read leave all state unchanged', async (t) => {
  const f = await fixture(t),
    before = await inventory(f.root);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(check(f, { signal: controller.signal }), { code: 'CANCELLED' });
  const during = new AbortController();
  const { FileService } = await import(moduleUrl('files.js'));
  const original = FileService.prototype.read;
  let observed = false;
  t.mock.method(FileService.prototype, 'read', async function (input) {
    const actual = await original.call(this, input);
    if (path.resolve(this.policy.root, input.path) === path.join(f.root, 'candidate/worker.mjs')) {
      observed = true;
      during.abort();
    }
    return actual;
  });
  await assert.rejects(check(f, { signal: during.signal }), { code: 'CANCELLED' });
  assert.equal(observed, true);
  assert.deepEqual(await inventory(f.root), before);
});

test('whole-check deadline includes observed evidence I/O and refuses a late report', async (t) => {
  const f = await fixture(t);
  const { FileService } = await import(moduleUrl('files.js'));
  const original = FileService.prototype.read;
  let observed = false;
  t.mock.method(FileService.prototype, 'read', async function (input) {
    const actual = await original.call(this, input);
    if (path.resolve(this.policy.root, input.path) === f.provenancePath) {
      observed = true;
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    return actual;
  });
  await assert.rejects(check(f, { timeoutMs: 500 }), { code: 'PACK_UPDATE_TIMEOUT' });
  assert.equal(observed, true);
});

test('permission read failure remains explicit and does not create a lock or state', async (t) => {
  const f = await fixture(t),
    before = await inventory(f.root);
  const { FileService } = await import(moduleUrl('files.js'));
  const original = FileService.prototype.read;
  t.mock.method(FileService.prototype, 'read', async function (input) {
    if (path.resolve(this.policy.root, input.path) === f.candidatePath)
      throw Object.assign(new Error('synthetic filesystem access denial'), { code: 'EACCES' });
    return original.call(this, input);
  });
  await assert.rejects(check(f), { code: 'EACCES' });
  assert.deepEqual(await inventory(f.root), before);
});

test('CLI rejects apply, repeated/unknown flags and missing check before attempting any file work', async (t) => {
  const f = await fixture(t);
  f.root = path.join(f.root, 'does-not-exist');
  for (const argv of [
    [...args(f), '--apply'],
    [...args(f), '--check'],
    [...args(f), '--network'],
    args(f).filter((x) => x !== '--check'),
    [...args(f), '--root', f.root],
  ]) {
    const result = await cli(f, argv);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /USAGE/);
    assert.ok(!result.stderr.includes('ENOENT'));
  }
});

test('blocked review exits two with an actionable bounded plan', async (t) => {
  const f = await fixture(t);
  f.review.files = [];
  await saveReview(f);
  const result = await cli(f);
  assert.equal(result.code, 2, result.stderr);
  const report = JSON.parse(result.stdout);
  hasBlocker(report, 'PACK_REVIEW_COVERAGE');
  assert.ok(Buffer.byteLength(result.stdout) <= 262144);
});

test('candidate plan digest changes when the reviewed identity changes', async (t) => {
  const f = await fixture(t);
  const a = await check(f);
  f.review.review.rationale += ' Revised.';
  await saveReview(f);
  const b = await check(f);
  assert.notEqual(a.planSha256, b.planSha256);
});
