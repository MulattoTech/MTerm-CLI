// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-12-public-endpoint-inspector (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import https from 'node:https';
import { Resolver } from 'node:dns/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const runtimeRoot = process.env.MTERM_ENDPOINT_VERIFY_ROOT ?? fileURLToPath(new URL('../', import.meta.url));
const { remoteMain } = await import(pathToFileURL(path.join(runtimeRoot, 'dist/remote/cli.js')).href);
const { RemoteStateStore } = await import(pathToFileURL(path.join(runtimeRoot, 'dist/remote/state.js')).href);

function isolated(t) {
  const messages = [];
  const old = process.env.MTERM_ENV;
  process.env.MTERM_ENV = 'INVALID_ENDPOINT_MUST_NOT_SELECT_A_STORE';
  t.after(() => {
    if (old === undefined) delete process.env.MTERM_ENV;
    else process.env.MTERM_ENV = old;
  });
  const forbidden = () => assert.fail('Endpoint preview touched network or remote credentials');
  t.mock.method(console, 'log', (value) => messages.push(String(value)));
  t.mock.method(RemoteStateStore, 'open', forbidden);
  t.mock.method(RemoteStateStore.prototype, 'credential', forbidden);
  t.mock.method(globalThis, 'fetch', forbidden);
  t.mock.method(https, 'request', forbidden);
  t.mock.method(Resolver.prototype, 'resolve4', forbidden);
  t.mock.method(Resolver.prototype, 'resolve6', forbidden);
  return messages;
}

test('existing remote help remains offline without resolving a profile', async (t) => {
  const messages = isolated(t);
  assert.equal(await remoteMain(['help']), 0);
  assert.match(messages[0], /MTerm remote/);
});

test('explicit public endpoint preview validates a path without DNS, credentials or local state', async (t) => {
  const messages = isolated(t);
  assert.equal(await remoteMain(['endpoint', '--url', 'https://EXAMPLE.com:443/mcp/v1', '--json']), 0);
  assert.equal(messages.length, 1);
  const result = JSON.parse(messages[0]);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.endpoint, 'https://example.com/mcp/v1');
  assert.equal(result.status, 'url-valid');
  assert.equal(result.urlValidated, true);
  assert.equal(result.networkChecked, false);
  assert.equal(result.protocolChecked, false);
  assert.equal(result.credentialsUsed, false);
  assert.equal(result.routingEnabled, false);
});

test('endpoint options reject profile selection, credential input and repeated flags', async (t) => {
  isolated(t);
  for (const args of [
    ['endpoint'],
    ['endpoint', '--url'],
    ['endpoint', '--url', 'https://example.com/mcp', '--profile', 'default'],
    ['endpoint', '--url', 'https://example.com/mcp', '--token', 'SYNTHETIC_DO_NOT_SEND'],
    ['endpoint', '--url', 'https://example.com/mcp', '--check', '--check'],
    ['endpoint', '--url', 'https://example.com/mcp', '--apply'],
    ['endpoint', '--url', 'https://example.com/mcp', '--protocol', 'automatic'],
  ]) {
    await assert.rejects(remoteMain(args), (error) => error.code === 'USAGE');
  }
});

test('explicit legacy preview stays offline and reports its selected protocol', async (t) => {
  const messages = isolated(t);
  assert.equal(
    await remoteMain(['endpoint', '--url', 'https://example.com/mcp', '--protocol', '2025-11-25']),
    0,
  );
  assert.equal(JSON.parse(messages[0]).requestedProtocol, '2025-11-25');
});

test('explicit endpoint network check still bypasses all state and credential admission', async (t) => {
  const messages = isolated(t);
  t.mock.method(Resolver.prototype, 'resolve4', async () => ['127.0.0.1']);
  t.mock.method(Resolver.prototype, 'resolve6', async () => []);
  assert.equal(await remoteMain(['endpoint', '--url', 'https://example.com/mcp', '--check', '--json']), 2);
  const report = JSON.parse(messages[0]);
  assert.equal(report.status, 'blocked-address');
  assert.equal(report.networkChecked, true);
  assert.equal(report.credentialsUsed, false);
  assert.equal(report.routingEnabled, false);
});
