// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-remote-agent (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { GatewayTransport, RemoteAgent, normalizeGateway } from '../dist/remote/agent.js';

test('gateway transport rejects insecure/credential-bearing URLs and never follows authenticated redirects', async () => {
  for (const value of ['http://gateway.test', 'https://user:secret@gateway.test', 'https://gateway.test/?token=secret'])
    assert.throws(() => normalizeGateway(value));
  let request;
  const transport = new GatewayTransport('https://gateway.test', 'secret-sentinel', async (url, options) => {
    request = { url, options };
    return new Response('{}', { status: 200 });
  });
  await transport.post('/api/agent/poll', { version: 1, deviceId: randomUUID() });
  assert.equal(request.options.redirect, 'error');
  assert.equal(request.options.headers.authorization, 'Bearer secret-sentinel');
  assert.throws(() => new GatewayTransport('https://gateway.test/path', 'secret-sentinel'));
});

test('gateway transport bounds input and error output, and distinguishes revocation', async () => {
  const large = new GatewayTransport('https://gateway.test', 'sentinel', async () =>
    new Response('x'.repeat(300001), { status: 200 }));
  await assert.rejects(large.post('/api/agent/poll', {}), e => e.code === 'REMOTE_RESPONSE_LIMIT');
  const revoked = new GatewayTransport('https://gateway.test', 'sentinel', async () =>
    new Response('NEVER_LOG_THIS_SECRET', { status: 401 }));
  await assert.rejects(revoked.post('/api/agent/poll', {}), e => e.code === 'REMOTE_REVOKED' && !e.message.includes('NEVER'));
});

test('outbound agent delivers a real adapter result once, rejects replay after reconnect, and stops on revocation', async () => {
  const deviceId = randomUUID(), requestId = randomUUID();
  const job = { version: 1, deviceId, requestId, tool: 'mterm_read_file', arguments: { path: 'fixture.txt' }, deadline: Date.now() + 20000 };
  let calls = 0, polls = 0, results = 0;
  const events = [];
  const fetch = async (url) => {
    if (url.endsWith('/api/agent/result')) { results++; return new Response('{}'); }
    polls++;
    if (polls === 1) return Response.json({ requests: [job], cancelled: [], pollAfterMs: 1000 });
    if (polls === 2) throw new Error('synthetic network outage secret-sentinel');
    if (polls === 3) return Response.json({ requests: [job], cancelled: [], pollAfterMs: 1000 });
    return new Response('', { status: 410 });
  };
  const adapter = { deviceId, execute: async r => {
    calls++;
    return { version: 1, deviceId, requestId: r.requestId, result: { content: [{ type: 'text', text: 'fixture' }], structuredContent: { text: 'fixture' }, isError: false } };
  } };
  const agent = new RemoteAgent({ adapter, transport: new GatewayTransport('https://gateway.test', 'secret-sentinel', fetch), onEvent: e => events.push(e), sleep: async () => {}, random: () => 0 });
  const outcome = await agent.run();
  assert.equal(outcome.reason, 'revoked');
  assert.equal(calls, 1);
  assert.equal(results, 1);
  assert.ok(events.some(e => e.state === 'reconnecting'));
  assert.ok(!JSON.stringify(events).includes('secret-sentinel'));
});

test('outbound agent forwards cancellation and shuts down its owned work cleanly', async () => {
  const deviceId = randomUUID(), requestId = randomUUID();
  let cancelled = false, polls = 0;
  const fetch = async url => {
    if (url.endsWith('/api/agent/result')) return new Response('{}');
    polls++;
    return polls === 1
      ? Response.json({ requests: [{ version: 1, deviceId, requestId, tool: 'mterm_search_content', arguments: { query: 'fixture' }, deadline: Date.now() + 20000 }], cancelled: [], pollAfterMs: 1000 })
      : polls === 2 ? Response.json({ requests: [], cancelled: [requestId], pollAfterMs: 1000 })
      : new Response('', { status: 401 });
  };
  const adapter = { deviceId, execute: async (r, signal) => {
    await new Promise(resolve => signal.addEventListener('abort', () => { cancelled = true; resolve(); }, { once: true }));
    return { version: 1, deviceId, requestId, result: { content: [], structuredContent: {}, isError: true } };
  } };
  const agent = new RemoteAgent({ adapter, transport: new GatewayTransport('https://gateway.test', 'fixture', fetch), sleep: async () => {} });
  await agent.run();
  assert.equal(cancelled, true);
});
