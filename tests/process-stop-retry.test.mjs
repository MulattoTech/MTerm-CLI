// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-owned-stop-retry (OpenAI / GPT-6 Astra Pro; self-reported)
// Real owned children; the first termination-helper failure is deliberately injected.
// These cases do not claim an actual OS termination failure or detached-tree containment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const entry = path.resolve(process.env.MTERM_VERIFY_BIN ?? 'bin/mterm-cli.js');
const moduleUrl = (name) => pathToFileURL(path.resolve(path.dirname(entry), '../dist', name)).href;
const { ProcessService } = await import(moduleUrl('processes.js'));
const { ToolError } = await import(moduleUrl('errors.js'));
const code = (expected) => (error) => error?.code === expected;
const idle = ['-e', 'setInterval(()=>{},1000)'];

async function fixture(t, maxSessions = 2) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-stop-retry-'));
  const service = await ProcessService.create(root, { allowExec: true, maxSessions });
  t.after(async () => {
    // Cleanup remains reliable even when the original implementation caches the injected rejection.
    // These fixtures create no descendants; target only their captured ChildProcess objects.
    for (const session of service.sessions.values()) {
      if (session.state === 'running' || session.state === 'starting') session.child.kill('SIGKILL');
      await session.done;
    }
    await service.close();
    await fs.rm(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  });
  return service;
}

function failFirstTermination(t, service) {
  const terminate = service.terminate.bind(service);
  let attempts = 0;
  const first = Promise.withResolvers();
  t.mock.method(service, 'terminate', async (session) => {
    attempts++;
    if (attempts === 1) return first.promise;
    return terminate(session);
  });
  return {
    attempts: () => attempts,
    fail: () => first.reject(new ToolError('STOP_UNCONFIRMED', 'Injected unconfirmed fixture stop.')),
  };
}

test('an explicit retry can stop an owned child after unconfirmed cleanup without releasing its slot early', async (t) => {
  const service = await fixture(t, 1);
  const run = await service.start({ command: process.execPath, args: idle });
  const injected = failFirstTermination(t, service);
  const failed = service.stop({ sessionId: run.sessionId });
  injected.fail();
  await assert.rejects(failed, code('STOP_UNCONFIRMED'));
  assert.equal(service.output({ sessionId: run.sessionId }).running, true);
  assert.equal(service.resourceStatus().usage.activeJobs, 1);
  assert.equal(injected.attempts(), 1, 'Failure must not trigger an automatic retry');
  await assert.rejects(service.start({ command: process.execPath, args: idle }), code('SESSION_LIMIT'));

  const stopped = await service.stop({ sessionId: run.sessionId });
  assert.equal(injected.attempts(), 2);
  assert.equal(stopped.running, false);
  assert.equal(service.resourceStatus().usage.activeJobs, 0);
  const next = await service.start({ command: process.execPath, args: idle });
  assert.notEqual(next.sessionId, run.sessionId);
  await service.stop({ sessionId: next.sessionId });
});

test('concurrent stop callers share one failed attempt and one explicit successful retry', async (t) => {
  const service = await fixture(t);
  const run = await service.start({ command: process.execPath, args: idle });
  const unrelated = await service.start({ command: process.execPath, args: idle });
  const injected = failFirstTermination(t, service);
  const first = service.stop({ sessionId: run.sessionId });
  const second = service.stop({ sessionId: run.sessionId });
  assert.equal(injected.attempts(), 1);
  injected.fail();
  const failures = await Promise.allSettled([first, second]);
  assert.ok(
    failures.every((result) => result.status === 'rejected' && result.reason.code === 'STOP_UNCONFIRMED'),
  );
  assert.equal(injected.attempts(), 1);

  const recovered = await Promise.all([
    service.stop({ sessionId: run.sessionId }),
    service.stop({ sessionId: run.sessionId }),
  ]);
  assert.equal(injected.attempts(), 2, 'Retry callers must coalesce while termination is pending');
  assert.ok(recovered.every((result) => result.running === false));
  assert.equal(service.output({ sessionId: unrelated.sessionId }).running, true);
  assert.equal(service.resourceStatus().usage.activeJobs, 1);
  await assert.rejects(service.stop({ sessionId: String(process.pid) }), code('SESSION_NOT_FOUND'));
});

test('a late observed child close replaces an earlier stop failure without sending another signal', async (t) => {
  const service = await fixture(t);
  const run = await service.start({
    command: process.execPath,
    args: ['-e', "process.stdin.once('data',()=>process.exit(0))"],
  });
  const injected = failFirstTermination(t, service);
  const failed = service.stop({ sessionId: run.sessionId });
  injected.fail();
  await assert.rejects(failed, code('STOP_UNCONFIRMED'));
  await service.input({ sessionId: run.sessionId, text: 'finish\n' });
  await service.sessions.get(run.sessionId).done;
  const stopped = await service.stop({ sessionId: run.sessionId });
  assert.equal(stopped.running, false);
  assert.equal(stopped.state, 'exited');
  assert.equal(service.output({ sessionId: run.sessionId }).exitCode, 0);
  assert.equal(injected.attempts(), 1, 'An observed closed child must never be signaled again');
});

test('host close can retry a prior failed stop while keeping admission closed', async (t) => {
  const service = await fixture(t);
  const run = await service.start({ command: process.execPath, args: idle });
  const injected = failFirstTermination(t, service);
  const failed = service.stop({ sessionId: run.sessionId });
  injected.fail();
  await assert.rejects(failed, code('STOP_UNCONFIRMED'));
  await service.close();
  assert.equal(injected.attempts(), 2);
  assert.equal(service.output({ sessionId: run.sessionId }).running, false);
  await assert.rejects(service.start({ command: process.execPath, args: idle }), code('HOST_CLOSED'));
  await service.close();
  assert.equal(injected.attempts(), 2);
});

test('a failed host close preserves ownership for a later explicit close retry', async (t) => {
  const service = await fixture(t, 1);
  const run = await service.start({ command: process.execPath, args: idle });
  const injected = failFirstTermination(t, service);
  const failed = service.close();
  injected.fail();
  await assert.rejects(failed, code('CLEANUP_UNCONFIRMED'));
  assert.equal(service.output({ sessionId: run.sessionId }).running, true);
  assert.equal(service.resourceStatus().usage.activeJobs, 1);
  assert.equal(injected.attempts(), 1);
  await assert.rejects(service.start({ command: process.execPath, args: idle }), code('HOST_CLOSED'));
  await service.close();
  assert.equal(injected.attempts(), 2);
  assert.equal(service.output({ sessionId: run.sessionId }).running, false);
});
