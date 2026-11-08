// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-08-aug005-lifecycle-observation (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
const config = await import('../scripts/isolation-ci-config.mjs').catch((error) => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  return {};
});
const select = (text) => {
  assert.equal(typeof config.cgroupfsDaemonConfig, 'function', 'CI driver selection is not implemented');
  return config.cgroupfsDaemonConfig(text);
};
test('disposable CI driver configuration preserves unrelated daemon settings', () => {
  const previous = JSON.stringify({
    features: { 'containerd-snapshotter': true },
    'log-driver': 'json-file',
    'registry-mirrors': ['https://example.invalid/owned-fixture'],
  });
  const selected = JSON.parse(select(previous));
  assert.deepEqual(selected, { ...JSON.parse(previous), 'exec-opts': ['native.cgroupdriver=cgroupfs'] });
  assert.equal(JSON.parse(previous)['exec-opts'], undefined);
});
test('disposable CI driver configuration replaces only its explicit supported driver', () => {
  for (const driver of ['systemd', 'cgroupfs']) {
    const previous = { 'exec-opts': ['preserved-option=value', 'native.cgroupdriver=' + driver] };
    const selected = JSON.parse(select(JSON.stringify(previous)));
    assert.deepEqual(selected['exec-opts'], ['preserved-option=value', 'native.cgroupdriver=cgroupfs']);
    assert.deepEqual(previous['exec-opts'], ['preserved-option=value', 'native.cgroupdriver=' + driver]);
  }
});
test('disposable CI driver configuration rejects malformed ambiguous and unknown options', () => {
  for (const text of [
    'not-json',
    'null',
    '[]',
    '42',
    '{"exec-opts":{}}',
    '{"exec-opts":null}',
    '{"EXEC-OPTS":["native.cgroupdriver=systemd"]}',
    '{"exec-opts":[1]}',
    '{"exec-opts":["native.cgroupdriver=unknown"]}',
    '{"exec-opts":["native.cgroupdriver=systemd","native.cgroupdriver=cgroupfs"]}',
    '{"exec-opts":["native.cgroupdriver"]}',
  ])
    assert.throws(() => select(text), /Daemon configuration/);
});
test('disposable CI driver configuration bounds input and sanitizes parse errors', () => {
  assert.throws(() => select(' '.repeat(65537)), /Daemon configuration/);
  assert.throws(() => select({}), /Daemon configuration/);
  assert.throws(
    () => select('{"nested":' + '['.repeat(33) + '0' + ']'.repeat(33) + '}'),
    /Daemon configuration/,
  );
  assert.throws(() => select('{"values":[' + Array(5000).fill('0').join(',') + ']}'), /Daemon configuration/);
  assert.throws(
    () => select('PRIVATE_DAEMON_FIXTURE'),
    (error) => {
      assert.match(error.message, /Daemon configuration/);
      assert.ok(!error.message.includes('PRIVATE_DAEMON_FIXTURE'));
      return true;
    },
  );
  assert.deepEqual(JSON.parse(select('{}')), { 'exec-opts': ['native.cgroupdriver=cgroupfs'] });
});

test('disposable CI driver configuration rejects duplicate decoded keys at every depth', () => {
  for (const text of [
    '{"debug":true,"debug":false}',
    '{"features":{"same":true,"same":false}}',
    '{"log-opts":{"first":"a"},"log-opts":{"second":"b"}}',
    '{"exec-opts":[],"\\u0065xec-opts":["native.cgroupdriver=systemd"]}',
    '{"nested":[{"a":1,"\\u0061":2}]}',
  ])
    assert.throws(() => select(text), /Daemon configuration/);
});
test('disposable CI driver configuration rejects lossy and noncanonical numeric tokens', () => {
  for (const number of [
    '9007199254740993',
    '-9007199254740992',
    '1.0000000000000000001',
    '1e3',
    '-0',
    '0.5',
    '1e400',
  ]) {
    assert.throws(() => select('{"nested":{"values":[' + number + ']}}'), /Daemon configuration/);
  }
  assert.equal(JSON.parse(select('{"max-concurrent-downloads":3}'))['max-concurrent-downloads'], 3);
  assert.equal(JSON.parse(select('{"limit":9007199254740991}')).limit, 9007199254740991);
  assert.throws(() => select('{"label":"\\ud800"}'), /Daemon configuration/);
});
test('disposable CI daemon bytes require bounded fatal UTF-8 and preserve BOM for refusal', () => {
  assert.equal(typeof config.decodeDaemonConfig, 'function');
  assert.throws(() => config.decodeDaemonConfig(Buffer.from([0xc3, 0x28])), /Daemon configuration/);
  assert.throws(() => config.decodeDaemonConfig(Buffer.alloc(65537)), /Daemon configuration/);
  assert.throws(() => select(config.decodeDaemonConfig(Buffer.from('\ufeff{}'))), /Daemon configuration/);
  const text = '{"label":"é"}';
  assert.equal(config.decodeDaemonConfig(Buffer.from(text)), text);
});

// Actual child-process regressions for public versus private command failure evidence.
test('private CI command failure withholds synthetic stdout stderr and command details', async (t) => {
  const { createCiCommandRunner } = await import('../scripts/isolation-ci-runner.mjs');
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const util = await import('node:util');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-ci-private-evidence-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const run = createCiCommandRunner(root, root);
  const marker = 'PRIVATE_CI_SYNTHETIC_FIXTURE';
  const error = await run(
    process.execPath,
    [
      '-e',
      'process.stdout.write(' +
        JSON.stringify(marker) +
        ');process.stderr.write(' +
        JSON.stringify(marker) +
        ');process.exit(7)',
    ],
    { retain: false },
  ).then(
    () => assert.fail('Expected private child failure'),
    (failure) => failure,
  );
  assert.ok(error instanceof Error);
  assert.ok(!util.inspect(error, { showHidden: true, depth: 5 }).includes(marker));
  for (const key of ['stdout', 'stderr', 'cmd', 'cause']) assert.equal(Object.hasOwn(error, key), false);
  const logs = await fs.readdir(root);
  assert.equal(logs.length, 1);
  const log = await fs.readFile(path.join(root, logs[0]), 'utf8');
  assert.ok(!log.includes(marker));
  assert.match(log, /omitted/);
});
test('public CI command failure retains its original synthetic diagnostics', async (t) => {
  const { createCiCommandRunner } = await import('../scripts/isolation-ci-runner.mjs');
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-ci-public-evidence-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const run = createCiCommandRunner(root, root);
  const error = await run(process.execPath, [
    '-e',
    'process.stdout.write("PUBLIC_FIXTURE");process.exit(7)',
  ]).then(
    () => assert.fail('Expected public child failure'),
    (failure) => failure,
  );
  assert.equal(error.code, 7);
  assert.equal(error.stdout, 'PUBLIC_FIXTURE');
  const logs = await fs.readdir(root);
  assert.equal(await fs.readFile(path.join(root, logs[0]), 'utf8'), 'PUBLIC_FIXTURE');
});
