// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-12-public-endpoint-inspector (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import { Resolver } from 'node:dns/promises';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { setImmediate as immediate } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const runtimeRoot = process.env.MTERM_ENDPOINT_VERIFY_ROOT ?? fileURLToPath(new URL('../', import.meta.url));
const { inspectPublicEndpoint } = await import(
  pathToFileURL(path.join(runtimeRoot, 'dist/remote/endpoint-probe.js')).href
);
const modern = (request, changes = {}) => ({
  jsonrpc: '2.0',
  id: request.id,
  result: {
    resultType: 'complete',
    supportedVersions: ['2026-07-28'],
    capabilities: { tools: {} },
    ttlMs: 0,
    cacheScope: 'private',
    ...changes,
  },
});
const legacy = (request, changes = {}) => ({
  jsonrpc: '2.0',
  id: request.id,
  result: {
    protocolVersion: '2025-11-25',
    capabilities: { tools: {} },
    serverInfo: { name: 'Fixture server', version: '1' },
    ...changes,
  },
});

function transport(t, scenarios = [], answers = { v4: ['8.8.8.8'], v6: [] }) {
  const calls = [],
    resolutions = [];
  t.mock.method(globalThis, 'fetch', () => assert.fail('The endpoint probe must not use unpinned fetch'));
  for (const [method, key] of [
    ['resolve4', 'v4'],
    ['resolve6', 'v6'],
  ]) {
    t.mock.method(Resolver.prototype, method, async (hostname) => {
      resolutions.push({ method, hostname });
      if (answers[key] instanceof Error) throw answers[key];
      return answers[key];
    });
  }
  t.mock.method(https, 'request', (options, callback) => {
    const index = calls.length,
      scenario = scenarios[index] ?? {};
    const request = new EventEmitter();
    const call = { options, body: null, destroyed: false, pinned: null };
    calls.push(call);
    let response;
    request.destroy = (error) => {
      call.destroyed = true;
      response?.destroy();
      if (error) queueMicrotask(() => request.emit('error', error));
      return request;
    };
    request.end = (body) => {
      call.body = body ? JSON.parse(String(body)) : null;
      queueMicrotask(() => {
        options.lookup(options.hostname, { family: options.family, all: false }, (error, address, family) => {
          assert.ifError(error);
          call.pinned = { address, family };
          if (scenario.hang) return;
          response = new PassThrough();
          response.statusCode = scenario.status ?? 200;
          response.headers = { 'content-type': 'application/json', ...(scenario.headers ?? {}) };
          response.rawHeaders = scenario.rawHeaders ?? Object.entries(response.headers).flat();
          response.socket = {
            remoteAddress: scenario.remoteAddress ?? address,
            authorized: scenario.authorized ?? true,
          };
          callback(response);
          if (response.destroyed) return;
          const data = scenario.chunks
            ? undefined
            : typeof scenario.value === 'function'
              ? scenario.value(call.body)
              : (scenario.value ?? modern(call.body));
          const chunks = scenario.chunks ?? [typeof data === 'string' ? data : JSON.stringify(data)];
          for (const chunk of chunks) {
            if (response.destroyed) break;
            response.write(chunk);
          }
          if (!scenario.open && !response.destroyed) response.end();
        });
      });
      return request;
    };
    return request;
  });
  return { calls, resolutions };
}

test('offline endpoint inspection never resolves DNS or sends a request', async (t) => {
  const f = transport(t);
  const report = await inspectPublicEndpoint('https://example.com/mcp');
  assert.equal(report.status, 'url-valid');
  assert.equal(report.networkChecked, false);
  assert.equal(report.credentialsUsed, false);
  assert.equal(report.protocolChecked, false);
  assert.deepEqual(f.calls, []);
  assert.deepEqual(f.resolutions, []);
});

test('modern discovery pins the inspected address and enforces credential-free TLS and proxy policy', async (t) => {
  const f = transport(t, [
    {
      value: (r) =>
        modern(r, {
          instructions: 'REMOTE_INSTRUCTION_SECRET',
          _meta: { 'io.modelcontextprotocol/serverInfo': { name: 'Fixture', version: '1' } },
        }),
    },
  ]);
  const before = Object.fromEntries(
    ['HTTPS_PROXY', 'NODE_USE_ENV_PROXY', 'NODE_TLS_REJECT_UNAUTHORIZED'].map((key) => [
      key,
      process.env[key],
    ]),
  );
  process.env.HTTPS_PROXY = 'http://SYNTHETIC_CREDENTIAL_PROXY.invalid';
  process.env.NODE_USE_ENV_PROXY = '1';
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  t.after(() => {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const report = await inspectPublicEndpoint('https://example.com:8443/mcp', { check: true });
  assert.equal(report.status, 'compatible');
  assert.equal(report.protocolVersion, '2026-07-28');
  assert.equal(report.protocolChecked, true);
  assert.equal(report.cleanup, 'not-needed');
  assert.equal(report.routingEnabled, false);
  assert.equal(f.calls.length, 1);
  const { options, body, pinned } = f.calls[0];
  assert.deepEqual(pinned, { address: '8.8.8.8', family: 4 });
  assert.equal(options.hostname, 'example.com');
  assert.equal(options.servername, 'example.com');
  assert.equal(options.port, 8443);
  assert.equal(options.path, '/mcp');
  assert.equal(options.rejectUnauthorized, true);
  assert.equal(options.minVersion, 'TLSv1.2');
  assert.equal(options.autoSelectFamily, false);
  assert.equal(options.insecureHTTPParser, false);
  assert.deepEqual(options.agent.options.proxyEnv, {});
  assert.notEqual(options.agent, https.globalAgent);
  assert.equal(options.headers.Authorization, undefined);
  assert.equal(options.headers.Cookie, undefined);
  assert.equal(options.headers['Mcp-Method'], 'server/discover');
  assert.equal(options.headers['MCP-Protocol-Version'], '2026-07-28');
  assert.equal(body.method, 'server/discover');
  assert.deepEqual(body.params._meta['io.modelcontextprotocol/clientCapabilities'], {});
  assert.equal(f.resolutions.length, 2);
  const repeated = await new Promise((resolve) =>
    options.lookup('example.com', { all: true }, (error, addresses) => {
      assert.ifError(error);
      resolve(addresses);
    }),
  );
  assert.deepEqual(repeated, [{ address: '8.8.8.8', family: 4 }]);
  assert.equal(f.resolutions.length, 2, 'The connection cannot trigger another resolver lookup');
  assert.equal(JSON.stringify(report).includes('REMOTE_INSTRUCTION_SECRET'), false);
  assert.equal(JSON.stringify(f.calls).includes('SYNTHETIC_CREDENTIAL_PROXY'), false);
});

test('mixed, oversized, invalid or failed DNS answers never reach HTTPS', async (t) => {
  for (const answers of [
    { v4: ['8.8.8.8', '127.0.0.1'], v6: [] },
    { v4: ['8.8.8.8'], v6: ['::ffff:8.8.8.8'] },
    { v4: ['8.8.8.8'], v6: ['fe80::1'] },
    { v4: Array(9).fill('8.8.8.8'), v6: [] },
    { v4: ['not-an-address'], v6: [] },
    { v4: [], v6: [] },
    { v4: ['8.8.8.8'], v6: Object.assign(new Error('SECRET_DNS_FAILURE'), { code: 'ESERVFAIL' }) },
  ])
    await t.test(JSON.stringify(answers), async (st) => {
      const f = transport(st, [], answers);
      const report = await inspectPublicEndpoint('https://example.com/mcp', { check: true });
      assert.equal(report.protocolChecked, false);
      assert.equal(f.calls.length, 0);
      assert.equal(JSON.stringify(report).includes('SECRET_DNS_FAILURE'), false);
    });
});

test('public IP literals require no DNS and still verify the connected address', async (t) => {
  const f = transport(t, [{ remoteAddress: '127.0.0.1' }]);
  const report = await inspectPublicEndpoint('https://8.8.8.8/mcp', { check: true });
  assert.equal(f.resolutions.length, 0);
  assert.equal(report.protocolChecked, false);
  assert.equal(report.errorCode, 'ENDPOINT_PIN');
});

test('authorization denials and redirects are classified without a second request or raw disclosure', async (t) => {
  for (const [status, expected] of [
    [401, 'authorization-required'],
    [403, 'access-denied'],
    [302, 'redirect-refused'],
  ]) {
    await t.test(String(status), async (st) => {
      const f = transport(st, [
        {
          status,
          headers: {
            location: 'http://127.0.0.1/SECRET',
            'www-authenticate': 'Bearer SECRET',
            'set-cookie': 'SECRET',
          },
          value: 'SECRET',
        },
      ]);
      const report = await inspectPublicEndpoint('https://example.com/mcp', { check: true });
      assert.equal(report.status, expected);
      assert.equal(report.protocolChecked, false);
      assert.equal(f.calls.length, 1);
      assert.equal(JSON.stringify(report).includes('SECRET'), false);
    });
  }
});

test('SSE accepts bounded priming and notification events and closes at the final response', async (t) => {
  const f = transport(t, [
    {
      headers: { 'content-type': 'text/event-stream' },
      open: true,
      value: (r) =>
        `: keepalive\r\n\r\nid: first\ndata:\n\nevent: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/message', params: { message: 'DO_NOT_DISPLAY' } })}\n\ndata: ${JSON.stringify(modern(r))}\n\n`,
    },
  ]);
  const report = await inspectPublicEndpoint('https://example.com/mcp', { check: true });
  assert.equal(report.status, 'compatible');
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].destroyed, true);
  assert.equal(JSON.stringify(report).includes('DO_NOT_DISPLAY'), false);
});

test('malformed, oversized, compressed and interactive responses cannot claim compatibility', async (t) => {
  const scenarios = [
    { value: '{not-json SECRET' },
    { value: (r) => ({ ...modern(r), id: 'wrong' }) },
    { value: (r) => modern(r, { resultType: 'input_required', inputRequests: ['SECRET'] }) },
    { value: (r) => modern(r, { ttlMs: -1 }) },
    { value: (r) => modern(r, { cacheScope: 'unknown' }) },
    { value: (r) => modern(r, { cacheScope: ['public'] }) },
    {
      value: (r) =>
        modern(r, { _meta: { 'io.modelcontextprotocol/serverInfo': { name: 42, version: '1' } } }),
    },
    { value: (r) => modern(r, { supportedVersions: ['2025-11-25'] }) },
    { value: (r) => modern(r, { capabilities: [] }) },
    {
      value: (r) => ({
        jsonrpc: '2.0',
        id: r.id,
        method: 'sampling/createMessage',
        params: { secret: 'SECRET' },
      }),
    },
    { headers: { 'content-type': 'text/html' }, value: 'SECRET' },
    { headers: { 'content-encoding': 'gzip' }, value: 'SECRET' },
    { headers: { 'content-length': '70000' }, value: '{}' },
    { chunks: [Buffer.from([0xc3, 0x28])] },
    { value: 'x'.repeat(65537) },
    { value: '['.repeat(30) + '0' + ']'.repeat(30) },
    { headers: { 'content-type': 'text/event-stream' }, value: 'data: ' + 'x'.repeat(17000) + '\n\n' },
    { headers: { 'content-type': 'text/event-stream' }, value: 'data:\n\n'.repeat(18) },
    { headers: { 'mcp-session-id': 'UNEXPECTED_MODERN_SESSION' } },
    { rawHeaders: ['content-type', 'application/json', 'Content-Type', 'text/event-stream'] },
    { headers: { 'x-oversized': 'x'.repeat(8192) } },
    { authorized: false },
  ];
  for (const [index, scenario] of scenarios.entries())
    await t.test(String(index), async (st) => {
      const f = transport(st, [scenario]);
      const report = await inspectPublicEndpoint('https://example.com/mcp', { check: true });
      assert.equal(report.protocolChecked, false);
      assert.notEqual(report.status, 'compatible');
      assert.equal(f.calls.length, 1, 'No downgrade or alternate URL probe');
      assert.equal(JSON.stringify(report).includes('SECRET'), false);
    });
});

test('SSE handles split UTF-8, split CRLF, lone CR and multiline data without exposing metadata', async (t) => {
  const f = transport(t, [
    {
      headers: { 'content-type': 'text/event-stream' },
      open: true,
      value: (r) => {
        const body = modern(r, { instructions: 'café ☕ DO_NOT_DISPLAY' });
        return `: comment\rid: cursor\rdata:\r\rdata: ${JSON.stringify(body).replace(',"id":', ',\r\ndata: "id":')}\r\n\r\n`;
      },
    },
  ]);
  // Make every byte its own chunk, including each multi-byte UTF-8 sequence.
  const request = https.request;
  t.mock.method(https, 'request', (options, callback) =>
    request(options, (response) => {
      const write = response.write.bind(response);
      response.write = (chunk) => {
        for (const byte of Buffer.from(chunk)) write(Buffer.from([byte]));
        return true;
      };
      callback(response);
    }),
  );
  const report = await inspectPublicEndpoint('https://example.com/mcp', { check: true });
  assert.equal(report.status, 'compatible');
  assert.equal(f.calls.length, 1);
  assert.equal(JSON.stringify(report).includes('DO_NOT_DISPLAY'), false);
});

test('DNS timeout cancels the resolver before any connection is attempted', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = transport(t);
  t.mock.method(Resolver.prototype, 'resolve4', () => new Promise(() => {}));
  const cancel = t.mock.method(Resolver.prototype, 'cancel', () => {});
  const pending = inspectPublicEndpoint('https://example.com/mcp', { check: true });
  await immediate();
  t.mock.timers.tick(2001);
  const report = await pending;
  assert.equal(report.status, 'timeout');
  assert.equal(report.errorCode, 'ENDPOINT_DNS_TIMEOUT');
  assert.equal(f.calls.length, 0);
  assert.ok(cancel.mock.callCount() >= 1);
});

test('legacy stateless negotiation reports the actual supported version without creating a session', async (t) => {
  const f = transport(t, [
    { value: (r) => legacy(r, { protocolVersion: '2025-06-18' }) },
    { status: 202, chunks: [] },
  ]);
  const report = await inspectPublicEndpoint('https://example.com/mcp', {
    check: true,
    protocol: '2025-11-25',
  });
  assert.equal(report.status, 'compatible');
  assert.equal(report.protocolVersion, '2025-06-18');
  assert.equal(report.cleanup, 'not-needed');
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[1].options.headers['MCP-Protocol-Version'], '2025-06-18');
});

test('legacy handshake is explicit and releases only its own same-endpoint session', async (t) => {
  const f = transport(t, [
    { headers: { 'mcp-session-id': 'OWNED_EPHEMERAL_SESSION' }, value: (r) => legacy(r) },
    { status: 202, chunks: [] },
    { status: 204, chunks: [] },
  ]);
  const report = await inspectPublicEndpoint('https://example.com/mcp', {
    check: true,
    protocol: '2025-11-25',
  });
  assert.equal(report.status, 'compatible');
  assert.equal(report.protocolVersion, '2025-11-25');
  assert.equal(report.cleanup, 'acknowledged');
  assert.equal(f.calls.length, 3);
  assert.deepEqual(
    f.calls.map((c) => c.options.method),
    ['POST', 'POST', 'DELETE'],
  );
  assert.equal(f.calls[0].body.method, 'initialize');
  assert.equal(f.calls[1].body.method, 'notifications/initialized');
  assert.equal(f.resolutions.length, 2);
  for (const call of f.calls) {
    assert.equal(call.options.hostname, 'example.com');
    assert.equal(call.options.path, '/mcp');
    assert.deepEqual(call.pinned, { address: '8.8.8.8', family: 4 });
  }
  assert.equal(f.calls[0].options.headers['MCP-Session-Id'], undefined);
  assert.equal(f.calls[1].options.headers['MCP-Session-Id'], 'OWNED_EPHEMERAL_SESSION');
  assert.equal(f.calls[2].options.headers['MCP-Session-Id'], 'OWNED_EPHEMERAL_SESSION');
  assert.equal(JSON.stringify(report).includes('OWNED_EPHEMERAL_SESSION'), false);
});

test('legacy cleanup requires a valid initialization and reports unsupported cleanup honestly', async (t) => {
  for (const [initialValid, cleanupStatus] of [
    [false, 204],
    [true, 405],
    [true, 500],
  ]) {
    await t.test(`${initialValid}-${cleanupStatus}`, async (st) => {
      const scenarios = [
        {
          headers: { 'mcp-session-id': 'EPHEMERAL' },
          value: (r) => (initialValid ? legacy(r) : { ...legacy(r), id: 'wrong' }),
        },
      ];
      if (initialValid) scenarios.push({ status: 202, chunks: [] });
      scenarios.push({ status: cleanupStatus, chunks: [] });
      const f = transport(st, scenarios);
      const report = await inspectPublicEndpoint('https://example.com/mcp', {
        check: true,
        protocol: '2025-11-25',
      });
      assert.equal(f.calls.at(-1).options.method, initialValid ? 'DELETE' : 'POST');
      if (!initialValid)
        assert.equal(f.calls.length, 1, 'An unbound header cannot authorize session deletion');
      assert.notEqual(report.status, 'compatible');
      assert.equal(
        report.cleanup,
        !initialValid ? 'unconfirmed' : cleanupStatus === 405 ? 'unsupported' : 'unconfirmed',
      );
      assert.equal(report.protocolChecked, initialValid);
    });
  }
});

test('legacy notification failure releases a session established by a valid matching initialization', async (t) => {
  const f = transport(t, [
    { headers: { 'mcp-session-id': 'OWNED_SESSION' }, value: (r) => legacy(r) },
    { status: 500, chunks: [] },
    { status: 204, chunks: [] },
  ]);
  const report = await inspectPublicEndpoint('https://example.com/mcp', {
    check: true,
    protocol: '2025-11-25',
  });
  assert.equal(f.calls.length, 3);
  assert.equal(f.calls[2].options.method, 'DELETE');
  assert.equal(report.cleanup, 'acknowledged');
  assert.equal(report.protocolChecked, false);
});

test('known legacy session values cannot be reflected through displayed server metadata', async (t) => {
  const session = 'SYNTHETIC_OWNED_SESSION_DO_NOT_PRINT';
  for (const field of ['name', 'version']) {
    for (const embedded of [false, true]) {
      await t.test(`${field}-${embedded ? 'embedded' : 'exact'}`, async (st) => {
        const f = transport(st, [
          {
            headers: { 'mcp-session-id': session },
            value: (r) =>
              legacy(r, {
                serverInfo: {
                  name: 'Fixture',
                  version: '1',
                  [field]: embedded ? `prefix ${session} suffix` : session,
                },
              }),
          },
          { status: 202, chunks: [] },
          { status: 405, chunks: [] },
        ]);
        const report = await inspectPublicEndpoint('https://example.com/mcp', {
          check: true,
          protocol: '2025-11-25',
        });
        assert.equal(report.protocolChecked, true);
        assert.equal(report.cleanup, 'unsupported');
        assert.equal(report.status, 'compatible-cleanup-unconfirmed');
        assert.equal(f.calls.length, 3);
        assert.equal(f.calls[2].options.headers['MCP-Session-Id'], session);
        assert.equal(report.serverInfo, undefined);
        assert.equal(JSON.stringify(report).includes(session), false);
      });
    }
  }
});

test('unusable session headers retain cleanup uncertainty without authorizing a DELETE', async (t) => {
  for (const session of ['', 'invalid session value', 'S'.repeat(257), ['first', 'second']]) {
    await t.test(typeof session === 'string' ? `length-${session.length}` : 'multiple-values', async (st) => {
      const f = transport(st, [
        {
          headers: { 'mcp-session-id': session },
          ...(Array.isArray(session)
            ? {
                rawHeaders: [
                  'content-type',
                  'application/json',
                  'mcp-session-id',
                  'first',
                  'mcp-session-id',
                  'second',
                ],
              }
            : {}),
          value: (r) => legacy(r),
        },
      ]);
      const report = await inspectPublicEndpoint('https://example.com/mcp', {
        check: true,
        protocol: '2025-11-25',
      });
      assert.equal(report.protocolChecked, false);
      assert.equal(report.cleanup, 'unconfirmed');
      assert.equal(report.errorCode, 'ENDPOINT_RESPONSE');
      assert.equal(f.calls.length, 1);
      assert.equal(f.calls[0].options.method, 'POST');
      assert.equal(report.serverInfo, undefined);
    });
  }
});

test('SSE event limits count actual LF, CR and CRLF bytes including split CRLF', async (t) => {
  for (const [ending, split] of [
    ['\n', false],
    ['\r', false],
    ['\r\n', false],
    ['\r\n', true],
  ]) {
    for (const eventSize of [16384, 16385]) {
      await t.test(`${JSON.stringify(ending)}-${split ? 'split' : 'whole'}-${eventSize}`, async (st) => {
        const message = JSON.stringify(modern({ id: 'mterm-endpoint-inspection' }));
        const suffix = `${ending}data: ${message}${ending}${ending}`;
        const wire = `:${'x'.repeat(eventSize - Buffer.byteLength(suffix) - 1)}${suffix}`;
        assert.equal(Buffer.byteLength(wire), eventSize);
        const chunks = split ? wire.split(/(?<=\r)/).map((part) => Buffer.from(part)) : [Buffer.from(wire)];
        const f = transport(st, [{ headers: { 'content-type': 'text/event-stream' }, chunks }]);
        const report = await inspectPublicEndpoint('https://example.com/mcp', { check: true });
        assert.equal(report.protocolChecked, eventSize === 16384);
        assert.equal(report.status, eventSize === 16384 ? 'compatible' : 'inconclusive');
        assert.equal(report.errorCode, eventSize === 16384 ? undefined : 'ENDPOINT_LIMIT');
        assert.equal(f.calls.length, 1);
        assert.equal(f.calls[0].destroyed, true);
      });
    }
  }
});

test('many CRLF comments cannot hide an oversized SSE event inside the response budget', async (t) => {
  const message = JSON.stringify(modern({ id: 'mterm-endpoint-inspection' }));
  const wire = `${':\r\n'.repeat(7000)}data: ${message}\r\n\r\n`;
  assert.ok(Buffer.byteLength(wire) > 16384 && Buffer.byteLength(wire) < 65536);
  const f = transport(t, [{ headers: { 'content-type': 'text/event-stream' }, chunks: [wire] }]);
  const report = await inspectPublicEndpoint('https://example.com/mcp', { check: true });
  assert.equal(report.protocolChecked, false);
  assert.equal(report.errorCode, 'ENDPOINT_LIMIT');
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].destroyed, true);
});

test('cancellation destroys an in-flight request without retry or raw error disclosure', async (t) => {
  const f = transport(t, [{ hang: true }]);
  const controller = new AbortController();
  const pending = inspectPublicEndpoint('https://example.com/mcp', {
    check: true,
    signal: controller.signal,
  });
  await immediate();
  controller.abort('SECRET_ABORT_REASON');
  const report = await pending;
  assert.equal(report.status, 'cancelled');
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].destroyed, true);
  assert.equal(JSON.stringify(report).includes('SECRET_ABORT_REASON'), false);
});

test('overall deadline bounds a stalled request even without response or socket activity', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = transport(t, [{ hang: true }]);
  const pending = inspectPublicEndpoint('https://example.com/mcp', { check: true });
  await immediate();
  t.mock.timers.tick(10001);
  const report = await pending;
  assert.equal(report.status, 'timeout');
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].destroyed, true);
});
