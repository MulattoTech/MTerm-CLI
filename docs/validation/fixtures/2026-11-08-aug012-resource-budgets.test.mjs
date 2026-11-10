// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-08-aug012-resource-budgets (OpenAI / GPT-6 Astra Pro; self-reported)
// Real owned-process/SDK fixtures; explicitly labeled injected disk failures never claim an OS result.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const entry = path.resolve(process.env.MTERM_VERIFY_BIN ?? 'bin/mterm-cli.js');
const moduleUrl = (name) => pathToFileURL(path.resolve(path.dirname(entry), '../dist', name)).href;
const processModule = await import(moduleUrl('processes.js')).catch(() => ({}));
const budgetsModule = await import(moduleUrl('resource-budgets.js')).catch(() => ({}));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exec = promisify(execFile);
const errorCode = (code) => (error) => error?.code === code;
const value = (r) => r.structuredContent ?? JSON.parse(r.content.find((c) => c.type === 'text').text);
const call = async (client, name, args = {}) => value(await client.callTool({ name, arguments: args }));
const idle = ['-e', 'console.log("READY");setInterval(()=>{},1000)'];
const disk = { minFreeBytes: '0', highWaterPercent: 100, maxJobScratchBytes: '1000' };
const stats = (available = 1000n, total = 1000n) => ({
  type: 0n,
  bsize: 1n,
  blocks: total,
  bfree: available,
  bavail: available,
});
async function until(read, predicate, timeout = 5000) {
  const deadline = Date.now() + timeout;
  let result;
  do {
    result = await read();
    if (predicate(result)) return result;
    await sleep(15);
  } while (Date.now() < deadline);
  assert.fail('Timed out: ' + JSON.stringify(result));
}
async function directory(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-budget-')));
  const cleanup = [];
  t.after(async () => {
    for (const close of cleanup.reverse()) await close();
    await fs.rm(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  });
  return { root, cleanup };
}
async function fixture(t, budgets = {}, extra = {}) {
  const f = await directory(t);
  f.service = await processModule.ProcessService.create(f.root, { allowExec: true, budgets, ...extra });
  f.cleanup.push(() => f.service.close());
  assert.equal(typeof f.service.resourceStatus, 'function', 'Resource admission must be implemented');
  return f;
}
async function finish(service, id) {
  return until(
    () => service.output({ sessionId: id }),
    (s) => !s.running,
  );
}
async function connect(f, flags = [], script) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: script ? [script] : [entry, 'mcp', '--stdio', '--root', f.root, ...flags],
    stderr: 'pipe',
  });
  transport.stderr?.resume();
  const client = new Client({ name: 'mterm-budget-fixture', version: '1.0.0' });
  f.cleanup.push(async () => {
    await client.close();
    await transport.close().catch(() => {});
  });
  await client.connect(transport);
  return client;
}
const flags = (budget) => ['--allow-exec', '--process-budget', JSON.stringify(budget)];

test('owner budget input is strict, immutable and cannot grant hard CPU/GPU/RAM quotas', async () => {
  assert.equal(typeof budgetsModule.parseProcessBudget, 'function');
  const input = { maxSessions: 2, disk: { ...disk } };
  const parsed = budgetsModule.parseProcessBudget(input);
  input.maxSessions = 8;
  input.disk.minFreeBytes = '999';
  assert.equal(parsed.maxSessions, 2);
  assert.equal(parsed.disk.minFreeBytes, '0');
  assert.ok(Object.isFrozen(parsed) && Object.isFrozen(parsed.disk));
  for (const bad of [
    { cpuPercent: 100 },
    { gpuBytes: '1' },
    { ramBytes: '1' },
    { maxSessions: 9 },
    { maxPendingStarts: 0 },
    { maxOutputBytes: 1048577 },
    { maxRuntimeMs: 99 },
    { admissionTimeoutMs: 30001 },
    { disk: { minFreeBytes: '-1' } },
    { disk: { minFreeBytes: '01' } },
    { disk: { minFreeBytes: '1\n' } },
    { disk: { minFreeBytes: '9'.repeat(31) } },
    { disk: { highWaterPercent: 101 } },
  ])
    assert.throws(() => budgetsModule.parseProcessBudget(bad));
  const { parseHost } = await import(moduleUrl('cli.js'));
  const options = parseHost(['--stdio', '--root', process.cwd(), '--process-budget', '{"maxSessions":2}']);
  assert.equal(options.processBudget.maxSessions, 2);
  for (const arg of ['null', '[]', '{"maxSessions":9}', '{bad', ' '.repeat(1025)])
    assert.throws(() => parseHost(['--stdio', '--root', process.cwd(), '--process-budget', arg]));
  assert.throws(() =>
    parseHost(['--stdio', '--root', process.cwd(), '--process-budget', '{}', '--process-budget', '{}']),
  );
});

test('normal and control admission have separate finite caps, zero queue and idempotent release', () => {
  assert.equal(typeof budgetsModule.WorkAdmission, 'function');
  const work = new budgetsModule.WorkAdmission();
  const normal = Array.from({ length: 4 }, () => work.enter(false));
  assert.throws(() => work.enter(false), errorCode('BUSY'));
  const controls = [work.enter(true), work.enter(true)];
  assert.throws(() => work.enter(true), errorCode('BUSY'));
  assert.deepEqual(work.status(), {
    normalLimit: 4,
    controlLimit: 2,
    normalActive: 4,
    controlActive: 2,
    maxQueued: 0,
  });
  normal[0]();
  normal[0]();
  assert.equal(work.status().normalActive, 3);
  for (const release of [...normal, ...controls]) release();
  assert.equal(work.status().normalActive + work.status().controlActive, 0);
});

test('resource status reports per-instance ceilings and unsupported hard quotas without probing drives', async (t) => {
  const { service } = await fixture(t);
  t.mock.method(fs, 'statfs', () => assert.fail('Status must not probe disk'));
  const status = service.resourceStatus();
  assert.equal(status.scope, 'host-instance');
  assert.match(status.instanceId, /^[a-f0-9-]{36}$/);
  assert.equal(status.limits.maxSessions, 8);
  assert.equal(status.limits.maxPendingStarts, 4);
  assert.equal(status.maxQueuedJobs, 0);
  assert.equal(status.disk.enabled, false);
  assert.deepEqual(status.usage, {
    pendingStarts: 0,
    activeJobs: 0,
    retainedSessions: 0,
    retainedOutputBytes: 0,
    reservedScratchBytes: '0',
  });
  for (const key of ['cpu', 'gpu', 'ram', 'diskWrites', 'crossHost'])
    assert.equal(status.hardEnforcement[key], false);
  assert.equal(service.list().resources.instanceId, status.instanceId);
});

test('per-job runtime and retained output narrow owner ceilings and recover after timeout', async (t) => {
  const { service } = await fixture(t, { maxOutputBytes: 4096, maxRuntimeMs: 1000 });
  await assert.rejects(
    service.start({ command: process.execPath, maxOutputBytes: 4097 }),
    errorCode('BUDGET_EXCEEDED'),
  );
  await assert.rejects(
    service.start({ command: process.execPath, timeoutMs: 1001 }),
    errorCode('BUDGET_EXCEEDED'),
  );
  const defaults = await service.start({ command: process.execPath, args: idle });
  assert.equal(defaults.budget.timeoutMs, 1000);
  await service.stop({ sessionId: defaults.sessionId });
  const run = await service.start({
    command: process.execPath,
    args: ['-e', 'process.stdout.write("x".repeat(100000)+"END");setInterval(()=>{},1000)'],
    maxOutputBytes: 1024,
    timeoutMs: 1000,
  });
  assert.equal(run.budget.maxOutputBytes, 1024);
  const stopped = await finish(service, run.sessionId);
  assert.equal(stopped.timedOut, true);
  assert.ok(stopped.retainedBytes <= 1024);
  assert.equal(stopped.lostOutput, true);
  assert.match(stopped.events.map((e) => e.text).join(''), /END/);
  assert.equal(service.resourceStatus().usage.activeJobs, 0);
  const next = await service.start({ command: process.execPath, args: ['-e', ''], timeoutMs: 500 });
  await finish(service, next.sessionId);
});

test('pending start admission remains bounded across actual asynchronous statfs and atomic job admission', async (t) => {
  const { service } = await fixture(t, { maxPendingStarts: 2, maxSessions: 1, disk });
  const original = fs.statfs;
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  t.after(() => release());
  let reached = 0;
  t.mock.method(fs, 'statfs', async (...args) => {
    const result = await original(...args);
    reached++;
    await gate;
    return result;
  });
  const pending = [0, 1].map(() => service.start({ command: process.execPath, args: idle }));
  const outcomes = Promise.allSettled(pending);
  await until(
    () => reached,
    (n) => n === 2,
  );
  assert.equal(service.resourceStatus().usage.pendingStarts, 2);
  await assert.rejects(service.start({ command: process.execPath, args: idle }), errorCode('START_LIMIT'));
  release();
  const results = await outcomes;
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(results.find((r) => r.status === 'rejected').reason.code, 'SESSION_LIMIT');
  assert.equal(service.resourceStatus().usage.pendingStarts, 0);
  assert.equal(service.resourceStatus().usage.activeJobs, 1);
  await service.stop({ sessionId: results.find((r) => r.status === 'fulfilled').value.sessionId });
  assert.equal(service.resourceStatus().usage.reservedScratchBytes, '0');
});

test('real filesystem capacity admits a declared job and above-total floor denies before spawn without deleting data', async (t) => {
  const { root, service } = await fixture(t, { disk });
  await assert.rejects(
    service.start({ command: process.execPath, scratchBytes: '1001' }),
    errorCode('BUDGET_EXCEEDED'),
  );
  for (const scratchBytes of ['1\n', '01', '1e3', '9'.repeat(31)])
    await assert.rejects(
      service.start({ command: process.execPath, scratchBytes }),
      (error) => error.name === 'ZodError',
    );
  await fs.writeFile(path.join(root, 'user.txt'), 'preserve exact user bytes');
  const observed = await fs.statfs(root, { bigint: true });
  const run = await service.start({
    command: process.execPath,
    args: ['-e', 'console.log(process.cwd())'],
    scratchBytes: '1',
  });
  assert.equal(run.budget.disk.backend, 'node:fs.statfs');
  assert.match(run.budget.disk.availableBytes, /^[0-9]+$/);
  assert.ok(BigInt(run.budget.disk.totalBytes) > 0n);
  assert.equal(run.budget.scratchBytes, '1');
  await finish(service, run.sessionId);
  const denied = await processModule.ProcessService.create(root, {
    allowExec: true,
    budgets: { disk: { ...disk, minFreeBytes: String(observed.blocks * observed.bsize + 1n) } },
  });
  t.after(() => denied.close());
  await assert.rejects(
    denied.start({
      command: process.execPath,
      args: ['-e', 'require("node:fs").writeFileSync("spawned.txt","bad")'],
    }),
    errorCode('DISK_HEADROOM'),
  );
  assert.equal(denied.list().sessions.length, 0);
  assert.equal(await fs.readFile(path.join(root, 'user.txt'), 'utf8'), 'preserve exact user bytes');
  assert.equal(await fs.stat(path.join(root, 'spawned.txt')).catch(() => null), null);
});

test('injected equal-volume observations share one conservative atomic reservation pool and recover on close', async (t) => {
  const { root, service } = await fixture(t, { disk });
  await fs.mkdir(path.join(root, 'a'));
  await fs.mkdir(path.join(root, 'b'));
  t.mock.method(fs, 'statfs', async () => stats());
  const results = await Promise.allSettled(
    ['a', 'b'].map((cwd) =>
      service.start({
        command: process.execPath,
        args: idle,
        cwd,
        scratchBytes: '600',
      }),
    ),
  );
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(results.find((r) => r.status === 'rejected').reason.code, 'DISK_HEADROOM');
  assert.equal(service.resourceStatus().usage.reservedScratchBytes, '600');
  const live = results.find((r) => r.status === 'fulfilled').value;
  await service.stop({ sessionId: live.sessionId });
  assert.equal(service.resourceStatus().usage.reservedScratchBytes, '0');
  const next = await service.start({ command: process.execPath, args: idle, scratchBytes: '1000' });
  await service.stop({ sessionId: next.sessionId });
});

test('actual ENOENT spawn failure releases the reserved estimate and pending admission once', async (t) => {
  const { root, service } = await fixture(t, { disk });
  t.mock.method(fs, 'statfs', async () => stats());
  const vanished = path.join(root, 'vanishing.exe');
  await fs.writeFile(vanished, 'not executed');
  await assert.rejects(
    service.start({ command: vanished, scratchBytes: '700' }, () => unlinkSync(vanished)),
    errorCode('SPAWN_FAILED'),
  );
  assert.equal(service.resourceStatus().usage.reservedScratchBytes, '0');
  assert.equal(service.resourceStatus().usage.pendingStarts, 0);
  assert.equal(service.resourceStatus().usage.activeJobs, 0);
  const next = await service.start({ command: process.execPath, args: idle, scratchBytes: '1000' });
  await service.stop({ sessionId: next.sessionId });
});

test('a post-spawn child error cannot release a live job or its reservation', async (t) => {
  const { service } = await fixture(t, { maxSessions: 1, disk });
  t.mock.method(fs, 'statfs', async () => stats());
  const live = await service.start({ command: process.execPath, args: idle, scratchBytes: '700' });
  service.sessions.get(live.sessionId).child.emit('error', new Error('Injected failed kill after spawn'));
  assert.equal(service.resourceStatus().usage.activeJobs, 1);
  assert.equal(service.resourceStatus().usage.reservedScratchBytes, '700');
  await assert.rejects(
    service.start({ command: process.execPath, scratchBytes: '0' }),
    errorCode('SESSION_LIMIT'),
  );
  await service.stop({ sessionId: live.sessionId });
  assert.equal(service.resourceStatus().usage.reservedScratchBytes, '0');
});

test('CLI tools reports the effective budget and managed setup refuses to silently discard it', async (t) => {
  const f = await directory(t);
  const result = await exec(
    process.execPath,
    [entry, 'tools', '--root', f.root, '--process-budget', '{"maxSessions":1}'],
    { timeout: 15000 },
  );
  assert.equal(JSON.parse(result.stdout).processBudget.maxSessions, 1);
  await assert.rejects(
    exec(
      process.execPath,
      [entry, 'setup', 'codex', '--root', f.root, '--process-budget', '{"maxSessions":1}'],
      { timeout: 15000 },
    ),
    (error) => error.code === 2 && /does not yet preserve process budgets/.test(error.stderr),
  );
});

test('cancelled statfs retains its physical pending slot until settlement and cannot spawn late', async (t) => {
  const { root, service } = await fixture(t, { maxPendingStarts: 1, disk });
  const original = fs.statfs;
  const abort = new AbortController();
  let release,
    reached = false;
  const gate = new Promise((r) => {
    release = r;
  });
  t.after(() => release());
  t.mock.method(fs, 'statfs', async (...args) => {
    const result = await original(...args);
    reached = true;
    await gate;
    return result;
  });
  const pending = service.start(
    { command: process.execPath, args: ['-e', 'require("node:fs").writeFileSync("late.txt","bad")'] },
    undefined,
    abort.signal,
  );
  const rejected = assert.rejects(pending, errorCode('CANCELLED'));
  await until(() => reached, Boolean);
  abort.abort();
  assert.equal(service.resourceStatus().usage.pendingStarts, 1);
  await assert.rejects(service.start({ command: process.execPath }), errorCode('START_LIMIT'));
  release();
  await rejected;
  assert.equal(service.resourceStatus().usage.pendingStarts, 0);
  assert.equal(service.list().sessions.length, 0);
  assert.equal(await fs.stat(path.join(root, 'late.txt')).catch(() => null), null);
});

test('cooperative admission deadline after real statfs fails closed with no late child', async (t) => {
  const { service } = await fixture(t, { admissionTimeoutMs: 100, disk });
  const original = fs.statfs;
  let observed = false;
  t.mock.method(fs, 'statfs', async (...args) => {
    const result = await original(...args);
    observed = true;
    await sleep(150);
    return result;
  });
  await assert.rejects(
    service.start({ command: process.execPath, args: idle }),
    errorCode('ADMISSION_TIMEOUT'),
  );
  assert.equal(observed, true);
  assert.equal(service.resourceStatus().usage.pendingStarts, 0);
  assert.equal(service.resourceStatus().usage.reservedScratchBytes, '0');
  assert.equal(service.list().sessions.length, 0);
});

test('an owned writer closing invalidates an earlier disk observation even after its reservation returns to zero', async (t) => {
  const { root, service } = await fixture(t, { disk });
  let release,
    blocked = false,
    directoryStats = 0;
  const gate = new Promise((r) => {
    release = r;
  });
  t.after(() => release());
  const original = fs.stat;
  t.mock.method(fs, 'stat', async (target, ...args) => {
    const result = await original(target, ...args);
    if (String(target) === root && ++directoryStats === 2) {
      blocked = true;
      await gate;
    }
    return result;
  });
  // Controlled capacity model; the owned child below really writes a 600-byte fixture.
  t.mock.method(fs, 'statfs', async () =>
    stats(
      await original(path.join(root, 'written.txt')).then(
        () => 400n,
        () => 1000n,
      ),
    ),
  );
  const pending = service.start({
    command: process.execPath,
    args: ['-e', 'require("node:fs").writeFileSync("late.txt","bad")'],
    scratchBytes: '600',
  });
  const rejected = assert.rejects(pending, errorCode('DISK_OBSERVATION_STALE'));
  await until(() => blocked, Boolean);
  const writer = await service.start({
    command: process.execPath,
    args: ['-e', 'require("node:fs").writeFileSync("written.txt","x".repeat(600))'],
    scratchBytes: '600',
  });
  await finish(service, writer.sessionId);
  assert.equal((await fs.readFile(path.join(root, 'written.txt'))).length, 600);
  assert.equal(service.resourceStatus().usage.reservedScratchBytes, '0');
  release();
  await rejected;
  assert.equal(await original(path.join(root, 'late.txt')).catch(() => null), null);
});

test('native start cancellation is checked after final real executable stat even without disk policy', async (t) => {
  const { service } = await fixture(t);
  const original = fs.stat,
    command = await fs.realpath(process.execPath);
  const abort = new AbortController();
  let reached = false;
  t.mock.method(fs, 'stat', async (target, ...args) => {
    const result = await original(target, ...args);
    if (String(target) === command) {
      reached = true;
      abort.abort();
    }
    return result;
  });
  await assert.rejects(
    service.start({ command: process.execPath, args: idle }, undefined, abort.signal),
    errorCode('CANCELLED'),
  );
  assert.equal(reached, true);
  assert.equal(service.list().sessions.length, 0);
});

test('placement preserves explicit cwd, deduplicates candidates and deterministically selects existing approved directories', async (t) => {
  const { root, service } = await fixture(t, { disk });
  for (const dir of ['a', 'b']) await fs.mkdir(path.join(root, dir));
  await fs.writeFile(path.join(root, 'a', 'user.txt'), 'untouched');
  let probes = 0;
  t.mock.method(fs, 'statfs', async () => {
    probes++;
    return stats();
  });
  const run = await service.start({
    command: process.execPath,
    args: ['-e', 'console.log(process.cwd())'],
    placement: { candidates: ['b', 'a', path.join(root, 'a')] },
    scratchBytes: '0',
  });
  assert.equal(run.cwd, 'a');
  assert.equal(probes, 2);
  assert.equal(run.budget.disk.candidatesObserved, 2);
  await finish(service, run.sessionId);
  const explicit = await service.start({
    command: process.execPath,
    args: ['-e', ''],
    cwd: 'b',
    scratchBytes: '0',
  });
  assert.equal(explicit.cwd, 'b');
  await finish(service, explicit.sessionId);
  assert.equal(await fs.readFile(path.join(root, 'a', 'user.txt'), 'utf8'), 'untouched');
  await assert.rejects(
    service.start({ command: process.execPath, cwd: 'b', placement: { candidates: ['a'] } }),
    errorCode('INVALID_ARGUMENT'),
  );
});

test('placement rejects outside, private, linked and non-directory candidates before probing them', async (t) => {
  const { root, service } = await fixture(t, { disk });
  await fs.mkdir(path.join(root, 'target'));
  await fs.mkdir(path.join(root, '.ssh'));
  await fs.symlink(path.join(root, 'target'), path.join(root, 'linked'), 'junction');
  await fs.writeFile(path.join(root, 'file.txt'), 'data');
  t.mock.method(fs, 'statfs', () => assert.fail('Denied candidate must not be probed'));
  for (const [candidate, code] of [
    ['..', 'OUTSIDE_ROOT'],
    ['.ssh', 'PRIVATE_PATH'],
    ['linked', 'LINK_REJECTED'],
    ['file.txt', 'NOT_DIRECTORY'],
  ])
    await assert.rejects(
      service.start({ command: process.execPath, placement: { candidates: [candidate] } }),
      errorCode(code),
    );
  assert.equal(service.list().sessions.length, 0);
});

test('effective request scope can only narrow placement and is rechecked after asynchronous observation', async (t) => {
  const { root, service } = await fixture(t, { disk });
  await fs.mkdir(path.join(root, 'allowed'));
  let revoked = false;
  service.policy.setAccessGuard(() => {
    if (revoked) throw Object.assign(new Error('denied'), { code: 'SCOPE_DENIED' });
  });
  const original = fs.statfs;
  t.mock.method(fs, 'statfs', async (...args) => {
    const result = await original(...args);
    revoked = true;
    return result;
  });
  await assert.rejects(
    service.start({ command: process.execPath, cwd: 'allowed' }),
    errorCode('OUTSIDE_ROOT'),
  );
  assert.equal(service.list().sessions.length, 0);
  assert.equal(service.resourceStatus().usage.reservedScratchBytes, '0');
});

test('injected unsupported, permission, operational and invalid-statistics failures are distinct and fail closed', async (t) => {
  const { service } = await fixture(t, { disk });
  for (const [backend, expected] of [
    [
      () => {
        throw Object.assign(new Error(), { code: 'ENOSYS' });
      },
      'DISK_UNSUPPORTED',
    ],
    [
      () => {
        throw Object.assign(new Error(), { code: 'ENOTSUP' });
      },
      'DISK_UNSUPPORTED',
    ],
    [
      () => {
        throw Object.assign(new Error(), { code: 'EACCES' });
      },
      'DISK_PERMISSION_DENIED',
    ],
    [
      () => {
        throw Object.assign(new Error(), { code: 'EIO' });
      },
      'DISK_PROBE_FAILED',
    ],
    [() => stats(-1n), 'DISK_INVALID_STATS'],
    [() => stats(1001n), 'DISK_INVALID_STATS'],
    [() => ({ ...stats(), bsize: 0n }), 'DISK_INVALID_STATS'],
    [() => ({ ...stats(), blocks: 1000 }), 'DISK_INVALID_STATS'],
  ]) {
    const mock = t.mock.method(fs, 'statfs', async () => backend());
    await assert.rejects(service.start({ command: process.execPath, args: idle }), errorCode(expected));
    mock.mock.restore();
    assert.equal(service.resourceStatus().usage.pendingStarts, 0);
    assert.equal(service.resourceStatus().usage.reservedScratchBytes, '0');
  }
  assert.equal(service.list().sessions.length, 0);
});

test('disk high-water arithmetic includes reservations and decimal bigints without rounding or disabled-policy bypass', async (t) => {
  const { service } = await fixture(t, { disk: { ...disk, minFreeBytes: '20', highWaterPercent: 90 } });
  t.mock.method(fs, 'statfs', async () => stats(120n, 1001n));
  await assert.rejects(
    service.start({ command: process.execPath, scratchBytes: '20' }),
    errorCode('DISK_HEADROOM'),
  );
  const allowed = await service.start({ command: process.execPath, args: idle, scratchBytes: '19' });
  assert.equal(allowed.budget.disk.requiredFreeBytes, '101');
  await service.stop({ sessionId: allowed.sessionId });
  const other = await fixture(t);
  await assert.rejects(
    other.service.start({ command: process.execPath, scratchBytes: '0' }),
    errorCode('DISK_BUDGET_DISABLED'),
  );
  await assert.rejects(
    other.service.start({ command: process.execPath, placement: { candidates: ['.'] } }),
    errorCode('DISK_BUDGET_DISABLED'),
  );
  const enormous = await fixture(t, { disk: { ...disk, minFreeBytes: '999999999999999999999999999999' } });
  await assert.rejects(enormous.service.start({ command: process.execPath }), errorCode('DISK_HEADROOM'));
});

test('two real SDK hosts expose independent immutable budgets and installed native disk admission', async (t) => {
  const f = await directory(t);
  const a = await connect(f, flags({ maxSessions: 1, maxOutputBytes: 2048, disk }));
  const b = await connect(f, flags({ maxSessions: 1, disk }));
  const stateA = await call(a, 'mterm_list_sessions'),
    stateB = await call(b, 'mterm_list_sessions');
  assert.equal(stateA.resources.scope, 'host-instance');
  assert.notEqual(stateA.resources.instanceId, stateB.resources.instanceId);
  assert.equal(stateA.resources.work.controlLimit, 2);
  assert.equal(stateA.resources.maxQueuedJobs, 0);
  const runA = await call(a, 'mterm_start_process', {
    command: process.execPath,
    args: idle,
    scratchBytes: '1',
  });
  const runB = await call(b, 'mterm_start_process', {
    command: process.execPath,
    args: idle,
    scratchBytes: '1',
  });
  assert.ok(runA.sessionId && runB.sessionId);
  assert.equal(runA.budget.disk.backend, 'node:fs.statfs');
  assert.equal(
    (await call(a, 'mterm_start_process', { command: process.execPath })).error.code,
    'SESSION_LIMIT',
  );
  assert.equal(
    (await call(a, 'mterm_start_process', { command: process.execPath, maxOutputBytes: 2049 })).error.code,
    'BUDGET_EXCEEDED',
  );
  await call(a, 'mterm_stop_process', { sessionId: runA.sessionId });
  assert.equal((await call(b, 'mterm_list_sessions')).resources.usage.activeJobs, 1);
  await call(b, 'mterm_stop_process', { sessionId: runB.sessionId });
});

async function packFixture(t) {
  const f = await directory(t);
  const worker = [
    'import fs from "node:fs";',
    'import readline from "node:readline";',
    'readline.createInterface({input:process.stdin}).once("line",()=>{',
    'fs.writeFileSync("pid-"+process.pid+".txt",String(process.pid));',
    'console.error("READY");setInterval(()=>{},1000);',
    '});',
  ].join('\n');
  const sha = (data) => createHash('sha256').update(data).digest('hex');
  const manifest = {
    manifestVersion: 1,
    abiVersion: 1,
    id: 'budget',
    version: '1.0.0',
    source: {
      url: 'https://github.com/MulattoTech/MTerm-CLI',
      commit: 'd6eb0fa8a3df8a22abdec587f405e1105f78acb8',
      license: 'MIT',
    },
    runtime: { kind: 'node-stdio-once', nodeMajor: 24, entry: 'worker.mjs' },
    platforms: ['win32-x64', 'linux-x64', 'darwin-arm64', 'darwin-x64'],
    dependencies: [],
    files: [{ path: 'worker.mjs', sha256: sha(worker) }],
    permissions: ['execute-unsandboxed'],
    tools: [
      {
        name: 'hold',
        description: 'Owned saturation fixture.',
        timeoutMs: 30000,
        inputSchema: { type: 'object', properties: {}, required: [], additionalProperties: false },
        outputSchema: { type: 'object', properties: {}, required: [], additionalProperties: false },
      },
    ],
  };
  const file = path.join(f.root, 'pack.json');
  f.registry = path.join(f.root, 'registry.json');
  const text = JSON.stringify(manifest);
  await fs.writeFile(file, text);
  await fs.writeFile(path.join(f.root, 'worker.mjs'), worker);
  const installed = await exec(
    process.execPath,
    [
      entry,
      'packs',
      'install',
      '--manifest',
      file,
      '--sha256',
      sha(text),
      '--registry',
      f.registry,
      '--apply',
    ],
    { timeout: 15000, maxBuffer: 1048576 },
  );
  assert.equal(JSON.parse(installed.stdout).applied, true);
  return f;
}

async function saturatedHost(t, compatibility) {
  const f = await packFixture(t);
  const config = path.join(f.root, 'compat.json');
  const client = await connect(f, [
    '--allow-exec',
    '--pack-registry',
    f.registry,
    '--allow-pack',
    'budget',
    ...(compatibility
      ? ['--compat-desktop-commander', '--compat-config', config, '--allow-shell', process.execPath]
      : []),
  ]);
  const initial = await call(client, 'mterm_list_sessions');
  assert.equal(initial.sessions.length, 0);
  const catalog = await call(client, 'mterm_tools_catalog');
  assert.deepEqual(
    catalog.diagnostics,
    [],
    'Startup must admit approved packs under the effective compatibility snapshot',
  );
  const completed = [];
  const running = Array.from({ length: 4 }, () =>
    client
      .callTool({ name: 'mterm_pack_budget__hold', arguments: {} })
      .catch((error) => ({ error: String(error) }))
      .then((result) => {
        completed.push(result);
        return result;
      }),
  );
  await until(
    async () => {
      assert.equal(completed.length, 0, 'Pack should remain active: ' + JSON.stringify(completed));
      return fs.readdir(f.root);
    },
    (files) => files.filter((name) => /^pid-\d+\.txt$/.test(name)).length === 4,
  );
  assert.equal((await call(client, 'mterm_capabilities')).error.code, 'BUSY');
  const status = await call(client, 'mterm_list_sessions');
  assert.equal(status.error, undefined, 'Owned status must remain available while normal work is saturated');
  assert.equal(status.resources.work.normalLimit, 4);
  assert.equal(status.resources.work.normalActive, 4);
  assert.equal(status.resources.work.controlActive, 1);
  assert.equal(status.resources.usage.activeJobs, 4);
  const output = await call(client, 'mterm_read_process_output', { sessionId: status.sessions[0].sessionId });
  assert.equal(output.running, true);
  if (compatibility) await fs.writeFile(config, '{malformed');
  for (const session of status.sessions)
    assert.equal((await call(client, 'mterm_stop_process', { sessionId: session.sessionId })).running, false);
  await Promise.all(running);
  const recovered = await call(client, 'mterm_list_sessions');
  assert.equal(recovered.resources.work.normalActive, 0);
  assert.equal(recovered.resources.usage.activeJobs, 0);
  if (compatibility) await fs.rm(config);
  assert.equal((await call(client, 'mterm_capabilities')).networkListener, false);
  for (const session of status.sessions) assert.throws(() => process.kill(session.pid, 0));
}
test('four real pack calls cannot starve bounded stop/output/status and recover without orphaned children', async (t) =>
  saturatedHost(t, false));
test('pack admission honors compatibility startup scope and cleanup survives its later malformed config', async (t) =>
  saturatedHost(t, true));

test('real disk denial through SDK still permits owned status and rejects unsupported hard limits', async (t) => {
  const f = await directory(t);
  const observed = await fs.statfs(f.root, { bigint: true });
  const client = await connect(
    f,
    flags({ disk: { ...disk, minFreeBytes: String(observed.blocks * observed.bsize + 1n) } }),
  );
  const denied = await call(client, 'mterm_start_process', { command: process.execPath, args: idle });
  assert.equal(denied.error.code, 'DISK_HEADROOM');
  const state = await call(client, 'mterm_list_sessions');
  assert.equal(state.resources.usage.activeJobs, 0);
  assert.equal(state.resources.work.controlActive, 1);
  assert.equal(
    (await call(client, 'mterm_stop_process', { sessionId: 'not-owned' })).error.code,
    'SESSION_NOT_FOUND',
  );
  const unsupported = await client.callTool({
    name: 'mterm_start_process',
    arguments: { command: process.execPath, cpuPercent: 1 },
  });
  assert.equal(unsupported.isError, true);
});

test('actual MCP cancellation during delayed real statfs cannot launch a native child after client abort', async (t) => {
  const f = await directory(t);
  const script = path.join(f.root, 'delayed-host.mjs');
  const host = [
    'import fs from "node:fs/promises";',
    'import {runMcp} from ' + JSON.stringify(moduleUrl('mcp.js')) + ';',
    'const probe=fs.statfs;',
    'fs.statfs=async(...args)=>{const result=await probe(...args);await fs.writeFile(' +
      JSON.stringify(path.join(f.root, 'probe.txt')) +
      ',"reached");await new Promise(r=>setTimeout(r,500));return result;};',
    'await runMcp(' + JSON.stringify({ root: f.root, allowExec: true, processBudget: { disk } }) + ');',
  ].join('\n');
  await fs.writeFile(script, host);
  const client = await connect(f, [], script);
  assert.equal((await call(client, 'mterm_list_sessions')).resources.scope, 'host-instance');
  const abort = new AbortController();
  const pending = client.callTool(
    {
      name: 'mterm_start_process',
      arguments: {
        command: process.execPath,
        args: ['-e', 'require("node:fs").writeFileSync("late.txt","bad")'],
      },
    },
    { signal: abort.signal },
  );
  const rejected = assert.rejects(pending, /abort|cancel/i);
  await until(() => fs.stat(path.join(f.root, 'probe.txt')).catch(() => null), Boolean);
  abort.abort();
  await rejected;
  const held = await call(client, 'mterm_list_sessions');
  assert.equal(held.resources.usage.pendingStarts, 1);
  const ended = await until(
    () => call(client, 'mterm_list_sessions'),
    (s) => s.resources.usage.pendingStarts === 0,
  );
  assert.equal(ended.sessions.length, 0);
  assert.equal(await fs.stat(path.join(f.root, 'late.txt')).catch(() => null), null);
});
