// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-remote-agent (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { RemoteReadAdapter, remoteRoot } from '../dist/remote/adapter.js';
import { READ_TOOLS, WIRE_VERSION } from '../dist/remote/protocol.js';

const deviceId = randomUUID();
const request = (tool, args = {}, extra = {}) => ({
  version: WIRE_VERSION,
  deviceId,
  requestId: randomUUID(),
  tool,
  arguments: args,
  deadline: Date.now() + 20000,
  ...extra,
});

test('remote adapter reads actual scoped content and advertises only five immutable read tools', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-remote-'));
  try {
    await fs.writeFile(path.join(root, 'sample.txt'), 'first\nsecond\n');
    const adapter = await RemoteReadAdapter.create({ root, deviceId });
    const r = await adapter.execute(request('mterm_read_file', { path: 'sample.txt' }));
    assert.equal(r.result.isError, false);
    assert.equal(r.result.structuredContent.text, 'first\nsecond\n');
    assert.equal(r.deviceId, deviceId);
    assert.equal(READ_TOOLS.length, 5);
    assert.ok(READ_TOOLS.every((t) => t.annotations.readOnlyHint && !t.annotations.destructiveHint));
    const info = await adapter.execute(request('mterm_file_info', { path: 'sample.txt' }));
    assert.equal(info.result.structuredContent.file, true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('remote setup root validation rejects a regular file before configuration or pairing', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-remote-root-'));
  try {
    const file = path.join(root, 'file.txt');
    await fs.writeFile(file, 'fixture');
    await assert.rejects(remoteRoot(file), (e) => e.code === 'INVALID_ROOT');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('remote adapter rejects mutation, cross-device, expired, cancelled and replay requests', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-remote-'));
  try {
    await fs.writeFile(path.join(root, 'sample.txt'), 'fixture');
    const adapter = await RemoteReadAdapter.create({ root, deviceId });
    const code = async (r) => (await adapter.execute(r)).result.structuredContent.error.code;
    assert.equal(
      await code(request('mterm_write_file', { path: 'sample.txt', text: 'changed' })),
      'TOOL_DISABLED',
    );
    assert.equal(
      await code(request('mterm_read_file', { path: 'sample.txt' }, { deviceId: randomUUID() })),
      'DEVICE_MISMATCH',
    );
    assert.equal(
      await code(request('mterm_read_file', { path: 'sample.txt' }, { deadline: Date.now() - 1 })),
      'DEADLINE_EXCEEDED',
    );
    const call = request('mterm_read_file', { path: 'sample.txt' });
    assert.equal((await adapter.execute(call)).result.isError, false);
    assert.equal(await code(call), 'REPLAY_REJECTED');
    const controller = new AbortController();
    controller.abort();
    const aborted = await adapter.execute(
      request('mterm_read_file', { path: 'sample.txt' }),
      controller.signal,
    );
    assert.equal(aborted.result.structuredContent.error.code, 'CANCELLED');
    assert.equal(await fs.readFile(path.join(root, 'sample.txt'), 'utf8'), 'fixture');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('remote adapter retains path policy, credentials exclusions, response bounds and strict argument validation', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-remote-'));
  try {
    await fs.writeFile(path.join(root, '.env'), 'SECRET_SENTINEL');
    await fs.writeFile(path.join(root, 'big.txt'), 'x'.repeat(65537));
    const adapter = await RemoteReadAdapter.create({ root, deviceId });
    for (const [args, expected] of [
      [{ path: '../outside.txt' }, 'OUTSIDE_ROOT'],
      [{ path: '.env' }, 'PRIVATE_PATH'],
      [{ path: 'big.txt' }, 'FILE_TOO_LARGE'],
      [{ path: 'big.txt', extra: true }, 'INVALID_ARGUMENT'],
    ]) {
      const r = await adapter.execute(request('mterm_read_file', args));
      assert.equal(r.result.structuredContent.error.code, expected);
      assert.ok(!JSON.stringify(r).includes('SECRET_SENTINEL'));
    }
    await assert.rejects(
      RemoteReadAdapter.create({ root: path.parse(root).root, deviceId }),
      /specific trusted directory/,
    );
    await assert.rejects(
      RemoteReadAdapter.create({ root: os.homedir(), deviceId }),
      /specific trusted directory/,
    );
    await assert.rejects(
      RemoteReadAdapter.create({ root: '//untrusted-server/share', deviceId }),
      (e) => e.code === 'INVALID_ROOT',
    );
    const credentials = path.join(root, '.ssh');
    await fs.mkdir(credentials);
    await assert.rejects(
      RemoteReadAdapter.create({ root: credentials, deviceId }),
      (e) => e.code === 'PRIVATE_PATH',
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
