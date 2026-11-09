// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-remote-gateway (OpenAI / GPT-6 Astra Pro; self-reported)
// Modified: 2026-11-09-grant-expiry; actual OAuth/pairing fixtures exercise dispatch/result expiry without a sweep.
// Modified: 2026-11-09-request-ownership; delayed results and HTTP cleanup retain their original request identity.
// Modified: 2026-11-09-oauth-expiry; public MCP authorization observes token expiry after registry reads.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGateway } from '../gateway/app.mjs';
import { MTermRegistry } from '../gateway/registry.mjs';
import { verifyAccess, sha256, randomToken } from '../gateway/security.mjs';

const origin = 'https://mcp.test.invalid';
const dashboard = 'https://mterm.test.invalid';
const issuer = 'https://identity.cloudflareaccess.com';
class MemoryStorage {
  data = new Map();
  alarmAt = null;
  async get(k) {
    return structuredClone(this.data.get(k));
  }
  async put(k, v) {
    this.data.set(k, structuredClone(v));
  }
  async delete(k) {
    return this.data.delete(k);
  }
  async list({ prefix = '', limit = 1000, startAfter = '' } = {}) {
    return new Map(
      [...this.data]
        .filter(([k]) => k.startsWith(prefix) && k > startAfter)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, limit),
    );
  }
  async getAlarm() {
    return this.alarmAt;
  }
  async setAlarm(time) {
    this.alarmAt = time;
  }
}
async function fixture() {
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
    DASHBOARD_ORIGIN: dashboard,
    ACCESS_ISSUER: issuer,
    ACCESS_AUDIENCE: 'audience-one',
    ALLOWED_EMAILS: 'owner@example.test,other@example.test',
    ENVIRONMENT: 'staging',
    BUILD_SHA: 'fixture',
    MCP_ENABLED: 'true',
  };
  const storage = new MemoryStorage();
  let queue = Promise.resolve();
  const ctx = {
    storage,
    blockConcurrencyWhile(fn) {
      const next = queue.then(fn);
      queue = next.catch(() => {});
      return next;
    },
  };
  const registry = new MTermRegistry(ctx, env);
  env.REGISTRY = { idFromName: () => 'one', get: () => ({ fetch: (req) => registry.fetch(req) }) };
  const fetcher = async (url) => {
    assert.equal(String(url), issuer + '/cdn-cgi/access/certs');
    return Response.json({ keys: [jwk] });
  };
  const app = createGateway({ fetcher });
  async function identity(email = 'owner@example.test', overrides = {}) {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: jwk.kid })).toString('base64url');
    const claims = Buffer.from(
      JSON.stringify({
        type: 'app',
        iss: issuer,
        aud: ['audience-one'],
        sub: email,
        email,
        exp: Math.floor(Date.now() / 1000) + 600,
        iat: Math.floor(Date.now() / 1000),
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
    return header + '.' + claims + '.' + signature;
  }
  async function req(path, { method = 'GET', body, token, jwt, host = origin, headers = {}, signal } = {}) {
    const r = new Request(host + path, {
      method,
      signal,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(token ? { authorization: 'Bearer ' + token } : {}),
        ...(jwt ? { 'cf-access-jwt-assertion': jwt } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    });
    return app.fetch(r, env, { waitUntil() {} });
  }
  async function oauth(jwt = null, { defer = false } = {}) {
    jwt ??= await identity();
    const verifier = randomToken(48),
      challenge = await sha256(verifier, 'base64url');
    const registration = await req('/oauth/register', {
      method: 'POST',
      body: {
        client_name: 'Fixture MCP client',
        redirect_uris: ['https://client.test.invalid/callback'],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code'],
      },
    });
    assert.equal(registration.status, 201);
    const client = await registration.json();
    const query = new URLSearchParams({
      response_type: 'code',
      client_id: client.client_id,
      redirect_uri: 'https://client.test.invalid/callback',
      scope: 'mterm:read',
      resource: origin + '/mcp',
      state: randomToken(24),
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    const consent = await req('/oauth/authorize?' + query, { jwt, host: dashboard });
    assert.equal(consent.status, 200);
    const html = await consent.text();
    const nonce = html.match(/name="consent" value="([A-Za-z0-9_-]+)"/)[1];
    const approval = await req('/oauth/authorize', {
      method: 'POST',
      jwt,
      host: dashboard,
      headers: { origin: dashboard, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ consent: nonce, decision: 'approve' }).toString(),
    });
    assert.equal(approval.status, 302);
    const code = new URL(approval.headers.get('location')).searchParams.get('code');
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: client.client_id,
      code,
      code_verifier: verifier,
      redirect_uri: 'https://client.test.invalid/callback',
      resource: origin + '/mcp',
    }).toString();
    if (defer) return { tokenBody, client, jwt };
    const tokenResponse = await req('/oauth/token', {
      method: 'POST',
      body: tokenBody,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    assert.equal(tokenResponse.status, 200);
    return { ...(await tokenResponse.json()), tokenBody, client, jwt };
  }
  async function pair(jwt = null, name = 'Fixture Windows', { deferClaim = false } = {}) {
    jwt ??= await identity();
    const start = await req('/api/pair/start', {
      method: 'POST',
      body: {
        name,
        platform: 'win32',
        capabilities: [
          'mterm_read_file',
          'mterm_file_info',
          'mterm_list_directory',
          'mterm_search_files',
          'mterm_search_content',
        ],
      },
    });
    assert.equal(start.status, 201);
    const p = await start.json();
    const approve = await req('/api/pair/approve', {
      method: 'POST',
      jwt,
      host: dashboard,
      headers: { origin: dashboard },
      body: { pairId: p.pairId, userCode: p.userCode },
    });
    assert.equal(approve.status, 200);
    if (deferClaim) return { pairing: p };
    const claim = await req('/api/pair/poll', {
      method: 'POST',
      body: { pairId: p.pairId, deviceCode: p.deviceCode },
    });
    assert.equal(claim.status, 200);
    return { ...(await claim.json()), pairing: p };
  }
  return { req, oauth, pair, identity, env, fetcher, storage, registry };
}

async function grantExpiryFixture(t) {
  let clock = Date.now();
  t.mock.method(Date, 'now', () => clock);
  const f = await fixture(),
    auth = await f.oauth(),
    device = await f.pair();
  const poll = async (availableSlots) => {
    const response = await f.req('/api/agent/poll', {
      method: 'POST',
      token: device.deviceToken,
      body: {
        version: 1,
        deviceId: device.deviceId,
        ...(availableSlots === undefined ? {} : { availableSlots }),
      },
    });
    assert.equal(response.status, 200);
    return response.json();
  };
  await poll(0);
  const token = await f.storage.get('token:' + (await sha256(auth.access_token)));
  const grantKey = 'grant:' + token.grantId;
  const grant = await f.storage.get(grantKey);
  const expiry = clock + 1000;
  grant.expiresAt = expiry;
  await f.storage.put(grantKey, grant);
  const dispatch = async (action, data) => {
    const response = await f.registry.fetch(
      new Request('https://registry.internal/dispatch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, data }),
      }),
    );
    return { status: response.status, data: await response.json() };
  };
  const enqueue = async (rpcId, credentials = auth) => {
    const result = await dispatch('enqueue', {
      token: credentials.access_token,
      deviceId: device.deviceId,
      tool: 'mterm_file_info',
      arguments: { path: 'grant-expiry-fixture.txt' },
      rpcId,
    });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    return result.data;
  };
  const submit = (job, text = 'synthetic-file-output-sentinel') =>
    f.req('/api/agent/result', {
      method: 'POST',
      token: device.deviceToken,
      body: {
        version: 1,
        requestId: job.requestId,
        deviceId: device.deviceId,
        result: { content: [{ type: 'text', text }], structuredContent: { text }, isError: false },
      },
    });
  const ping = (credentials = auth) =>
    f.req('/mcp', {
      method: 'POST',
      token: credentials.access_token,
      body: { jsonrpc: '2.0', id: 'expiry-ping', method: 'ping' },
    });
  const jobState = (job) => f.storage.get('job:' + job.requestId);
  return {
    ...f,
    auth,
    device,
    token,
    grant,
    grantKey,
    expiry,
    poll,
    dispatch,
    enqueue,
    submit,
    ping,
    jobState,
    setClock(value) {
      clock = value;
    },
  };
}

for (const capacity of [undefined, 0, 4]) {
  test(`grant expiry: ${capacity === undefined ? 'legacy' : capacity + '-slot'} poll cancels queued and delivered work without an alarm sweep`, async (t) => {
    const f = await grantExpiryFixture(t);
    const delivered = await f.enqueue('delivered');
    assert.deepEqual(
      (await f.poll(1)).requests.map((r) => r.requestId),
      [delivered.requestId],
    );
    const queued = await f.enqueue('queued');
    f.setClock(f.expiry);
    assert.ok(queued.deadline > f.expiry && delivered.deadline > f.expiry);
    assert.equal((await f.ping()).status, 401, 'Client access already rejects the expired grant');
    assert.deepEqual(await f.storage.get(f.grantKey), f.grant, 'Expired grant remains physically stored');
    const poll = await f.poll(capacity);
    assert.deepEqual(poll.requests, [], 'An expired grant cannot dispatch pending work');
    assert.deepEqual(new Set(poll.cancelled), new Set([delivered.requestId, queued.requestId]));
    for (const job of [delivered, queued]) {
      const state = await f.jobState(job);
      assert.equal(state.status, 'revoked');
      assert.equal(state.abortRequested, true);
      assert.equal(state.arguments, undefined);
      assert.equal(state.result, undefined);
    }
    assert.equal((await f.jobState(queued)).deliveredAt, undefined);
    assert.deepEqual(await f.storage.get(f.grantKey), f.grant, 'Authorization does not depend on deletion');
    const repeated = await f.poll(4);
    assert.deepEqual(repeated.requests, []);
    assert.deepEqual(new Set(repeated.cancelled), new Set(poll.cancelled));
    const audit = await f.registry.rows('audit:' + f.grant.userId + ':');
    for (const job of [delivered, queued])
      assert.equal(audit.filter((e) => e.requestId === job.requestId && e.result === 'revoked').length, 1);
  });
}

for (const boundary of ['exact', 'after', 'missing']) {
  test(`grant expiry: result acceptance rejects ${boundary} expiry before retaining output`, async (t) => {
    const f = await grantExpiryFixture(t);
    const job = await f.enqueue('result');
    assert.equal((await f.poll()).requests[0].requestId, job.requestId);
    if (boundary === 'missing') {
      delete f.grant.expiresAt;
      await f.storage.put(f.grantKey, f.grant);
    } else f.setClock(f.expiry + (boundary === 'after' ? 1 : 0));
    assert.equal((await f.ping()).status, 401);
    const before = await f.jobState(job);
    assert.ok(before.deadline > Date.now());
    const response = await f.submit(job);
    assert.equal(response.status, 410);
    assert.deepEqual(await response.json(), { error: 'request_revoked' });
    const rejected = await f.jobState(job);
    assert.equal(rejected.status, 'revoked');
    assert.equal(rejected.arguments, undefined);
    assert.equal(rejected.result, undefined);
    assert.equal((await f.submit(job)).status, 409, 'A rejected result cannot later be retained');
    assert.equal((await f.storage.get(f.grantKey)).id, f.grant.id);
    const poll = await f.poll(0);
    assert.ok(poll.cancelled.includes(job.requestId));
    assert.equal((await f.jobState(job)).status, 'revoked');
    const audit = await f.registry.rows('audit:' + f.grant.userId + ':');
    assert.ok(!audit.some((e) => e.requestId === job.requestId && e.result === 'ok'));
    assert.ok(!JSON.stringify(audit).includes('synthetic-file-output-sentinel'));
    assert.ok(!JSON.stringify(await f.jobState(job)).includes('synthetic-file-output-sentinel'));
  });
}

test('grant expiry: just-before success and another live client grant remain independent', async (t) => {
  const f = await grantExpiryFixture(t);
  const other = await f.oauth();
  const before = await f.enqueue('before');
  const independent = await f.enqueue('other', other);
  f.setClock(f.expiry - 1);
  assert.equal((await f.ping()).status, 200);
  const poll = await f.poll();
  assert.deepEqual(
    new Set(poll.requests.map((r) => r.requestId)),
    new Set([before.requestId, independent.requestId]),
  );
  assert.equal((await f.submit(before)).status, 200);
  const consumed = await f.dispatch('jobResult', { token: f.auth.access_token, requestId: before.requestId });
  assert.equal(consumed.status, 200);
  assert.equal(consumed.data.result.structuredContent.text, 'synthetic-file-output-sentinel');
  f.setClock(f.expiry);
  assert.equal((await f.ping()).status, 401);
  assert.equal((await f.ping(other)).status, 200);
  assert.ok(!(await f.poll(0)).cancelled.includes(independent.requestId));
  assert.equal((await f.submit(independent, 'other-client-result')).status, 200);
  const result = await f.dispatch('jobResult', {
    token: other.access_token,
    requestId: independent.requestId,
  });
  assert.equal(result.status, 200);
  assert.equal(result.data.result.structuredContent.text, 'other-client-result');
  assert.equal((await f.poll()).requests.length, 0);
});

test('grant expiry: existing request deadline takes precedence when both boundaries expire', async (t) => {
  const f = await grantExpiryFixture(t);
  const job = await f.enqueue('deadline');
  await f.poll();
  f.setClock(job.deadline);
  const response = await f.submit(job);
  assert.equal(response.status, 410);
  assert.deepEqual(await response.json(), { error: 'request_expired' });
  const poll = await f.poll(0);
  assert.ok(poll.cancelled.includes(job.requestId));
  assert.equal((await f.jobState(job)).status, 'timeout');
  assert.equal((await f.jobState(job)).result, undefined);
});

for (const action of ['poll', 'result']) {
  for (const boundary of ['grant', 'deadline']) {
    test(`grant expiry: ${action} rechecks ${boundary} after asynchronous grant and epoch reads`, async (t) => {
      const f = await grantExpiryFixture(t);
      const job = await f.enqueue('await-boundary');
      if (action === 'result') await f.poll();
      f.setClock(f.expiry - 1);
      const read = f.storage.get.bind(f.storage);
      let grantRead = false,
        crossed = false;
      f.storage.get = async (key) => {
        const value = await read(key);
        if (key === f.grantKey) grantRead = true;
        else if (grantRead && key === 'epoch:' + f.grant.userId && !crossed) {
          crossed = true;
          f.setClock(boundary === 'grant' ? f.expiry : job.deadline);
        }
        return value;
      };
      if (action === 'poll') {
        const result = await f.poll();
        assert.equal(crossed, true, 'The actual epoch await crossed the decision boundary');
        assert.deepEqual(result.requests, []);
        assert.ok(result.cancelled.includes(job.requestId));
      } else {
        const response = await f.submit(job);
        assert.equal(crossed, true, 'The actual epoch await crossed the decision boundary');
        assert.equal(response.status, 410);
        assert.deepEqual(await response.json(), {
          error: boundary === 'grant' ? 'request_revoked' : 'request_expired',
        });
        assert.equal((await f.jobState(job)).result, undefined);
        await f.poll(0);
      }
      const state = await f.jobState(job);
      assert.equal(state.status, boundary === 'grant' ? 'revoked' : 'timeout');
      assert.equal(state.result, undefined);
    });
  }
}
test('gateway fails closed; discovery is public, bounded, and precise', async () => {
  const f = await fixture();
  assert.equal((await f.req('/mcp', { method: 'POST', body: {} })).status, 401);
  const doc = await (await f.req('/.well-known/oauth-protected-resource/mcp')).json();
  assert.equal(doc.resource, origin + '/mcp');
  assert.deepEqual(doc.scopes_supported, ['mterm:read']);
  assert.equal((await f.req('/api/dashboard', { host: dashboard })).status, 401);
  assert.equal(
    (await f.req('/mcp', { method: 'POST', body: {}, headers: { origin: 'https://evil.test' } })).status,
    403,
  );
  assert.equal(
    (await f.req('/oauth/register', { method: 'POST', body: { redirect_uris: ['javascript:alert(1)'] } }))
      .status,
    400,
  );
});
test('Access JWT signature, audience, expiry and allowlist are enforced independently of headers', async () => {
  const f = await fixture();
  for (const jwt of [
    await f.identity('owner@example.test', { aud: ['wrong'] }),
    await f.identity('owner@example.test', { exp: 1 }),
    await f.identity('intruder@example.test'),
  ]) {
    const result = await f.req('/api/dashboard', { jwt, host: dashboard });
    assert.ok([401, 403].includes(result.status));
  }
  const valid = await f.identity();
  assert.equal(
    (await f.req('/api/dashboard', { jwt: valid.slice(0, -10) + 'INVALIDSIG', host: dashboard })).status,
    401,
  );
  assert.equal((await f.req('/api/dashboard', { jwt: valid, host: dashboard })).status, 200);
  // Actual Access service JWTs can use the RFC 7519 single-audience string form.
  assert.equal(
    (
      await f.req('/api/dashboard', {
        jwt: await f.identity('owner@example.test', { aud: 'audience-one' }),
        host: dashboard,
      })
    ).status,
    200,
  );
  for (const aud of ['wrong', 'audience-one.evil', ['wrong'], 1, null])
    assert.equal(
      (
        await f.req('/api/dashboard', {
          jwt: await f.identity('owner@example.test', { aud }),
          host: dashboard,
        })
      ).status,
      401,
    );
  const request = new Request(dashboard, { headers: { 'cf-access-jwt-assertion': valid } });
  await assert.rejects(
    verifyAccess(request, f.env, async (url, options) => {
      assert.equal(options.redirect, 'manual');
      assert.equal(String(url), issuer + '/cdn-cgi/access/certs');
      return new Response(null, { status: 302, headers: { location: 'https://attacker.invalid/keys' } });
    }),
    (error) => error.status === 503 && error.code === 'identity_keys_unavailable',
  );
});
test('PKCE code is single use and tokens are resource-bound', async () => {
  const f = await fixture(),
    auth = await f.oauth();
  assert.equal(
    (
      await f.req('/oauth/token', {
        method: 'POST',
        body: auth.tokenBody,
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      })
    ).status,
    400,
  );
  const init = await f.req('/mcp', {
    method: 'POST',
    token: auth.access_token,
    body: {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } },
    },
  });
  assert.equal(init.status, 200);
  assert.equal((await init.json()).result.protocolVersion, '2025-11-25');
  const tools = await (
    await f.req('/mcp', {
      method: 'POST',
      token: auth.access_token,
      body: { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    })
  ).json();
  assert.equal(tools.result.tools.length, 6);
  assert.ok(tools.result.tools.every((t) => t.annotations.readOnlyHint));
});
test('pairing requires authenticated approval, is one-time, and never grants execution', async () => {
  const f = await fixture();
  const p = await f.pair();
  assert.equal(
    (
      await f.req('/api/pair/poll', {
        method: 'POST',
        body: { pairId: p.pairing.pairId, deviceCode: p.pairing.deviceCode },
      })
    ).status,
    410,
  );
  assert.equal(
    (
      await f.req('/api/pair/approve', {
        method: 'POST',
        host: dashboard,
        headers: { origin: dashboard },
        body: { pairId: p.pairing.pairId, userCode: p.pairing.userCode },
      })
    ).status,
    401,
  );
  const poll = await f.req('/api/agent/poll', {
    method: 'POST',
    token: p.deviceToken,
    body: { version: 1, deviceId: p.deviceId },
  });
  assert.equal(poll.status, 200);
  const d = await (await f.req('/api/dashboard', { jwt: await f.identity(), host: dashboard })).json();
  assert.equal(d.devices[0].status, 'online');
  assert.equal(d.devices[0].permissions, 'read-only');
  assert.ok(!JSON.stringify(d).includes(p.deviceToken));
});
test('real relay request travels gateway queue to selected agent and result returns once', async () => {
  const f = await fixture(),
    auth = await f.oauth(),
    p = await f.pair();
  await f.req('/api/agent/poll', {
    method: 'POST',
    token: p.deviceToken,
    body: { version: 1, deviceId: p.deviceId },
  });
  const pending = f.req('/mcp', {
    method: 'POST',
    token: auth.access_token,
    body: {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: { name: 'mterm_read_file', arguments: { deviceId: p.deviceId, path: 'fixture.txt' } },
    },
  });
  let job;
  for (let i = 0; i < 30 && !job; i++) {
    const poll = await (
      await f.req('/api/agent/poll', {
        method: 'POST',
        token: p.deviceToken,
        body: { version: 1, deviceId: p.deviceId },
      })
    ).json();
    job = poll.requests[0];
    if (!job) await new Promise((r) => setTimeout(r, 5));
  }
  assert.equal(job.tool, 'mterm_read_file');
  assert.deepEqual(job.arguments, { path: 'fixture.txt' });
  const frame = {
    version: 1,
    requestId: job.requestId,
    deviceId: p.deviceId,
    result: {
      content: [{ type: 'text', text: 'verified fixture' }],
      structuredContent: { text: 'verified fixture' },
      isError: false,
    },
  };
  assert.equal(
    (await f.req('/api/agent/result', { method: 'POST', token: p.deviceToken, body: frame })).status,
    200,
  );
  const output = await pending;
  assert.equal((await output.json()).result.content[0].text, 'verified fixture');
  assert.equal(
    (await f.req('/api/agent/result', { method: 'POST', token: p.deviceToken, body: frame })).status,
    409,
  );
  const audit = (await (await f.req('/api/dashboard', { jwt: auth.jwt, host: dashboard })).json()).audit;
  assert.ok(audit.some((e) => e.requestId === job.requestId && e.result === 'ok'));
  assert.ok(!JSON.stringify(audit).includes('verified fixture'));
});
test('cross-user and cross-device access, mutation names, and revoked credentials fail closed', async () => {
  const f = await fixture(),
    first = await f.oauth(),
    second = await f.oauth(await f.identity('other@example.test')),
    p = await f.pair();
  for (const [token, name] of [
    [second.access_token, 'mterm_read_file'],
    [first.access_token, 'mterm_start_process'],
  ]) {
    const r = await (
      await f.req('/mcp', {
        method: 'POST',
        token,
        body: {
          jsonrpc: '2.0',
          id: randomToken(10),
          method: 'tools/call',
          params: { name, arguments: { deviceId: p.deviceId, path: 'fixture.txt' } },
        },
      })
    ).json();
    assert.ok(r.error || r.result?.isError);
  }
  assert.equal(
    (
      await f.req('/api/agent/poll', {
        method: 'POST',
        token: p.deviceToken,
        body: { version: 1, deviceId: crypto.randomUUID() },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await f.req('/api/devices/revoke', {
        method: 'POST',
        jwt: first.jwt,
        host: dashboard,
        headers: { origin: dashboard },
        body: { deviceId: p.deviceId },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await f.req('/api/agent/poll', {
        method: 'POST',
        token: p.deviceToken,
        body: { version: 1, deviceId: p.deviceId },
      })
    ).status,
    410,
  );
  assert.equal(
    (
      await f.req('/oauth/revoke', {
        method: 'POST',
        body: new URLSearchParams({
          token: first.access_token,
          client_id: first.client.client_id,
        }).toString(),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      })
    ).status,
    200,
  );
  assert.equal((await f.req('/mcp', { method: 'POST', token: first.access_token, body: {} })).status, 401);
});
test('frequent polling cannot defer expiry cleanup and the sweep reaches beyond 1000 rows', async () => {
  const f = await fixture(),
    p = await f.pair();
  const due = await f.storage.getAlarm();
  await new Promise((r) => setTimeout(r, 5));
  await f.req('/api/agent/poll', {
    method: 'POST',
    token: p.deviceToken,
    body: { version: 1, deviceId: p.deviceId },
  });
  assert.equal(await f.storage.getAlarm(), due);
  for (let i = 0; i < 1250; i++)
    await f.storage.put('expired:' + String(i).padStart(5, '0'), { expiresAt: 1 });
  await f.registry.alarm();
  assert.equal((await f.storage.list({ prefix: 'expired:', limit: 2000 })).size, 0);
});
test('refresh rotation is single use, replay revokes its whole grant, and resource mismatch fails', async () => {
  const f = await fixture(),
    a = await f.oauth();
  const headers = { 'content-type': 'application/x-www-form-urlencoded' };
  const refresh = (resource) =>
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: a.client.client_id,
      refresh_token: a.refresh_token,
      resource,
    }).toString();
  assert.equal(
    (await f.req('/oauth/token', { method: 'POST', headers, body: refresh('https://wrong.test/mcp') }))
      .status,
    400,
  );
  const r = await f.req('/oauth/token', { method: 'POST', headers, body: refresh(origin + '/mcp') });
  assert.equal(r.status, 200);
  const b = await r.json();
  assert.notEqual(a.refresh_token, b.refresh_token);
  assert.equal(
    (await f.req('/oauth/token', { method: 'POST', headers, body: refresh(origin + '/mcp') })).status,
    400,
  );
  assert.equal(
    (
      await f.req('/mcp', {
        method: 'POST',
        token: b.access_token,
        body: { jsonrpc: '2.0', id: 1, method: 'ping' },
      })
    ).status,
    401,
  );
});
test('request cancellation is scoped, delivered requests never replay, and late results fail', async () => {
  const f = await fixture(),
    auth = await f.oauth(),
    other = await f.oauth(await f.identity('other@example.test')),
    p = await f.pair();
  const poll = () =>
    f.req('/api/agent/poll', {
      method: 'POST',
      token: p.deviceToken,
      body: { version: 1, deviceId: p.deviceId },
    });
  await poll();
  const pending = f.req('/mcp', {
    method: 'POST',
    token: auth.access_token,
    body: {
      jsonrpc: '2.0',
      id: 90,
      method: 'tools/call',
      params: { name: 'mterm_file_info', arguments: { deviceId: p.deviceId, path: 'a.txt' } },
    },
  });
  let job;
  for (let i = 0; i < 30 && !job; i++) {
    job = (await (await poll()).json()).requests[0];
    if (!job) await new Promise((r) => setTimeout(r, 5));
  }
  assert.ok(job);
  assert.deepEqual((await (await poll()).json()).requests, []);
  const cancel = (token) =>
    f.req('/mcp', {
      method: 'POST',
      token,
      body: { jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 90 } },
    });
  assert.equal((await cancel(other.access_token)).status, 202);
  assert.equal((await f.storage.get('job:' + job.requestId)).status, 'delivered');
  assert.equal((await cancel(auth.access_token)).status, 202);
  const result = await (await pending).json();
  assert.equal(result.result.isError, true);
  assert.ok(
    (await (await poll()).json()).cancelled.includes(job.requestId),
    'agent must receive cancellation even after the client consumes the error',
  );
  const late = await f.req('/api/agent/result', {
    method: 'POST',
    token: p.deviceToken,
    body: {
      version: 1,
      requestId: job.requestId,
      deviceId: p.deviceId,
      result: { content: [{ type: 'text', text: 'late' }], structuredContent: {}, isError: false },
    },
  });
  assert.equal(late.status, 409);
});
test('offline, expired, malformed and oversized requests have bounded safe failures', async () => {
  const f = await fixture(),
    auth = await f.oauth(),
    p = await f.pair();
  const call = (arguments_) =>
    f.req('/mcp', {
      method: 'POST',
      token: auth.access_token,
      body: {
        jsonrpc: '2.0',
        id: 17,
        method: 'tools/call',
        params: { name: 'mterm_read_file', arguments: arguments_ },
      },
    });
  let r = await (await call({ deviceId: p.deviceId, path: 'x.txt' })).json();
  assert.equal(r.result.structuredContent.error.code, 'device_offline');
  r = await (await call({ deviceId: p.deviceId, path: 'x.txt', unexpected: 'secret sentinel' })).json();
  assert.equal(r.result.structuredContent.error.code, 'invalid_arguments');
  assert.ok(!JSON.stringify(r).includes('secret sentinel'));
  assert.equal((await f.req('/mcp', { method: 'POST', token: auth.access_token, body: '{bad' })).status, 400);
  assert.equal(
    (await f.req('/mcp', { method: 'POST', token: auth.access_token, body: { text: 'x'.repeat(40000) } }))
      .status,
    413,
  );
  const tokenKey = 'token:' + (await sha256(auth.access_token)),
    token = await f.storage.get(tokenKey);
  token.expiresAt = 1;
  await f.storage.put(tokenKey, token);
  assert.equal((await call({ deviceId: p.deviceId, path: 'x.txt' })).status, 401);
});
test('dashboard cancellation checks ownership and service identities require exact app-token claims', async () => {
  const f = await fixture();
  f.env.STAGING_SERVICE_ID = 'synthetic.access';
  const svc = await f.identity('owner@example.test', {
    sub: '',
    email: undefined,
    common_name: 'synthetic.access',
  });
  assert.equal((await f.req('/api/dashboard', { jwt: svc, host: dashboard })).status, 200);
  const wrongType = await f.identity('owner@example.test', { type: 'org' });
  assert.equal((await f.req('/api/dashboard', { jwt: wrongType, host: dashboard })).status, 401);
  const bypass = await f.identity('intruder@example.test', { common_name: 'synthetic.access' });
  assert.equal((await f.req('/api/dashboard', { jwt: bypass, host: dashboard })).status, 403);
  f.env.ENVIRONMENT = 'production';
  assert.equal((await f.req('/api/dashboard', { jwt: svc, host: dashboard })).status, 403);
});
test('revoke-all invalidates unredeemed authorization codes and approved unclaimed pairings', async () => {
  const f = await fixture(),
    auth = await f.oauth(null, { defer: true }),
    p = await f.pair(null, 'Pending fixture', { deferClaim: true });
  assert.equal(
    (
      await f.req('/api/revoke-all', {
        method: 'POST',
        jwt: auth.jwt,
        host: dashboard,
        headers: { origin: dashboard },
        body: {},
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await f.req('/oauth/token', {
        method: 'POST',
        body: auth.tokenBody,
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.req('/api/pair/poll', {
        method: 'POST',
        body: { pairId: p.pairing.pairId, deviceCode: p.pairing.deviceCode },
      })
    ).status,
    410,
  );
});
test('MCP optional arguments and JSON-RPC parse errors follow the advertised protocol', async () => {
  const f = await fixture(),
    auth = await f.oauth();
  const result = await (
    await f.req('/mcp', {
      method: 'POST',
      token: auth.access_token,
      body: { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'mterm_list_devices' } },
    })
  ).json();
  assert.deepEqual(result.result.structuredContent.devices, []);
  const bad = await (await f.req('/mcp', { method: 'POST', token: auth.access_token, body: '{bad' })).json();
  assert.equal(bad.error.code, -32700);
});
test('pairing stays consumed after a credential-store failure and consent CSP permits only its callback', async () => {
  const f = await fixture(),
    p = await f.pair(null, 'Crash fixture', { deferClaim: true });
  const original = f.storage.put.bind(f.storage);
  let injected = false;
  f.storage.put = async (key, value) => {
    if (!injected && key.startsWith('agent:')) {
      injected = true;
      throw Error('fixture storage fault');
    }
    return original(key, value);
  };
  const request = () =>
    f.req('/api/pair/poll', {
      method: 'POST',
      body: { pairId: p.pairing.pairId, deviceCode: p.pairing.deviceCode },
    });
  assert.equal((await request()).status, 500);
  assert.equal((await request()).status, 410);
  const client = await (
    await f.req('/oauth/register', {
      method: 'POST',
      body: { redirect_uris: ['https://client.test.invalid/callback'] },
    })
  ).json();
  const q = new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: 'https://client.test.invalid/callback',
    response_type: 'code',
    resource: origin + '/mcp',
    scope: 'mterm:read',
    state: randomToken(),
    code_challenge: await sha256(randomToken(48), 'base64url'),
    code_challenge_method: 'S256',
  });
  const consent = await f.req('/oauth/authorize?' + q, { jwt: await f.identity(), host: dashboard });
  assert.match(
    consent.headers.get('content-security-policy'),
    /form-action 'self' https:\/\/client\.test\.invalid;/,
  );
  assert.ok((await consent.text()).includes('Client callback:'));
});

async function requestOwnershipFixture(t) {
  let clock = Date.now();
  t.mock.method(Date, 'now', () => clock);
  const f = await fixture(),
    auth = await f.oauth(),
    device = await f.pair();
  const dispatch = async (action, data) => {
    const response = await f.registry.fetch(
      new Request('https://registry.internal/dispatch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, data }),
      }),
    );
    return { status: response.status, data: await response.json() };
  };
  const poll = async (availableSlots = 0) => {
    const response = await f.req('/api/agent/poll', {
      method: 'POST',
      token: device.deviceToken,
      body: { version: 1, deviceId: device.deviceId, availableSlots },
    });
    assert.equal(response.status, 200);
    return response.json();
  };
  await poll();
  const tryEnqueue = (rpcId, credentials = auth) =>
    dispatch('enqueue', {
      token: credentials.access_token,
      deviceId: device.deviceId,
      tool: 'mterm_file_info',
      arguments: { path: 'request-ownership-fixture.txt' },
      rpcId,
    });
  const enqueue = async (rpcId, credentials) => {
    const result = await tryEnqueue(rpcId, credentials);
    assert.equal(result.status, 200, JSON.stringify(result.data));
    return result.data;
  };
  const jobState = (job) => f.storage.get('job:' + job.requestId);
  const index = async (job) => f.storage.get((await jobState(job)).rpcKey);
  const consume = (job) => dispatch('jobResult', { token: auth.access_token, requestId: job.requestId });
  const notify = (rpcId, credentials = auth) =>
    f.req('/mcp', {
      method: 'POST',
      token: credentials.access_token,
      body: { jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: rpcId } },
    });
  const expireLease = async (job) => {
    clock = job.deadline + 1001;
    await poll(); // Actual timeout processing and a fresh device heartbeat.
  };
  return {
    ...f,
    auth,
    device,
    dispatch,
    poll,
    tryEnqueue,
    enqueue,
    jobState,
    index,
    consume,
    notify,
    expireLease,
  };
}

for (const terminal of ['timeout', 'cancelled', 'complete']) {
  test(`request ownership: consuming an old ${terminal} preserves the replacement RPC lease`, async (t) => {
    const f = await requestOwnershipFixture(t),
      rpcId = 'reused-terminal',
      old = await f.enqueue(rpcId);
    if (terminal === 'cancelled') assert.equal((await f.notify(rpcId)).status, 202);
    if (terminal === 'complete') {
      assert.deepEqual(
        (await f.poll(1)).requests.map((r) => r.requestId),
        [old.requestId],
      );
      const response = await f.req('/api/agent/result', {
        method: 'POST',
        token: f.device.deviceToken,
        body: {
          version: 1,
          deviceId: f.device.deviceId,
          requestId: old.requestId,
          result: {
            content: [{ type: 'text', text: 'old-owned-result' }],
            structuredContent: { value: 7 },
            isError: false,
          },
        },
      });
      assert.equal(response.status, 200);
    }
    await f.expireLease(old);
    assert.equal((await f.jobState(old)).status, terminal);
    const replacement = await f.enqueue(rpcId),
      before = await f.index(replacement);
    assert.equal(before.requestId, replacement.requestId);
    assert.equal((await f.tryEnqueue(rpcId)).status, 409);
    const consumed = await f.consume(old);
    assert.equal(consumed.status, 200);
    if (terminal === 'complete') assert.deepEqual(consumed.data.result.structuredContent, { value: 7 });
    else assert.equal(consumed.data.result.structuredContent.error.code, 'REMOTE_' + terminal.toUpperCase());
    assert.equal((await f.jobState(old)).status, 'consumed');
    assert.deepEqual(await f.index(replacement), before, 'Old consumption must preserve the newer lookup');
    const duplicate = await f.tryEnqueue(rpcId);
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.data.error, 'request_in_progress');
    const delivered = await f.poll(1);
    assert.deepEqual(
      delivered.requests.map((r) => r.requestId),
      [replacement.requestId],
    );
    assert.equal((await f.poll(1)).requests.length, 0, 'Replacement is delivered once');
  });
}

test('request ownership: public cancellation still reaches a replacement after old result consumption', async (t) => {
  const f = await requestOwnershipFixture(t),
    rpcId = 'reused-public-cancel',
    old = await f.enqueue(rpcId);
  await f.expireLease(old);
  const replacement = await f.enqueue(rpcId);
  assert.equal((await f.consume(old)).status, 200);
  assert.equal((await f.notify(rpcId)).status, 202);
  assert.equal((await f.jobState(replacement)).status, 'cancelled');
  assert.ok((await f.poll()).cancelled.includes(replacement.requestId));
});

test('request ownership: repeated consumption rejects before modifying a reused RPC lease', async (t) => {
  const f = await requestOwnershipFixture(t),
    rpcId = 'repeated-consumption',
    old = await f.enqueue(rpcId);
  await f.expireLease(old);
  assert.equal((await f.consume(old)).status, 200);
  const replacement = await f.enqueue(rpcId),
    before = {
      old: await f.jobState(old),
      next: await f.jobState(replacement),
      index: await f.index(replacement),
    };
  const repeated = await f.consume(old);
  assert.equal(repeated.status, 409);
  assert.equal(repeated.data.error, 'result_already_consumed');
  assert.deepEqual(
    { old: await f.jobState(old), next: await f.jobState(replacement), index: await f.index(replacement) },
    before,
  );
});

async function boundedObservation(promise, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error('Fixture observation timed out: ' + label)), 5000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

for (const trigger of ['abort', 'deadline']) {
  test(`request ownership: delayed old HTTP ${trigger} cleanup cannot cancel a replacement`, async (t) => {
    const f = await requestOwnershipFixture(t),
      rpcId = 'reused-http-' + trigger,
      queued = Promise.withResolvers(),
      entered = Promise.withResolvers(),
      release = Promise.withResolvers(),
      cancelSettled = Promise.withResolvers(),
      controller = new AbortController();
    let old,
      gated = false;
    // Gate the binding outside serialized registry.fetch, so a replacement can
    // actually be admitted while the original HTTP handler awaits its response.
    f.env.REGISTRY = {
      idFromName: () => 'one',
      get: () => ({
        fetch: async (request) => {
          const message = await request.clone().json();
          if (message.action === 'enqueue') {
            const response = await f.registry.fetch(request);
            old = await response.clone().json();
            assert.equal(response.status, 200);
            queued.resolve(old);
            return response;
          }
          if (message.action === 'jobResult' && !gated) {
            gated = true;
            assert.equal(message.data.requestId, old.requestId);
            // Abort gates the lookup itself; deadline gates a genuine pending
            // response. Cancellation is observed before any old result consumption.
            const response = trigger === 'deadline' ? await f.registry.fetch(request) : undefined;
            if (response) assert.deepEqual(await response.clone().json(), { pending: true });
            entered.resolve();
            await release.promise;
            return response ?? f.registry.fetch(request);
          }
          const response = await f.registry.fetch(request);
          if (message.action === 'cancel') cancelSettled.resolve({ message, status: response.status });
          return response;
        },
      }),
    };
    const http = f.req('/mcp', {
      method: 'POST',
      token: f.auth.access_token,
      signal: controller.signal,
      body: {
        jsonrpc: '2.0',
        id: rpcId,
        method: 'tools/call',
        params: { name: 'mterm_file_info', arguments: { deviceId: f.device.deviceId, path: 'owned.txt' } },
      },
    });
    try {
      old = await boundedObservation(queued.promise, 'original enqueue');
      await boundedObservation(entered.promise, 'original result response gate');
      await f.expireLease(old);
      const replacement = await f.enqueue(rpcId),
        before = { job: await f.jobState(replacement), index: await f.index(replacement) };
      assert.equal((await f.jobState(old)).status, 'timeout');
      if (trigger === 'abort') controller.abort();
      else release.resolve();
      const cancellation = await boundedObservation(cancelSettled.promise, 'original HTTP cancellation');
      assert.equal(cancellation.status, 200);
      assert.equal(
        (await f.jobState(replacement)).status,
        'queued',
        'Old HTTP cleanup cannot cancel newer work',
      );
      assert.deepEqual({ job: await f.jobState(replacement), index: await f.index(replacement) }, before);
      assert.equal(cancellation.message.data.expectedRequestId, old.requestId);
      assert.deepEqual(
        (await f.poll(1)).requests.map((r) => r.requestId),
        [replacement.requestId],
      );
    } finally {
      controller.abort();
      release.resolve();
      await boundedObservation(http, 'original HTTP teardown');
    }
  });
}

test('request ownership: malformed private expected IDs cannot fall back to unbound cancellation', async (t) => {
  const f = await requestOwnershipFixture(t),
    job = await f.enqueue('invalid-private-id'),
    before = { job: await f.jobState(job), index: await f.index(job) };
  for (const expectedRequestId of [null, '', false, 1, {}, [], 'not-a-uuid']) {
    const response = await f.dispatch('cancel', {
      token: f.auth.access_token,
      rpcId: 'invalid-private-id',
      expectedRequestId,
    });
    assert.equal(response.status, 400, JSON.stringify(expectedRequestId));
    assert.deepEqual({ job: await f.jobState(job), index: await f.index(job) }, before);
  }
});

test('request ownership: private stale IDs require authentication and cannot select another job', async (t) => {
  const f = await requestOwnershipFixture(t),
    job = await f.enqueue('private-current'),
    other = await f.enqueue('private-other'),
    before = { job: await f.jobState(job), other: await f.jobState(other), index: await f.index(job) };
  assert.equal(
    (
      await f.dispatch('cancel', {
        token: 'invalid-fixture-token',
        rpcId: 'private-current',
        expectedRequestId: other.requestId,
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await f.dispatch('cancel', {
        token: f.auth.access_token,
        rpcId: 'private-current',
        expectedRequestId: other.requestId,
      })
    ).status,
    200,
  );
  assert.deepEqual(
    { job: await f.jobState(job), other: await f.jobState(other), index: await f.index(job) },
    before,
  );
  await f.storage.delete(before.job.rpcKey);
  assert.equal(
    (
      await f.dispatch('cancel', {
        token: f.auth.access_token,
        rpcId: 'private-current',
        expectedRequestId: job.requestId,
      })
    ).status,
    200,
  );
  assert.deepEqual(
    await f.jobState(job),
    before.job,
    'Missing pointer does not authorize a direct job lookup',
  );
  assert.deepEqual(await f.jobState(other), before.other);
});

test('request ownership: public notifications isolate bearer credentials and numeric versus string IDs', async (t) => {
  const f = await requestOwnershipFixture(t),
    other = await f.oauth(),
    text = await f.enqueue('7'),
    number = await f.enqueue(7),
    otherClient = await f.enqueue('7', other);
  assert.equal((await f.notify('7')).status, 202);
  assert.equal((await f.jobState(text)).status, 'cancelled');
  assert.equal((await f.jobState(number)).status, 'queued');
  assert.equal((await f.jobState(otherClient)).status, 'queued');
  assert.equal((await f.notify(7)).status, 202);
  assert.equal((await f.jobState(number)).status, 'cancelled');
  assert.equal((await f.jobState(otherClient)).status, 'queued');
  assert.equal((await f.notify('7', other)).status, 202);
  assert.equal((await f.jobState(otherClient)).status, 'cancelled');
});

test('request ownership: a matching private expected ID still cancels its current job', async (t) => {
  const f = await requestOwnershipFixture(t),
    job = await f.enqueue('matching-private-id');
  const response = await f.dispatch('cancel', {
    token: f.auth.access_token,
    rpcId: 'matching-private-id',
    expectedRequestId: job.requestId,
  });
  assert.equal(response.status, 200);
  assert.equal((await f.jobState(job)).status, 'cancelled');
  assert.ok((await f.poll()).cancelled.includes(job.requestId));
});

test('request ownership: an absent active pointer permits first authorized terminal consumption', async (t) => {
  const f = await requestOwnershipFixture(t),
    job = await f.enqueue('missing-active-pointer');
  await f.expireLease(job);
  const { rpcKey } = await f.jobState(job);
  await f.storage.delete(rpcKey);
  const response = await f.consume(job);
  assert.equal(response.status, 200);
  assert.equal(response.data.result.structuredContent.error.code, 'REMOTE_TIMEOUT');
  assert.equal((await f.jobState(job)).status, 'consumed');
  assert.equal(await f.storage.get(rpcKey), undefined);
});

async function oauthExpiryFixture(t) {
  let clock = Date.now();
  t.mock.method(Date, 'now', () => clock);
  let externalRequests = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    externalRequests++;
    assert.fail('OAuth expiry fixtures must not make external requests.');
  });
  t.after(() => assert.equal(externalRequests, 0));
  const f = await fixture(),
    auth = await f.oauth(),
    tokenKey = 'token:' + (await sha256(auth.access_token)),
    token = await f.storage.get(tokenKey),
    grantKey = 'grant:' + token.grantId,
    grant = await f.storage.get(grantKey),
    epochKey = 'epoch:' + token.userId,
    expiry = clock + 1000;
  token.expiresAt = expiry;
  await f.storage.put(tokenKey, token);
  const read = f.storage.get;
  const observed = { tokenReads: 0, epochReads: 0, grantReads: 0, crossings: 0 };
  let transition;
  t.mock.method(f.storage, 'get', async function (key) {
    const value = await read.call(this, key);
    if (key === tokenKey) observed.tokenReads++;
    if (key === epochKey) observed.epochReads++;
    if (key === grantKey) observed.grantReads++;
    if (transition?.key === key) {
      clock = transition.time;
      transition = undefined;
      observed.crossings++;
    }
    return value;
  });
  return {
    ...f,
    auth,
    token,
    tokenKey,
    grant,
    grantKey,
    expiry,
    observed,
    setClock(time) {
      clock = time;
    },
    crossRead(phase, time) {
      transition = { key: phase === 'epoch' ? epochKey : grantKey, time };
    },
    ping(credentials = auth) {
      return f.req('/mcp', {
        method: 'POST',
        token: credentials.access_token,
        body: { jsonrpc: '2.0', id: 'oauth-expiry', method: 'ping' },
      });
    },
  };
}

for (const phase of ['epoch', 'grant']) {
  for (const delta of [-1, 0, 1]) {
    const boundary = delta < 0 ? 'just before' : delta === 0 ? 'exactly at' : 'after';
    test(`OAuth expiry: public MCP authorization settles ${boundary} token expiry during ${phase} read`, async (t) => {
      const f = await oauthExpiryFixture(t);
      f.crossRead(phase, f.expiry + delta);
      const response = await f.ping();
      assert.deepEqual(f.observed, { tokenReads: 1, epochReads: 1, grantReads: 1, crossings: 1 });
      assert.ok(f.grant.expiresAt > f.expiry + delta, 'The client grant remains valid');
      assert.equal(response.status, delta < 0 ? 200 : 401);
      assert.deepEqual(
        await response.json(),
        delta < 0 ? { jsonrpc: '2.0', id: 'oauth-expiry', result: {} } : { error: 'invalid_token' },
      );
    });
  }
  test(`OAuth expiry: public MCP authorization still rejects grant expiry during ${phase} read`, async (t) => {
    const f = await oauthExpiryFixture(t);
    f.token.expiresAt = f.expiry + 60000;
    await f.storage.put(f.tokenKey, f.token);
    f.grant.expiresAt = f.expiry;
    await f.storage.put(f.grantKey, f.grant);
    f.crossRead(phase, f.expiry);
    const response = await f.ping();
    assert.deepEqual(f.observed, { tokenReads: 1, epochReads: 1, grantReads: 1, crossings: 1 });
    assert.ok(f.token.expiresAt > f.expiry, 'The client access token remains valid');
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'invalid_token' });
  });
}

test('OAuth expiry: an already-expired access token rejects before epoch and grant reads', async (t) => {
  const f = await oauthExpiryFixture(t);
  f.setClock(f.expiry);
  const response = await f.ping();
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'invalid_token' });
  assert.deepEqual(f.observed, { tokenReads: 1, epochReads: 0, grantReads: 0, crossings: 0 });
});

test('OAuth expiry: another live client token remains authorized after the first token expires', async (t) => {
  const f = await oauthExpiryFixture(t),
    other = await f.oauth();
  assert.notEqual(other.client.client_id, f.auth.client.client_id);
  assert.notEqual(other.access_token, f.auth.access_token);
  f.setClock(f.expiry);
  const expired = await f.ping();
  assert.equal(expired.status, 401);
  assert.deepEqual(await expired.json(), { error: 'invalid_token' });
  const live = await f.ping(other);
  assert.equal(live.status, 200);
  assert.deepEqual(await live.json(), { jsonrpc: '2.0', id: 'oauth-expiry', result: {} });
});
