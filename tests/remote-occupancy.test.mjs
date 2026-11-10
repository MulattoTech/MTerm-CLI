// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-10-remote-occupancy (OpenAI / GPT-6 Astra Pro; self-reported)
// Source gateway contract only: synthetic signed identities and serialized memory storage.
// Internal enqueue/result controls deliberately retain completions that public MCP consumes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createGateway } from '../gateway/app.mjs';
import { MTermRegistry } from '../gateway/registry.mjs';
import { randomToken, sha256 } from '../gateway/security.mjs';

const origin = 'https://occupancy-mcp.test.invalid';
const dashboardOrigin = 'https://occupancy-dashboard.test.invalid';
const issuer = 'https://occupancy.cloudflareaccess.com';
const initialTime = Date.UTC(2026, 10, 10, 1, 0, 0);
const tool = 'mterm_file_info';
const digest = (value) => createHash('sha256').update(value).digest('hex');
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const canonical = (value) =>
  JSON.stringify(value, (_, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => compare(a, b)))
      : item,
  );
const sourceBindings = {};
for (const name of [
  'gateway/app.mjs',
  'gateway/registry.mjs',
  'gateway/security.mjs',
  'gateway/dashboard.mjs',
  'dist/remote/protocol.js',
  'tests/remote-occupancy.test.mjs',
]) {
  const bytes = await readFile(new URL('../' + name, import.meta.url));
  sourceBindings[name] = { bytes: bytes.length, sha256: digest(bytes) };
}

class MemoryStorage {
  data = new Map();
  alarmAt = null;
  lists = [];
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
    this.lists.push({ prefix, limit, startAfterPresent: Boolean(startAfter) });
    return new Map(
      [...this.data]
        .filter(([key]) => key.startsWith(prefix) && key > startAfter)
        .sort(([a], [b]) => compare(a, b))
        .slice(0, limit)
        .map(([key, value]) => [key, structuredClone(value)]),
    );
  }
  async getAlarm() {
    return this.alarmAt;
  }
  async setAlarm(value) {
    this.alarmAt = value;
  }
}

function projectSession(job) {
  return {
    requestId: job.requestId,
    deviceId: job.deviceId,
    tool: job.tool,
    deadline: job.deadline,
    status: job.status,
  };
}

function sortedSessions(sessions) {
  return [...sessions].sort((a, b) => compare(a.requestId, b.requestId));
}

function requireAdmission(response, deviceId, queued, delivered, completed, occupied, remaining) {
  const device = response.devices.find((item) => item.id === deviceId);
  assert.equal(Boolean(device), true, 'The selected owned device must be returned');
  assert.deepEqual(device.registryAdmission, {
    limit: 4,
    queued,
    delivered,
    completedAwaitingConsumption: completed,
    occupied,
    remaining,
  });
  assert.equal(Object.values(device.registryAdmission).every(Number.isSafeInteger), true);
}

async function fixture(t, report) {
  let currentTime = initialTime;
  t.mock.method(Date, 'now', () => currentTime);
  const secrets = [];
  const remember = (value) => {
    if (typeof value === 'string' && value.length >= 8) secrets.push(value);
    return value;
  };
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
  const jwk = {
    ...(await crypto.subtle.exportKey('jwk', keys.publicKey)),
    kid: randomToken(8),
    alg: 'RS256',
    use: 'sig',
  };
  const env = {
    PUBLIC_ORIGIN: origin,
    DASHBOARD_ORIGIN: dashboardOrigin,
    ACCESS_ISSUER: issuer,
    ACCESS_AUDIENCE: 'occupancy-fixture',
    ALLOWED_EMAILS: 'owner@example.test,other@example.test',
    ENVIRONMENT: 'staging',
    BUILD_SHA: 'occupancy-fixture',
    MCP_ENABLED: 'true',
  };
  const storage = new MemoryStorage();
  let queue = Promise.resolve();
  let pending = 0;
  const registry = new MTermRegistry(
    {
      storage,
      blockConcurrencyWhile(fn) {
        const next = queue.then(fn);
        queue = next.catch(() => {});
        return next;
      },
    },
    env,
  );
  env.REGISTRY = {
    idFromName: () => 'fixture',
    get: () => ({ fetch: (request) => registry.fetch(request) }),
  };
  const app = createGateway({
    fetcher: async (url, options) => {
      assert.equal(String(url), issuer + '/cdn-cgi/access/certs');
      assert.equal(options.redirect, 'manual');
      report.jwksRequests++;
      return Response.json({ keys: [jwk] });
    },
  });
  const f = { storage, registry, env, secrets, pending: () => pending, now: () => currentTime };
  f.advanceTo = (value) => {
    assert.equal(Number.isSafeInteger(value) && value >= currentTime, true);
    report.clockAdvances.push({ from: currentTime, to: value });
    currentTime = value;
  };
  f.secret = (label) => remember(label + '-' + randomToken(18));
  f.identity = async (email = 'owner@example.test', overrides = {}) => {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: jwk.kid })).toString('base64url');
    const claims = Buffer.from(
      JSON.stringify({
        type: 'app',
        iss: issuer,
        aud: ['occupancy-fixture'],
        sub: email,
        email,
        exp: Math.floor(currentTime / 1000) + 600,
        iat: Math.floor(currentTime / 1000),
        ...overrides,
      }),
    ).toString('base64url');
    const signature = Buffer.from(
      await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        keys.privateKey,
        new TextEncoder().encode(header + '.' + claims),
      ),
    ).toString('base64url');
    return remember(header + '.' + claims + '.' + signature);
  };
  async function collect(label, response) {
    const text = await response.text();
    assert.equal(Buffer.byteLength(text) <= 1048576, true, 'Fixture response bound');
    const body = (response.headers.get('content-type') || '').startsWith('application/json')
      ? JSON.parse(text)
      : null;
    report.requests.push({
      label,
      status: response.status,
      responseBytes: Buffer.byteLength(text),
      error: typeof body?.error === 'string' ? body.error : null,
    });
    return { status: response.status, body, text, headers: response.headers };
  }
  f.req = async (label, path, { method = 'GET', body, token, jwt, host = origin, headers = {} } = {}) => {
    pending++;
    try {
      return await collect(
        label,
        await app.fetch(
          new Request(host + path, {
            method,
            headers: {
              ...(body === undefined ? {} : { 'content-type': 'application/json' }),
              ...(token ? { authorization: 'Bearer ' + token } : {}),
              ...(jwt ? { 'cf-access-jwt-assertion': jwt } : {}),
              ...headers,
            },
            ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
          }),
          env,
          { waitUntil() {} },
        ),
      );
    } finally {
      pending--;
    }
  };
  f.internal = async (label, action, data) => {
    pending++;
    try {
      return await collect(
        'INTERNAL_REGISTRY:' + label,
        await registry.fetch(
          new Request('https://registry.test.invalid/', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action, data }),
          }),
        ),
      );
    } finally {
      pending--;
    }
  };
  f.expect = (response, status, label) => {
    report.controls.push({
      label,
      expectedStatus: status,
      observedStatus: response.status,
      matched: response.status === status,
    });
    assert.equal(response.status, status, label);
    return response.body;
  };
  f.oauth = async (jwt) => {
    const verifier = remember(randomToken(48));
    const registered = f.expect(
      await f.req('oauth-register', '/oauth/register', {
        method: 'POST',
        body: {
          client_name: 'Occupancy fixture',
          redirect_uris: ['https://client.test.invalid/callback'],
          token_endpoint_auth_method: 'none',
          grant_types: ['authorization_code'],
        },
      }),
      201,
      'Actual OAuth registration',
    );
    const query = new URLSearchParams({
      response_type: 'code',
      client_id: registered.client_id,
      redirect_uri: 'https://client.test.invalid/callback',
      scope: 'mterm:read',
      resource: origin + '/mcp',
      state: remember(randomToken(24)),
      code_challenge: await sha256(verifier, 'base64url'),
      code_challenge_method: 'S256',
    });
    const consent = await f.req('oauth-consent', '/oauth/authorize?' + query, { jwt, host: dashboardOrigin });
    f.expect(consent, 200, 'Actual signed-identity consent page');
    const match = consent.text.match(/name="consent" value="([A-Za-z0-9_-]+)"/);
    assert.equal(Boolean(match), true, 'Consent nonce present');
    const nonce = remember(match[1]);
    const approval = await f.req('oauth-approve', '/oauth/authorize', {
      method: 'POST',
      jwt,
      host: dashboardOrigin,
      headers: { origin: dashboardOrigin, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ consent: nonce, decision: 'approve' }).toString(),
    });
    f.expect(approval, 302, 'Actual explicit fixture consent');
    const code = remember(new URL(approval.headers.get('location')).searchParams.get('code'));
    const token = f.expect(
      await f.req('oauth-token', '/oauth/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: registered.client_id,
          code,
          code_verifier: verifier,
          redirect_uri: 'https://client.test.invalid/callback',
          resource: origin + '/mcp',
        }).toString(),
      }),
      200,
      'Actual S256 PKCE redemption',
    );
    assert.equal(typeof token.access_token, 'string');
    remember(token.access_token);
    remember(token.refresh_token);
    return { ...token, clientId: registered.client_id };
  };
  f.owner = async (email = 'owner@example.test') => {
    const jwt = await f.identity(email);
    return { jwt, userId: await sha256(issuer + '\nuser:' + email), auth: await f.oauth(jwt) };
  };
  f.pair = async (owner, name = 'Occupancy device') => {
    const started = f.expect(
      await f.req('pair-start', '/api/pair/start', {
        method: 'POST',
        body: { name, platform: 'linux', capabilities: [tool] },
      }),
      201,
      'Actual pair start',
    );
    remember(started.deviceCode);
    remember(started.userCode);
    f.expect(
      await f.req('pair-approve', '/api/pair/approve', {
        method: 'POST',
        jwt: owner.jwt,
        host: dashboardOrigin,
        headers: { origin: dashboardOrigin },
        body: { pairId: started.pairId, userCode: started.userCode },
      }),
      200,
      'Actual signed-identity pair approval',
    );
    const device = f.expect(
      await f.req('pair-claim', '/api/pair/poll', {
        method: 'POST',
        body: { pairId: started.pairId, deviceCode: started.deviceCode },
      }),
      200,
      'Actual pair claim',
    );
    remember(device.deviceToken);
    return device;
  };
  f.poll = async (device, availableSlots = 4) =>
    f.expect(
      await f.req('agent-poll', '/api/agent/poll', {
        method: 'POST',
        token: device.deviceToken,
        body: { version: 1, deviceId: device.deviceId, availableSlots },
      }),
      200,
      'Actual public agent poll',
    );
  f.ready = async () => {
    const owner = await f.owner();
    const device = await f.pair(owner);
    await f.poll(device, 0);
    return { owner, device };
  };
  let rpcSequence = 0;
  f.enqueue = async (owner, device, { expected = 200, args = { path: f.secret('argument') } } = {}) => {
    const response = await f.internal('enqueue', 'enqueue', {
      token: owner.auth.access_token,
      rpcId: 'occupancy-' + ++rpcSequence,
      deviceId: device.deviceId,
      tool,
      arguments: args,
    });
    f.expect(response, expected, 'Authenticated registry admission');
    return response.body;
  };
  f.result = (label = 'result') => {
    const sentinel = f.secret(label);
    return {
      content: [{ type: 'text', text: sentinel }],
      structuredContent: { fixture: sentinel },
      isError: false,
    };
  };
  f.complete = async (device, requestId, result = f.result()) => {
    f.expect(
      await f.req('agent-result', '/api/agent/result', {
        method: 'POST',
        token: device.deviceToken,
        body: { version: 1, deviceId: device.deviceId, requestId, result },
      }),
      200,
      'Actual public agent result accepted',
    );
    return result;
  };
  f.consume = async (owner, requestId, expected = 200) => {
    const response = await f.internal('jobResult', 'jobResult', {
      token: owner.auth.access_token,
      requestId,
    });
    f.expect(response, expected, 'Authenticated internal result consumption');
    return response.body;
  };
  f.manage = async (owner, path, body, expected = 200) =>
    f.expect(
      await f.req('management:' + path, path, {
        method: 'POST',
        jwt: owner.jwt,
        host: dashboardOrigin,
        headers: { origin: dashboardOrigin },
        body,
      }),
      expected,
      'Public authenticated management',
    );
  f.job = (id) => storage.get('job:' + id);
  f.snapshot = (label) => {
    const entries = [...storage.data].sort(([a], [b]) => compare(a, b));
    const text = canonical({ alarmAt: storage.alarmAt, entries });
    assert.equal(
      entries.length <= 512 && Buffer.byteLength(text) <= 1048576,
      true,
      'Bounded complete fixture storage',
    );
    const value = {
      label,
      entries: entries.length,
      bytes: Buffer.byteLength(text),
      sha256: digest(text),
      alarmAt: storage.alarmAt,
    };
    report.storage.push(value);
    return { ...value, entriesValue: structuredClone(entries), text };
  };
  f.jobs = (label) => {
    const jobs = [...storage.data]
      .filter(([key]) => key.startsWith('job:'))
      .map(([, job]) => ({
        requestId: job.requestId,
        deviceId: job.deviceId,
        userId: job.userId,
        status: job.status,
        deadline: job.deadline,
        expiresAt: job.expiresAt,
        hasArguments: Object.hasOwn(job, 'arguments'),
        hasResult: Object.hasOwn(job, 'result'),
        ...(job.result ? { resultSha256: digest(canonical(job.result)) } : {}),
      }))
      .sort((a, b) => compare(a.requestId, b.requestId));
    report.jobs.push({ label, jobs });
    return jobs;
  };
  f.dashboard = async (owner, label) => {
    const value = f.expect(
      await f.req('dashboard:' + label, '/api/dashboard', { jwt: owner.jwt, host: dashboardOrigin }),
      200,
      'Actual public authenticated dashboard',
    );
    assert.equal(Array.isArray(value.devices) && Array.isArray(value.sessions), true);
    report.dashboards.push({
      label,
      authenticated: value.authenticated,
      identityKind: value.identityKind,
      devices: value.devices.map((d) => ({
        id: d.id,
        status: d.status,
        permissions: d.permissions,
        capabilities: d.capabilities,
        registryAdmission: d.registryAdmission ?? null,
      })),
      sessions: value.sessions,
      grantCount: value.grants.length,
      auditCount: value.audit.length,
      permissions: value.permissions,
    });
    report.phases.observations = 'REACHED';
    return value;
  };
  f.sensitiveAbsent = (value) => {
    const text = JSON.stringify(value);
    const absent = secrets.every((secret) => !text.includes(secret));
    report.redaction.push({ valuesChecked: secrets.length, allAbsent: absent });
    assert.equal(absent, true, 'No synthetic secret, argument or result value in dashboard');
  };
  f.features = (fn) => {
    report.phases.transitions = 'PASS';
    report.phases.featureAssertions = 'STARTED';
    t.diagnostic(
      'MTERM_OCCUPANCY_DIAGNOSTIC ' + JSON.stringify({ ...report, event: 'BEFORE_FEATURE_ASSERTIONS' }),
    );
    fn();
    report.phases.featureAssertions = 'PASS';
  };
  f.settle = async () => {
    await queue;
    assert.equal(pending, 0, 'All owned in-process requests settled');
  };
  return f;
}

function scenario(id, title, run) {
  test(id + ' ' + title, { timeout: 20000 }, async (t) => {
    const originalDateNow = Date.now;
    const report = {
      schemaVersion: 1,
      id,
      sourceOnly: true,
      gatewayInstalled: false,
      workersRuntimeQualified: false,
      runtime: {
        node: process.version,
        execPath: process.execPath,
        platform: process.platform,
        arch: process.arch,
      },
      sourceBindings,
      phases: {
        setup: 'NOT_REACHED',
        transitions: 'NOT_REACHED',
        observations: 'NOT_REACHED',
        featureAssertions: 'NOT_REACHED',
      },
      requests: [],
      controls: [],
      dashboards: [],
      jobs: [],
      storage: [],
      redaction: [],
      clockAdvances: [],
      jwksRequests: 0,
      cleanup: 'NOT_REACHED',
    };
    let f, primaryError;
    try {
      report.phases.setup = 'STARTED';
      f = await fixture(t, report);
      report.phases.setup = 'PASS';
      report.phases.transitions = 'STARTED';
      await run(f, report);
      report.phases.transitions = 'PASS';
      report.classification =
        report.phases.featureAssertions === 'PASS' ? 'FEATURE_PASS' : 'EXISTING_CONTROL_PASS';
    } catch (error) {
      report.classification =
        report.phases.featureAssertions === 'STARTED'
          ? 'FEATURE_ASSERTION_FAILED'
          : 'FIXTURE_OR_EXISTING_CONTROL_FAILURE';
      report.failure = { name: error.name, code: error.code ?? null };
      primaryError = error;
    } finally {
      try {
        if (f) await f.settle();
        report.cleanup = f ? 'ALL_OWNED_REQUESTS_SETTLED' : 'FIXTURE_CREATION_DID_NOT_COMPLETE';
      } catch (error) {
        report.cleanup = 'UNCONFIRMED';
        report.cleanupFailure = { name: error.name, code: error.code ?? null };
        report.classification = 'FIXTURE_CLEANUP_FAILURE';
        primaryError ??= error;
      } finally {
        try {
          t.mock.restoreAll();
        } catch (error) {
          report.restoreFailure = { name: error.name, code: error.code ?? null };
          report.classification = 'FIXTURE_CLEANUP_FAILURE';
          primaryError ??= error;
        }
        report.clockRestored = Date.now === originalDateNow;
        t.diagnostic('MTERM_OCCUPANCY_DIAGNOSTIC ' + JSON.stringify({ ...report, event: 'FINAL' }));
      }
    }
    if (primaryError) throw primaryError;
  });
}

async function fourComplete(f) {
  const { owner, device } = await f.ready();
  const queued = [];
  for (let i = 0; i < 4; i++) queued.push(await f.enqueue(owner, device));
  const delivered = await f.poll(device, 4);
  assert.equal(delivered.requests.length, 4);
  const results = new Map();
  for (const request of delivered.requests)
    results.set(request.requestId, await f.complete(device, request.requestId));
  f.jobs('four-complete-before-consumption');
  return { owner, device, queued, delivered, results };
}

scenario('OCC-01', 'empty device admission is separate from presence and offline refusal', async (f) => {
  const { owner, device } = await f.ready();
  const offline = await f.pair(owner, 'Offline fixture');
  const view = await f.dashboard(owner, 'two-empty-devices');
  const denial = await f.enqueue(owner, offline, { expected: 409 });
  assert.equal(denial.error, 'device_offline');
  assert.equal(view.devices.find((d) => d.id === device.deviceId).status, 'online');
  assert.equal(view.devices.find((d) => d.id === offline.deviceId).status, 'offline');
  f.features(() => {
    requireAdmission(view, device.deviceId, 0, 0, 0, 0, 4);
    requireAdmission(view, offline.deviceId, 0, 0, 0, 0, 4);
  });
});

scenario('OCC-02', 'four completed unconsumed results occupy all slots with empty sessions', async (f) => {
  const { owner, device } = await fourComplete(f);
  const before = f.snapshot('before-dashboard');
  const view = await f.dashboard(owner, 'four-complete');
  const after = f.snapshot('after-dashboard');
  assert.equal(before.sha256, after.sha256);
  assert.deepEqual(view.sessions, []);
  f.sensitiveAbsent(view);
  f.features(() => requireAdmission(view, device.deviceId, 0, 0, 4, 4, 0));
});

scenario(
  'OCC-03',
  'existing full-slot refusal single-use consumption and replacement stay independent',
  async (f, report) => {
    const { owner, device, results } = await fourComplete(f);
    const [requestId, result] = results.entries().next().value;
    const denied = await f.enqueue(owner, device, { expected: 429 });
    assert.equal(denied.error, 'device_busy');
    const first = await f.consume(owner, requestId);
    const repeated = await f.consume(owner, requestId, 409);
    assert.equal(canonical(first.result) === canonical(result), true, 'Exact result returned once');
    assert.equal(repeated.error, 'result_already_consumed');
    const replacement = await f.enqueue(owner, device);
    const jobs = f.jobs('replacement-with-retained-consumed-row');
    assert.equal(jobs.filter((j) => j.status === 'complete').length, 3);
    assert.equal(jobs.filter((j) => j.status === 'consumed').length, 1);
    assert.equal(jobs.find((j) => j.requestId === replacement.requestId).status, 'queued');
    assert.equal(jobs.find((j) => j.requestId === requestId).hasResult, false);
    report.phases.observations = 'REACHED';
  },
);

scenario('OCC-04', 'mixed states and zero-slot polling preserve exact pending sessions', async (f) => {
  const { owner, device } = await f.ready();
  for (let i = 0; i < 4; i++) await f.enqueue(owner, device);
  const queued = await f.dashboard(owner, 'all-queued');
  const poll = await f.poll(device, 2);
  assert.equal(poll.requests.length, 2);
  const delivered = await f.dashboard(owner, 'two-delivered');
  await f.complete(device, poll.requests[0].requestId);
  const mixed = await f.dashboard(owner, 'mixed');
  const expected = [...f.storage.data]
    .filter(([key, j]) => key.startsWith('job:') && j.status !== 'complete')
    .map(([, j]) => projectSession(j));
  f.advanceTo(f.now() + 1);
  const zero = await f.poll(device, 0);
  const afterZero = await f.dashboard(owner, 'after-zero-offer');
  assert.equal(zero.requests.length, 0);
  assert.equal((await f.storage.get('device:' + device.deviceId)).lastSeen, f.now());
  assert.deepEqual(sortedSessions(mixed.sessions), sortedSessions(expected));
  assert.deepEqual(afterZero.sessions, mixed.sessions);
  f.jobs('mixed-after-zero-poll');
  f.features(() => {
    requireAdmission(queued, device.deviceId, 4, 0, 0, 4, 0);
    requireAdmission(delivered, device.deviceId, 2, 2, 0, 4, 0);
    requireAdmission(mixed, device.deviceId, 2, 1, 1, 4, 0);
    requireAdmission(afterZero, device.deviceId, 2, 1, 1, 4, 0);
  });
});

scenario('OCC-05', 'consumption releases one slot while its consumed record remains', async (f) => {
  const { owner, device } = await f.ready();
  await f.enqueue(owner, device);
  await f.enqueue(owner, device);
  const poll = await f.poll(device);
  for (const r of poll.requests) await f.complete(device, r.requestId);
  const before = await f.dashboard(owner, 'before-consumption');
  await f.consume(owner, poll.requests[0].requestId);
  const after = await f.dashboard(owner, 'after-consumption');
  const consumed = await f.job(poll.requests[0].requestId);
  assert.equal(consumed.status, 'consumed');
  assert.equal(Object.hasOwn(consumed, 'result'), false);
  f.jobs('consumed-row-retained');
  f.features(() => {
    requireAdmission(before, device.deviceId, 0, 0, 2, 2, 2);
    requireAdmission(after, device.deviceId, 0, 0, 1, 1, 3);
  });
});

scenario('OCC-06', 'pending cancellation releases slots but completed cancellation is a no-op', async (f) => {
  const { owner, device } = await f.ready();
  const other = await f.owner('other@example.test');
  for (let i = 0; i < 4; i++) await f.enqueue(owner, device);
  const poll = await f.poll(device, 2);
  const completedId = poll.requests[0].requestId;
  await f.complete(device, completedId);
  const queuedId = [...f.storage.data].find(([key, j]) => key.startsWith('job:') && j.status === 'queued')[1]
    .requestId;
  const full = await f.dashboard(owner, 'before-cancellations');
  await f.manage(owner, '/api/requests/cancel', { requestId: queuedId });
  const one = await f.dashboard(owner, 'queued-cancelled');
  await f.manage(owner, '/api/requests/cancel', { requestId: poll.requests[1].requestId });
  const two = await f.dashboard(owner, 'delivered-cancelled');
  const completeBefore = canonical(await f.job(completedId));
  await f.manage(owner, '/api/requests/cancel', { requestId: completedId });
  const denied = await f.manage(other, '/api/requests/cancel', { requestId: completedId }, 404);
  const after = await f.dashboard(owner, 'completed-cancel-no-op');
  assert.equal(denied.error, 'request_unavailable');
  assert.equal(canonical(await f.job(completedId)) === completeBefore, true);
  assert.equal(f.jobs('after-cancellations').filter((j) => j.status === 'cancelled').length, 2);
  f.features(() => {
    requireAdmission(full, device.deviceId, 2, 1, 1, 4, 0);
    requireAdmission(one, device.deviceId, 1, 1, 1, 3, 1);
    requireAdmission(two, device.deviceId, 1, 0, 1, 2, 2);
    requireAdmission(after, device.deviceId, 1, 0, 1, 2, 2);
  });
});

scenario(
  'OCC-07',
  'deadline-only reads preserve status until existing zero-slot timeout transition',
  async (f) => {
    const { owner, device } = await f.ready();
    for (let i = 0; i < 3; i++) await f.enqueue(owner, device);
    const poll = await f.poll(device, 2);
    await f.complete(device, poll.requests[0].requestId);
    f.advanceTo(poll.requests[0].deadline);
    const beforeStorage = f.snapshot('deadline-before-read');
    const before = await f.dashboard(owner, 'expired-deadline-still-pending');
    const afterStorage = f.snapshot('deadline-after-read');
    assert.equal(beforeStorage.sha256, afterStorage.sha256);
    assert.equal(before.sessions.length, 2);
    const zero = await f.poll(device, 0);
    assert.equal(zero.requests.length, 0);
    const after = await f.dashboard(owner, 'existing-timeout-transition');
    const jobs = f.jobs('timeouts');
    assert.equal(jobs.filter((j) => j.status === 'timeout').length, 2);
    assert.equal(
      jobs.filter((j) => j.status === 'timeout').every((j) => j.expiresAt === f.now() + 120000),
      true,
    );
    assert.deepEqual(after.sessions, []);
    f.features(() => {
      requireAdmission(before, device.deviceId, 1, 1, 1, 3, 1);
      requireAdmission(after, device.deviceId, 0, 0, 1, 1, 3);
    });
  },
);

scenario('OCC-08', 'existing retention pruning removes only the expired completed result', async (f) => {
  const { owner, device } = await f.ready();
  await f.enqueue(owner, device);
  await f.enqueue(owner, device);
  const poll = await f.poll(device);
  const first = poll.requests[0].requestId,
    second = poll.requests[1].requestId;
  await f.complete(device, first);
  f.advanceTo(f.now() + 1);
  await f.complete(device, second);
  const expiresAt = (await f.job(first)).expiresAt;
  f.advanceTo(expiresAt - 1);
  const before = await f.dashboard(owner, 'one-ms-before-retention');
  f.advanceTo(expiresAt);
  const storageBefore = f.snapshot('at-expiry-before-read');
  const after = await f.dashboard(owner, 'at-retention-expiry');
  const storageAfter = f.snapshot('at-expiry-after-read');
  assert.equal(await f.job(first), undefined);
  assert.equal((await f.job(second)).status, 'complete');
  assert.equal(Object.hasOwn(await f.job(second), 'result'), true);
  const expectedEntries = storageBefore.entriesValue.filter(([key]) => key !== 'job:' + first);
  assert.equal(
    canonical(storageAfter.entriesValue) === canonical(expectedEntries),
    true,
    'Exactly the expired job is deleted',
  );
  assert.equal(storageBefore.alarmAt, storageAfter.alarmAt);
  f.jobs('one-retained-result');
  f.features(() => {
    requireAdmission(before, device.deviceId, 0, 0, 2, 2, 2);
    requireAdmission(after, device.deviceId, 0, 0, 1, 1, 3);
  });
});

scenario('OCC-09', 'grant aggregation and grant or device revocation preserve unaffected work', async (f) => {
  const { owner, device } = await f.ready();
  const secondGrant = { ...owner, auth: await f.oauth(owner.jwt) };
  const secondDevice = await f.pair(owner, 'Second owned device');
  await f.poll(secondDevice, 0);
  const foreign = await f.owner('other@example.test');
  const foreignDevice = await f.pair(foreign);
  await f.poll(foreignDevice, 0);
  const firstJob = await f.enqueue(owner, device);
  const otherGrantJob = await f.enqueue(secondGrant, device);
  const anotherDeviceJob = await f.enqueue(secondGrant, secondDevice);
  const foreignJob = await f.enqueue(foreign, foreignDevice);
  const poll = await f.poll(device);
  assert.equal(poll.requests.length, 2);
  await f.complete(device, firstJob.requestId);
  const before = await f.dashboard(owner, 'two-grants');
  const grantId = before.grants.find((g) => g.clientId === owner.auth.clientId).id;
  await f.manage(owner, '/api/grants/revoke', { grantId });
  const afterGrant = await f.dashboard(owner, 'one-grant-revoked');
  assert.equal((await f.job(firstJob.requestId)).status, 'revoked');
  assert.equal(Object.hasOwn(await f.job(firstJob.requestId), 'result'), false);
  assert.equal((await f.job(otherGrantJob.requestId)).status, 'delivered');
  await f.manage(owner, '/api/devices/revoke', { deviceId: device.deviceId });
  const afterDevice = await f.dashboard(owner, 'one-device-revoked');
  const foreignView = await f.dashboard(foreign, 'foreign-unaffected');
  assert.equal(
    afterDevice.devices.some((d) => d.id === device.deviceId),
    false,
  );
  assert.equal((await f.job(otherGrantJob.requestId)).status, 'revoked');
  assert.equal((await f.job(anotherDeviceJob.requestId)).status, 'queued');
  assert.equal((await f.job(foreignJob.requestId)).status, 'queued');
  f.jobs('revocation-state');
  f.features(() => {
    requireAdmission(before, device.deviceId, 0, 1, 1, 2, 2);
    requireAdmission(afterGrant, device.deviceId, 0, 1, 0, 1, 3);
    requireAdmission(afterDevice, secondDevice.deviceId, 1, 0, 0, 1, 3);
    requireAdmission(foreignView, foreignDevice.deviceId, 1, 0, 0, 1, 3);
  });
});

scenario(
  'OCC-10',
  'public signed identities isolate device occupancy and redact secrets',
  async (f, report) => {
    const { owner, device } = await f.ready();
    const secondDevice = await f.pair(owner, 'Another owner device');
    await f.poll(secondDevice, 0);
    const other = await f.owner('other@example.test');
    const foreignDevice = await f.pair(other);
    await f.poll(foreignDevice, 0);
    await f.enqueue(owner, device);
    await f.enqueue(owner, device);
    await f.enqueue(owner, secondDevice);
    for (let i = 0; i < 4; i++) await f.enqueue(other, foreignDevice);
    const polled = await f.poll(device, 1);
    await f.complete(device, polled.requests[0].requestId);
    const ownView = await f.dashboard(owner, 'owner');
    const foreignView = await f.dashboard(other, 'other-owner');
    const valid = await f.identity();
    const invalidSignature = valid.slice(0, valid.lastIndexOf('.') + 1) + 'A'.repeat(342);
    const refusals = [
      ['missing', undefined, 401, 'identity_required'],
      [
        'expired',
        await f.identity('owner@example.test', { exp: Math.floor(f.now() / 1000) }),
        401,
        'invalid_identity',
      ],
      ['signature', invalidSignature, 401, 'invalid_identity'],
      ['audience', await f.identity('owner@example.test', { aud: ['wrong'] }), 401, 'invalid_identity'],
      ['disallowed', await f.identity('intruder@example.test'), 403, 'identity_not_allowed'],
    ];
    const before = f.snapshot('before-identity-refusals');
    for (const [label, jwt, status, error] of refusals) {
      const result = f.expect(
        await f.req('identity-refusal:' + label, '/api/dashboard', { jwt, host: dashboardOrigin }),
        status,
        label,
      );
      assert.equal(result.error, error);
    }
    const after = f.snapshot('after-identity-refusals');
    assert.equal(before.sha256, after.sha256);
    f.sensitiveAbsent(ownView);
    f.sensitiveAbsent(foreignView);
    assert.deepEqual(
      ownView.devices.map((d) => d.id).sort(),
      [device.deviceId, secondDevice.deviceId].sort(),
    );
    assert.deepEqual(
      foreignView.devices.map((d) => d.id),
      [foreignDevice.deviceId],
    );
    assert.equal(JSON.stringify(ownView).includes(foreignDevice.deviceId), false);
    assert.equal(JSON.stringify(foreignView).includes(device.deviceId), false);
    assert.equal(JSON.stringify(foreignView).includes(secondDevice.deviceId), false);
    report.ownerIsolation = { authenticatedOwners: 2, foreignDeviceIdsDisclosed: false };
    f.features(() => {
      requireAdmission(ownView, device.deviceId, 1, 0, 1, 2, 2);
      requireAdmission(ownView, secondDevice.deviceId, 1, 0, 0, 1, 3);
      requireAdmission(foreignView, foreignDevice.deviceId, 4, 0, 0, 4, 0);
    });
  },
);

scenario(
  'OCC-11',
  'initialized unexpired dashboard reads preserve state and share one job page',
  async (f, report) => {
    const { owner, device } = await f.ready();
    await f.enqueue(owner, device);
    await f.enqueue(owner, device);
    const poll = await f.poll(device, 1);
    await f.complete(device, poll.requests[0].requestId);
    assert.notEqual(f.storage.alarmAt, null);
    assert.equal(
      [...f.storage.data.values()].every((v) => !v.expiresAt || v.expiresAt > f.now()),
      true,
    );
    const before = f.snapshot('before-stable-reads');
    const listStart = f.storage.lists.length;
    const first = await f.dashboard(owner, 'stable-first');
    const middle = f.storage.lists.length;
    const second = await f.dashboard(owner, 'stable-second');
    const after = f.snapshot('after-stable-reads');
    const pages = [f.storage.lists.slice(listStart, middle), f.storage.lists.slice(middle)].map((calls) =>
      calls.filter((c) => c.prefix === 'job:'),
    );
    report.jobPageObservations = { ordinaryUnexpiredSmallFixtureOnly: true, pages };
    assert.deepEqual(
      pages.map((p) => p.length),
      [1, 1],
    );
    assert.equal(
      pages.flat().every((p) => p.limit === 256 && !p.startAfterPresent),
      true,
    );
    assert.equal(before.sha256, after.sha256);
    assert.equal(canonical(first) === canonical(second), true);
    f.features(() => {
      requireAdmission(first, device.deviceId, 1, 0, 1, 2, 2);
      requireAdmission(second, device.deviceId, 1, 0, 1, 2, 2);
    });
  },
);

async function renderActualScript(f, owner, report, redactions = []) {
  const response = await f.req('dashboard-html', '/', { jwt: owner.jwt, host: dashboardOrigin });
  f.expect(response, 200, 'Actual authenticated HTML');
  const scripts = [...response.text.matchAll(/<script nonce="[^"]+">([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1, 'One actual served application script');
  let unsafeHtmlAssignments = 0;
  const tags = [];
  class Element {
    children = [];
    ownText = '';
    listeners = new Map();
    classes = new Set();
    constructor(tag) {
      this.tag = tag;
      tags.push(tag);
      this.classList = {
        add: (...xs) => xs.forEach((x) => this.classes.add(x)),
        remove: (...xs) => xs.forEach((x) => this.classes.delete(x)),
        toggle: (x) => (this.classes.has(x) ? this.classes.delete(x) : this.classes.add(x)),
      };
    }
    set textContent(value) {
      this.children = [];
      this.ownText = String(value);
    }
    get textContent() {
      return this.ownText + this.children.map((n) => n.textContent).join(' ');
    }
    set innerHTML(_value) {
      unsafeHtmlAssignments++;
      throw new Error('Unsafe HTML assignment in DOM fixture');
    }
    append(...nodes) {
      this.children.push(...nodes);
    }
    replaceChildren(...nodes) {
      this.ownText = '';
      this.children = [...nodes];
    }
    addEventListener(event, fn) {
      this.listeners.set(event, fn);
    }
    focus() {}
  }
  const elements = new Map(
    [...response.text.matchAll(/<([a-z]+)\b[^>]*\bid="([^"]+)"/g)].map((m) => [m[2], new Element(m[1])]),
  );
  const calls = [],
    pending = [],
    timers = [];
  const context = vm.createContext({
    document: {
      hidden: false,
      getElementById: (id) => {
        assert.equal(elements.has(id), true, 'Actual HTML owns requested element');
        return elements.get(id);
      },
      createElement: (tag) => new Element(tag),
    },
    location: { href: dashboardOrigin + '/' },
    URL,
    Date,
    navigator: {
      clipboard: {
        writeText: async () => {
          throw new Error('Unexpected clipboard action');
        },
      },
    },
    confirm: () => {
      throw new Error('Unexpected confirmation action');
    },
    setInterval: (fn, ms) => {
      timers.push({ fn, ms });
      return timers.length;
    },
    setTimeout: () => {
      throw new Error('Unexpected timed UI action');
    },
    fetch: (path, options) => {
      calls.push({ path, method: options.method, credentials: options.credentials, cache: options.cache });
      assert.equal(path, '/api/dashboard');
      assert.equal(options.method, 'GET');
      const request = f
        .req('DOM-refresh-public-dashboard', path, { jwt: owner.jwt, host: dashboardOrigin })
        .then((r) => Response.json(r.body, { status: r.status }));
      pending.push(request);
      return request;
    },
  });
  vm.runInContext(scripts[0][1], context, { timeout: 1000 });
  await Promise.all(pending);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(vm.runInContext('loading', context), false, 'Actual refresh settled');
  assert.equal(elements.get('error').textContent, '', 'Actual refresh did not catch an error');
  assert.equal(pending.length, 1);
  assert.deepEqual(calls, [
    { path: '/api/dashboard', method: 'GET', credentials: 'same-origin', cache: 'no-store' },
  ]);
  assert.equal(timers.length, 1);
  assert.equal(timers[0].ms, 10000);
  const redactedText = (text) =>
    [...f.secrets, ...redactions].reduce(
      (value, secret) => value.replaceAll(secret, '[fixture-value]'),
      text,
    );
  report.dom = {
    scope: 'Actual served script in minimal DOM adapter; no browser/accessibility/runtime acceptance',
    htmlSha256: digest(response.text),
    scriptSha256: digest(scripts[0][1]),
    refreshRequests: calls,
    settled: true,
    unsafeHtmlAssignments,
    createdImageOrScript: tags.some((t) => ['img', 'script'].includes(t)),
    cards: elements.get('devices').children.map((n) => ({
      textSha256: digest(n.textContent),
      textLength: n.textContent.length,
      redactedText: redactedText(n.textContent),
    })),
  };
  return { cards: elements.get('devices').children, unsafeHtmlAssignments, tags };
}

scenario(
  'OCC-12',
  'actual device-card script renders admission numbers and safe name text',
  async (f, report) => {
    const { owner, device } = await fourComplete(f);
    const markupName = '<img src=x onerror=fixture()>';
    const empty = await f.pair(owner, markupName);
    const mixed = await f.pair(owner, 'Mixed fixture');
    await f.poll(mixed, 0);
    await f.enqueue(owner, mixed);
    await f.enqueue(owner, mixed);
    await f.poll(mixed, 1);
    const view = await f.dashboard(owner, 'render-source-observation');
    const rendered = await renderActualScript(f, owner, report, [markupName]);
    const card = (id) => rendered.cards.find((n) => n.textContent.includes(id));
    assert.equal(Boolean(card(device.deviceId) && card(empty.deviceId) && card(mixed.deviceId)), true);
    assert.equal(
      card(empty.deviceId).textContent.includes(markupName),
      true,
      'Markup-like name remains literal text',
    );
    assert.equal(rendered.unsafeHtmlAssignments, 0);
    assert.equal(rendered.tags.includes('img'), false);
    const expected = [
      [device.deviceId, 0, 0, 4, 4, 0],
      [empty.deviceId, 0, 0, 0, 0, 4],
      [mixed.deviceId, 1, 1, 0, 2, 2],
    ];
    report.dom.assertions = 'NOT_REACHED';
    report.dom.markupNameRemainedLiteral = true;
    report.dom.admissionTextObservations = expected.map(([id, q, d, c, occupied, remaining]) => {
      const text = card(id).textContent;
      return {
        deviceId: id,
        matches: {
          heading: /registry admission/i.test(text),
          occupied: new RegExp(`${occupied}\\s*(?:of|/)\\s*4\\s*occupied`, 'i').test(text),
          remaining: new RegExp(`${remaining}\\s*device slots? remaining`, 'i').test(text),
          queued: new RegExp(`${q}\\s*queued`, 'i').test(text),
          delivered: new RegExp(`${d}\\s*delivered`, 'i').test(text),
          completed: new RegExp(`${c}\\s*results? awaiting collection`, 'i').test(text),
          deliveredExplanation: /delivered.*(?:does not|doesn't|is not).*execution/i.test(text),
          remainingQualification: /other limits.*authorization.*device availability/i.test(text),
        },
      };
    });
    f.features(() => {
      for (const [id, q, d, c, occupied, remaining] of expected) {
        requireAdmission(view, id, q, d, c, occupied, remaining);
      }
      report.dom.assertions = 'STARTED';
      for (const observation of report.dom.admissionTextObservations)
        assert.equal(
          Object.values(observation.matches).every(Boolean),
          true,
          'Exact card counts and admission qualifications visible',
        );
      report.dom.assertions = 'PASS';
    });
  },
);

scenario(
  'OCC-13',
  'existing public MCP inventory retains its exact legacy device fields',
  async (f, report) => {
    const { owner, device } = await f.ready();
    const listed = f.expect(
      await f.req('public-mcp-tools-list', '/mcp', {
        method: 'POST',
        token: owner.auth.access_token,
        body: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
      }),
      200,
      'Public MCP tools/list',
    );
    assert.deepEqual(
      listed.result.tools.map((t) => t.name).sort(),
      [
        'mterm_file_info',
        'mterm_list_devices',
        'mterm_list_directory',
        'mterm_read_file',
        'mterm_search_content',
        'mterm_search_files',
      ].sort(),
    );
    assert.equal(
      listed.result.tools.every((t) => t.annotations.readOnlyHint && !t.annotations.destructiveHint),
      true,
    );
    const response = f.expect(
      await f.req('public-mcp-list-devices', '/mcp', {
        method: 'POST',
        token: owner.auth.access_token,
        body: {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: { name: 'mterm_list_devices', arguments: {} },
        },
      }),
      200,
      'Public MCP mterm_list_devices',
    );
    const devices = response.result.structuredContent.devices;
    assert.equal(devices.length, 1);
    assert.equal(devices[0].id, device.deviceId);
    assert.deepEqual(
      Object.keys(devices[0]).sort(),
      ['id', 'name', 'platform', 'capabilities', 'permissions', 'createdAt', 'lastSeen', 'status'].sort(),
    );
    assert.equal(Object.hasOwn(devices[0], 'registryAdmission'), false);
    assert.equal(devices[0].permissions, 'read-only');
    assert.deepEqual(devices[0].capabilities, [tool]);
    const view = await f.dashboard(owner, 'legacy-inventory-separate');
    f.sensitiveAbsent(view);
    report.mcpInventory = {
      tools: listed.result.tools.map((t) => t.name),
      deviceFieldNames: Object.keys(devices[0]).sort(),
      registryAdmissionAbsent: true,
    };
  },
);

scenario(
  'OCC-14',
  'labeled storage faults filter counters preserve orphan sessions and report over-limit occupancy',
  async (f, report) => {
    report.storageFaultInjection = {
      actualAdmissionOrProductionCorruptionClaim: false,
      purpose: 'Exercise owner AND returned-device filters and unclamped observed totals independently.',
    };
    const { owner, device } = await f.ready();
    const empty = await f.pair(owner, 'Unoccupied returned device');
    const other = await f.owner('other@example.test');
    const otherDevice = await f.pair(other);
    const admitted = await f.enqueue(owner, device);
    const template = await f.job(admitted.requestId);
    const ownPending = [projectSession(template)];
    for (const status of ['queued', 'delivered', 'complete', 'complete']) {
      const injected = { ...template, requestId: randomUUID(), status };
      if (status === 'complete') {
        delete injected.arguments;
        injected.result = f.result('injected-result');
        injected.finishedAt = f.now();
        injected.expiresAt = f.now() + 120000;
      }
      if (status === 'delivered') injected.deliveredAt = f.now();
      await f.storage.put('job:' + injected.requestId, injected);
      if (status !== 'complete') ownPending.push(projectSession(injected));
    }
    const foreign = { ...template, requestId: randomUUID(), userId: other.userId };
    const orphan = { ...template, requestId: randomUUID(), deviceId: randomUUID() };
    await f.storage.put('job:' + foreign.requestId, foreign);
    await f.storage.put('job:' + orphan.requestId, orphan);
    ownPending.push(projectSession(orphan));
    report.storageFaultInjection.injectedRows = 6;
    f.jobs('labeled-injected-state');
    const before = f.snapshot('fault-before-read');
    const view = await f.dashboard(owner, 'fault-owner');
    const otherView = await f.dashboard(other, 'fault-other-owner');
    const after = f.snapshot('fault-after-read');
    assert.equal(before.sha256, after.sha256);
    assert.deepEqual(sortedSessions(view.sessions), sortedSessions(ownPending));
    assert.deepEqual(otherView.sessions, [projectSession(foreign)]);
    assert.equal(
      view.devices.some((d) => d.id === orphan.deviceId),
      false,
    );
    assert.equal(
      view.devices.some((d) => d.id === otherDevice.deviceId),
      false,
    );
    f.features(() => {
      requireAdmission(view, device.deviceId, 2, 1, 2, 5, 0);
      requireAdmission(view, empty.deviceId, 0, 0, 0, 0, 4);
      requireAdmission(otherView, otherDevice.deviceId, 0, 0, 0, 0, 4);
    });
  },
);
