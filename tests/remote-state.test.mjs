// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-remote-agent (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { RemoteStateStore } from '../dist/remote/state.js';
import { remoteMain } from '../dist/remote/cli.js';

test('remote state separates public config from protected credentials and round-trips local protection', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-state-'));
  try {
    const root = path.join(temp, 'fixture');
    await fs.mkdir(root);
    const store = await RemoteStateStore.open(path.join(temp, 'state'));
    await store.configure({ schemaVersion: 1, gateway: 'https://gateway.test', root, name: 'Fixture PC' });
    const deviceId = randomUUID();
    await store.savePairing(deviceId, 'SECRET_FIXTURE_TOKEN');
    const state = await store.config();
    assert.equal(state.deviceId, deviceId);
    assert.ok(!JSON.stringify(state).includes('SECRET'));
    assert.equal((await store.credential()).token, 'SECRET_FIXTURE_TOKEN');
    const raw = await fs.readFile(path.join(store.directory, 'credential.json'), 'utf8');
    if (process.platform === 'win32') assert.ok(!raw.includes('SECRET_FIXTURE_TOKEN'));
    else assert.equal((await fs.stat(path.join(store.directory, 'credential.json'))).mode & 0o777, 0o600);
    await store.clearPairing();
    assert.equal((await store.config()).deviceId, undefined);
    await assert.rejects(store.credential(), (e) => e.code === 'REMOTE_UNPAIRED');
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});

test('remote state refuses exposing its credential directory and unapproved reconfiguration of a paired device', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-state-'));
  try {
    const store = await RemoteStateStore.open(path.join(temp, 'state'));
    await assert.rejects(
      store.configure({ schemaVersion: 1, gateway: 'https://gateway.test', root: temp, name: 'Fixture' }),
      (e) => e.code === 'STATE_IN_ROOT',
    );
    const root = path.join(temp, 'fixture');
    await fs.mkdir(root);
    await store.configure({ schemaVersion: 1, gateway: 'https://gateway.test', root, name: 'Fixture' });
    await store.savePairing(randomUUID(), 'fixture-secret');
    await assert.rejects(
      store.configure({ schemaVersion: 1, gateway: 'https://other.test', root, name: 'Fixture' }),
      (e) => e.code === 'REMOTE_PAIRED',
    );
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});

test('concurrent pair saves retain one coherent device/token binding', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-state-race-'));
  try {
    const root = path.join(temp, 'fixture');
    await fs.mkdir(root);
    const store = await RemoteStateStore.open(path.join(temp, 'state'));
    await store.configure({ schemaVersion: 1, gateway: 'https://gateway.test', root, name: 'Fixture' });
    const pairs = [
      { deviceId: randomUUID(), token: 'fixture-token-one' },
      { deviceId: randomUUID(), token: 'fixture-token-two' },
    ];
    const results = await Promise.allSettled(pairs.map((p) => store.savePairing(p.deviceId, p.token)));
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    const credential = await store.credential();
    assert.equal(credential.token, pairs.find((p) => p.deviceId === credential.deviceId).token);
    assert.equal((await store.config()).deviceId, credential.deviceId);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});

test('device credential binds its enrolled root and refuses a retargeted root', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-state-binding-'));
  try {
    const root = path.join(temp, 'fixture'),
      other = path.join(temp, 'other');
    await fs.mkdir(root);
    await fs.mkdir(other);
    const store = await RemoteStateStore.open(path.join(temp, 'state'));
    await store.configure({ schemaVersion: 1, gateway: 'https://gateway.test', root, name: 'Fixture' });
    await store.savePairing(randomUUID(), 'fixture-bound-secret');
    const config = await store.config();
    await fs.writeFile(
      path.join(store.directory, 'config.json'),
      JSON.stringify({ ...config, root: await fs.realpath(other) }),
    );
    await assert.rejects(store.credential(), (e) => e.code === 'REMOTE_CREDENTIAL');
    await fs.writeFile(path.join(store.directory, 'config.json'), JSON.stringify(config));
    await fs.rename(root, path.join(temp, 'old-root'));
    await fs.symlink(other, root, process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(store.config(), (e) => e.code === 'REMOTE_ROOT_CHANGED');
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});

test('idempotent remote setup reports an existing pairing accurately', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-state-setup-'));
  const originalLog = console.log,
    messages = [];
  try {
    const root = path.join(temp, 'fixture'),
      state = path.join(temp, 'state');
    await fs.mkdir(root);
    const args = [
      'setup',
      '--gateway',
      'https://gateway.test',
      '--dashboard',
      'https://dashboard.test',
      '--root',
      root,
      '--name',
      'Fixture',
      '--state-dir',
      state,
      '--apply',
    ];
    console.log = (value) => messages.push(value);
    assert.equal(await remoteMain(args), 0);
    const store = await RemoteStateStore.open(state),
      deviceId = randomUUID();
    await store.savePairing(deviceId, 'fixture-setup-token');
    assert.equal(await remoteMain(args), 0);
    const report = JSON.parse(messages.at(-1));
    assert.equal(report.paired, true);
    assert.equal(report.deviceId, deviceId);
    assert.equal(report.next, 'mterm-cli remote start');
    assert.ok(!JSON.stringify(messages).includes('fixture-setup-token'));
  } finally {
    console.log = originalLog;
    await fs.rm(temp, { recursive: true, force: true });
  }
});
