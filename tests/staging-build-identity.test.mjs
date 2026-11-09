// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-staging-build-identity (OpenAI / GPT-6 Astra Pro; self-reported)
// Executes the unmodified harness source in an isolated VM with simulated endpoints,
// stdin, filesystem, Windows platform, SDK, DPAPI store and agents. This is ordering
// and fail-closed regression evidence, never real Windows, SDK or hosted acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { spawnSync } from 'node:child_process';
import * as vm from 'node:vm';

const HARNESS_URL = new URL('../scripts/verify-remote-staging.mjs', import.meta.url);
const CHILD_ARGUMENT = '--controlled-staging-build-fixture';
const EXPECTED = 'a1'.repeat(20);
const OTHER = 'b2'.repeat(20);
const CLIENT_ID = 'simulated_access_client.access';
const CLIENT_SECRET = 'SIMULATED_ACCESS_SECRET_NOT_A_REAL_CREDENTIAL';
const REMOTE_SECRET = 'UNTRUSTED_REMOTE_BUILD_SECRET_<script>do-not-record</script>';
const GATEWAY = 'https://mcp-staging.m-techlabs.com';
const DASHBOARD = 'https://mterm-staging.m-techlabs.com';
const RESOURCE = GATEWAY + '/mcp';
const CALLBACK = 'https://mterm-staging-client.invalid/callback';
const OLD_CHECKS = [
  'windows_runtime_and_real_modules',
  'live_discovery_and_anonymous_denial',
  'real_access_service_authentication',
  'live_pkce_consent_exchange_and_code_replay',
  'pair_and_protect_fixture-a',
  'pair_and_protect_fixture-b',
  'real_sdk_initialize_and_tool_discovery',
  'sdk_device_inventory_and_two_real_windows_reads',
  'cross_device_credential_and_mutation_denial',
  'one_device_revocation_and_other_device_isolation',
  'oauth_grant_revocation',
];
const has = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

async function controlledHarness(scenario) {
  const source = await fs.readFile(HARNESS_URL, 'utf8');
  // The virtual filesystem uses POSIX names on every host. Actual source reads
  // and child-process paths retain their native fileURLToPath behavior.
  const virtualPath = path.posix;
  const events = [];
  const files = new Map();
  const pairs = new Map();
  const devices = new Map();
  const runningAgents = new Map();
  const timers = new Set();
  let stdout = '';
  let report;
  let consentQuery;
  let tokenConsumed = false;
  let oauthRevoked = false;
  let localCleanupFinished = false;
  let authenticatedDashboardReads = 0;
  let healthReads = 0;
  const oauthToken = 'SIMULATED_OAUTH_ACCESS_TOKEN_'.repeat(2);
  const readTools = [
    'mterm_read_file',
    'mterm_file_info',
    'mterm_list_directory',
    'mterm_search_files',
    'mterm_search_content',
  ].map((name) => ({ name, annotations: { readOnlyHint: true } }));
  const fakeProcess = {
    argv: ['node', fileURLToPath(HARNESS_URL), ...(scenario.argv ?? [])],
    platform: scenario.platform ?? 'win32',
    versions: { node: '24.22.1' },
    env: {
      ...(has(scenario, 'expected') ? { MTERM_STAGING_EXPECTED_SOURCE_COMMIT: scenario.expected } : {}),
      ...(scenario.disableTls ? { NODE_TLS_REJECT_UNAUTHORIZED: '0' } : {}),
    },
    stdin: { pause() {} },
    stdout: {
      write(value) {
        stdout += value;
      },
    },
    exitCode: undefined,
  };
  const fakeFs = {
    async readFile(file) {
      const name = String(file);
      if (name.endsWith('/node_modules/@modelcontextprotocol/client/package.json')) {
        return JSON.stringify({ version: scenario.sdkVersion ?? '2.3.0' });
      }
      assert.ok(files.has(name), 'controlled fixture read must have an existing virtual file');
      return files.get(name);
    },
    async mkdir(file) {
      events.push({ type: 'mkdir', fixture: String(file).startsWith('/simulated-tmp/') });
    },
    async mkdtemp(prefix) {
      assert.equal(prefix, '/simulated-tmp/mterm-staging-smoke-');
      events.push({ type: 'fixture-create' });
      return prefix + 'controlled';
    },
    async writeFile(file, value) {
      const name = String(file);
      if (name.includes('/artifacts/remote-staging-smoke/')) {
        report = JSON.parse(value);
        events.push({ type: 'report-write' });
      } else {
        assert.ok(name.startsWith('/simulated-tmp/mterm-staging-smoke-controlled/'));
        files.set(name, value);
        events.push({ type: 'fixture-write' });
      }
    },
    async rm(file, options) {
      assert.equal(file, '/simulated-tmp/mterm-staging-smoke-controlled');
      assert.equal(options.recursive, true);
      assert.equal(options.force, false);
      events.push({ type: 'fixture-remove' });
      if (scenario.cleanupFailure === 'local') throw new Error('simulated local cleanup failure');
      localCleanupFinished = true;
    },
  };
  class RemoteStateStore {
    static async open(directory) {
      events.push({ type: 'state-open' });
      const store = new RemoteStateStore();
      store.directory = directory;
      return store;
    }
    async configure(config) {
      this.config = config;
    }
    async savePairing(deviceId, token) {
      this.saved = { deviceId, token };
      files.set(
        virtualPath.join(this.directory, 'credential.json'),
        JSON.stringify({
          protection: 'windows-dpapi-current-user',
          protected: 'simulated-ciphertext',
        }),
      );
      events.push({ type: 'state-save' });
    }
    async credential() {
      return { ...this.saved };
    }
    async acquire() {
      events.push({ type: 'state-acquire' });
    }
    async release() {
      events.push({ type: 'state-release' });
    }
  }
  class RemoteReadAdapter {
    static async create(value) {
      return value;
    }
  }
  class GatewayTransport {
    constructor(origin, token) {
      assert.equal(origin, GATEWAY);
      this.token = token;
    }
  }
  class RemoteAgent {
    constructor(options) {
      this.options = options;
    }
    run(signal) {
      const { adapter, onEvent } = this.options;
      events.push({ type: 'agent-start' });
      runningAgents.set(adapter.deviceId, this);
      onEvent({ state: 'online' });
      return new Promise((resolve) => {
        this.finish = (reason) => resolve({ reason });
        signal.addEventListener(
          'abort',
          () => {
            events.push({ type: 'agent-stop' });
            resolve({ reason: 'stopped' });
          },
          { once: true },
        );
      });
    }
  }
  class StreamableHTTPClientTransport {
    constructor(url, options) {
      assert.equal(String(url), RESOURCE);
      assert.equal(options.requestInit.redirect, 'error');
      assert.equal(options.requestInit.headers.authorization, 'Bearer ' + oauthToken);
    }
  }
  class Client {
    async connect() {
      events.push({ type: 'sdk-connect' });
    }
    async listTools() {
      return { tools: [{ name: 'mterm_list_devices', annotations: { readOnlyHint: true } }, ...readTools] };
    }
    async callTool({ name, arguments: args }) {
      if (name === 'mterm_list_devices') {
        return {
          structuredContent: {
            devices: [...devices.values()].map((device) => ({
              id: device.id,
              status: 'online',
              permissions: 'read-only',
            })),
          },
        };
      }
      if (name === 'mterm_write_file') return { isError: true };
      assert.equal(name, 'mterm_read_file');
      if (args.path.startsWith('../')) {
        return { isError: true, structuredContent: { error: { code: 'OUTSIDE_ROOT' } } };
      }
      if (devices.get(args.deviceId)?.revoked) return { isError: true };
      const adapter = runningAgents.get(args.deviceId)?.options.adapter;
      assert.ok(adapter);
      return { structuredContent: { text: files.get(virtualPath.join(adapter.root, args.path)) } };
    }
    async close() {
      events.push({ type: 'sdk-close' });
    }
  }
  function remoteBuild(surface) {
    const key = (localCleanupFinished ? 'final' : 'initial') + (surface === 'edge' ? 'Edge' : 'Registry');
    if (scenario['omit' + key[0].toUpperCase() + key.slice(1)]) return undefined;
    if (has(scenario, key)) return scenario[key];
    return EXPECTED;
  }
  async function controlledFetch(input, options) {
    const url = new URL(input);
    const headers = options.headers;
    assert.ok([GATEWAY, DASHBOARD].includes(url.origin), 'only the fixed staging origins are allowed');
    assert.equal(url.protocol, 'https:');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.signal.aborted, false);
    const authenticated = headers.has('cf-access-client-id');
    const bearer = headers.has('authorization');
    if (authenticated) {
      assert.equal(url.origin, DASHBOARD);
      assert.equal(headers.get('cf-access-client-id'), CLIENT_ID);
      assert.equal(headers.get('cf-access-client-secret'), CLIENT_SECRET);
      assert.equal(bearer, false);
    } else {
      assert.equal(headers.has('cf-access-client-secret'), false);
    }
    if (bearer) assert.equal(url.origin, GATEWAY);
    if (url.origin === DASHBOARD && options.method === 'POST') {
      assert.equal(headers.get('origin'), DASHBOARD);
    }
    events.push({
      type: 'request',
      origin: url.origin,
      path: url.pathname,
      method: options.method,
      authenticated,
      bearer,
      afterLocalCleanup: localCleanupFinished,
    });
    const json = (value, status = 200, extraHeaders = {}) =>
      Response.json(value, { status, headers: extraHeaders });
    const body = headers.get('content-type') === 'application/json' ? JSON.parse(options.body) : undefined;
    const form =
      headers.get('content-type') === 'application/x-www-form-urlencoded'
        ? new URLSearchParams(options.body)
        : undefined;
    if (url.pathname === '/health') {
      healthReads++;
      if (localCleanupFinished && scenario.finalEdgeFailure) throw new Error(REMOTE_SECRET);
      return json(
        {
          enabled: scenario.enabled ?? true,
          environment: scenario.environment ?? 'staging',
          build: remoteBuild('edge'),
        },
        localCleanupFinished ? (scenario.finalEdgeStatus ?? 200) : 200,
      );
    }
    if (url.pathname === '/.well-known/oauth-protected-resource/mcp') {
      return json({ resource: RESOURCE, authorization_servers: [GATEWAY] });
    }
    if (url.pathname === '/.well-known/oauth-authorization-server') {
      return json({
        issuer: GATEWAY,
        authorization_endpoint: DASHBOARD + '/oauth/authorize',
        token_endpoint: GATEWAY + '/oauth/token',
      });
    }
    if (url.pathname === '/api/dashboard') {
      if (!authenticated) return json({}, 403);
      authenticatedDashboardReads++;
      if (localCleanupFinished && scenario.finalRegistryFailure) throw new Error(REMOTE_SECRET);
      const initial = authenticatedDashboardReads === 1;
      return json(
        {
          authenticated: localCleanupFinished
            ? (scenario.finalAuthenticated ?? true)
            : (scenario.authenticated ?? true),
          identityKind: localCleanupFinished
            ? (scenario.finalIdentityKind ?? 'staging-service')
            : (scenario.identityKind ?? 'staging-service'),
          build: remoteBuild('registry'),
          devices: initial && scenario.nonemptyDevices ? [{ id: 'unowned-existing-device' }] : [],
          grants: initial && scenario.nonemptyGrants ? [{ id: 'unowned-existing-grant' }] : [],
        },
        localCleanupFinished ? (scenario.finalRegistryStatus ?? 200) : 200,
      );
    }
    if (url.pathname === '/mcp') {
      assert.ok(!bearer || oauthRevoked);
      return json({}, 401, {
        'www-authenticate':
          'Bearer resource_metadata="' + GATEWAY + '/.well-known/oauth-protected-resource/mcp"',
      });
    }
    if (url.pathname === '/oauth/register') {
      events.push({ type: 'oauth-register' });
      return json({ client_id: 'simulated-client' }, 201);
    }
    if (url.pathname === '/oauth/authorize' && options.method === 'GET') {
      assert.equal(authenticated, true);
      consentQuery = url.searchParams;
      return new Response('<input name="consent" value="simulated_consent_nonce">');
    }
    if (url.pathname === '/oauth/authorize') {
      assert.equal(authenticated, true);
      assert.equal(form.get('decision'), 'approve');
      return new Response(null, {
        status: 302,
        headers: { location: CALLBACK + '?state=' + consentQuery.get('state') + '&code=simulated-code' },
      });
    }
    if (url.pathname === '/oauth/token') {
      const challenge = createHash('sha256').update(form.get('code_verifier')).digest('base64url');
      if (
        tokenConsumed ||
        challenge !== consentQuery.get('code_challenge') ||
        form.get('resource') !== RESOURCE
      )
        return json({}, 400);
      tokenConsumed = true;
      return json({ access_token: oauthToken, scope: 'mterm:read' });
    }
    if (url.pathname === '/oauth/revoke') {
      assert.equal(form.get('token'), oauthToken);
      oauthRevoked = true;
      return json({});
    }
    if (url.pathname === '/api/pair/start') {
      events.push({ type: 'pair-start' });
      const n = pairs.size + 1;
      const pair = { pairId: 'pair-' + n, userCode: 'USERCODE' + n, deviceCode: 'device-code-' + n };
      pairs.set(pair.pairId, pair);
      return json(pair, 201);
    }
    if (url.pathname === '/api/pair/approve') {
      const pair = pairs.get(body.pairId);
      if (body.userCode !== pair.userCode) return json({}, 400);
      pair.approved = true;
      return json({});
    }
    if (url.pathname === '/api/pair/poll') {
      const pair = pairs.get(body.pairId);
      if (body.deviceCode !== pair.deviceCode) return json({}, 403);
      if (pair.claimed) return json({}, 410);
      assert.equal(pair.approved, true);
      pair.claimed = true;
      const device = { id: 'device-' + pairs.size, token: 'SIMULATED_DEVICE_TOKEN_' + pairs.size };
      devices.set(device.id, device);
      return json({ deviceId: device.id, deviceToken: device.token });
    }
    if (url.pathname === '/api/agent/poll') {
      const device = devices.get(body.deviceId);
      if (headers.get('authorization') !== 'Bearer ' + device.token) return json({}, 403);
      assert.equal(device.revoked, true);
      return json({}, 410);
    }
    if (url.pathname === '/api/devices/revoke') {
      const device = devices.get(body.deviceId);
      device.revoked = true;
      runningAgents.get(device.id).finish('revoked');
      return json({});
    }
    if (url.pathname === '/api/revoke-all') {
      assert.equal(authenticated, true);
      events.push({ type: 'revoke-all' });
      return json({}, scenario.cleanupFailure === 'remote' ? 500 : 200);
    }
    throw new Error('unexpected simulated endpoint');
  }
  const modules = new Map();
  const definitions = {
    'node:fs/promises': { default: fakeFs },
    'node:os': { default: { tmpdir: () => '/simulated-tmp' } },
    'node:path': { default: virtualPath },
    'node:url': {
      fileURLToPath(url) {
        assert.equal(url, HARNESS_URL.href);
        return '/simulated-repo/scripts/verify-remote-staging.mjs';
      },
    },
    'node:crypto': { createHash, randomBytes, randomUUID },
    'node:readline': {
      createInterface() {
        events.push({ type: 'credential-read' });
        const reader = new EventEmitter();
        reader.close = () => reader.emit('close');
        queueMicrotask(() =>
          reader.emit('line', JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET })),
        );
        return reader;
      },
    },
    'node:timers/promises': { setTimeout: async () => {} },
    '../dist/remote/agent.js': { RemoteAgent, GatewayTransport },
    '../dist/remote/adapter.js': { RemoteReadAdapter },
    '../dist/remote/state.js': { RemoteStateStore },
    '../dist/remote/protocol.js': { READ_TOOLS: readTools, WIRE_VERSION: 1 },
    '@modelcontextprotocol/client': { Client, StreamableHTTPClientTransport },
  };
  const context = vm.createContext({
    process: fakeProcess,
    Buffer,
    URL,
    URLSearchParams,
    Headers,
    TextDecoder,
    AbortController,
    AbortSignal,
    fetch: controlledFetch,
    setTimeout(callback, milliseconds) {
      const timer = setTimeout(callback, milliseconds);
      timers.add(timer);
      return timer;
    },
    clearTimeout(timer) {
      clearTimeout(timer);
      timers.delete(timer);
    },
  });
  function moduleFor(specifier) {
    assert.ok(has(definitions, specifier), 'every harness import must be explicitly simulated');
    if (!modules.has(specifier)) {
      const definition = definitions[specifier];
      modules.set(
        specifier,
        new vm.SyntheticModule(
          Object.keys(definition),
          function () {
            for (const [name, value] of Object.entries(definition)) this.setExport(name, value);
          },
          { context },
        ),
      );
    }
    return modules.get(specifier);
  }
  const harness = new vm.SourceTextModule(source, {
    context,
    identifier: HARNESS_URL.href,
    initializeImportMeta(meta) {
      meta.url = HARNESS_URL.href;
    },
    async importModuleDynamically(specifier) {
      const module = moduleFor(specifier);
      if (module.status === 'unlinked') await module.link(() => assert.fail('unexpected fixture import'));
      if (module.status !== 'evaluated') await module.evaluate();
      return module;
    },
  });
  try {
    await harness.link(moduleFor);
    await harness.evaluate({ timeout: 5000 });
  } finally {
    for (const timer of timers) clearTimeout(timer);
  }
  assert.ok(report, 'the actual harness must produce a virtual receipt');
  assert.equal(
    await fs.readFile(HARNESS_URL, 'utf8'),
    source,
    'harness bytes must not change during the fixture',
  );
  return {
    simulated: true,
    exitCode: fakeProcess.exitCode,
    stdout,
    report,
    events,
    healthReads,
    authenticatedDashboardReads,
  };
}

function run(scenario = {}) {
  const child = spawnSync(
    process.execPath,
    [
      '--experimental-vm-modules',
      '--disable-warning=ExperimentalWarning',
      fileURLToPath(import.meta.url),
      CHILD_ARGUMENT,
    ],
    {
      input: JSON.stringify(scenario),
      encoding: 'utf8',
      timeout: 15000,
      maxBuffer: 1048576,
      // Do not pass ambient credentials, Node preload options, or network configuration.
      env: { PATH: process.env.PATH ?? '', SystemRoot: process.env.SystemRoot ?? '' },
    },
  );
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.signal, null);
  assert.equal(child.stderr, '');
  const result = JSON.parse(child.stdout);
  assert.equal(result.simulated, true);
  const serialized = JSON.stringify(result);
  for (const secret of [CLIENT_ID, CLIENT_SECRET, REMOTE_SECRET]) {
    assert.equal(serialized.includes(secret), false, 'credential or arbitrary remote content leaked');
  }
  return result;
}
function requests(result, pathname) {
  return result.events.filter((event) => event.type === 'request' && event.path === pathname);
}
function noFixtureEffects(result) {
  for (const type of [
    'oauth-register',
    'pair-start',
    'agent-start',
    'fixture-create',
    'fixture-write',
    'state-open',
    'state-save',
    'revoke-all',
    'sdk-connect',
  ]) {
    assert.equal(
      result.events.some((event) => event.type === type),
      false,
      type + ' must not occur',
    );
  }
}
function failed(result, code) {
  assert.equal(result.exitCode, 1);
  assert.equal(result.report.status, 'failed');
  assert.equal(result.report.failure?.code, code);
  assert.equal(result.stdout.includes('"result":"passed"'), false);
}

if (process.argv[2] === CHILD_ARGUMENT) {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  process.stdout.write(JSON.stringify(await controlledHarness(JSON.parse(input))));
} else {
  test('matching builds traverse all original simulated smoke checks and owned cleanup', () => {
    const result = run({ expected: EXPECTED });
    assert.equal(result.exitCode, 0);
    assert.equal(result.report.status, 'passed');
    assert.deepEqual(
      result.report.checks
        .filter((check) => OLD_CHECKS.includes(check.name))
        .map((check) => [check.name, check.status]),
      OLD_CHECKS.map((name) => [name, 'passed']),
    );
    assert.equal(result.events.filter((event) => event.type === 'pair-start').length, 2);
    assert.equal(result.events.filter((event) => event.type === 'agent-start').length, 2);
    assert.equal(result.events.filter((event) => event.type === 'revoke-all').length, 1);
    assert.equal(result.report.cleanup.syntheticDevicesAndGrantsRevoked, true);
    assert.equal(result.report.cleanup.onlyCreatedLocalFixturesRemoved, true);
  });
  for (const [name, expected, code] of [
    ['missing', undefined, 'EXPECTED_SOURCE_COMMIT_REQUIRED'],
    ['empty', '', 'EXPECTED_SOURCE_COMMIT_REQUIRED'],
    ['abbreviated', EXPECTED.slice(0, 7), 'EXPECTED_SOURCE_COMMIT_INVALID'],
    ['39 characters', EXPECTED.slice(1), 'EXPECTED_SOURCE_COMMIT_INVALID'],
    ['41 characters', EXPECTED + '0', 'EXPECTED_SOURCE_COMMIT_INVALID'],
    ['64 characters', 'a'.repeat(64), 'EXPECTED_SOURCE_COMMIT_INVALID'],
    ['uppercase', EXPECTED.toUpperCase(), 'EXPECTED_SOURCE_COMMIT_INVALID'],
    ['leading whitespace', ' ' + EXPECTED, 'EXPECTED_SOURCE_COMMIT_INVALID'],
    ['trailing newline', EXPECTED + '\n', 'EXPECTED_SOURCE_COMMIT_INVALID'],
    ['untrusted value', REMOTE_SECRET, 'EXPECTED_SOURCE_COMMIT_INVALID'],
  ]) {
    test('expected commit ' + name + ' fails before stdin, network or fixtures', () => {
      const result = run(expected === undefined ? {} : { expected });
      failed(result, code);
      assert.equal(result.stdout.includes('INPUT_REQUIRED'), false);
      assert.equal(
        result.events.some((event) => event.type === 'credential-read' || event.type === 'request'),
        false,
      );
      noFixtureEffects(result);
    });
  }
  for (const surface of ['Edge', 'Registry']) {
    for (const [name, build, code] of [
      ['missing', undefined, 'INVALID'],
      ['null', null, 'INVALID'],
      ['object', { secret: REMOTE_SECRET }, 'INVALID'],
      ['abbreviated', EXPECTED.slice(0, 7), 'INVALID'],
      ['uppercase', EXPECTED.toUpperCase(), 'INVALID'],
      ['trailing newline', EXPECTED + '\n', 'INVALID'],
      ['arbitrary response text', REMOTE_SECRET, 'INVALID'],
      ['different canonical commit', OTHER, 'MISMATCH'],
    ]) {
      test(
        'initial ' + surface.toLowerCase() + ' build ' + name + ' blocks OAuth and fixture effects',
        () => {
          const result = run({
            expected: EXPECTED,
            ...(build === undefined ? { ['omitInitial' + surface]: true } : { ['initial' + surface]: build }),
          });
          failed(result, surface.toUpperCase() + '_BUILD_' + code);
          assert.equal(result.events.filter((event) => event.type === 'credential-read').length, 1);
          assert.equal(result.healthReads, 1);
          assert.equal(result.authenticatedDashboardReads, surface === 'Edge' ? 0 : 1);
          noFixtureEffects(result);
        },
      );
    }
  }
  test('matching edge with stale registry is rejected as partial adoption', () => {
    const result = run({ expected: EXPECTED, initialEdge: EXPECTED, initialRegistry: OTHER });
    failed(result, 'REGISTRY_BUILD_MISMATCH');
    noFixtureEffects(result);
    assert.deepEqual(result.report.buildIdentity.initial, { edge: EXPECTED, registry: OTHER });
  });
  test('matching registry cannot excuse a stale edge', () => {
    const result = run({ expected: EXPECTED, initialEdge: OTHER, initialRegistry: EXPECTED });
    failed(result, 'EDGE_BUILD_MISMATCH');
    noFixtureEffects(result);
  });
  for (const surface of ['Edge', 'Registry']) {
    for (const [name, build, code] of [
      ['missing', undefined, 'INVALID'],
      ['malformed', REMOTE_SECRET, 'INVALID'],
      ['different canonical commit', OTHER, 'MISMATCH'],
    ]) {
      test(
        'final ' + surface.toLowerCase() + ' build ' + name + ' during local cleanup prevents success',
        () => {
          const result = run({
            expected: EXPECTED,
            ...(build === undefined ? { ['omitFinal' + surface]: true } : { ['final' + surface]: build }),
          });
          failed(result, surface.toUpperCase() + '_BUILD_' + code);
          assert.equal(result.report.cleanup.syntheticDevicesAndGrantsRevoked, true);
          assert.equal(result.report.cleanup.onlyCreatedLocalFixturesRemoved, true);
          assert.equal(result.healthReads, 2);
          assert.equal(result.authenticatedDashboardReads, surface === 'Edge' ? 2 : 3);
          assert.equal(
            result.report.checks.find((check) => check.name === 'final_staging_build_identity')?.status,
            'failed',
          );
          assert.equal(result.events.filter((event) => event.type === 'revoke-all').length, 1);
        },
      );
    }
    test('final ' + surface.toLowerCase() + ' HTTP failure cannot report success or retry', () => {
      const result = run({ expected: EXPECTED, ['final' + surface + 'Status']: 503 });
      failed(result, surface === 'Edge' ? 'HEALTH_UNAVAILABLE' : 'ACCESS_SERVICE_AUTH_FAILED');
      assert.equal(result.healthReads, 2);
      assert.equal(result.authenticatedDashboardReads, surface === 'Edge' ? 2 : 3);
    });
    test('final ' + surface.toLowerCase() + ' transport failure is sanitized and not retried', () => {
      const result = run({ expected: EXPECTED, ['final' + surface + 'Failure']: true });
      failed(result, 'UNEXPECTED_RUNTIME_ERROR');
      assert.equal(result.healthReads, 2);
      assert.equal(result.authenticatedDashboardReads, surface === 'Edge' ? 2 : 3);
    });
  }
  test('matching final observations follow all owned cleanup and precede the success receipt', () => {
    const result = run({ expected: EXPECTED });
    assert.equal(result.exitCode, 0);
    assert.deepEqual(result.report.buildIdentity, {
      expectedSourceCommit: EXPECTED,
      initial: { edge: EXPECTED, registry: EXPECTED },
      final: { edge: EXPECTED, registry: EXPECTED },
    });
    assert.equal(result.report.build, EXPECTED);
    assert.equal(result.healthReads, 2);
    assert.equal(result.authenticatedDashboardReads, 3);
    const finalRequests = result.events.filter(
      (event) => event.type === 'request' && event.afterLocalCleanup,
    );
    assert.deepEqual(
      finalRequests.map((event) => [event.path, event.authenticated]),
      [
        ['/health', false],
        ['/api/dashboard', true],
      ],
    );
    const finalIndex = result.events.indexOf(finalRequests[0]);
    for (const type of ['revoke-all', 'agent-stop', 'state-release', 'sdk-close', 'fixture-remove']) {
      assert.ok(result.events.findLastIndex((event) => event.type === type) < finalIndex, type);
    }
    assert.ok(finalIndex < result.events.findIndex((event) => event.type === 'report-write'));
  });
  for (const [name, scenario, code] of [
    ['argv input', { argv: ['--client-secret=forbidden'] }, 'NO_COMMAND_LINE_OPTIONS_ACCEPTED'],
    ['non-Windows runtime', { platform: 'linux' }, 'WINDOWS_ACCEPTANCE_REQUIRES_WINDOWS'],
    ['disabled TLS verification', { disableTls: true }, 'TLS_VERIFICATION_DISABLED'],
    ['wrong SDK version', { sdkVersion: '0.0.0' }, 'PINNED_SDK_VERSION_MISMATCH'],
    ['disabled staging', { enabled: false }, 'NOT_ENABLED_STAGING'],
    ['production environment', { environment: 'production' }, 'NOT_ENABLED_STAGING'],
    ['unauthenticated identity', { authenticated: false }, 'NOT_SYNTHETIC_SERVICE_IDENTITY'],
    ['human identity', { identityKind: 'human' }, 'NOT_SYNTHETIC_SERVICE_IDENTITY'],
    ['existing devices', { nonemptyDevices: true }, 'STAGING_IDENTITY_NOT_EMPTY'],
    ['existing grants', { nonemptyGrants: true }, 'STAGING_IDENTITY_NOT_EMPTY'],
  ]) {
    test('existing ' + name + ' guard remains fail-closed', () => {
      const result = run({ expected: EXPECTED, ...scenario });
      failed(result, code);
      noFixtureEffects(result);
    });
  }
  for (const [name, scenario] of [
    ['authenticated flag', { finalAuthenticated: false }],
    ['service identity', { finalIdentityKind: 'human' }],
  ]) {
    test('final registry requires its ' + name + ' as well as a matching build', () => {
      const result = run({ expected: EXPECTED, ...scenario });
      failed(result, 'NOT_SYNTHETIC_SERVICE_IDENTITY');
      assert.equal(result.authenticatedDashboardReads, 3);
    });
  }
  for (const cleanupFailure of ['remote', 'local']) {
    test('existing ' + cleanupFailure + ' cleanup failure stays failed and skips success-only probes', () => {
      const result = run({ expected: EXPECTED, cleanupFailure });
      assert.equal(result.exitCode, 1);
      assert.equal(result.report.status, 'failed');
      assert.equal(result.healthReads, 1);
      assert.equal(
        result.report.checks.some((check) => check.name === 'final_staging_build_identity'),
        false,
      );
      assert.equal(requests(result, '/api/revoke-all').length, 1);
    });
  }
}
