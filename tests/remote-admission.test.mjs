// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-poll-capacity (OpenAI / GPT-6 Astra Pro; self-reported)
// Actual agent/transport/gateway/registry with isolated storage and controlled adapter/response gates.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { setImmediate as turn } from 'node:timers/promises';
import { createGateway } from '../gateway/app.mjs';
import { MTermRegistry } from '../gateway/registry.mjs';
import { sha256 } from '../gateway/security.mjs';

const entry = path.resolve(process.env.MTERM_VERIFY_BIN ?? 'bin/mterm-cli.js');
const { RemoteAgent, GatewayTransport } = await import(
  pathToFileURL(path.resolve(path.dirname(entry), '../dist/remote/agent.js')).href
);
const origin = 'https://gateway.test.invalid';
const deferred = () => {
  const { promise, resolve } = Promise.withResolvers();
  return { promise, release: resolve };
};
async function bounded(promise, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Fixture stalled: ' + label)), 5000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
class MemoryStorage {
  data = new Map();
  alarmAt = null;
  async get(key) {
    return structuredClone(this.data.get(key));
  }
  async put(key, value) {
    this.data.set(key, structuredClone(value));
  }
  async delete(key) {
    return this.data.delete(key);
  }
  async list({ prefix = '', limit = 1000, startAfter = '' } = {}) {
    return new Map(
      [...this.data]
        .filter(([key]) => key.startsWith(prefix) && key > startAfter)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, limit),
    );
  }
  async getAlarm() {
    return this.alarmAt;
  }
  async setAlarm(value) {
    this.alarmAt = value;
  }
}
async function fixture() {
  const storage = new MemoryStorage();
  let queue = Promise.resolve();
  const ctx = {
    storage,
    blockConcurrencyWhile(callback) {
      const pending = queue.then(callback);
      queue = pending.catch(() => {});
      return pending;
    },
  };
  const env = {
    PUBLIC_ORIGIN: origin,
    DASHBOARD_ORIGIN: 'https://dashboard.test.invalid',
    ACCESS_ISSUER: 'https://identity.cloudflareaccess.com',
    ACCESS_AUDIENCE: 'synthetic-audience',
    ALLOWED_EMAILS: 'owner@example.test',
    ENVIRONMENT: 'staging',
    MCP_ENABLED: 'true',
  };
  const registry = new MTermRegistry(ctx, env);
  env.REGISTRY = { idFromName: () => 'fixture', get: () => registry };
  const app = createGateway();
  const deviceId = randomUUID(),
    grantId = randomUUID(),
    userId = 'fixture-owner',
    clientId = 'fixture-client',
    agentToken = 'synthetic-agent-' + randomUUID(),
    accessToken = 'synthetic-access-' + randomUUID();
  const agentHash = await sha256(agentToken),
    accessHash = await sha256(accessToken),
    expiresAt = Date.now() + 600000;
  await storage.put('device:' + deviceId, {
    id: deviceId,
    userId,
    epoch: 0,
    tokenHash: agentHash,
    capabilities: ['mterm_file_info'],
    lastSeen: Date.now(),
  });
  await storage.put('agent:' + agentHash, { deviceId });
  await storage.put('grant:' + grantId, { id: grantId, userId, clientId, expiresAt });
  await storage.put('token:' + accessHash, {
    kind: 'access',
    userId,
    clientId,
    grantId,
    epoch: 0,
    expiresAt,
    resource: origin + '/mcp',
    scope: 'mterm:read',
  });
  async function call(action, data) {
    const response = await registry.fetch(
      new Request(origin + '/internal', {
        method: 'POST',
        body: JSON.stringify({ action, data }),
        headers: { 'content-type': 'application/json' },
      }),
    );
    return { status: response.status, data: await response.json() };
  }
  async function ok(action, data) {
    const result = await call(action, data);
    assert.equal(result.status, 200, JSON.stringify(result.data));
    return result.data;
  }
  const enqueue = (rpcId) =>
    ok('enqueue', {
      token: accessToken,
      deviceId,
      tool: 'mterm_file_info',
      arguments: { path: 'fixture.txt' },
      rpcId,
    });
  const poll = (offer = {}) =>
    call('agentPoll', { token: agentToken, input: { version: 1, deviceId, ...offer } });
  const job = (id) => storage.get('job:' + id);
  return { app, env, storage, registry, call, ok, enqueue, poll, job, deviceId, agentToken, accessToken };
}

test('gateway delivers only the offered slots and retains queued deadlines and arguments', async () => {
  for (const availableSlots of [0, 1, 2, 3, 4]) {
    const f = await fixture();
    const jobs = [];
    for (let i = 0; i < 4; i++) jobs.push(await f.enqueue(i));
    const before = await Promise.all(jobs.map((j) => f.job(j.requestId)));
    const result = await f.poll({ availableSlots });
    assert.equal(result.status, 200);
    assert.equal(result.data.requests.length, availableSlots);
    const delivered = new Set(result.data.requests.map((r) => r.requestId));
    for (const previous of before) {
      const current = await f.job(previous.requestId);
      assert.equal(current.deadline, previous.deadline);
      assert.deepEqual(current.arguments, previous.arguments);
      assert.equal(current.status, delivered.has(current.requestId) ? 'delivered' : 'queued');
      if (!delivered.has(current.requestId)) assert.equal(current.deliveredAt, undefined);
    }
  }
});

test('gateway rejects malformed slot offers before changing jobs or heartbeat', async () => {
  const f = await fixture();
  const queued = await f.enqueue(1);
  const before = await f.job(queued.requestId);
  const heartbeat = (await f.storage.get('device:' + f.deviceId)).lastSeen;
  for (const availableSlots of [null, false, '0', -1, 5, 1.5, {}, [], Number.MAX_SAFE_INTEGER]) {
    const response = await f.poll({ availableSlots });
    assert.equal(response.status, 400, JSON.stringify(availableSlots));
    assert.equal(response.data.error, 'invalid_capacity');
    assert.deepEqual(await f.job(queued.requestId), before);
    assert.equal((await f.storage.get('device:' + f.deviceId)).lastSeen, heartbeat);
  }
});

test('omitted capacity preserves the legacy four-request poll contract', async () => {
  const f = await fixture();
  for (let i = 0; i < 4; i++) await f.enqueue(i);
  const response = await f.poll();
  assert.equal(response.status, 200);
  assert.equal(response.data.requests.length, 4);
  assert.equal((await f.poll()).data.requests.length, 0, 'Delivered work is not replayed');
});

test('zero-capacity polls still report cancellation and expiry without later executing expired work', async (t) => {
  let clock = Date.now();
  t.mock.method(Date, 'now', () => clock);
  const f = await fixture();
  const jobs = [];
  for (let i = 0; i < 3; i++) jobs.push(await f.enqueue(i));
  const ordered = (await Promise.all(jobs.map((j) => f.job(j.requestId)))).sort((a, b) =>
    ('job:' + a.requestId).localeCompare('job:' + b.requestId),
  );
  ordered[1].deadline = clock - 1;
  await f.storage.put('job:' + ordered[1].requestId, ordered[1]);
  const cancelledRpc = jobs.findIndex((j) => j.requestId === ordered[2].requestId);
  await f.ok('cancel', { token: f.accessToken, rpcId: cancelledRpc });
  clock += 1;
  const zero = await f.poll({ availableSlots: 0 });
  assert.equal(zero.status, 200);
  assert.deepEqual(zero.data.requests, []);
  assert.deepEqual(new Set(zero.data.cancelled), new Set([ordered[1].requestId, ordered[2].requestId]));
  assert.equal((await f.storage.get('device:' + f.deviceId)).lastSeen, clock);
  assert.equal((await f.job(ordered[0].requestId)).status, 'queued');
  assert.equal((await f.job(ordered[1].requestId)).status, 'timeout');
  assert.equal((await f.job(ordered[2].requestId)).status, 'cancelled');
  const next = await f.poll({ availableSlots: 4 });
  assert.deepEqual(
    next.data.requests.map((r) => r.requestId),
    [ordered[0].requestId],
  );
  assert.equal((await f.job(ordered[1].requestId)).deliveredAt, undefined);
  assert.equal((await f.job(ordered[2].requestId)).deliveredAt, undefined);
});

test('capacity offers do not bypass device authentication, ownership or revocation', async () => {
  const f = await fixture();
  const queued = await f.enqueue(1);
  const before = await f.job(queued.requestId);
  for (const [token, deviceId, expected] of [
    ['synthetic-invalid', f.deviceId, 401],
    [f.agentToken, randomUUID(), 403],
  ]) {
    const response = await f.call('agentPoll', { token, input: { version: 1, deviceId, availableSlots: 0 } });
    assert.equal(response.status, expected);
    assert.deepEqual(await f.job(queued.requestId), before);
  }
  await f.ok('agentRevoke', { token: f.agentToken, input: { deviceId: f.deviceId } });
  assert.equal((await f.poll({ availableSlots: 0 })).status, 410);
  assert.equal((await f.job(queued.requestId)).status, 'revoked');
});

for (const mode of ['cancelled cleanup', 'timed-out cleanup', 'result delivery']) {
  test(
    'agent retains delivery capacity through ' + mode + ' and resumes each queued request once',
    async (t) => {
      let clock = Date.now();
      if (mode === 'timed-out cleanup') t.mock.method(Date, 'now', () => clock);
      const f = await fixture();
      const originals = [];
      for (let i = 0; i < 4; i++) originals.push(await f.enqueue(i));
      const fifth = await f.call('enqueue', {
        token: f.accessToken,
        deviceId: f.deviceId,
        tool: 'mterm_file_info',
        arguments: { path: 'fixture.txt' },
        rpcId: 99,
      });
      assert.equal(fifth.status, 429);
      assert.equal(fifth.data.error, 'device_busy');
      const originalIds = new Set(originals.map((j) => j.requestId));
      const gates = new Map(originals.map((j) => [j.requestId, deferred()]));
      const settled = new Map(originals.map((j) => [j.requestId, deferred()]));
      const settledAttempts = new Map();
      const originalResponsesReady = deferred(),
        replacementResponsesReady = deferred();
      let replacementResponses = 0;
      const controller = new AbortController();
      const executed = [],
        aborted = new Set(),
        history = [],
        online = [],
        resultAttempts = [];
      const ready = [],
        pendingSleeps = new Set();
      let waiting, failure;
      const nextStep = async () => {
        if (failure) throw failure;
        if (ready.length) return ready.shift();
        waiting = deferred();
        return bounded(waiting.promise, mode + ' poll');
      };
      const sleep = async (ms, signal) => {
        if (ms !== 2000 || signal.aborted) return; // Result retries use their real 500/1000-ms path without wall-clock waits.
        const gate = deferred();
        pendingSleeps.add(gate);
        signal.addEventListener('abort', gate.release, { once: true });
        if (waiting) {
          const receiver = waiting;
          waiting = undefined;
          receiver.release(gate);
        } else ready.push(gate);
        try {
          await gate.promise;
        } finally {
          pendingSleeps.delete(gate);
          signal.removeEventListener('abort', gate.release);
        }
      };
      const adapter = {
        deviceId: f.deviceId,
        async execute(request, signal) {
          executed.push(request.requestId);
          const observe = () => aborted.add(request.requestId);
          signal.addEventListener('abort', observe, { once: true });
          const gate = gates.get(request.requestId) ?? deferred();
          gates.set(request.requestId, gate);
          try {
            if (mode !== 'result delivery' || !originalIds.has(request.requestId)) await gate.promise;
            return {
              version: 1,
              deviceId: f.deviceId,
              requestId: request.requestId,
              result: { content: [], structuredContent: { ok: !signal.aborted }, isError: signal.aborted },
            };
          } finally {
            signal.removeEventListener('abort', observe);
          }
        },
      };
      const fetcher = async (url, options) => {
        try {
          const input = JSON.parse(options.body);
          const response = await f.app.fetch(new Request(url, options), f.env, { waitUntil() {} });
          if (url.endsWith('/api/agent/poll')) {
            history.push({ input, status: response.status, data: await response.clone().json() });
            if (history.length > 25) throw new Error('Unexpected fixture poll loop');
          } else {
            resultAttempts.push({ requestId: input.requestId, status: response.status });
            if (resultAttempts.filter((r) => originalIds.has(r.requestId)).length === 4)
              originalResponsesReady.release();
            if (mode === 'result delivery' && originalIds.has(input.requestId))
              await gates.get(input.requestId).promise;
          }
          return response;
        } catch (error) {
          failure ??= error;
          throw error;
        }
      };
      const actualTransport = new GatewayTransport(origin, f.agentToken, fetcher);
      const transport = {
        async post(endpoint, input, signal) {
          try {
            return await actualTransport.post(endpoint, input, signal);
          } finally {
            // Observe complete real transport settlement, including HTTP error handling/retries.
            if (endpoint === '/api/agent/result') {
              if (originalIds.has(input.requestId)) {
                const count = (settledAttempts.get(input.requestId) ?? 0) + 1;
                settledAttempts.set(input.requestId, count);
                if (count === (mode === 'cancelled cleanup' ? 3 : 1)) settled.get(input.requestId).release();
              } else if (++replacementResponses === 2) replacementResponsesReady.release();
            }
          }
        },
      };
      const releaseOriginal = async (id) => {
        gates.get(id).release();
        if (mode !== 'timed-out cleanup')
          await bounded(settled.get(id).promise, 'original transport settlement');
        // After the observed final await, drain the agent's promise-finally slot release.
        await turn();
      };
      const agent = new RemoteAgent({
        adapter,
        transport,
        sleep,
        random: () => 0,
        onEvent: (event) => {
          if (event.state === 'online') online.push(event.activeRequests);
        },
      });
      const running = agent.run(controller.signal);
      let step;
      try {
        step = await nextStep();
        assert.equal(history[0].status, 200, JSON.stringify(history[0].data));
        assert.equal(executed.length, 4);
        if (mode === 'result delivery') {
          await bounded(originalResponsesReady.promise, 'four original gateway responses');
          assert.equal(resultAttempts.length, 4);
          assert.ok(resultAttempts.every((r) => r.status === 200));
          for (const job of originals)
            assert.equal(
              (await f.ok('jobResult', { token: f.accessToken, requestId: job.requestId })).pending,
              undefined,
            );
        } else if (mode === 'timed-out cleanup') {
          clock += 20001;
          // Keep the device online while advancing past the jobs' real broker deadlines.
          assert.equal((await f.poll({ availableSlots: 0 })).status, 200);
          for (const job of originals) {
            const result = await f.ok('jobResult', { token: f.accessToken, requestId: job.requestId });
            assert.equal(result.result.structuredContent.error.code, 'REMOTE_TIMEOUT');
          }
        } else {
          for (let i = 0; i < 4; i++) await f.ok('cancel', { token: f.accessToken, rpcId: i });
        }
        const replacements = [await f.enqueue(4), await f.enqueue(5)];
        step.release();
        step = await nextStep();
        assert.deepEqual(history.at(-1).data.requests, []);
        assert.equal(executed.length, 4);
        assert.equal(online.at(-1), 4);
        if (mode !== 'result delivery') assert.deepEqual(aborted, originalIds);
        for (const job of replacements) assert.equal((await f.job(job.requestId)).status, 'queued');
        assert.equal(history[0].input.availableSlots, 4);
        assert.equal(history.at(-1).input.availableSlots, 0);
        await releaseOriginal(originals[0].requestId);
        step.release();
        step = await nextStep();
        assert.equal(executed.length, 5, 'Exactly one cleanup/response releases one slot');
        assert.equal(history.at(-1).input.availableSlots, 1);
        assert.equal(history.at(-1).data.requests.length, 1);
        const first = executed[4],
          second = replacements.find((j) => j.requestId !== first);
        assert.ok(replacements.some((j) => j.requestId === first));
        assert.equal((await f.job(second.requestId)).status, 'queued');
        await Promise.all(originals.slice(1).map((job) => releaseOriginal(job.requestId)));
        step.release();
        step = await nextStep();
        assert.equal(executed.length, 6);
        assert.equal(new Set(executed).size, 6, 'No adapter execution is replayed');
        assert.ok(online.every((active) => active <= 4));
        for (const job of replacements) gates.get(job.requestId).release();
        await bounded(replacementResponsesReady.promise, 'two replacement transport settlements');
        for (const job of replacements) assert.equal((await f.job(job.requestId)).status, 'complete');
        if (mode === 'cancelled cleanup') {
          assert.equal(resultAttempts.filter((r) => originalIds.has(r.requestId)).length, 12);
          assert.ok(
            resultAttempts.filter((r) => originalIds.has(r.requestId)).every((r) => r.status === 409),
          );
        }
        if (mode === 'timed-out cleanup')
          assert.equal(resultAttempts.filter((r) => originalIds.has(r.requestId)).length, 0);
      } finally {
        controller.abort();
        for (const gate of gates.values()) gate.release();
        for (const gate of pendingSleeps) gate.release();
        assert.equal((await bounded(running, mode + ' teardown')).reason, 'stopped');
      }
      if (failure) throw failure;
    },
  );
}
