// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-pairing-expiry (OpenAI / GPT-6 Astra Pro; self-reported)
// Actual gateway/public routes and signed synthetic Access identities; owned
// serialized storage and barriers around real digests. No live network or agents.
import test from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { createGateway } from '../gateway/app.mjs';
import { MTermRegistry } from '../gateway/registry.mjs';
import { verifyAccess } from '../gateway/security.mjs';

const origin = 'https://mcp.test.invalid';
const dashboard = 'https://mterm.test.invalid';
const keys = await crypto.subtle.generateKey(
  {
    name: 'RSASSA-PKCS1-v1_5',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
  },
  true,
  ['sign', 'verify'],
);
let fixtureNumber = 0;
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
class MemoryStorage {
  data = new Map();
  alarmAt = null;
  checkpoint = async () => {};
  failPutPrefix = null;
  async get(key) {
    const value = structuredClone(this.data.get(key));
    await this.checkpoint({ kind: 'get', key });
    return value;
  }
  async put(key, value) {
    await this.checkpoint({ kind: 'put-start', key, value: structuredClone(value) });
    if (this.failPutPrefix && key.startsWith(this.failPutPrefix)) {
      this.failPutPrefix = null;
      throw new Error('owned-fixture-storage-fault');
    }
    this.data.set(key, structuredClone(value));
    await this.checkpoint({ kind: 'put', key });
  }
  async delete(key) {
    await this.checkpoint({ kind: 'delete-start', key });
    const result = this.data.delete(key);
    await this.checkpoint({ kind: 'delete', key });
    return result;
  }
  async list({ prefix = '', limit = 1000, startAfter = '' }) {
    const page = new Map(
      [...this.data]
        .filter(([key]) => key.startsWith(prefix) && key > startAfter)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, limit)
        .map(([key, value]) => [key, structuredClone(value)]),
    );
    await this.checkpoint({ kind: 'list', prefix });
    return page;
  }
  async getAlarm() {
    return this.alarmAt;
  }
  async setAlarm(value) {
    this.alarmAt = value;
  }
}
async function fixture(t) {
  const clock = { at: Date.now() };
  t.mock.method(Date, 'now', () => clock.at);
  t.mock.method(globalThis, 'fetch', async () =>
    assert.fail('External network is forbidden in pairing fixtures.'),
  );
  const issuer = 'https://owned-pair-' + ++fixtureNumber + '.cloudflareaccess.com';
  const jwk = {
    ...(await crypto.subtle.exportKey('jwk', keys.publicKey)),
    kid: 'owned-pairing-key',
    alg: 'RS256',
    use: 'sig',
  };
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: jwk.kid })).toString('base64url');
  const claims = Buffer.from(
    JSON.stringify({
      type: 'app',
      iss: issuer,
      aud: ['owned-pairing-audience'],
      sub: 'owner@example.test',
      email: 'owner@example.test',
      exp: Math.floor(clock.at / 1000) + 3600,
      iat: Math.floor(clock.at / 1000) - 5,
    }),
  ).toString('base64url');
  const signature = Buffer.from(
    await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      keys.privateKey,
      new TextEncoder().encode(header + '.' + claims),
    ),
  ).toString('base64url');
  const jwt = header + '.' + claims + '.' + signature;
  const fetcher = async (url) => {
    assert.equal(String(url), issuer + '/cdn-cgi/access/certs');
    return Response.json({ keys: [jwk] });
  };
  const env = {
    PUBLIC_ORIGIN: origin,
    DASHBOARD_ORIGIN: dashboard,
    ACCESS_ISSUER: issuer,
    ACCESS_AUDIENCE: 'owned-pairing-audience',
    ALLOWED_EMAILS: 'owner@example.test',
    ENVIRONMENT: 'staging',
    BUILD_SHA: 'owned-pairing-expiry-fixture',
    MCP_ENABLED: 'true',
  };
  const storage = new MemoryStorage();
  let queue = Promise.resolve();
  const registry = new MTermRegistry(
    {
      storage,
      blockConcurrencyWhile(action) {
        const next = queue.then(action);
        queue = next.catch(() => {});
        return next;
      },
    },
    env,
  );
  env.REGISTRY = { idFromName: () => 'one', get: () => ({ fetch: (request) => registry.fetch(request) }) };
  const app = createGateway({ fetcher });
  const owner = await verifyAccess(
    new Request(dashboard + '/api/dashboard', { headers: { 'cf-access-jwt-assertion': jwt } }),
    env,
    fetcher,
  );
  let active = null;
  async function checkpoint(event) {
    const gate = active;
    if (!gate) return;
    gate.events.push(event);
    if (!gate.hit && gate.matches(event, gate.events)) {
      gate.hit = true;
      gate.hits++;
      gate.entered.resolve();
      await gate.release.promise;
    }
  }
  storage.checkpoint = checkpoint;
  const nativeDigest = crypto.subtle.digest.bind(crypto.subtle);
  t.mock.method(crypto.subtle, 'digest', async (algorithm, data) => {
    const result = await nativeDigest(algorithm, data);
    await checkpoint({ kind: 'digest', text: new TextDecoder().decode(data) });
    return result;
  });
  t.after(() => {
    active?.release.resolve();
    active = null;
  });
  async function request(path, { privateRoute = false, body, token } = {}) {
    const response = await app.fetch(
      new Request((privateRoute ? dashboard : origin) + path, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(privateRoute ? { origin: dashboard, 'cf-access-jwt-assertion': jwt } : {}),
          ...(token ? { authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify(body),
      }),
      env,
      { waitUntil() {} },
    );
    return { status: response.status, data: await response.json() };
  }
  const approve = (pair, userCode = pair.userCode) =>
    request('/api/pair/approve', {
      privateRoute: true,
      body: { pairId: pair.pairId, userCode },
    });
  const poll = (pair, deviceCode = pair.deviceCode) =>
    request('/api/pair/poll', {
      body: { pairId: pair.pairId, deviceCode },
    });
  async function pairing(approved = false) {
    const started = await request('/api/pair/start', {
      body: { name: 'Owned pairing fixture', platform: 'linux', capabilities: ['mterm_read_file'] },
    });
    assert.equal(started.status, 201);
    const pair = started.data;
    if (approved) assert.equal((await approve(pair)).status, 200);
    return pair;
  }
  function arm(phase, pair, { userCode = pair.userCode, deviceCode = pair.deviceCode } = {}) {
    assert.equal(active, null);
    const epochKey = 'epoch:' + owner.userId;
    const pairKey = 'pair:' + pair.pairId;
    const pollRateKey = 'rate:pair-poll:' + pair.pairId;
    const matches = (event, events) => {
      const epochs = events.filter((entry) => entry.kind === 'get' && entry.key === epochKey).length;
      if (phase === 'user-code-hash')
        return event.kind === 'digest' && event.text === userCode.trim().toUpperCase();
      if (phase === 'device-code-hash') return event.kind === 'digest' && event.text === deviceCode;
      if (phase === 'inventory-list')
        return event.kind === 'list' && event.prefix === 'user-device:' + owner.userId + ':';
      if (phase === 'approval-inventory-epoch' || phase === 'approved-owner-epoch') {
        return event.kind === 'get' && event.key === epochKey && epochs === 1;
      }
      if (phase === 'approval-final-epoch' || phase === 'approved-inventory-epoch') {
        return event.kind === 'get' && event.key === epochKey && epochs === 2;
      }
      if (phase === 'rate-read') return event.kind === 'get' && event.key === pollRateKey;
      if (phase === 'rate-write') return event.kind === 'put' && event.key === pollRateKey;
      if (phase === 'approval-rate-read')
        return event.kind === 'get' && event.key === 'rate:pair-approve:' + owner.userId;
      if (phase === 'credential-hash')
        return (
          event.kind === 'digest' &&
          epochs === 2 &&
          events.some(
            (entry) => entry.kind === 'list' && entry.prefix === 'user-device:' + owner.userId + ':',
          )
        );
      if (phase === 'approval-write') return event.kind === 'put-start' && event.key === pairKey;
      if (phase === 'pair-consume') return event.kind === 'delete-start' && event.key === pairKey;
      assert.fail('Unknown controlled await phase.');
    };
    active = { phase, events: [], entered: deferred(), release: deferred(), hit: false, hits: 0, matches };
    return active;
  }
  async function cross(phase, pair, offset, action, codeOverrides) {
    const gate = arm(phase, pair, codeOverrides);
    clock.at = pair.expiresAt - 2;
    const pending = action();
    let timer;
    try {
      await Promise.race([
        gate.entered.promise,
        pending.then(() => {
          throw new Error('The selected asynchronous boundary was not reached.');
        }),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Owned barrier timed out.')), 3000);
        }),
      ]);
      clock.at = pair.expiresAt + offset;
      gate.release.resolve();
      const response = await pending;
      assert.equal(gate.hits, 1, 'The intended asynchronous boundary must be crossed exactly once.');
      return { response, events: gate.events, hitCount: gate.hits };
    } finally {
      clearTimeout(timer);
      gate.release.resolve();
      active = null;
    }
  }
  const pairRecord = (pair) => structuredClone(storage.data.get('pair:' + pair.pairId));
  const count = (prefix) => [...storage.data.keys()].filter((key) => key.startsWith(prefix)).length;
  async function usable(response) {
    assert.equal(response.status, 200);
    assert.equal(typeof response.data.deviceId, 'string');
    assert.equal(typeof response.data.deviceToken, 'string');
    const result = await request('/api/agent/poll', {
      token: response.data.deviceToken,
      body: { version: 1, deviceId: response.data.deviceId },
    });
    assert.equal(result.status, 200);
  }
  async function fullDeviceInventory() {
    for (let i = 0; i < 20; i++) {
      const id = crypto.randomUUID();
      await storage.put('device:' + id, { id, userId: owner.userId, epoch: 0 });
      await storage.put('user-device:' + owner.userId + ':' + id, { id });
    }
  }
  return {
    clock,
    storage,
    owner,
    request,
    approve,
    poll,
    pairing,
    cross,
    pairRecord,
    count,
    usable,
    fullDeviceInventory,
  };
}

function rejected(f, pair, previous, attempt, status, error) {
  assert.equal(attempt.response.status, status);
  assert.equal(attempt.response.data.error, error);
  assert.equal(typeof attempt.response.data.deviceToken, 'undefined');
  assert.ok(isDeepStrictEqual(f.pairRecord(pair), previous), 'The pairing record must remain unchanged.');
  const authorityWrites = attempt.events.filter(
    (event) =>
      event.kind === 'put-start' &&
      (event.key === 'pair:' + pair.pairId ||
        event.key.startsWith('device:') ||
        event.key.startsWith('agent:') ||
        event.key.startsWith('user-device:') ||
        (event.key.startsWith('audit:') && event.value.decision === 'pair-read')),
  );
  assert.equal(
    authorityWrites.length,
    0,
    'Rejected decisions must not attempt approval, credentials, indices or pairing-success audit.',
  );
  assert.equal(
    attempt.events.some((event) => event.kind === 'delete-start' && event.key === 'pair:' + pair.pairId),
    false,
  );
}
const phases = [
  ['approval', ['user-code-hash', 'inventory-list', 'approval-inventory-epoch', 'approval-final-epoch']],
  ['pending', ['device-code-hash', 'rate-read', 'rate-write']],
  [
    'approved',
    [
      'device-code-hash',
      'rate-read',
      'rate-write',
      'approved-owner-epoch',
      'inventory-list',
      'approved-inventory-epoch',
      'credential-hash',
    ],
  ],
];
for (const [flow, awaitPhases] of phases)
  for (const phase of awaitPhases)
    for (const offset of [-1, 0, 1]) {
      test(
        'pairing expiry: ' + flow + ' settles at ' + offset + 'ms during ' + phase,
        { timeout: 10000 },
        async (t) => {
          const f = await fixture(t);
          const pair = await f.pairing(flow === 'approved');
          const previous = f.pairRecord(pair);
          const attempt = await f.cross(phase, pair, offset, () =>
            flow === 'approval' ? f.approve(pair) : f.poll(pair),
          );
          if (offset >= 0) {
            rejected(
              f,
              pair,
              previous,
              attempt,
              flow === 'approval' ? 400 : 410,
              flow === 'approval' ? 'invalid_pairing' : 'pairing_expired',
            );
          } else if (flow === 'approval') {
            assert.equal(attempt.response.status, 200);
            assert.equal(f.pairRecord(pair).userId, f.owner.userId);
            assert.equal(f.pairRecord(pair).epoch, 0);
            assert.equal(f.count('device:'), 0);
          } else if (flow === 'pending') {
            assert.equal(attempt.response.status, 202);
            assert.equal(attempt.response.data.pending, true);
            assert.ok(isDeepStrictEqual(f.pairRecord(pair), previous));
            assert.equal(f.count('device:'), 0);
          } else {
            assert.equal(f.pairRecord(pair), undefined);
            await f.usable(attempt.response);
            assert.equal(f.count('device:'), 1);
            assert.equal(f.count('agent:'), 1);
            assert.equal(f.count('user-device:'), 1);
          }
        },
      );
    }
for (const flow of ['approval', 'pending', 'approved']) {
  test('pairing expiry: already-expired ' + flow + ' entry remains rejected', async (t) => {
    const f = await fixture(t);
    const pair = await f.pairing(flow === 'approved');
    const previous = f.pairRecord(pair);
    f.clock.at = pair.expiresAt;
    const response = flow === 'approval' ? await f.approve(pair) : await f.poll(pair);
    rejected(
      f,
      pair,
      previous,
      { response, events: [] },
      flow === 'approval' ? 400 : 410,
      flow === 'approval' ? 'invalid_pairing' : 'pairing_expired',
    );
    assert.equal(f.count('device:'), 0);
    assert.equal(f.count('agent:'), 0);
    assert.equal(f.count('user-device:'), 0);
  });
  test('pairing expiry: wrong code keeps ' + flow + ' error precedence', async (t) => {
    const f = await fixture(t);
    const pair = await f.pairing(flow === 'approved');
    const previous = f.pairRecord(pair);
    const userCode = 'WRONGCODE',
      deviceCode = 'wrong-owned-device-code';
    const attempt = await f.cross(
      flow === 'approval' ? 'user-code-hash' : 'device-code-hash',
      pair,
      0,
      () => (flow === 'approval' ? f.approve(pair, userCode) : f.poll(pair, deviceCode)),
      { userCode, deviceCode },
    );
    rejected(f, pair, previous, attempt, flow === 'approval' ? 400 : 403, 'invalid_pairing');
  });
  test('pairing expiry: rate limit keeps ' + flow + ' error precedence', async (t) => {
    const f = await fixture(t);
    const pair = await f.pairing(flow === 'approved');
    const previous = f.pairRecord(pair);
    const rateKey =
      flow === 'approval' ? 'rate:pair-approve:' + f.owner.userId : 'rate:pair-poll:' + pair.pairId;
    await f.storage.put(rateKey, { count: flow === 'approval' ? 10 : 90, expiresAt: pair.expiresAt + 60000 });
    const attempt = await f.cross(flow === 'approval' ? 'approval-rate-read' : 'rate-read', pair, 0, () =>
      flow === 'approval' ? f.approve(pair) : f.poll(pair),
    );
    rejected(f, pair, previous, attempt, 429, 'rate_limited');
  });
}
for (const flow of ['approval', 'approved']) {
  test('pairing expiry: full inventory keeps ' + flow + ' device-limit precedence', async (t) => {
    const f = await fixture(t);
    const pair = await f.pairing(flow === 'approved');
    await f.fullDeviceInventory();
    const previous = f.pairRecord(pair);
    const attempt = await f.cross(flow === 'approval' ? 'user-code-hash' : 'device-code-hash', pair, 0, () =>
      flow === 'approval' ? f.approve(pair) : f.poll(pair),
    );
    rejected(f, pair, previous, attempt, 409, 'device_limit');
    assert.equal(f.count('device:'), 20);
  });
}
test('pairing expiry: revoked approval keeps its existing polling error precedence', async (t) => {
  const f = await fixture(t);
  const pair = await f.pairing(true);
  const previous = f.pairRecord(pair);
  await f.storage.put('epoch:' + f.owner.userId, 1);
  const attempt = await f.cross('device-code-hash', pair, 0, () => f.poll(pair));
  rejected(f, pair, previous, attempt, 410, 'pairing_revoked');
});
test('pairing expiry: a successful claim remains single-use and its credential works', async (t) => {
  const f = await fixture(t);
  const pair = await f.pairing(true);
  const claimed = await f.poll(pair);
  await f.usable(claimed);
  const replay = await f.poll(pair);
  assert.equal(replay.status, 410);
  assert.equal(replay.data.error, 'pairing_expired');
  assert.equal(f.count('device:'), 1);
  assert.equal(f.count('agent:'), 1);
  assert.equal(f.count('user-device:'), 1);
});
test('pairing expiry: failed credential persistence still consumes before create and cannot replay', async (t) => {
  const f = await fixture(t);
  const pair = await f.pairing(true);
  f.storage.failPutPrefix = 'agent:';
  const first = await f.poll(pair);
  assert.equal(first.status, 500);
  assert.equal(JSON.stringify(first.data).includes('owned-fixture-storage-fault'), false);
  assert.equal(f.pairRecord(pair), undefined);
  assert.equal(f.count('device:'), 1);
  assert.equal(f.count('agent:'), 0);
  assert.equal(f.count('user-device:'), 0);
  const replay = await f.poll(pair);
  assert.equal(replay.status, 410);
  assert.equal(f.count('device:'), 1);
});
test('pairing expiry: rejecting one expired pair leaves an independent live pair usable', async (t) => {
  const f = await fixture(t);
  const expired = await f.pairing(true);
  f.clock.at += 1000;
  const live = await f.pairing(true);
  const previous = f.pairRecord(expired);
  const denied = await f.cross('inventory-list', expired, 0, () => f.poll(expired));
  const claimed = await f.poll(live);
  await f.usable(claimed);
  rejected(f, expired, previous, denied, 410, 'pairing_expired');
  assert.equal(f.count('device:'), 1);
});
test('pairing expiry: denial permits existing rate bookkeeping and expired-index cleanup', async (t) => {
  const f = await fixture(t);
  const pair = await f.pairing(true);
  const previous = f.pairRecord(pair);
  const id = crypto.randomUUID();
  const expiredIndex = 'user-device:' + f.owner.userId + ':' + id;
  await f.storage.put(expiredIndex, { id, expiresAt: pair.expiresAt - 1 });
  const attempt = await f.cross('inventory-list', pair, 0, () => f.poll(pair));
  assert.equal(f.storage.data.has(expiredIndex), false);
  assert.equal(f.storage.data.get('rate:pair-poll:' + pair.pairId).count, 1);
  rejected(f, pair, previous, attempt, 410, 'pairing_expired');
});
test('pairing expiry: a live approval decision may finish its storage write after expiry', async (t) => {
  const f = await fixture(t);
  const pair = await f.pairing();
  const attempt = await f.cross('approval-write', pair, 1, () => f.approve(pair));
  assert.equal(attempt.response.status, 200);
  assert.equal(f.pairRecord(pair).userId, f.owner.userId);
  assert.equal(f.pairRecord(pair).epoch, 0);
  assert.equal(f.count('device:'), 0);
});
test('pairing expiry: a live claim decision may finish consume/create I/O after expiry', async (t) => {
  const f = await fixture(t);
  const pair = await f.pairing(true);
  const attempt = await f.cross('pair-consume', pair, 1, () => f.poll(pair));
  assert.equal(f.pairRecord(pair), undefined);
  await f.usable(attempt.response);
  assert.equal(f.count('device:'), 1);
  assert.equal(f.count('agent:'), 1);
  assert.equal(f.count('user-device:'), 1);
});
