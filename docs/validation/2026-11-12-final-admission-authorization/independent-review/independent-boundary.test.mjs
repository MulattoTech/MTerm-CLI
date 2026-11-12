import test from 'node:test';
import assert from 'node:assert/strict';
import { MTermRegistry as CandidateRegistry } from '../MTerm-CLI-Admission/gateway/registry.mjs';
import { MTermRegistry as BaselineRegistry } from './baseline/gateway/registry.mjs';
import { createGateway } from '../MTerm-CLI-Admission/gateway/app.mjs';
import { sha256 } from '../MTerm-CLI-Admission/gateway/security.mjs';
import { READ_TOOLS } from '../MTerm-CLI-Admission/dist/remote/protocol.js';

const origin = 'https://review.test.invalid';
class MemoryStorage {
  data = new Map();
  on = () => {};
  async get(key) {
    const value = structuredClone(this.data.get(key));
    await Promise.resolve();
    this.on('get', key);
    return value;
  }
  async put(key, value) {
    this.data.set(key, structuredClone(value));
    await Promise.resolve();
    this.on('put', key);
  }
  async delete(key) {
    const result = this.data.delete(key);
    await Promise.resolve();
    this.on('delete', key);
    return result;
  }
  async list({ prefix = '', limit = 1000, startAfter = '' } = {}) {
    const values = new Map([...this.data]
      .filter(([key]) => key.startsWith(prefix) && key > startAfter)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, limit)
      .map(([key, value]) => [key, structuredClone(value)]));
    await Promise.resolve();
    this.on('list', prefix);
    return values;
  }
  async getAlarm() { return 1; }
  async setAlarm() {}
}

async function fixture(t, { Registry = CandidateRegistry, lifetime = 'token', rpcId = 7 } = {}) {
  const clock = { now: 1794520000000 }, expiry = clock.now + 1000;
  t.mock.method(Date, 'now', () => clock.now);
  t.mock.method(globalThis, 'fetch', async () => assert.fail('No fixture network request allowed'));
  const storage = new MemoryStorage();
  let queue = Promise.resolve();
  const ctx = {
    storage,
    blockConcurrencyWhile(fn) {
      const current = queue.then(fn);
      queue = current.catch(() => {});
      return current;
    },
  };
  const env = {
    PUBLIC_ORIGIN: origin,
    DASHBOARD_ORIGIN: 'https://dashboard.review.test.invalid',
    ACCESS_ISSUER: 'https://identity.review.test.invalid',
    ACCESS_AUDIENCE: 'synthetic-review-audience',
    ALLOWED_EMAILS: 'review@example.test',
    ENVIRONMENT: 'staging', MCP_ENABLED: 'true',
  };
  const registry = new Registry(ctx, env);
  env.REGISTRY = { idFromName: () => 'review', get: () => registry };
  const accessToken = 'a'.repeat(43), agentToken = 'b'.repeat(43);
  const tokenHash = await sha256(accessToken), agentHash = await sha256(agentToken);
  const deviceId = 'a4444444-4444-4444-a444-444444444444';
  const grantId = 'a5555555-5555-4555-a555-555555555555';
  const userId = 'review-owner', clientId = 'review-client';
  await storage.put('device:' + deviceId, {
    id: deviceId, userId, tokenHash: agentHash, epoch: 0, platform: 'linux',
    capabilities: READ_TOOLS.map((tool) => tool.name), lastSeen: clock.now,
  });
  await storage.put('agent:' + agentHash, { deviceId });
  await storage.put('user-device:' + userId + ':' + deviceId, { id: deviceId });
  await storage.put('grant:' + grantId, {
    id: grantId, userId, clientId, expiresAt: lifetime === 'grant' ? expiry : expiry + 60000,
  });
  await storage.put('token:' + tokenHash, {
    kind: 'access', userId, clientId, grantId, epoch: 0,
    expiresAt: lifetime === 'token' ? expiry : expiry + 60000,
    resource: origin + '/mcp', scope: 'mterm:read',
  });
  const call = async (action, data) => {
    const response = await registry.fetch(new Request(origin + '/private', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, data }),
    }));
    return { status: response.status, body: await response.json() };
  };
  let transition, crossings = 0;
  storage.on = (operation, key) => {
    if (transition?.operation !== operation || !key.startsWith(transition.prefix)) return;
    if (--transition.remaining > 0) return;
    clock.now = transition.at;
    transition = undefined;
    crossings++;
  };
  const originalDigest = crypto.subtle.digest;
  t.mock.method(crypto.subtle, 'digest', async function (...args) {
    const value = await originalDigest.apply(this, args);
    if (new TextDecoder().decode(args[1]) === JSON.stringify(rpcId)) storage.on('digest', 'rpc');
    return value;
  });
  return {
    env, registry, storage, clock, expiry, deviceId, grantId, accessToken, agentToken, tokenHash, rpcId, call,
    cross(phase, at) {
      const [operation, prefix, remaining = 1] = {
        'rate-get': ['get', 'rate:tools:'],
        'rate-put': ['put', 'rate:tools:'],
        'device-get': ['get', 'device:'],
        'device-epoch': ['get', 'epoch:', 2],
        'job-list': ['list', 'job:'],
        'cleanup-delete': ['delete', 'job:'],
        'rpc-digest': ['digest', 'rpc'],
        'active-get': ['get', 'active:'],
        'job-put': ['put', 'job:'],
      }[phase];
      transition = { operation, prefix, remaining, at };
    },
    crossed: () => crossings,
    enqueue(extra = {}) {
      return call('enqueue', {
        token: accessToken, deviceId, tool: 'mterm_file_info', arguments: { path: 'review-owned.txt' },
        rpcId, ...extra,
      });
    },
    poll: () => call('agentPoll', { token: agentToken, input: { version: 1, deviceId } }),
    admissions: () => [...storage.data].filter(([key]) => /^(job|active):/.test(key)),
    queuedAudits: () => [...storage.data].filter(([key, value]) => key.startsWith('audit:') &&
      value.decision === 'allow-read' && value.result === 'queued'),
    async publicCall(tool = 'mterm_file_info', args = { path: 'review-owned.txt' }) {
      const response = await createGateway().fetch(new Request(origin + '/mcp', {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + accessToken },
        body: JSON.stringify({ jsonrpc: '2.0', id: rpcId, method: 'tools/call',
          params: { name: tool, arguments: { deviceId, ...args } } }),
      }), env);
      return { status: response.status, body: await response.json(), challenge: response.headers.get('www-authenticate') };
    },
  };
}

for (const lifetime of ['token', 'grant']) {
  test('baseline admits late ' + lifetime + ' expiry across the final awaited read', async (t) => {
    const f = await fixture(t, { Registry: BaselineRegistry, lifetime });
    f.cross('active-get', f.expiry);
    const response = await f.enqueue();
    assert.equal(f.crossed(), 1);
    assert.equal(response.status, 200);
    assert.equal(f.admissions().length, 2);
    assert.equal(f.queuedAudits().length, 1);
    const delivery = await f.poll();
    assert.equal(delivery.status, 200);
    assert.equal(delivery.body.requests.length, lifetime === 'token' ? 1 : 0);
    assert.deepEqual(await f.call('jobResult', { token: f.accessToken, requestId: response.body.requestId }),
      { status: 401, body: { error: 'invalid_token' } });
  });
  for (const phase of ['rate-get', 'rate-put', 'device-get', 'device-epoch', 'job-list', 'cleanup-delete', 'rpc-digest', 'active-get']) {
    for (const offset of [-1, 0, 1]) {
      test(`candidate ${lifetime} expiry ${offset} at ${phase}`, async (t) => {
        const f = await fixture(t, { lifetime, rpcId: offset === 0 ? 7 : '7' });
        if (phase === 'cleanup-delete') await f.storage.put('job:expired-owned-fixture', { expiresAt: f.clock.now - 1 });
        f.cross(phase, f.expiry + offset);
        const response = await f.enqueue();
        assert.equal(f.crossed(), 1);
        assert.equal(response.status, offset < 0 ? 200 : 401);
        if (offset >= 0) {
          assert.deepEqual(response.body, { error: 'invalid_token' });
          assert.deepEqual(f.admissions(), []);
          assert.deepEqual(f.queuedAudits(), []);
          assert.deepEqual((await f.poll()).body.requests, []);
        } else {
          assert.equal(f.admissions().length, 2);
          assert.equal(f.queuedAudits().length, 1);
          assert.equal((await f.poll()).body.requests[0].requestId, response.body.requestId);
        }
      });
    }
  }
  test('candidate valid ' + lifetime + ' admission keeps its decision while storage finishes later', async (t) => {
    const f = await fixture(t, { lifetime });
    f.clock.now = f.expiry - 1;
    f.cross('job-put', f.expiry + 1);
    const response = await f.enqueue();
    assert.equal(response.status, 200);
    assert.equal(f.crossed(), 1);
    assert.equal(f.admissions().length, 2);
    assert.equal(f.queuedAudits().length, 1);
  });
  for (const tool of READ_TOOLS) {
    test('public route denies late ' + lifetime + ' for ' + tool.name, async (t) => {
      const f = await fixture(t, { lifetime });
      f.cross('active-get', f.expiry);
      const args = Object.fromEntries(tool.inputSchema.required.map((name) => [name, 'review-owned']));
      const response = await f.publicCall(tool.name, args);
      assert.equal(f.crossed(), 1);
      assert.equal(response.status, 401);
      assert.deepEqual(response.body, { error: 'invalid_token' });
      assert.match(response.challenge, /^Bearer .*error="invalid_token"/);
      assert.deepEqual(f.admissions(), []);
      assert.deepEqual(f.queuedAudits(), []);
    });
  }
}

test('public access projection excludes internal authorization metadata', async (t) => {
  const f = await fixture(t);
  assert.deepEqual(await f.call('access', { token: f.accessToken }), {
    status: 200, body: { userId: 'review-owner', clientId: 'review-client', scope: 'mterm:read' },
  });
});

test('grant expiry snapshot comes from the validated grant, not a stale token field or input', async (t) => {
  const f = await fixture(t, { lifetime: 'grant' });
  const key = 'token:' + f.tokenHash, token = await f.storage.get(key);
  token.grantExpiresAt = f.expiry + 60000;
  await f.storage.put(key, token);
  f.cross('active-get', f.expiry);
  assert.deepEqual(await f.enqueue({ grantExpiresAt: f.expiry + 60000, expiresAt: f.expiry + 60000 }),
    { status: 401, body: { error: 'invalid_token' } });
  assert.deepEqual(f.admissions(), []);
});

test('terminal refusal frees the serialized handler for a valid independent grant', async (t) => {
  const f = await fixture(t);
  f.cross('active-get', f.expiry);
  assert.equal((await f.enqueue()).status, 401);
  const token = await f.storage.get('token:' + f.tokenHash);
  token.expiresAt = f.expiry + 60000;
  token.clientId = 'independent-client'; token.grantId = 'independent-grant';
  await f.storage.put('grant:' + token.grantId, {
    id: token.grantId, userId: token.userId, clientId: token.clientId, expiresAt: token.expiresAt,
  });
  const independent = 'c'.repeat(43);
  await f.storage.put('token:' + await sha256(independent), token);
  const response = await f.enqueue({ token: independent });
  assert.equal(response.status, 200);
  const delivered = (await f.poll()).body.requests;
  assert.equal(delivered[0].requestId, response.body.requestId);
});
