// Bounded original-source investigation. No product source is edited.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import childProcess from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import dnsPromises from 'node:dns/promises';

const directory = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(directory, 'owned-fixture');
await fs.mkdir(fixture, { mode: 0o700 });
const root = path.join(fixture, 'workspace');
const state = path.join(fixture, 'state');
await fs.mkdir(root, { mode: 0o700 });
process.env.XDG_STATE_HOME = path.join(fixture, 'state-home');
process.env.LOCALAPPDATA = path.join(fixture, 'state-home');
process.env.MTERM_ENV = 'development';
process.env.MTERM_CONFIG_PATH = path.join(fixture, 'unused-config.json');

const forbiddenCalls = [];
const forbid = (name) => (...args) => {
  forbiddenCalls.push(name);
  throw Error('Unexpected external/process operation: ' + name);
};
globalThis.fetch = forbid('fetch');
process.kill = forbid('process.kill');
for (const name of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork'])
  childProcess[name] = forbid('child_process.' + name);
for (const [name, object] of [['http', http], ['https', https]])
  for (const method of ['request', 'get']) object[method] = forbid(name + '.' + method);
net.connect = forbid('net.connect');
net.createConnection = forbid('net.createConnection');
net.Socket.prototype.connect = forbid('net.Socket.connect');
tls.connect = forbid('tls.connect');
dns.lookup = forbid('dns.lookup');
dns.resolve = forbid('dns.resolve');
dnsPromises.lookup = forbid('dns/promises.lookup');
dnsPromises.resolve = forbid('dns/promises.resolve');
for (const klass of [dns.Resolver, dnsPromises.Resolver])
  for (const name of Object.getOwnPropertyNames(klass.prototype))
    if (name.startsWith('resolve')) klass.prototype[name] = forbid('Resolver.' + name);
syncBuiltinESMExports();

const { remoteMain } = await import('./snapshot/dist/remote/cli.js');
const { RemoteStateStore } = await import('./snapshot/dist/remote/state.js');
RemoteStateStore.prototype.credential = forbid('credential');
const originalLog = console.log;
const messages = [];
console.log = (message) => messages.push(String(message));
assert.equal(await remoteMain([
  'setup', '--gateway', 'https://owned-status.invalid', '--root', root,
  '--name', 'Owned status observation fixture', '--state-dir', state,
  '--environment', 'development', '--apply',
]), 0);
const configPath = path.join(state, 'config.json');
const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
config.deviceId = '11111111-1111-4111-8111-111111111111';
await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });

const now = Date.parse('2026-11-12T23:00:00.000Z');
const originalNow = Date.now;
Date.now = () => now;
const instance = '22222222-2222-4222-8222-222222222222';
const otherInstance = '33333333-3333-4333-8333-333333333333';
const at = (offset) => new Date(now + offset).toISOString();
const cases = [
  { id: 'future-one-ms-no-lock', runtime: { at: at(1), state: 'online', pid: process.pid, instanceId: instance }, lock: null, proposed: 'offline-or-not-observed' },
  { id: 'future-day-matching-lock', runtime: { at: at(86400000), state: 'online', pid: 2147483647, instanceId: instance }, lock: { instanceId: instance, pid: 2147483647 }, proposed: 'offline-or-not-observed' },
  { id: 'future-year-mismatched-lock', runtime: { at: at(365 * 86400000), state: 'online', pid: 2147483647, instanceId: instance }, lock: { instanceId: otherInstance, pid: process.pid }, proposed: 'offline-or-not-observed' },
  { id: 'current-time-control', runtime: { at: at(0), state: 'online', pid: process.pid }, lock: null, proposed: 'online' },
  { id: 'recent-44999-control', runtime: { at: at(-44999), state: 'online', pid: 2147483647 }, lock: { instanceId: instance, pid: 2147483647 }, proposed: 'online' },
  { id: 'boundary-45000-control', runtime: { at: at(-45000), state: 'online' }, lock: null, proposed: 'offline-or-not-observed' },
  { id: 'stale-45001-control', runtime: { at: at(-45001), state: 'online' }, lock: null, proposed: 'offline-or-not-observed' },
  { id: 'missing-timestamp-control', runtime: { state: 'online' }, lock: null, proposed: 'offline-or-not-observed' },
  { id: 'malformed-timestamp-control', runtime: { at: 'not-a-date', state: 'online' }, lock: null, proposed: 'offline-or-not-observed' },
  { id: 'numeric-timestamp-control', runtime: { at: now, state: 'online' }, lock: null, proposed: 'offline-or-not-observed' },
  { id: 'null-timestamp-control', runtime: { at: null, state: 'online' }, lock: null, proposed: 'offline-or-not-observed' },
];
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const files = async () => {
  const list = [];
  for (const name of (await fs.readdir(state)).sort()) {
    const bytes = await fs.readFile(path.join(state, name));
    list.push({ name, bytes: bytes.length, sha256: digest(bytes) });
  }
  return list;
};
const results = [];
const originalOpen = fs.open;
for (const item of cases) {
  await fs.writeFile(path.join(state, 'running.json'), JSON.stringify(item.runtime, null, 2) + '\n', { mode: 0o600 });
  const lockPath = path.join(state, 'run.lock');
  if (item.lock) await fs.writeFile(lockPath, JSON.stringify(item.lock) + '\n', { mode: 0o600 });
  else await fs.rm(lockPath, { force: true });
  const before = await files();
  const opened = [];
  fs.open = async (...args) => {
    opened.push({ path: String(args[0]), flags: args[1] });
    return originalOpen(...args);
  };
  messages.length = 0;
  let exitCode;
  try {
    exitCode = await remoteMain(['status', '--state-dir', state, '--environment', 'development', '--json']);
  } finally {
    fs.open = originalOpen;
  }
  const report = JSON.parse(messages.at(-1));
  const after = await files();
  assert.equal(exitCode, 0);
  assert.equal(report.networkChecked, false);
  assert.equal(report.paired, true);
  assert.deepEqual(after, before);
  assert.equal(opened.some((x) => /(?:credential\.json|run\.lock)$/.test(x.path)), false);
  const future = item.id.startsWith('future-');
  assert.equal(report.observedStatus, future ? 'online' : item.proposed);
  results.push({ ...item, now, nowIso: new Date(now).toISOString(), inputAgeMs: typeof item.runtime.at === 'string' && Number.isFinite(Date.parse(item.runtime.at)) ? now - Date.parse(item.runtime.at) : null, exitCode, actual: report.observedStatus, meetsProposedFreshness: report.observedStatus === item.proposed, report, filesBefore: before, filesAfter: after, opened, statusMutation: false });
}
Date.now = originalNow;
console.log = originalLog;
assert.deepEqual(forbiddenCalls, []);
assert.equal(results.filter((x) => !x.meetsProposedFreshness).length, 3);
const output = {
  schemaVersion: 1,
  executedAt: new Date().toISOString(),
  sourceSha: '55ac8b1f35f657b079c191292219b0ae576d7164',
  command: 'node probe.mjs',
  classification: 'ORIGINAL_SOURCE_OBSERVATIONS_NOT_FIXED_SOURCE_QUALIFICATION',
  fixtureUses: 'Owned scratch config/running/lock files and frozen Date.now; no running agent or real credentials',
  pidLimit: 'Synthetic numbers plus this fixture process PID; no existence or command probe was made',
  forbiddenCalls,
  cases: results,
  totals: { observations: results.length, futureFalseFreshness: 3, preservedControls: 8, networkOperations: 0, childProcessOperations: 0, pidProbes: 0, credentialReads: 0, runLockReads: 0, statusMutations: 0 },
};
await fs.writeFile(path.join(directory, 'observations.json'), JSON.stringify(output, null, 2) + '\n');
originalLog(JSON.stringify(output.totals, null, 2));
