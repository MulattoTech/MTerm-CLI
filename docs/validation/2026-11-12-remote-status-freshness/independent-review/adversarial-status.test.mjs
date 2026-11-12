// Independent, synthetic-only review of the frozen status freshness change.
// Run from the review directory with MTERM_REVIEW_RUNTIME_ROOT set to the built candidate.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { syncBuiltinESMExports } from 'node:module';
import childProcess from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import dgram from 'node:dgram';

const reviewRoot = path.dirname(fileURLToPath(import.meta.url));
const runtimeRoot = process.env.MTERM_REVIEW_RUNTIME_ROOT;
assert.ok(runtimeRoot && path.isAbsolute(runtimeRoot), 'Supply the absolute built candidate root');
const { remoteMain } = await import(pathToFileURL(path.join(runtimeRoot, 'dist/remote/cli.js')));
const { RemoteStateStore } = await import(pathToFileURL(path.join(runtimeRoot, 'dist/remote/state.js')));
const NOW = Date.UTC(2026, 10, 12, 20, 0, 0);
const ISO = '2026-11-12T20:00:00.000Z';
const OFFLINE = 'offline-or-not-observed';
const PRIVATE_SENTINEL = 'PEER_SYNTHETIC_PRIVATE_VALUE';
const overlongTimestamp = ' '.repeat(20) + 'Thu, 12 Nov 2026 20:00:00 GMT';
assert.ok(overlongTimestamp.length > 40 && Date.parse(overlongTimestamp) === NOW);

async function snapshot(directory) {
  return Promise.all((await fs.readdir(directory)).sort().map(async (name) => [
    name, (await fs.readFile(path.join(directory, name))).toString('base64'),
  ]));
}

async function fixture(t) {
  const base = await fs.realpath(await fs.mkdtemp(path.join(reviewRoot, 'fixture-')));
  const root = path.join(base, 'workspace');
  const stateHome = path.join(base, 'state-home');
  await fs.mkdir(root, { mode: 0o700 });
  const keys = ['LOCALAPPDATA', 'XDG_STATE_HOME', 'MTERM_ENV', 'MTERM_CONFIG_PATH'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.LOCALAPPDATA = stateHome;
  process.env.XDG_STATE_HOME = stateHome;
  delete process.env.MTERM_ENV;
  delete process.env.MTERM_CONFIG_PATH;
  t.after(async () => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    await fs.rm(base, { recursive: true, force: true });
  });
  const messages = [];
  t.mock.method(console, 'log', (value) => messages.push(String(value)));
  const counters = { network: 0, process: 0, credential: 0 };
  const deny = (kind) => () => {
    counters[kind]++;
    throw new Error('Unexpected ' + kind + ' operation during synthetic status review');
  };
  t.mock.method(globalThis, 'fetch', deny('network'));
  for (const [module, names] of [
    [http, ['request', 'get']], [https, ['request', 'get']],
    [net, ['connect', 'createConnection']], [tls, ['connect']], [dgram, ['createSocket']],
  ]) for (const name of names) t.mock.method(module, name, deny('network'));
  for (const name of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork'])
    t.mock.method(childProcess, name, deny('process'));
  t.mock.method(process, 'kill', deny('process'));
  t.mock.method(RemoteStateStore.prototype, 'credential', deny('credential'));
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  const run = async (args) => {
    messages.length = 0;
    assert.equal(await remoteMain(args), 0);
    assert.equal(messages.length, 1);
    return JSON.parse(messages[0]);
  };
  const setup = await run([
    'setup', '--gateway', 'https://gateway.invalid', '--root', root,
    '--name', 'Peer synthetic review', '--profile', 'freshness', '--apply',
  ]);
  const store = await RemoteStateStore.open(setup.stateDirectory, false, 'production');
  const credential = path.join(setup.stateDirectory, 'credential.json');
  await fs.writeFile(credential, JSON.stringify({ synthetic: PRIVATE_SENTINEL }), { mode: 0o600 });
  const open = fs.open;
  t.mock.method(fs, 'open', async function (name, ...args) {
    if (path.resolve(String(name)) === credential) return deny('credential')();
    return open.call(this, name, ...args);
  });
  const guards = () => assert.deepEqual(counters, { network: 0, process: 0, credential: 0 });
  return {
    base, root, stateHome, setup, store, run, guards, messages,
    statusArgs: ['status', '--environment', 'production', '--profile', 'freshness'],
  };
}

async function checkStatus(t, { raw, expected, expectedAt, now = NOW, expectedState }) {
  const f = await fixture(t);
  await f.store.runtime(raw);
  const before = await snapshot(f.setup.stateDirectory);
  t.mock.method(Date, 'now', () => now);
  const status = await f.run(f.statusArgs);
  assert.equal(status.observedStatus, expected);
  assert.equal(status.runtime?.at, expectedAt);
  if (expectedState !== undefined) assert.equal(status.runtime.state, expectedState);
  assert.equal(status.stateDirectory, f.setup.stateDirectory);
  assert.equal(status.environment, 'production');
  assert.equal(status.profile, 'freshness');
  assert.equal(status.networkChecked, false);
  assert.equal(status.autostart, false);
  assert.equal(JSON.stringify(status).includes(PRIVATE_SENTINEL), false);
  assert.deepEqual(await snapshot(f.setup.stateDirectory), before);
  f.guards();
}

const cases = [
  ['equivalent explicit timezone retains raw observation', '2026-11-12T14:00:00.000-06:00', 'online', '2026-11-12T14:00:00.000-06:00'],
  ['future explicit timezone is not fresh', '2026-11-12T14:00:00.001-06:00', OFFLINE, '2026-11-12T14:00:00.001-06:00'],
  ['maximum representable timestamp is not fresh', '+275760-09-13T00:00:00.000Z', OFFLINE, '+275760-09-13T00:00:00.000Z'],
  ['minimum representable timestamp is stale', '-271821-04-20T00:00:00.000Z', OFFLINE, '-271821-04-20T00:00:00.000Z'],
  ['numeric timestamp is not coerced', NOW, OFFLINE, undefined],
  ['object timestamp is not coerced', { value: ISO }, OFFLINE, undefined],
  ['array timestamp is not coerced', [ISO], OFFLINE, undefined],
  ['empty timestamp is absent', '', OFFLINE, undefined],
  ['parseable timestamp exceeding the public length bound is absent', overlongTimestamp, OFFLINE, undefined],
];
for (const [name, at, expected, expectedAt] of cases)
  test(name, async (t) => checkStatus(t, {
    raw: { at, state: 'online', pid: 2147483647, activeRequests: 2, rawSecret: PRIVATE_SENTINEL },
    expected, expectedAt, expectedState: 'online',
  }));

for (const state of ['connecting', 'reconnecting', 'revoked', 'stopped'])
  test('fresh observation preserves recorded state ' + state, async (t) => checkStatus(t, {
    raw: { at: ISO, state, pid: 2147483647, rawSecret: PRIVATE_SENTINEL },
    expected: state, expectedAt: ISO, expectedState: state,
  }));

test('recent startedAt cannot make stale at fresh', async (t) => checkStatus(t, {
  raw: { at: '2026-11-12T19:59:15.000Z', startedAt: ISO, state: 'online' },
  expected: OFFLINE, expectedAt: '2026-11-12T19:59:15.000Z', expectedState: 'online',
}));

test('array runtime yields no observation', async (t) => checkStatus(t, {
  raw: [{ at: ISO, state: 'online' }], expected: OFFLINE, expectedAt: undefined,
}));

for (const now of [NaN, Infinity, -Infinity])
  test('nonfinite observer clock ' + String(now) + ' cannot claim freshness', async (t) => checkStatus(t, {
    raw: { at: ISO, state: 'online' }, expected: OFFLINE, expectedAt: ISO, now,
  }));

test('freshness is assessed after awaited status reads', async (t) => {
  const f = await fixture(t);
  await f.store.runtime({ at: ISO, state: 'online', pid: 2147483647 });
  const before = await snapshot(f.setup.stateDirectory);
  let now = NOW;
  t.mock.method(Date, 'now', () => now);
  const originalStatus = RemoteStateStore.prototype.status;
  t.mock.method(RemoteStateStore.prototype, 'status', async function (...args) {
    const result = await originalStatus.apply(this, args);
    now += 45000;
    return result;
  });
  const status = await f.run(f.statusArgs);
  assert.equal(status.observedStatus, OFFLINE);
  assert.equal(status.runtime.at, ISO);
  assert.equal(status.runtime.pid, 2147483647);
  assert.equal(status.networkChecked, false);
  assert.deepEqual(await snapshot(f.setup.stateDirectory), before);
  f.guards();
});

test('malformed runtime JSON retains existing refusal and owned bytes', async (t) => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.setup.stateDirectory, 'running.json'), 'invalid {' + PRIVATE_SENTINEL, { mode: 0o600 });
  const before = await snapshot(f.setup.stateDirectory);
  f.messages.length = 0;
  await assert.rejects(remoteMain(f.statusArgs), (error) =>
    error.code === 'REMOTE_STATE' && !String(error).includes(PRIVATE_SENTINEL));
  assert.deepEqual(f.messages, []);
  assert.deepEqual(await snapshot(f.setup.stateDirectory), before);
  f.guards();
});

test('cross-environment status retains scope refusal before observation', async (t) => {
  const f = await fixture(t);
  await f.store.runtime({ at: ISO, state: 'online' });
  const before = await snapshot(f.setup.stateDirectory);
  f.messages.length = 0;
  await assert.rejects(remoteMain([
    'status', '--environment', 'development', '--state-dir', f.setup.stateDirectory,
  ]), (error) => error.code === 'REMOTE_SCOPE');
  assert.deepEqual(f.messages, []);
  assert.deepEqual(await snapshot(f.setup.stateDirectory), before);
  f.guards();
});

test('missing profile status does not create or fall back to another store', async (t) => {
  const f = await fixture(t);
  const before = await snapshot(f.setup.stateDirectory);
  const collection = path.dirname(f.setup.stateDirectory);
  const names = await fs.readdir(collection);
  f.messages.length = 0;
  await assert.rejects(remoteMain([
    'status', '--environment', 'production', '--profile', 'missing',
  ]));
  assert.deepEqual(f.messages, []);
  assert.deepEqual(await fs.readdir(collection), names);
  assert.deepEqual(await snapshot(f.setup.stateDirectory), before);
  f.guards();
});
