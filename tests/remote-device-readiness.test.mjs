// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-12-device-readiness-observations (OpenAI / GPT-6 Astra Pro; self-reported)
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MTermRegistry } from '../gateway/registry.mjs';
import { sha256 } from '../gateway/security.mjs';
import { RemoteAgent, GatewayTransport } from '../dist/remote/agent.js';

// Owned in-memory observations only. No listener, network request, credentials or source writes.
const originalNow = Date.now;
let clock = 1800000000000;
Date.now = () => clock;
class MemoryStorage {
  data = new Map();
  alarm = null;
  beforeList;
  beforeGet;
  async get(key) {
    await this.beforeGet?.(key);
    return structuredClone(this.data.get(key));
  }
  async put(key, value) {
    this.data.set(key, structuredClone(value));
  }
  async delete(key) {
    return this.data.delete(key);
  }
  async getAlarm() {
    return this.alarm;
  }
  async setAlarm(value) {
    this.alarm = value;
  }
  async list({ prefix = '', limit = 1000, startAfter = '' } = {}) {
    await this.beforeList?.(prefix);
    return new Map(
      [...this.data]
        .filter(([k]) => k.startsWith(prefix) && k > startAfter)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, limit)
        .map(([k, v]) => [k, structuredClone(v)]),
    );
  }
}
async function fixture({ lastSeen = clock, owner = 'synthetic-owner' } = {}) {
  const storage = new MemoryStorage();
  let queue = Promise.resolve();
  const registry = new MTermRegistry(
    {
      storage,
      blockConcurrencyWhile(callback) {
        const p = queue.then(callback);
        queue = p.catch(() => {});
        return p;
      },
    },
    { PUBLIC_ORIGIN: 'https://owned.test.invalid', DASHBOARD_ORIGIN: 'https://dashboard.test.invalid' },
  );
  const deviceId = randomUUID(),
    grantId = randomUUID();
  const userId = owner,
    clientId = 'synthetic-client-' + owner;
  const deviceToken = 'synthetic-owned-device-token-' + owner,
    token = 'synthetic-owned-access-token-' + owner;
  const deviceHash = await sha256(deviceToken),
    tokenHash = await sha256(token);
  await storage.put('device:' + deviceId, {
    id: deviceId,
    userId,
    epoch: 0,
    tokenHash: deviceHash,
    name: 'Owned observation fixture',
    platform: 'linux',
    capabilities: ['mterm_file_info'],
    createdAt: clock - 100000,
    lastSeen,
  });
  await storage.put('user-device:' + userId + ':' + deviceId, { id: deviceId });
  await storage.put('agent:' + deviceHash, { deviceId });
  await storage.put('grant:' + grantId, { id: grantId, userId, clientId, expiresAt: clock + 600000 });
  await storage.put('token:' + tokenHash, {
    kind: 'access',
    userId,
    clientId,
    grantId,
    epoch: 0,
    expiresAt: clock + 600000,
    resource: 'https://owned.test.invalid/mcp',
    scope: 'mterm:read',
  });
  async function call(action, data) {
    const response = await registry.fetch(
      new Request('https://registry.test.invalid', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, data }),
      }),
    );
    return { status: response.status, data: await response.json() };
  }
  return {
    storage,
    registry,
    deviceId,
    deviceToken,
    token,
    tokenHash,
    grantId,
    userId,
    clientId,
    call,
    poll: (extra = {}) =>
      call('agentPoll', { token: deviceToken, input: { version: 1, deviceId, ...extra } }),
    list: () => call('listDevices', { token }),
    enqueue: (rpcId = 1) =>
      call('enqueue', { token, deviceId, tool: 'mterm_file_info', arguments: { path: '.' }, rpcId }),
    row: () => storage.get('device:' + deviceId),
  };
}

import test, { after } from 'node:test';
test.beforeEach(() => {
  clock = 1800000000000;
});
after(() => {
  Date.now = originalNow;
});
for (const boundary of ['job-list', 'active-lookup']) {
  test(
    'enqueue rejects a device that becomes stale during ' + boundary + ' without admission writes',
    async () => {
      const f = await fixture({ lastSeen: clock - 14999 });
      let advanced = false;
      const advance = () => {
        if (!advanced) {
          clock += 1;
          advanced = true;
        }
      };
      if (boundary === 'job-list')
        f.storage.beforeList = async (prefix) => {
          if (prefix === 'job:') advance();
        };
      else
        f.storage.beforeGet = async (key) => {
          if (key.startsWith('active:')) advance();
        };
      const result = await f.enqueue();
      assert.equal(advanced, true, 'The actual asynchronous admission read must cross freshness expiry');
      assert.equal(result.status, 409, 'Do not admit a new job after the device has become stale');
      assert.equal(result.data.error, 'device_offline');
      assert.equal(
        [...f.storage.data.keys()].some((key) => key.startsWith('job:') || key.startsWith('active:')),
        false,
      );
    },
  );
}
test('control: a device still fresh after admission reads can enqueue', async () => {
  const f = await fixture({ lastSeen: clock - 14999 });
  assert.equal((await f.enqueue()).status, 200);
  assert.equal([...f.storage.data.keys()].filter((key) => key.startsWith('job:')).length, 1);
});
test('control: a device already stale on entry rejects without admission', async () => {
  const f = await fixture({ lastSeen: clock - 15000 });
  const result = await f.enqueue();
  assert.equal(result.status, 409);
  assert.equal(result.data.error, 'device_offline');
  assert.equal(
    [...f.storage.data.keys()].some((key) => key.startsWith('job:') || key.startsWith('active:')),
    false,
  );
});

const resultBody = (isError = false) => ({
  isError,
  content: [{ type: 'text', text: 'synthetic-private-result-body' }],
  structuredContent: { ok: !isError, privateDetail: 'synthetic-private-structured-detail' },
});
const submitResult = (f, requestId, result = resultBody(), extra = {}) =>
  f.call('agentResult', {
    token: f.deviceToken,
    input: { version: 1, deviceId: f.deviceId, requestId, result, ...extra },
  });
async function delivered(f, rpcId = 1) {
  const queued = await f.enqueue(rpcId);
  assert.equal(queued.status, 200);
  const polled = await f.poll({ availableSlots: 1 });
  assert.equal(polled.status, 200);
  assert.equal(polled.data.requests.length, 1);
  assert.equal(polled.data.requests[0].requestId, queued.data.requestId);
  return queued.data;
}
async function inventory(f) {
  const response = await f.list();
  assert.equal(response.status, 200);
  assert.equal(response.data.devices.length, 1);
  return response.data.devices[0];
}

test('a never-polled registration has unknown executor health and no readiness evidence', async () => {
  const f = await fixture({ lastSeen: null });
  const d = await inventory(f);
  assert.equal(d.status, 'offline');
  assert.deepEqual(d.observations, {
    observedAt: clock,
    pollObservedAt: null,
    lastReportedCapacity: null,
    lastAcceptedResult: null,
    executorHealth: 'unknown',
  });
});

for (const slots of [0, 1, 4]) {
  test(
    'an authenticated ' + slots + '-slot poll records an offer without asserting executor health',
    async () => {
      const f = await fixture({ lastSeen: null });
      const polledAt = clock;
      assert.equal((await f.poll({ availableSlots: slots })).status, 200);
      clock += 3;
      const d = await inventory(f);
      assert.equal(d.status, 'online');
      assert.equal(d.lastSeen, polledAt);
      assert.deepEqual(d.observations, {
        observedAt: clock,
        pollObservedAt: polledAt,
        lastReportedCapacity: { at: polledAt, slots },
        lastAcceptedResult: null,
        executorHealth: 'unknown',
      });
    },
  );
}

test('legacy polls clear the earlier capacity claim while preserving four-request delivery', async () => {
  const f = await fixture();
  await f.poll({ availableSlots: 2 });
  for (let i = 0; i < 4; i++) assert.equal((await f.enqueue(i)).status, 200);
  clock += 2;
  const poll = await f.poll();
  assert.equal(poll.status, 200);
  assert.equal(poll.data.requests.length, 4);
  const d = await inventory(f);
  assert.deepEqual(d.observations.lastReportedCapacity, { at: clock, slots: null });
  assert.equal(d.observations.executorHealth, 'unknown');
});

test('a consumed capacity offer stays an historical offer instead of current free slots', async () => {
  const f = await fixture();
  const job = await delivered(f);
  const d = await inventory(f);
  assert.deepEqual(d.observations.lastReportedCapacity, { at: clock, slots: 1 });
  assert.equal((await f.storage.get('job:' + job.requestId)).status, 'delivered');
  assert.equal(Object.hasOwn(d.observations, 'availableSlots'), false);
  assert.equal(Object.hasOwn(d.observations, 'ready'), false);
  assert.equal(d.observations.executorHealth, 'unknown');
});

test('invalid and unauthenticated polls cannot refresh stored observations', async () => {
  const f = await fixture();
  await f.poll({ availableSlots: 1 });
  const before = await f.row();
  clock += 100;
  for (const slots of [null, false, '0', -1, 5, 0.5, {}, []]) {
    assert.equal((await f.poll({ availableSlots: slots })).status, 400);
    assert.deepEqual(await f.row(), before);
  }
  assert.equal(
    (
      await f.call('agentPoll', {
        token: 'wrong-synthetic-device-token',
        input: { version: 1, deviceId: f.deviceId, availableSlots: 4 },
      })
    ).status,
    401,
  );
  assert.deepEqual(await f.row(), before);
});

for (const isError of [false, true]) {
  test('an accepted ' + (isError ? 'error' : 'success') + ' records only its outcome and time', async () => {
    const f = await fixture();
    const job = await delivered(f);
    const polledAt = clock;
    clock += 14000;
    assert.equal((await submitResult(f, job.requestId, resultBody(isError))).status, 200);
    const d = await inventory(f);
    assert.equal(d.lastSeen, polledAt, 'Result acceptance must not refresh presence');
    assert.deepEqual(d.observations.lastReportedCapacity, { at: polledAt, slots: 1 });
    assert.deepEqual(d.observations.lastAcceptedResult, {
      at: clock,
      outcome: isError ? 'error' : 'success',
    });
    assert.equal(d.observations.executorHealth, 'unknown');
    const text = JSON.stringify(d);
    for (const secret of [
      f.token,
      f.deviceToken,
      f.tokenHash,
      job.requestId,
      'synthetic-private-result-body',
      'synthetic-private-structured-detail',
    ]) {
      assert.equal(
        text.includes(secret),
        false,
        'Inventory excludes private result and authorization values',
      );
    }
  });
}

for (const kind of ['expired', 'revoked-grant', 'mismatched-device', 'malformed', 'oversized']) {
  test('a rejected ' + kind + ' result does not create accepted-result evidence', async () => {
    const f = await fixture();
    const job = await delivered(f);
    let body = resultBody();
    let extra = {};
    let expected;
    if (kind === 'expired') {
      clock = job.deadline;
      expected = 410;
    } else if (kind === 'revoked-grant') {
      const grant = await f.storage.get('grant:' + f.grantId);
      await f.storage.put('grant:' + f.grantId, { ...grant, revokedAt: clock });
      expected = 410;
    } else if (kind === 'mismatched-device') {
      extra = { deviceId: randomUUID() };
      expected = 403;
    } else if (kind === 'malformed') {
      body = { ...body, isError: 'false' };
      expected = 400;
    } else {
      body = { ...body, content: [{ type: 'text', text: 'x'.repeat(262145) }] };
      expected = 413;
    }
    const response = await submitResult(f, job.requestId, body, extra);
    assert.equal(response.status, expected);
    assert.equal((await f.row()).lastAcceptedResult ?? null, null);
  });
}

test('a replayed completion cannot replace the accepted result observation', async () => {
  const f = await fixture();
  const job = await delivered(f);
  assert.equal((await submitResult(f, job.requestId)).status, 200);
  const before = (await f.row()).lastAcceptedResult;
  assert.deepEqual(before, { at: clock, outcome: 'success' });
  clock += 10;
  assert.equal((await submitResult(f, job.requestId, resultBody(true))).status, 409);
  assert.deepEqual((await f.row()).lastAcceptedResult, before);
});

test('observations survive registry reconstruction without becoming live health proof', async () => {
  const f = await fixture();
  const job = await delivered(f);
  await submitResult(f, job.requestId);
  const before = (await inventory(f)).observations;
  let queue = Promise.resolve();
  const reconstructed = new MTermRegistry(
    {
      storage: f.storage,
      blockConcurrencyWhile(fn) {
        const next = queue.then(fn);
        queue = next.catch(() => {});
        return next;
      },
    },
    { PUBLIC_ORIGIN: 'https://owned.test.invalid' },
  );
  const response = await reconstructed.fetch(
    new Request('https://registry.test.invalid', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'listDevices', data: { token: f.token } }),
    }),
  );
  assert.equal(response.status, 200);
  const d = (await response.json()).devices[0];
  assert.deepEqual(d.observations, before);
  assert.equal(d.observations.executorHealth, 'unknown');
});

test('old stored device rows remain readable with unknown unrecorded capacity', async () => {
  const f = await fixture();
  const d = await inventory(f);
  assert.equal(d.status, 'online');
  assert.deepEqual(d.observations, {
    observedAt: clock,
    pollObservedAt: clock,
    lastReportedCapacity: null,
    lastAcceptedResult: null,
    executorHealth: 'unknown',
  });
});

for (const [age, expected] of [
  [14999, 'online'],
  [15000, 'reconnecting'],
  [44999, 'reconnecting'],
  [45000, 'offline'],
]) {
  test('presence at ' + age + ' ms remains separate from retained observations', async () => {
    const f = await fixture();
    const at = clock;
    await f.poll({ availableSlots: 4 });
    clock += age;
    const d = await inventory(f);
    assert.equal(d.status, expected);
    assert.equal(d.observations.pollObservedAt, at);
    assert.deepEqual(d.observations.lastReportedCapacity, { at, slots: 4 });
    assert.equal(d.observations.executorHealth, 'unknown');
  });
}

for (const badTime of [null, -1, Infinity, NaN, '1800000000000', true, 1800000000001]) {
  test(
    'invalid or future poll timestamp ' + String(badTime) + ' cannot admit work or imply presence',
    async () => {
      const f = await fixture({ lastSeen: badTime });
      const response = await f.enqueue();
      assert.equal(response.status, 409);
      assert.equal(response.data.error, 'device_offline');
      const d = await inventory(f);
      assert.equal(d.status, 'offline');
      assert.equal(d.lastSeen, null);
      assert.equal(d.observations.pollObservedAt, null);
    },
  );
}

for (const boundary of ['grant-list', 'job-list', 'audit-list']) {
  test('dashboard projects presence after the final ' + boundary + ' await', async () => {
    const f = await fixture({ lastSeen: clock - 14999 });
    const prefix = boundary === 'grant-list' ? 'user-grant:' : boundary === 'job-list' ? 'job:' : 'audit:';
    let advanced = false;
    f.storage.beforeList = async (value) => {
      if (!advanced && value.startsWith(prefix)) {
        clock++;
        advanced = true;
      }
    };
    const view = await f.call('dashboard', { identity: { userId: f.userId, kind: 'user' } });
    assert.equal(view.status, 200);
    assert.equal(advanced, true);
    assert.equal(view.data.devices[0].status, 'reconnecting');
    assert.equal(view.data.devices[0].observations.observedAt, clock);
  });
}

test('observation projection whitelists fields and rejects corrupt stored observations', async () => {
  const f = await fixture();
  const d = await f.row();
  await f.storage.put('device:' + f.deviceId, {
    ...d,
    lastReportedCapacity: { at: clock, slots: 5, secret: 'synthetic-corrupt-capacity-secret' },
    lastAcceptedResult: { at: clock, outcome: 'synthetic-arbitrary-error-secret' },
    secret: 'synthetic-device-record-secret',
  });
  const listed = await inventory(f);
  assert.deepEqual(
    Object.keys(listed).sort(),
    [
      'id',
      'name',
      'platform',
      'capabilities',
      'permissions',
      'createdAt',
      'lastSeen',
      'status',
      'observations',
    ].sort(),
  );
  assert.deepEqual(
    Object.keys(listed.observations).sort(),
    ['observedAt', 'pollObservedAt', 'lastReportedCapacity', 'lastAcceptedResult', 'executorHealth'].sort(),
  );
  assert.equal(listed.observations.lastReportedCapacity, null);
  assert.equal(listed.observations.lastAcceptedResult, null);
  assert.equal(JSON.stringify(listed).includes('secret'), false);
});

test('an explicitly stale target fails while another owned device is fresh', async () => {
  const f = await fixture({ lastSeen: clock - 15000 });
  const freshId = randomUUID();
  await f.storage.put('device:' + freshId, { ...(await f.row()), id: freshId, lastSeen: clock });
  await f.storage.put('user-device:' + f.userId + ':' + freshId, { id: freshId });
  assert.equal((await f.enqueue()).status, 409);
  assert.equal(
    [...f.storage.data.keys()].some((key) => key.startsWith('job:')),
    false,
  );
  const response = await f.call('enqueue', {
    token: f.token,
    deviceId: freshId,
    tool: 'mterm_file_info',
    arguments: { path: '.' },
    rpcId: 1,
  });
  assert.equal(response.status, 200);
  assert.equal((await f.storage.get('job:' + response.data.requestId)).deviceId, freshId);
});

test('device observations remain owner-filtered and disappear with revocation', async () => {
  const f = await fixture();
  const foreign = await fixture({ owner: 'synthetic-other-owner' });
  await foreign.poll({ availableSlots: 3 });
  for (const [key, value] of foreign.storage.data) await f.storage.put(key, value);
  const job = await delivered(f);
  await submitResult(f, job.requestId);
  const own = await inventory(f);
  assert.equal(own.id, f.deviceId);
  assert.equal(JSON.stringify(own).includes(foreign.deviceId), false);
  assert.equal(JSON.stringify(own).includes(foreign.token), false);
  const theirs = await f.call('listDevices', { token: foreign.token });
  assert.equal(theirs.status, 200);
  assert.equal(theirs.data.devices.length, 1);
  assert.equal(theirs.data.devices[0].id, foreign.deviceId);
  assert.deepEqual(theirs.data.devices[0].observations.lastReportedCapacity, { at: clock, slots: 3 });
  assert.equal(theirs.data.devices[0].observations.lastAcceptedResult, null);
  assert.equal(
    (await f.call('agentRevoke', { token: f.deviceToken, input: { deviceId: f.deviceId } })).status,
    200,
  );
  assert.deepEqual((await f.list()).data.devices, []);
  assert.equal((await f.poll({ availableSlots: 4 })).status, 410);
  assert.equal((await submitResult(f, job.requestId)).status, 410);
  assert.equal((await f.call('listDevices', { token: foreign.token })).data.devices.length, 1);
});

test('a result expiring during authorization reads cannot refresh the accepted observation', async () => {
  const f = await fixture();
  const job = await delivered(f);
  let epochReads = 0;
  f.storage.beforeGet = async (key) => {
    if (key === 'epoch:' + f.userId && ++epochReads === 2) clock = job.deadline;
  };
  const response = await submitResult(f, job.requestId);
  assert.equal(epochReads, 2);
  assert.equal(response.status, 410);
  assert.equal(response.data.error, 'request_expired');
  assert.equal((await f.row()).lastAcceptedResult ?? null, null);
});

test('gateway poll observations never imply that the actual agent accepted a response', async () => {
  const f = await fixture({ lastSeen: null });
  const controller = new AbortController();
  const events = [];
  const transport = new GatewayTransport(
    'https://owned.test.invalid',
    f.deviceToken,
    async (url, options) => {
      assert.equal(url, 'https://owned.test.invalid/api/agent/poll');
      const input = JSON.parse(options.body);
      assert.equal((await f.poll({ availableSlots: input.availableSlots })).status, 200);
      return Response.json({ malformedControlledResponse: true });
    },
  );
  const agent = new RemoteAgent({
    adapter: {
      deviceId: f.deviceId,
      execute: async () => {
        throw Error('No execution is authorized in this fixture');
      },
    },
    transport,
    sleep: async () => {},
    onEvent(event) {
      events.push(event.state);
      if (event.state === 'reconnecting') controller.abort();
    },
  });
  await agent.run(controller.signal);
  assert.equal(events.includes('online'), false);
  assert.equal(events.includes('reconnecting'), true);
  const d = await inventory(f);
  assert.equal(d.status, 'online');
  assert.deepEqual(d.observations.lastReportedCapacity, { at: clock, slots: 4 });
  assert.equal(d.observations.lastAcceptedResult, null);
  assert.equal(d.observations.executorHealth, 'unknown');
});
