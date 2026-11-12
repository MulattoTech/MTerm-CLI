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

import test, { after } from 'node:test';
after(() => { Date.now = originalNow; });
for (const boundary of ['job-list', 'active-lookup']) {
  test('enqueue rejects a device that becomes stale during ' + boundary + ' without admission writes', async () => {
    const f = await fixture({ lastSeen: clock - 14999 });
    let advanced = false;
    const advance = () => { if (!advanced) { clock += 1; advanced = true; } };
    if (boundary === 'job-list') f.storage.beforeList = async (prefix) => { if (prefix === 'job:') advance(); };
    else f.storage.beforeGet = async (key) => { if (key.startsWith('active:')) advance(); };
    const result = await f.enqueue();
    assert.equal(advanced, true, 'The actual asynchronous admission read must cross freshness expiry');
    assert.equal(result.status, 409, 'Do not admit a new job after the device has become stale');
    assert.equal(result.data.error, 'device_offline');
    assert.equal([...f.storage.data.keys()].some((key) => key.startsWith('job:') || key.startsWith('active:')), false);
  });
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
  assert.equal([...f.storage.data.keys()].some((key) => key.startsWith('job:') || key.startsWith('active:')), false);
});
