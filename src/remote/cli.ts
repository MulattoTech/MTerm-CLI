// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-remote-agent (OpenAI / GPT-6 Astra Pro; self-reported)
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { fail, plain } from '../errors.js';
import { RemoteReadAdapter, remoteRoot } from './adapter.js';
import { GatewayTransport, normalizeGateway, RemoteAgent } from './agent.js';
import { defaultRemoteStateDirectory, RemoteStateStore } from './state.js';
import { READ_TOOLS, UUID_PATTERN, WIRE_VERSION } from './protocol.js';

export const REMOTE_HELP = `MTerm remote — opt-in outbound read-only agent

  mterm-cli remote setup --gateway https://HOST --root ABSOLUTE_PATH [--dashboard https://HOST] [--name NAME] [--apply]
  mterm-cli remote pair [--state-dir PATH]
  mterm-cli remote start [--state-dir PATH]
  mterm-cli remote status [--state-dir PATH] [--json]
  mterm-cli remote stop [--state-dir PATH]
  mterm-cli remote revoke [--state-dir PATH]

Setup previews by default. --apply saves only MTerm remote configuration.
Pairing requires owner approval in the private browser dashboard.
Start remains in the foreground and opens no local listening port or startup task.
Write and process tools are unavailable. Stop affects only this state directory’s owned session.
Windows credentials use current-user DPAPI; POSIX credentials use private mode-0600 storage.
`;
interface Options { state: string; gateway?: string; dashboard?: string; root?: string; name?: string; apply: boolean; json: boolean }
function options(args: string[], command: string): Options {
  const out: Options = { state: defaultRemoteStateDirectory(), apply: false, json: false };
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const key = args[i]!;
    if (seen.has(key)) fail('USAGE', 'Remote options may occur only once.');
    seen.add(key);
    if (key === '--apply' && command === 'setup') { out.apply = true; continue; }
    if (key === '--json' && ['status', 'setup'].includes(command)) { out.json = true; continue; }
    if (key === '--state-dir' || (command === 'setup' && ['--gateway', '--dashboard', '--root', '--name'].includes(key))) {
      const value = args[++i];
      if (!value || value.startsWith('--')) fail('USAGE', 'Remote option is missing its value.');
      if (key === '--state-dir') out.state = path.resolve(value);
      else if (key === '--gateway') out.gateway = value;
      else if (key === '--dashboard') out.dashboard = value;
      else if (key === '--root') out.root = value;
      else out.name = value;
      continue;
    }
    fail('USAGE', 'Unsupported remote command option.');
  }
  return out;
}
function ownSignals(controller: AbortController): () => void {
  const stop = () => controller.abort();
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  return () => { process.off('SIGINT', stop); process.off('SIGTERM', stop); };
}

async function pair(store: RemoteStateStore): Promise<number> {
  const config = await store.config();
  if (config.deviceId) fail('REMOTE_PAIRED', 'This computer is already paired. Revoke its current pairing before replacing it.');
  const transport = new GatewayTransport(config.gateway);
  const controller = new AbortController(), release = ownSignals(controller);
  try {
    const started = await transport.post('/api/pair/start', {
      name: config.name, platform: process.platform, capabilities: READ_TOOLS.map(t => t.name),
    }, controller.signal);
    const value = started.data as { pairId?: string; deviceCode?: string; userCode?: string; verificationUri?: string; expiresAt?: number; pollIntervalMs?: number };
    let verification: URL;
    try { verification = new URL(value.verificationUri ?? ''); }
    catch { fail('REMOTE_PROTOCOL', 'Pairing verification URL is invalid.'); }
    if (!value.pairId || !UUID_PATTERN.test(value.pairId) || typeof value.deviceCode !== 'string' || value.deviceCode.length < 24 || value.deviceCode.length > 256 ||
      typeof value.userCode !== 'string' || !/^[A-Z0-9_-]{6,20}$/.test(value.userCode) ||
      verification.origin !== (config.dashboard ?? config.gateway) || verification.username || verification.password ||
      !Number.isSafeInteger(value.expiresAt) || value.expiresAt! <= Date.now() || value.expiresAt! > Date.now() + 600000 ||
      !Number.isInteger(value.pollIntervalMs) || value.pollIntervalMs! < 1000 || value.pollIntervalMs! > 30000)
      fail('REMOTE_PROTOCOL', 'Gateway pairing response does not match the bounded protocol.');
    console.log(`Open ${verification.href}\nVerify this computer: ${value.userCode}\nWaiting for authenticated owner approval…`);
    while (!controller.signal.aborted && Date.now() < value.expiresAt!) {
      await delay(value.pollIntervalMs!, undefined, { signal: controller.signal }).catch(() => {});
      if (controller.signal.aborted) break;
      const polled = await transport.post('/api/pair/poll', { pairId: value.pairId, deviceCode: value.deviceCode }, controller.signal);
      if (polled.status === 202) continue;
      const result = polled.data as { deviceId?: string; deviceToken?: string };
      if (!result.deviceId || !result.deviceToken) fail('REMOTE_PROTOCOL', 'Gateway did not provide a complete approved pairing.');
      await store.savePairing(result.deviceId, result.deviceToken);
      console.log('Computer paired with read-only permissions. Start the foreground agent with mterm-cli remote start.');
      return 0;
    }
    fail(controller.signal.aborted ? 'CANCELLED' : 'PAIRING_EXPIRED', 'Pairing did not complete; start a new one-time request explicitly.');
  } finally { release(); }
}

async function start(store: RemoteStateStore): Promise<number> {
  const config = await store.config();
  const credential = await store.credential();
  const adapter = await RemoteReadAdapter.create({ root: config.root, deviceId: credential.deviceId });
  const instanceId = randomUUID(), startedAt = new Date().toISOString();
  await store.acquire(instanceId);
  const controller = new AbortController(), release = ownSignals(controller);
  let stateWrites: Promise<void> = Promise.resolve(), lastState = '';
  let checkingStop = false;
  const stopCheck = setInterval(() => {
    if (checkingStop) return;
    checkingStop = true;
    void store.stopRequested(instanceId).then(stop => { if (stop) controller.abort(); }, () => controller.abort()).finally(() => { checkingStop = false; });
  }, 1000);
  const agent = new RemoteAgent({
    adapter,
    transport: new GatewayTransport(config.gateway, credential.token),
    onEvent: event => {
      stateWrites = stateWrites.then(() => store.runtime({ instanceId, pid: process.pid, startedAt, ...event })).catch(() => { controller.abort(); });
      if (event.state !== lastState) { process.stderr.write('MTerm remote: ' + event.state + '\n'); lastState = event.state; }
    },
  });
  try {
    const result = await agent.run(controller.signal);
    return result.reason === 'revoked' ? 2 : 0;
  } finally {
    clearInterval(stopCheck); release(); controller.abort();
    await stateWrites;
    await store.release(instanceId);
  }
}

export async function remoteMain(args: string[]): Promise<number> {
  const command = args[0];
  if (!command || command === 'help' || command === '--help') { console.log(REMOTE_HELP); return 0; }
  if (!['setup', 'pair', 'start', 'status', 'stop', 'revoke'].includes(command)) fail('USAGE', 'Unknown remote command. See remote help.');
  const opts = options(args.slice(1), command);
  if (command === 'setup') {
    if (!opts.gateway || !opts.root) fail('USAGE', 'Remote setup requires --gateway HTTPS_ORIGIN and --root ABSOLUTE_PATH.');
    const gateway = normalizeGateway(opts.gateway), root = await remoteRoot(opts.root);
    const config = { schemaVersion: 1 as const, gateway, dashboard: normalizeGateway(opts.dashboard ?? gateway), root, name: plain(opts.name ?? os.hostname()).slice(0, 80) };
    if (!config.name.trim()) fail('USAGE', 'Device name must be nonempty.');
    if (opts.apply) await (await RemoteStateStore.open(opts.state)).configure(config);
    console.log(JSON.stringify({ ...config, stateDirectory: opts.state, applied: opts.apply, paired: false, permissions: 'read-only', autostart: false, next: opts.apply ? 'mterm-cli remote pair' : 'Repeat with --apply to save this configuration.' }, null, 2));
    return 0;
  }
  const store = await RemoteStateStore.open(opts.state, false);
  if (command === 'pair') return pair(store);
  if (command === 'start') return start(store);
  if (command === 'status') {
    const status = await store.status();
    const runtime = status.runtime as { at?: string; state?: string } | null;
    const recent = !!runtime?.at && Date.now() - Date.parse(runtime.at) < 45000;
    console.log(JSON.stringify({ ...status, observedStatus: runtime && recent ? runtime.state : 'offline-or-not-observed', networkChecked: false }, null, 2));
    return 0;
  }
  if (command === 'stop') { console.log(JSON.stringify({ stopRequested: await store.requestStop(), scope: 'owned remote session only' })); return 0; }
  const config = await store.config(), credential = await store.credential();
  await new GatewayTransport(config.gateway, credential.token).post('/api/agent/revoke', { version: WIRE_VERSION, deviceId: credential.deviceId });
  await store.requestStop();
  await store.clearPairing();
  console.log('Remote pairing revoked. Local credentials removed; the owned agent will stop.');
  return 0;
}
