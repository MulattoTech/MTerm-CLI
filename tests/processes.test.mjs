// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-04-local-mcp
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const mod = await import('../dist/processes.js').catch(() => ({}));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const code = (c) => (e) => e?.code === c;
async function fixture(t, opts = {}) {
  assert.equal(typeof mod.ProcessService, 'function', 'ProcessService must be implemented');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-owned-process-'));
  const service = await mod.ProcessService.create(root, opts);
  t.after(async () => {
    await service.close();
    await fs.rm(root, { recursive: true, force: true });
  });
  return { root, service };
}
async function wait(service, id, predicate, timeout = 5000) {
  const deadline = Date.now() + timeout;
  let output;
  do {
    output = service.output({ sessionId: id });
    if (predicate(output)) return output;
    await sleep(20);
  } while (Date.now() < deadline);
  assert.fail(JSON.stringify(output));
}
const text = (r) => r.events.map((e) => e.text).join('');
test('disabled execution denies without starting anything', async (t) => {
  const { service } = await fixture(t);
  await assert.rejects(
    service.start({ command: process.execPath, args: ['-e', 'process.exit(0)'] }),
    code('EXEC_DISABLED'),
  );
  assert.equal(service.list().sessions.length, 0);
});
test('start preserves structured args, working directory and final exit code', async (t) => {
  const { root, service } = await fixture(t, { allowExec: true });
  const run = await service.start({
    command: process.execPath,
    args: [
      '-e',
      'console.log(JSON.stringify({cwd:process.cwd(),args:process.argv.slice(1)}));process.exitCode=7',
      'space value',
      'x;echo BAD',
      '文',
    ],
  });
  const result = await wait(service, run.sessionId, (o) => !o.running);
  assert.equal(result.exitCode, 7);
  const data = JSON.parse(text(result));
  assert.equal(data.cwd, root);
  assert.deepEqual(data.args, ['space value', 'x;echo BAD', '文']);
});
test('spawn failure has no falsely running session', async (t) => {
  const { root, service } = await fixture(t, { allowExec: true });
  await assert.rejects(service.start({ command: path.join(root, 'absent.exe'), args: [] }));
  assert.equal(service.list().sessions.filter((s) => s.running).length, 0);
  await assert.rejects(service.start({ command: process.execPath, args: [42] }));
  await assert.rejects(service.start({ command: 'node', args: [] }));
});
test('UTF8 split output survives incremental decoding and byte/event bounds', async (t) => {
  const { service } = await fixture(t, { allowExec: true, maxOutputBytes: 4096 });
  const run = await service.start({
    command: process.execPath,
    args: [
      '-e',
      "const b=Buffer.from('🌎');process.stdout.write(b.subarray(0,2));setTimeout(()=>{process.stdout.write(b.subarray(2));process.stderr.write('ERR');},15)",
    ],
  });
  const result = await wait(service, run.sessionId, (o) => !o.running);
  assert.match(text(result), /🌎/);
  assert.doesNotMatch(text(result), /�/);
  assert.ok(result.events.some((e) => e.stream === 'stderr'));
  const flood = await service.start({
    command: process.execPath,
    args: ['-e', "process.stdout.write('x'.repeat(2000000)+'END')"],
  });
  const tail = await wait(service, flood.sessionId, (o) => !o.running);
  assert.ok(tail.retainedBytes <= 4096);
  assert.ok(tail.droppedThroughSeq > 0);
  assert.equal(tail.lostOutput, true);
  assert.match(text(tail), /END/);
});
test('stdin round trip and output cursor omit already consumed events', async (t) => {
  const { service } = await fixture(t, { allowExec: true });
  const run = await service.start({
    command: process.execPath,
    args: ['-e', "process.stdin.once('data',b=>{console.log('INPUT:'+b.toString());process.exit(0)})"],
  });
  await service.input({ sessionId: run.sessionId, text: 'hello\n' });
  const r = await wait(service, run.sessionId, (o) => !o.running);
  assert.match(text(r), /INPUT:hello/);
  assert.equal(service.output({ sessionId: run.sessionId, afterSeq: r.nextSeq }).events.length, 0);
  await assert.rejects(service.input({ sessionId: run.sessionId, text: 'closed' }), code('SESSION_CLOSED'));
});
test('active slots are capped atomically and reused after stop', async (t) => {
  const { service } = await fixture(t, { allowExec: true, maxSessions: 1 });
  const a = await service.start({ command: process.execPath, args: ['-e', 'setInterval(()=>{},1000)'] });
  await assert.rejects(service.start({ command: process.execPath, args: [] }), code('SESSION_LIMIT'));
  const stopped = await service.stop({ sessionId: a.sessionId });
  assert.equal(stopped.running, false);
  const b = await service.start({ command: process.execPath, args: ['-e', 'console.log("next")'] });
  assert.notEqual(a.sessionId, b.sessionId);
  await wait(service, b.sessionId, (o) => !o.running);
});
test('timeout and server close terminate owned live jobs', async (t) => {
  const { service } = await fixture(t, { allowExec: true });
  const a = await service.start({
    command: process.execPath,
    args: ['-e', 'setInterval(()=>{},1000)'],
    timeoutMs: 150,
  });
  const r = await wait(service, a.sessionId, (o) => !o.running);
  assert.equal(r.timedOut, true);
  const b = await service.start({ command: process.execPath, args: ['-e', 'setInterval(()=>{},1000)'] });
  await service.close();
  assert.equal(service.output({ sessionId: b.sessionId }).running, false);
  await assert.rejects(service.start({ command: process.execPath, args: [] }), code('HOST_CLOSED'));
});
test('unknown/stale IDs cannot interact with unrelated system processes', async (t) => {
  const { service } = await fixture(t, { allowExec: true });
  await assert.rejects(service.stop({ sessionId: String(process.pid) }), code('SESSION_NOT_FOUND'));
  await assert.rejects(service.input({ sessionId: 'unknown', text: 'x' }), code('SESSION_NOT_FOUND'));
  assert.throws(() => service.output({ sessionId: 'unknown' }), code('SESSION_NOT_FOUND'));
});
test('child environment does not inherit unrequested credentials', async (t) => {
  const { service } = await fixture(t, { allowExec: true });
  process.env.MTERM_TEST_SECRET = 'SENTINEL_DO_NOT_FORWARD';
  t.after(() => delete process.env.MTERM_TEST_SECRET);
  const a = await service.start({
    command: process.execPath,
    args: ['-e', 'console.log(String(process.env.MTERM_TEST_SECRET))'],
  });
  const r = await wait(service, a.sessionId, (o) => !o.running);
  assert.equal(text(r).trim(), 'undefined');
});
test('owned live parent cleanup reaches its child on Windows/Unix supported path', async (t) => {
  const { service } = await fixture(t, { allowExec: true });
  const script =
    "const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});console.log(c.pid);setInterval(()=>{},1000)";
  const a = await service.start({ command: process.execPath, args: ['-e', script] });
  const output = await wait(service, a.sessionId, (o) => /\d+/.test(text(o)));
  const childPid = Number(text(output).trim());
  assert.ok(childPid > 0);
  t.after(() => {
    try {
      process.kill(childPid);
    } catch {}
  });
  await service.stop({ sessionId: a.sessionId });
  let alive = true;
  for (let i = 0; i < 100; i++) {
    try {
      process.kill(childPid, 0);
    } catch {
      alive = false;
      break;
    }
    await sleep(20);
  }
  assert.equal(alive, false, 'Only this known fixture descendant should have stopped');
});

test('small cursor pages never silently lose a suffix of a large output event', async (t) => {
  const { service } = await fixture(t, { allowExec: true, maxOutputBytes: 65536 });
  const expected = 'abc🌎'.repeat(1500);
  const a = await service.start({
    command: process.execPath,
    args: ['-e', "process.stdout.write('abc🌎'.repeat(1500))"],
  });
  await wait(service, a.sessionId, (o) => !o.running);
  let cursor = 0,
    combined = '';
  for (let i = 0; i < 100; i++) {
    const r = service.output({ sessionId: a.sessionId, afterSeq: cursor, maxBytes: 1024 });
    if (!r.events.length) break;
    combined += text(r);
    cursor = r.nextSeq;
  }
  assert.equal(combined, expected);
});

test('stdin acknowledgment says queued, never claims process consumption', async (t) => {
  const { service } = await fixture(t, { allowExec: true });
  const a = await service.start({ command: process.execPath, args: ['-e', 'setInterval(()=>{},1000)'] });
  const ack = await service.input({ sessionId: a.sessionId, text: 'buffered' });
  assert.equal(ack.queuedToStdin, true);
  assert.equal(ack.processConsumed, false);
  await service.stop({ sessionId: a.sessionId });
});
