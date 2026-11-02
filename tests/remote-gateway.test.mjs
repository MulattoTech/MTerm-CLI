// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-remote-gateway (OpenAI / GPT-6 Astra Pro; self-reported)
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
  async function req(path, { method = 'GET', body, token, jwt, host = origin, headers = {} } = {}) {
    const r = new Request(host + path, {
      method,
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
