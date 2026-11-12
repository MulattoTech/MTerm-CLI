import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { MTermRegistry } from '../peer-endpoint-published-01c0fc0d/snapshot/gateway/registry.mjs';
import { sha256 } from '../peer-endpoint-published-01c0fc0d/snapshot/gateway/security.mjs';
import { RemoteAgent, GatewayTransport } from '../peer-endpoint-published-01c0fc0d/snapshot/dist/remote/agent.js';

// Owned in-memory observations only. No listener, network request, credentials or source writes.
const originalNow = Date.now;
let clock = 1800000000000;
Date.now = () => clock;
class MemoryStorage {
  data = new Map();
  alarm = null;
  beforeList;
  beforeGet;
  async get(key) { await this.beforeGet?.(key); return structuredClone(this.data.get(key)); }
  async put(key, value) { this.data.set(key, structuredClone(value)); }
  async delete(key) { return this.data.delete(key); }
  async getAlarm() { return this.alarm; }
  async setAlarm(value) { this.alarm = value; }
  async list({ prefix = '', limit = 1000, startAfter = '' } = {}) {
    await this.beforeList?.(prefix);
    return new Map([...this.data].filter(([k]) => k.startsWith(prefix) && k > startAfter).sort(([a], [b]) => a.localeCompare(b)).slice(0, limit).map(([k, v]) => [k, structuredClone(v)]));
  }
}
async function fixture({ lastSeen = clock } = {}) {
  const storage = new MemoryStorage();
  let queue = Promise.resolve();
  const registry = new MTermRegistry({ storage, blockConcurrencyWhile(callback) { const p = queue.then(callback); queue = p.catch(() => {}); return p; } }, { PUBLIC_ORIGIN: 'https://owned.test.invalid', DASHBOARD_ORIGIN: 'https://dashboard.test.invalid' });
  const deviceId = randomUUID(), grantId = randomUUID();
  const userId = 'synthetic-owner', clientId = 'synthetic-client';
  const deviceToken = 'synthetic-owned-device-token', token = 'synthetic-owned-access-token';
  const deviceHash = await sha256(deviceToken), tokenHash = await sha256(token);
  await storage.put('device:' + deviceId, { id: deviceId, userId, epoch: 0, tokenHash: deviceHash, name: 'Owned observation fixture', platform: 'linux', capabilities: ['mterm_file_info'], createdAt: clock - 100000, lastSeen });
  await storage.put('user-device:' + userId + ':' + deviceId, { id: deviceId });
  await storage.put('agent:' + deviceHash, { deviceId });
  await storage.put('grant:' + grantId, { id: grantId, userId, clientId, expiresAt: clock + 600000 });
  await storage.put('token:' + tokenHash, { kind: 'access', userId, clientId, grantId, epoch: 0, expiresAt: clock + 600000, resource: 'https://owned.test.invalid/mcp', scope: 'mterm:read' });
  async function call(action, data) {
    const response = await registry.fetch(new Request('https://registry.test.invalid', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, data }) }));
    return { status: response.status, data: await response.json() };
  }
  return { storage, registry, deviceId, deviceToken, token,
    poll: (extra = {}) => call('agentPoll', { token: deviceToken, input: { version: 1, deviceId, ...extra } }),
    list: () => call('listDevices', { token }),
    enqueue: (rpcId = 1) => call('enqueue', { token, deviceId, tool: 'mterm_file_info', arguments: { path: '.' }, rpcId }),
    row: () => storage.get('device:' + deviceId),
  };
}
const observations = [];
try {
  {
    const f = await fixture({ lastSeen: null });
    const before = await f.list();
    assert.equal(before.data.devices[0].status, 'offline');
    assert.equal((await f.enqueue()).data.error, 'device_offline');
    const p = await f.poll({ availableSlots: 0 });
    const d = (await f.list()).data.devices[0];
    assert.equal(p.status, 200); assert.equal(p.data.requests.length, 0); assert.equal(d.status, 'online');
    assert.equal(Object.hasOwn(d, 'readiness'), false);
    assert.equal(Object.hasOwn(await f.row(), 'availableSlots'), false);
    observations.push({ id: 'zero-capacity-presence', registeredWithoutPoll: before.data.devices[0].status, pollOffer: 0, returnedStatus: d.status, inventoryHasReadiness: false, storedOffer: null, conclusion: 'Presence survives busy/cleanup capacity zero; current online is not executor availability.' });
  }
  {
    const f = await fixture();
    for (let i = 0; i < 4; i++) assert.equal((await f.enqueue(i)).status, 200);
    const p = await f.poll();
    assert.equal(p.data.requests.length, 4);
    observations.push({ id: 'legacy-omitted-capacity', delivered: p.data.requests.length, hasActualReportedCapacity: false, conclusion: 'The legacy delivery default must not become a reported four-slot readiness claim.' });
  }
  {
    const f = await fixture();
    assert.equal((await f.enqueue()).status, 200);
    const p = await f.poll({ availableSlots: 1 });
    assert.equal(p.data.requests.length, 1);
    const d = (await f.list()).data.devices[0];
    observations.push({ id: 'offer-consumed-in-same-poll', offered: 1, delivered: p.data.requests.length, unallocatedAtReply: 0, returnedStatus: d.status, conclusion: 'A future projection must distinguish original offer from slots already allocated in its reply.' });
  }
  for (const boundary of ['job-list', 'active-lookup']) {
    const f = await fixture({ lastSeen: clock - 14999 });
    let advanced = false;
    const advance = () => { if (!advanced) { clock += 1; advanced = true; } };
    if (boundary === 'job-list') f.storage.beforeList = async (prefix) => { if (prefix === 'job:') advance(); };
    else f.storage.beforeGet = async (key) => { if (key.startsWith('active:')) advance(); };
    const result = await f.enqueue();
    assert.equal(advanced, true); assert.equal(result.status, 200);
    const d = (await f.list()).data.devices[0];
    assert.equal(d.status, 'reconnecting');
    observations.push({ id: 'stale-admission-after-' + boundary, initialAgeMs: 14999, finalAgeMs: 15000, enqueueStatus: result.status, resultingPresence: d.status, conclusion: 'Current enqueue admits after crossing its freshness deadline during a storage await.' });
  }
  {
    const f = await fixture({ lastSeen: clock - 15000 });
    const result = await f.enqueue();
    assert.equal(result.status, 409); assert.equal(result.data.error, 'device_offline');
    observations.push({ id: 'stale-at-entry-control', ageMs: 15000, enqueueStatus: result.status, error: result.data.error });
  }
  {
    const f = await fixture({ lastSeen: null });
    const controller = new AbortController(), events = [];
    const transport = new GatewayTransport('https://owned.test.invalid', f.deviceToken, async (url, options) => {
      assert.equal(url, 'https://owned.test.invalid/api/agent/poll');
      const input = JSON.parse(options.body);
      const p = await f.poll({ availableSlots: input.availableSlots });
      assert.equal(p.status, 200);
      return Response.json({ malformedControlledResponse: true });
    });
    const agent = new RemoteAgent({ adapter: { deviceId: f.deviceId, execute: async () => { throw new Error('No job execution allowed'); } }, transport, sleep: async () => {}, onEvent(e) { events.push(e.state); if (e.state === 'reconnecting') controller.abort(); } });
    await agent.run(controller.signal);
    assert.ok(events.includes('reconnecting')); assert.ok(!events.includes('online'));
    const d = (await f.list()).data.devices[0]; assert.equal(d.status, 'online');
    observations.push({ id: 'accepted-request-is-not-successful-roundtrip', agentStates: events, gatewayPresence: d.status, conclusion: 'Authenticated inbound poll can update online while the actual agent rejects the poll response.' });
  }
  const report = { schemaVersion: 1, sourceCommit: 'ddbb14d8c4f066c48ce416ec25cbe5c14167949f', sourceTree: '2ee6ecc09206ca3f8e64edc34635b3820383e00b', scope: 'Executed observations of unchanged source; these are not future-feature passing tests or production probes.', observations, externalNetworkCalls: 0, realCredentialsUsed: false, sourceModified: false };
  await fs.writeFile(new URL('./current-observations.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { Date.now = originalNow; }
