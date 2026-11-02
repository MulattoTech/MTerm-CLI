// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-remote-staging-smoke (OpenAI / GPT-6 Astra Pro; self-reported)
// Run after build: node scripts/verify-remote-staging.mjs
// Supply ONE stdin JSON line: {"client_id":"...access","client_secret":"..."}.
// Credentials never enter argv, environment, reports, or plaintext credential files.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { setTimeout as delay } from 'node:timers/promises';

const GATEWAY = 'https://mcp-staging.m-techlabs.com';
const DASHBOARD = 'https://mterm-staging.m-techlabs.com';
const RESOURCE = GATEWAY + '/mcp';
const CALLBACK = 'https://mterm-staging-client.invalid/callback';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID();
const digest = value => createHash('sha256').update(value).digest('hex');
const random = bytes => randomBytes(bytes).toString('base64url');
const report = {
  schemaVersion: 1,
  runId,
  startedAt: new Date().toISOString(),
  status: 'running',
  platform: process.platform,
  nodeVersion: process.versions.node,
  endpoints: { mcp: RESOURCE, dashboard: DASHBOARD },
  identity: 'temporary-cloudflare-access-service-principal',
  humanGoogleLoginVerified: false,
  humanConsentVerified: false,
  browserCallbackVisited: false,
  chatgptConnectorVerified: false,
  remoteWriteOrExecutionEnabled: false,
  sdk: { package: '@modelcontextprotocol/client', version: '2.3.0', transport: 'StreamableHTTPClientTransport', initialized: false, fallbackUsed: false },
  devices: [],
  checks: [],
  cleanup: {},
};
class SmokeError extends Error {
  constructor(code) { super(code); this.code = code; }
}
function ensure(condition, code) { if (!condition) throw new SmokeError(code); }
function failure(error) {
  return {
    code: error instanceof SmokeError ? error.code : 'UNEXPECTED_RUNTIME_ERROR',
    ...(Number.isSafeInteger(error?.httpStatus) && error.httpStatus >= 100 && error.httpStatus <= 599 ? { httpStatus: error.httpStatus } : {}),
    ...(Number.isSafeInteger(error?.code) ? { protocolErrorCode: error.code } : {}),
    ...(typeof error?.code === 'string' && /^[A-Z_]{3,60}$/.test(error.code) ? { runtimeErrorCode: error.code } : {}),
  };
}
async function bounded(promise, milliseconds, code) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new SmokeError(code)), milliseconds); })]); }
  finally { clearTimeout(timer); }
}
async function check(name, action) {
  const started = Date.now();
  try {
    const evidence = await action();
    const entry = { name, status: 'passed', durationMs: Date.now() - started, evidence: evidence ?? {} };
    report.checks.push(entry);
    process.stdout.write(JSON.stringify({ check: name, status: 'passed' }) + '\n');
    return evidence;
  } catch (error) {
    const entry = { name, status: 'failed', durationMs: Date.now() - started, ...failure(error) };
    report.checks.push(entry);
    process.stdout.write(JSON.stringify({ check: name, status: 'failed', ...failure(error) }) + '\n');
    throw error;
  }
}
async function inputCredentials() {
  ensure(process.argv.length === 2, 'NO_COMMAND_LINE_OPTIONS_ACCEPTED');
  process.stdout.write('INPUT_REQUIRED\n');
  const reader = createInterface({ input: process.stdin, crlfDelay: Infinity, terminal: false });
  try {
    let line = await bounded(new Promise((resolve, reject) => {
      reader.once('line', resolve);
      reader.once('close', () => reject(new SmokeError('CREDENTIAL_INPUT_CLOSED')));
      reader.once('error', () => reject(new SmokeError('CREDENTIAL_INPUT_FAILED')));
    }), 120000, 'CREDENTIAL_INPUT_TIMEOUT');
    ensure(typeof line === 'string' && Buffer.byteLength(line) <= 8192, 'CREDENTIAL_INPUT_INVALID');
    let value;
    try { value = JSON.parse(line); } catch { throw new SmokeError('CREDENTIAL_INPUT_INVALID'); }
    line = '';
    ensure(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(k => ['client_id', 'client_secret'].includes(k)), 'CREDENTIAL_INPUT_INVALID');
    ensure(typeof value.client_id === 'string' && /^[A-Za-z0-9_-]{8,256}\.access$/.test(value.client_id), 'CREDENTIAL_INPUT_INVALID');
    ensure(typeof value.client_secret === 'string' && /^[A-Za-z0-9_-]{16,1024}$/.test(value.client_secret), 'CREDENTIAL_INPUT_INVALID');
    return value;
  } finally { reader.close(); process.stdin.pause(); }
}

let credentials;
let fixtureBase;
let syntheticIdentityVerified = false;
let client;
let transport;
let oauth;
const agents = [];
const lifetime = new AbortController();
let lifetimeTimer;

// Only this function adds Access credentials, and only to the fixed dashboard origin.
async function request(surface, endpoint, { method = 'GET', json, form, token, authenticate = false, signal = lifetime.signal } = {}) {
  ensure(surface === 'public' || surface === 'dashboard', 'INVALID_REQUEST_SURFACE');
  ensure(endpoint.startsWith('/') && !endpoint.startsWith('//'), 'INVALID_REQUEST_PATH');
  const origin = surface === 'public' ? GATEWAY : DASHBOARD;
  const url = new URL(endpoint, origin);
  ensure(url.origin === origin, 'REQUEST_ORIGIN_REJECTED');
  ensure(!authenticate || (surface === 'dashboard' && credentials), 'ACCESS_CREDENTIAL_DESTINATION_REJECTED');
  ensure(!token || surface === 'public', 'BEARER_DESTINATION_REJECTED');
  const headers = new Headers({ accept: 'application/json' });
  if (authenticate) { headers.set('CF-Access-Client-Id', credentials.client_id); headers.set('CF-Access-Client-Secret', credentials.client_secret); }
  if (surface === 'dashboard' && method === 'POST') headers.set('origin', DASHBOARD);
  if (token) headers.set('authorization', 'Bearer ' + token);
  let body;
  if (json !== undefined) { headers.set('content-type', 'application/json'); body = JSON.stringify(json); }
  if (form !== undefined) { headers.set('content-type', 'application/x-www-form-urlencoded'); body = new URLSearchParams(form).toString(); }
  const response = await fetch(url, { method, headers, body, redirect: 'manual', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000) });
  const reader = response.body?.getReader();
  const chunks = []; let bytes = 0;
  if (reader) {
    try {
      for (;;) {
        const part = await reader.read(); if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > 1048576) { await reader.cancel(); throw new SmokeError('HTTP_RESPONSE_TOO_LARGE'); }
        chunks.push(part.value);
      }
    } finally { reader.releaseLock(); }
  }
  const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
  let data; try { data = JSON.parse(text); } catch { /* HTML consent or an Access redirect is expected on some routes. */ }
  return { status: response.status, headers: response.headers, data, text };
}
function status(response, expected, code) {
  if (![expected].flat().includes(response.status)) {
    const error = new SmokeError(code); error.httpStatus = response.status; throw error;
  }
}
const rpc = (method, params, id = randomUUID()) => ({ jsonrpc: '2.0', id, method, ...(params === undefined ? {} : { params }) });
async function callTool(name, args) {
  return bounded(client.callTool({ name, ...(args === undefined ? {} : { arguments: args }) }), 35000, 'SDK_TOOL_TIMEOUT');
}
function content(result) {
  ensure(result && !result.isError && result.structuredContent && typeof result.structuredContent === 'object', 'TOOL_RESULT_INVALID');
  return result.structuredContent;
}
async function waitFor(predicate, milliseconds, code) {
  const end = Date.now() + milliseconds;
  while (!predicate()) { ensure(Date.now() < end && !lifetime.signal.aborted, code); await delay(100); }
}

async function main() {
  credentials = await inputCredentials();
  lifetimeTimer = setTimeout(() => lifetime.abort(), 240000);
  await check('windows_runtime_and_real_modules', async () => {
    ensure(process.platform === 'win32', 'WINDOWS_ACCEPTANCE_REQUIRES_WINDOWS');
    ensure(Number(process.versions.node.split('.')[0]) >= 24, 'NODE_24_REQUIRED');
    ensure(process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0', 'TLS_VERIFICATION_DISABLED');
    const sdkManifest = JSON.parse(await fs.readFile(path.join(REPO, 'node_modules', '@modelcontextprotocol', 'client', 'package.json'), 'utf8'));
    ensure(sdkManifest.version === '2.3.0', 'PINNED_SDK_VERSION_MISMATCH');
    report.sdk.installedVersionVerified = true;
    const [{ RemoteAgent, GatewayTransport }, { RemoteReadAdapter }, { RemoteStateStore }, { READ_TOOLS, WIRE_VERSION }, sdk] = await Promise.all([
      import('../dist/remote/agent.js'), import('../dist/remote/adapter.js'), import('../dist/remote/state.js'), import('../dist/remote/protocol.js'), import('@modelcontextprotocol/client'),
    ]);
    ensure(typeof sdk.Client === 'function' && typeof sdk.StreamableHTTPClientTransport === 'function', 'SDK_EXPORTS_UNAVAILABLE');
    main.modules = { RemoteAgent, GatewayTransport, RemoteReadAdapter, RemoteStateStore, READ_TOOLS, WIRE_VERSION, sdk };
    return { windows: true, localToolHost: 'FileService through RemoteReadAdapter', credentialProtection: 'windows-dpapi-current-user' };
  });
  const { RemoteAgent, GatewayTransport, RemoteReadAdapter, RemoteStateStore, READ_TOOLS, WIRE_VERSION, sdk } = main.modules;
  await check('live_discovery_and_anonymous_denial', async () => {
    const health = await request('public', '/health'); status(health, 200, 'HEALTH_UNAVAILABLE');
    ensure(health.data?.enabled === true && health.data.environment === 'staging', 'NOT_ENABLED_STAGING');
    report.build = typeof health.data.build === 'string' && /^[a-f0-9]{7,64}$/i.test(health.data.build) ? health.data.build : 'unverified';
    const resource = await request('public', '/.well-known/oauth-protected-resource/mcp');
    status(resource, 200, 'RESOURCE_DISCOVERY_FAILED');
    ensure(resource.data?.resource === RESOURCE && resource.data.authorization_servers?.includes(GATEWAY), 'RESOURCE_DISCOVERY_MISMATCH');
    const server = await request('public', '/.well-known/oauth-authorization-server'); status(server, 200, 'OAUTH_DISCOVERY_FAILED');
    ensure(server.data?.issuer === GATEWAY && server.data.authorization_endpoint === DASHBOARD + '/oauth/authorize' && server.data.token_endpoint === GATEWAY + '/oauth/token', 'OAUTH_DISCOVERY_MISMATCH');
    const anonymous = await request('public', '/mcp', { method: 'POST', json: rpc('tools/list') });
    status(anonymous, 401, 'ANONYMOUS_MCP_NOT_REJECTED');
    ensure(anonymous.headers.get('www-authenticate')?.includes('resource_metadata='), 'MISSING_AUTH_CHALLENGE');
    const privatePage = await request('dashboard', '/api/dashboard');
    status(privatePage, [302, 303, 401, 403], 'ANONYMOUS_DASHBOARD_NOT_REJECTED');
    return { resourceDiscovery: 200, authorizationServerDiscovery: 200, anonymousMcpStatus: anonymous.status, anonymousDashboardStatus: privatePage.status };
  });
  await check('real_access_service_authentication', async () => {
    const response = await request('dashboard', '/api/dashboard', { authenticate: true }); status(response, 200, 'ACCESS_SERVICE_AUTH_FAILED');
    ensure(response.data?.authenticated === true && response.data.identityKind === 'staging-service', 'NOT_SYNTHETIC_SERVICE_IDENTITY');
    ensure(Array.isArray(response.data.devices) && response.data.devices.length === 0 && Array.isArray(response.data.grants) && response.data.grants.length === 0, 'STAGING_IDENTITY_NOT_EMPTY');
    syntheticIdentityVerified = true;
    return { authenticated: true, identityKind: 'staging-service', initiallyEmpty: true, humanLoginTested: false };
  });
  await check('live_pkce_consent_exchange_and_code_replay', async () => {
    const registration = await request('public', '/oauth/register', { method: 'POST', json: { client_name: 'MTerm staging smoke ' + runId.slice(-8), redirect_uris: [CALLBACK], token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] } });
    status(registration, 201, 'CLIENT_REGISTRATION_FAILED');
    const clientId = registration.data?.client_id; ensure(typeof clientId === 'string', 'CLIENT_REGISTRATION_INVALID');
    const verifier = random(48), state = random(24), challenge = createHash('sha256').update(verifier).digest('base64url');
    const query = new URLSearchParams({ client_id: clientId, redirect_uri: CALLBACK, response_type: 'code', scope: 'mterm:read', resource: RESOURCE, state, code_challenge: challenge, code_challenge_method: 'S256' });
    const consent = await request('dashboard', '/oauth/authorize?' + query, { authenticate: true }); status(consent, 200, 'CONSENT_PAGE_FAILED');
    const nonce = /name="consent" value="([A-Za-z0-9_-]+)"/.exec(consent.text)?.[1]; ensure(nonce, 'CONSENT_NONCE_MISSING');
    const approval = await request('dashboard', '/oauth/authorize', { method: 'POST', authenticate: true, form: { consent: nonce, decision: 'approve' } });
    status(approval, 302, 'CONSENT_APPROVAL_FAILED');
    const redirect = new URL(approval.headers.get('location') || 'https://invalid.invalid');
    ensure(redirect.origin + redirect.pathname === CALLBACK && redirect.searchParams.get('state') === state, 'OAUTH_CALLBACK_MISMATCH');
    const code = redirect.searchParams.get('code'); ensure(code, 'AUTHORIZATION_CODE_MISSING');
    const params = { grant_type: 'authorization_code', client_id: clientId, code, code_verifier: verifier, redirect_uri: CALLBACK, resource: RESOURCE };
    const wrongPkce = await request('public', '/oauth/token', { method: 'POST', form: { ...params, code_verifier: random(48) } }); status(wrongPkce, 400, 'WRONG_PKCE_NOT_REJECTED');
    const wrongResource = await request('public', '/oauth/token', { method: 'POST', form: { ...params, resource: GATEWAY + '/wrong-resource' } }); status(wrongResource, 400, 'WRONG_RESOURCE_NOT_REJECTED');
    const token = await request('public', '/oauth/token', { method: 'POST', form: params }); status(token, 200, 'TOKEN_EXCHANGE_FAILED');
    ensure(typeof token.data?.access_token === 'string' && /^[A-Za-z0-9_-]{40,128}$/.test(token.data.access_token) && token.data.scope === 'mterm:read', 'TOKEN_RESPONSE_INVALID');
    oauth = { clientId, accessToken: token.data.access_token };
    const replay = await request('public', '/oauth/token', { method: 'POST', form: params }); status(replay, 400, 'AUTHORIZATION_CODE_REPLAY_ACCEPTED');
    return { pkce: 'S256', scope: 'mterm:read', consentIdentity: 'staging-service', wrongPkceStatus: wrongPkce.status, wrongResourceStatus: wrongResource.status, codeReplayStatus: replay.status, browserCallbackVisited: false };
  });
  fixtureBase = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-staging-smoke-'));
  for (const label of ['fixture-a', 'fixture-b']) {
    await check('pair_and_protect_' + label, async () => {
      const root = path.join(fixtureBase, label), stateDirectory = path.join(fixtureBase, label + '-private-state');
      await fs.mkdir(root, { mode: 0o700 });
      const marker = 'MTerm staging fixture ' + randomUUID() + '\n';
      await fs.writeFile(path.join(root, 'marker.txt'), marker, { flag: 'wx', mode: 0o600 });
      const store = await RemoteStateStore.open(stateDirectory);
      await store.configure({ schemaVersion: 1, gateway: GATEWAY, dashboard: DASHBOARD, root, name: 'MTerm smoke ' + label + ' ' + runId.slice(-8) });
      const start = await request('public', '/api/pair/start', { method: 'POST', json: { name: 'MTerm smoke ' + label + ' ' + runId.slice(-8), platform: process.platform, capabilities: READ_TOOLS.map(t => t.name) } });
      status(start, 201, 'PAIR_START_FAILED'); const pair = start.data;
      ensure(pair && typeof pair.pairId === 'string' && typeof pair.deviceCode === 'string' && typeof pair.userCode === 'string', 'PAIR_START_INVALID');
      const wrong = await request('dashboard', '/api/pair/approve', { method: 'POST', authenticate: true, json: { pairId: pair.pairId, userCode: 'INVALID' } }); status(wrong, 400, 'WRONG_PAIR_CODE_ACCEPTED');
      const wrongClaim = await request('public', '/api/pair/poll', { method: 'POST', json: { pairId: pair.pairId, deviceCode: random(32) } }); status(wrongClaim, 403, 'WRONG_DEVICE_CODE_ACCEPTED');
      const approved = await request('dashboard', '/api/pair/approve', { method: 'POST', authenticate: true, json: { pairId: pair.pairId, userCode: pair.userCode } }); status(approved, 200, 'PAIR_APPROVAL_FAILED');
      const claimed = await request('public', '/api/pair/poll', { method: 'POST', json: { pairId: pair.pairId, deviceCode: pair.deviceCode } }); status(claimed, 200, 'PAIR_CLAIM_FAILED');
      const { deviceId, deviceToken } = claimed.data ?? {}; ensure(typeof deviceId === 'string' && typeof deviceToken === 'string', 'PAIR_CREDENTIAL_INVALID');
      report.devices.push({ label, deviceId, platform: process.platform, permissions: 'read-only', credentialProtection: 'windows-dpapi-current-user' });
      const replay = await request('public', '/api/pair/poll', { method: 'POST', json: { pairId: pair.pairId, deviceCode: pair.deviceCode } }); status(replay, 410, 'PAIR_CLAIM_REPLAY_ACCEPTED');
      await store.savePairing(deviceId, deviceToken);
      const credential = await store.credential(); ensure(credential.deviceId === deviceId && credential.token === deviceToken, 'DPAPI_ROUNDTRIP_FAILED');
      const protectedFile = await fs.readFile(path.join(stateDirectory, 'credential.json'), 'utf8');
      ensure(JSON.parse(protectedFile).protection === 'windows-dpapi-current-user' && !protectedFile.includes(deviceToken), 'CREDENTIAL_NOT_DPAPI_PROTECTED');
      const instanceId = randomUUID(); await store.acquire(instanceId);
      const adapter = await RemoteReadAdapter.create({ root, deviceId });
      const entry = { label, deviceId, credential, root, marker, store, instanceId, controller: new AbortController(), online: false, events: {}, outcome: null };
      agents.push(entry);
      const agent = new RemoteAgent({ adapter, transport: new GatewayTransport(GATEWAY, credential.token), onEvent: event => { entry.events[event.state] = (entry.events[event.state] || 0) + 1; if (event.state === 'online') entry.online = true; } });
      entry.done = agent.run(AbortSignal.any([entry.controller.signal, lifetime.signal])).then(outcome => { entry.outcome = outcome; return outcome; }, error => { entry.outcome = { reason: 'error', ...failure(error) }; return entry.outcome; });
      await waitFor(() => entry.online || entry.outcome, 20000, 'AGENT_ONLINE_TIMEOUT'); ensure(entry.online, 'AGENT_START_FAILED');
      return { deviceId, wrongPairCodeStatus: wrong.status, wrongDeviceCodeStatus: wrongClaim.status, pairingReplayStatus: replay.status, dpapiRoundtrip: true, agentOnline: true };
    });
  }
  await check('real_sdk_initialize_and_tool_discovery', async () => {
    client = new sdk.Client({ name: 'mterm-live-staging-smoke', version: '1.0.0' }, { capabilities: {}, versionNegotiation: { mode: 'legacy' } });
    client.onerror = () => { report.sdk.transportErrorCount = (report.sdk.transportErrorCount || 0) + 1; };
    transport = new sdk.StreamableHTTPClientTransport(new URL(RESOURCE), { requestInit: { headers: { authorization: 'Bearer ' + oauth.accessToken }, redirect: 'error' } });
    await bounded(client.connect(transport), 30000, 'SDK_INITIALIZE_TIMEOUT');
    report.sdk.initialized = true;
    const listed = await bounded(client.listTools(), 15000, 'SDK_LIST_TOOLS_TIMEOUT');
    ensure(Array.isArray(listed.tools) && listed.tools.length === 6 && listed.tools.every(t => t.annotations?.readOnlyHint === true), 'SDK_TOOL_DISCOVERY_MISMATCH');
    const expected = new Set(['mterm_list_devices', ...READ_TOOLS.map(t => t.name)]);
    ensure(listed.tools.every(t => expected.delete(t.name)) && expected.size === 0, 'SDK_TOOL_NAMES_MISMATCH');
    report.sdk.toolCount = listed.tools.length;
    return { initialized: true, toolCount: listed.tools.length, allReadOnly: true, legacyNegotiation: true, fallbackUsed: false };
  });
  await check('sdk_device_inventory_and_two_real_windows_reads', async () => {
    const inventory = content(await callTool('mterm_list_devices'));
    ensure(Array.isArray(inventory.devices) && inventory.devices.length === 2 && agents.every(a => inventory.devices.some(d => d.id === a.deviceId && d.status === 'online' && d.permissions === 'read-only')), 'PAIRED_INVENTORY_MISMATCH');
    const hashes = [];
    for (const entry of agents) {
      const result = content(await callTool('mterm_read_file', { deviceId: entry.deviceId, path: 'marker.txt' }));
      ensure(typeof result.text === 'string' && result.text === entry.marker, 'REAL_FILE_MARKER_MISMATCH');
      hashes.push({ deviceId: entry.deviceId, expectedSha256: digest(entry.marker), actualSha256: digest(result.text), bytes: Buffer.byteLength(result.text) });
    }
    ensure(hashes[0].actualSha256 !== hashes[1].actualSha256, 'DEVICE_FIXTURES_NOT_DISTINCT');
    report.realWindowsReadViaDeployedGatewayAndSdk = true;
    return { inventoryCount: inventory.devices.length, independentFixtureReads: hashes, rawFileContentRecorded: false };
  });
  await check('cross_device_credential_and_mutation_denial', async () => {
    const [first, second] = agents;
    const crossed = await request('public', '/api/agent/poll', { method: 'POST', token: first.credential.token, json: { version: WIRE_VERSION, deviceId: second.deviceId } }); status(crossed, 403, 'CROSS_DEVICE_TOKEN_ACCEPTED');
    let denied = false, protocolErrorCode;
    try { const result = await callTool('mterm_write_file', { deviceId: first.deviceId, path: 'marker.txt', text: 'not permitted' }); denied = result?.isError === true; }
    catch (error) { if ([-32601, -32602].includes(error?.code)) { denied = true; protocolErrorCode = error.code; } else throw error; }
    ensure(denied, 'REMOTE_MUTATION_NOT_REJECTED');
    ensure(await fs.readFile(path.join(first.root, 'marker.txt'), 'utf8') === first.marker, 'FIXTURE_WAS_MODIFIED');
    const escaped = await callTool('mterm_read_file', { deviceId: first.deviceId, path: '../not-exposed.txt' });
    ensure(escaped?.isError === true && escaped.structuredContent?.error?.code === 'OUTSIDE_ROOT', 'ROOT_ESCAPE_NOT_REJECTED');
    return { crossDeviceStatus: crossed.status, mutationDenied: true, ...(protocolErrorCode ? { protocolErrorCode } : {}), fixtureUnchanged: true, outsideRootDenied: true };
  });
  await check('one_device_revocation_and_other_device_isolation', async () => {
    const [first, second] = agents;
    const revoked = await request('dashboard', '/api/devices/revoke', { method: 'POST', authenticate: true, json: { deviceId: first.deviceId } }); status(revoked, 200, 'DEVICE_REVOCATION_FAILED');
    const poll = await request('public', '/api/agent/poll', { method: 'POST', token: first.credential.token, json: { version: WIRE_VERSION, deviceId: first.deviceId } }); status(poll, 410, 'REVOKED_DEVICE_STILL_AUTHORIZED');
    await waitFor(() => first.outcome, 12000, 'AGENT_REVOCATION_NOT_OBSERVED'); ensure(first.outcome.reason === 'revoked', 'AGENT_DID_NOT_STOP_ON_REVOCATION');
    const denied = await callTool('mterm_read_file', { deviceId: first.deviceId, path: 'marker.txt' }); ensure(denied?.isError === true, 'REVOKED_DEVICE_READ_SUCCEEDED');
    ensure(content(await callTool('mterm_read_file', { deviceId: second.deviceId, path: 'marker.txt' })).text === second.marker, 'OTHER_DEVICE_AFFECTED_BY_REVOCATION');
    return { revokedDeviceStatus: poll.status, agentStoppedBecauseRevoked: true, revokedReadDenied: true, secondDeviceReadStillWorks: true };
  });
  await check('oauth_grant_revocation', async () => {
    const revoked = await request('public', '/oauth/revoke', { method: 'POST', form: { token: oauth.accessToken, client_id: oauth.clientId } }); status(revoked, 200, 'GRANT_REVOCATION_FAILED');
    const denied = await request('public', '/mcp', { method: 'POST', token: oauth.accessToken, json: rpc('tools/list') }); status(denied, 401, 'REVOKED_OAUTH_TOKEN_ACCEPTED');
    return { revocationStatus: revoked.status, subsequentMcpStatus: denied.status };
  });
  report.status = 'passed';
}

try { await main(); }
catch (error) { report.status = 'failed'; report.failure = failure(error); }
finally {
  // revoke-all is used only after proving that this is the dedicated, initially empty service principal.
  if (syntheticIdentityVerified) {
    try {
      const response = await request('dashboard', '/api/revoke-all', { method: 'POST', authenticate: true, json: {}, signal: null });
      status(response, 200, 'CLEANUP_REVOKE_ALL_FAILED');
      const empty = await request('dashboard', '/api/dashboard', { authenticate: true, signal: null }); status(empty, 200, 'CLEANUP_INVENTORY_FAILED');
      ensure(empty.data?.identityKind === 'staging-service' && empty.data.devices?.length === 0 && empty.data.grants?.length === 0, 'CLEANUP_IDENTITY_NOT_EMPTY');
      report.cleanup.syntheticDevicesAndGrantsRevoked = true;
    } catch (error) { report.cleanup.syntheticDevicesAndGrantsRevoked = false; report.cleanup.revocationFailure = failure(error); report.status = 'failed'; }
  } else { report.cleanup.syntheticDevicesAndGrantsRevoked = 'not-created-or-identity-unverified'; }
  lifetime.abort(); clearTimeout(lifetimeTimer);
  for (const entry of agents) entry.controller.abort();
  try {
    await bounded(Promise.all(agents.map(a => a.done)), 15000, 'AGENT_CLEANUP_TIMEOUT');
    report.cleanup.agentsStopped = true;
  } catch (error) { report.cleanup.agentsStopped = false; report.cleanup.agentFailure = failure(error); report.status = 'failed'; }
  for (const entry of agents) {
    try { await entry.store.release(entry.instanceId); } catch { report.cleanup.lockReleaseFailed = true; report.status = 'failed'; }
    const metadata = report.devices.find(d => d.deviceId === entry.deviceId);
    if (metadata) { metadata.agentEventCounts = entry.events; metadata.agentStopReason = entry.outcome?.reason || 'unknown'; }
    entry.credential.token = ''; entry.marker = '';
  }
  if (client) { try { await bounded(client.close(), 10000, 'SDK_CLOSE_TIMEOUT'); report.cleanup.sdkClosed = true; } catch { report.cleanup.sdkClosed = false; report.status = 'failed'; } }
  if (fixtureBase) {
    try {
      ensure(path.dirname(fixtureBase) === path.resolve(os.tmpdir()) && path.basename(fixtureBase).startsWith('mterm-staging-smoke-'), 'FIXTURE_CLEANUP_PATH_REJECTED');
      await fs.rm(fixtureBase, { recursive: true, force: false }); report.cleanup.onlyCreatedLocalFixturesRemoved = true;
    } catch (error) { report.cleanup.onlyCreatedLocalFixturesRemoved = false; report.cleanup.fixtureFailure = failure(error); report.status = 'failed'; }
  }
  if (credentials) { credentials.client_id = ''; credentials.client_secret = ''; }
  if (oauth) oauth.accessToken = '';
  report.finishedAt = new Date().toISOString();
  try {
    const directory = path.join(REPO, 'artifacts', 'remote-staging-smoke'); await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const reportPath = path.join(directory, runId + '.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    process.stdout.write(JSON.stringify({ result: report.status, reportPath, realWindowsReadViaDeployedGatewayAndSdk: report.realWindowsReadViaDeployedGatewayAndSdk === true, passedChecks: report.checks.filter(c => c.status === 'passed').length, humanLoginVerified: false, chatgptConnectorVerified: false }) + '\n');
  } catch { process.stdout.write(JSON.stringify({ result: 'failed', error: 'METADATA_REPORT_WRITE_FAILED' }) + '\n'); report.status = 'failed'; }
  process.exitCode = report.status === 'passed' ? 0 : 1;
}
