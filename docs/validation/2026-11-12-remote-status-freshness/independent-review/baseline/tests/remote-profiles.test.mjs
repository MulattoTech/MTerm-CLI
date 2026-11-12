// SPDX-License-Identifier: MIT
// Named remote-state selection uses only owned fixtures and synthetic credentials.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const runtimeRoot = process.env.MTERM_PROFILE_VERIFY_ROOT ?? fileURLToPath(new URL('../', import.meta.url));
const { remoteMain } = await import(pathToFileURL(path.join(runtimeRoot, 'dist/remote/cli.js')).href);
const { RemoteStateStore, defaultRemoteStateDirectory } = await import(
  pathToFileURL(path.join(runtimeRoot, 'dist/remote/state.js')).href
);
const { admitRemoteStateDirectory } = await import(
  pathToFileURL(path.join(runtimeRoot, 'dist/remote/profiles.js')).href
);

async function fixture(t) {
  const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-profiles-')));
  const stateHome = path.join(base, 'state-home'),
    root = path.join(base, 'workspace');
  await fs.mkdir(root);
  const keys = ['LOCALAPPDATA', 'XDG_STATE_HOME', 'MTERM_ENV', 'MTERM_CONFIG_PATH'];
  const old = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.LOCALAPPDATA = stateHome;
  process.env.XDG_STATE_HOME = stateHome;
  delete process.env.MTERM_ENV;
  delete process.env.MTERM_CONFIG_PATH;
  t.after(async () => {
    for (const key of keys) {
      if (old[key] === undefined) delete process.env[key];
      else process.env[key] = old[key];
    }
    await fs.rm(base, { recursive: true, force: true, maxRetries: 5 });
  });
  const messages = [];
  t.mock.method(console, 'log', (value) => messages.push(String(value)));
  t.mock.method(globalThis, 'fetch', async () => {
    throw Error('Unexpected network operation');
  });
  const run = async (args) => {
    messages.length = 0;
    assert.equal(await remoteMain(args), 0);
    return JSON.parse(messages.at(-1));
  };
  const setup = ['setup', '--gateway', 'https://gateway.test', '--root', root, '--name', 'Fixture'];
  return { base, stateHome, root, messages, run, setup };
}

test('remote default state isolates development without moving production state', async (t) => {
  const f = await fixture(t);
  const production = defaultRemoteStateDirectory();
  assert.equal(production, path.join(f.stateHome, 'MTerm-CLI', 'remote'));
  process.env.MTERM_ENV = 'development';
  assert.equal(defaultRemoteStateDirectory(), path.join(f.stateHome, 'MTerm-CLI-DEV', 'remote'));
  assert.equal(
    await fs.stat(f.stateHome).then(
      () => true,
      () => false,
    ),
    false,
  );
});

test('remote-owned dev and named-profile preview performs no mutation or network call', async (t) => {
  const f = await fixture(t);
  const report = await f.run([...f.setup, '--dev', '--profile', 'staging']);
  assert.equal(report.environment, 'development');
  assert.equal(report.profile, 'staging');
  assert.equal(report.stateDirectory, path.join(f.stateHome, 'MTerm-CLI-DEV', 'remote-profiles', 'staging'));
  assert.equal(report.applied, false);
  assert.equal(
    await fs.stat(f.stateHome).then(
      () => true,
      () => false,
    ),
    false,
  );
});

test('two named profiles configure independent directories and default remains an alias', async (t) => {
  const f = await fixture(t);
  const a = await f.run([...f.setup, '--profile', 'alpha', '--apply']);
  const b = await f.run([...f.setup, '--profile', 'beta', '--apply']);
  assert.notEqual(a.stateDirectory, b.stateDirectory);
  assert.equal(a.stateScope.environment, 'production');
  assert.equal(a.stateScope.directory, a.stateDirectory);
  const normal = await f.run(f.setup);
  const alias = await f.run([...f.setup, '--profile', 'default']);
  assert.equal(alias.stateDirectory, normal.stateDirectory);
  assert.equal(alias.stateDirectory, defaultRemoteStateDirectory());
});

test('setup next-command argv preserves an explicit shell-sensitive state path', async (t) => {
  const f = await fixture(t);
  const state = path.join(f.base, "owned state ' & literal");
  const report = await f.run([...f.setup, '--state-dir', state, '--apply']);
  assert.deepEqual(report.nextCommand, {
    executable: 'mterm-cli',
    args: ['remote', 'pair', '--environment', 'production', '--state-dir', state],
  });
  assert.equal(report.selection, 'explicit-directory');
});

test('remote root cannot expose another managed environment or profile namespace', async (t) => {
  const f = await fixture(t);
  const devState = path.join(f.stateHome, 'MTerm-CLI-DEV', 'remote');
  await fs.mkdir(devState, { recursive: true, mode: 0o700 });
  const store = await RemoteStateStore.open(path.join(f.base, 'explicit-state'));
  await assert.rejects(
    store.configure({
      schemaVersion: 1,
      gateway: 'https://gateway.test',
      root: devState,
      name: 'Fixture',
    }),
    (error) => error.code === 'STATE_IN_ROOT',
  );
});

test('overlapping setup root is rejected before creating any remote state', async (t) => {
  const f = await fixture(t);
  const state = path.join(f.root, 'state');
  await assert.rejects(
    remoteMain([...f.setup, '--state-dir', state, '--apply']),
    (error) => error.code === 'STATE_IN_ROOT',
  );
  assert.equal(
    await fs.stat(state).then(
      () => true,
      () => false,
    ),
    false,
  );
});

test('profile inventory is local, bounded and does not decrypt credentials or expose arbitrary runtime fields', async (t) => {
  const f = await fixture(t);
  const a = await f.run([...f.setup, '--profile', 'alpha', '--apply']);
  const store = await RemoteStateStore.open(a.stateDirectory);
  await store.runtime({ at: new Date().toISOString(), state: 'online', rawSecret: 'DO_NOT_DISCLOSE' });
  t.mock.method(RemoteStateStore.prototype, 'credential', async () => {
    throw Error('Inventory decrypted a credential');
  });
  const result = await f.run(['profiles', '--json']);
  assert.equal(result.networkChecked, false);
  assert.equal(result.profiles.length, 1);
  assert.equal(result.profiles[0].profile, 'alpha');
  assert.equal(result.profiles[0].runtime.rawSecret, undefined);
  assert.equal(JSON.stringify(result).includes('DO_NOT_DISCLOSE'), false);
});

test('invalid or conflicting selectors refuse before creating state', async (t) => {
  const f = await fixture(t);
  for (const name of [
    '../escape',
    'UPPER',
    'con',
    'nul',
    'lpt1',
    'a/b',
    'a\\b',
    'unicode-\u00e9',
    ' x',
    'a'.repeat(49),
  ]) {
    await assert.rejects(remoteMain([...f.setup, '--profile', name, '--apply']), (error) =>
      ['USAGE', 'REMOTE_PROFILE'].includes(error.code),
    );
  }
  await assert.rejects(
    remoteMain([...f.setup, '--profile', 'alpha', '--state-dir', f.base, '--apply']),
    (error) => error.code === 'USAGE',
  );
  assert.equal(
    await fs.stat(f.stateHome).then(
      () => true,
      () => false,
    ),
    false,
  );
});

test('profile credentials cannot be adopted by copying configuration and protected bytes', async (t) => {
  const f = await fixture(t);
  const a = await f.run([...f.setup, '--profile', 'alpha', '--apply']);
  const b = await f.run([...f.setup, '--profile', 'beta', '--apply']);
  const alpha = await RemoteStateStore.open(a.stateDirectory);
  await alpha.savePairing(randomUUID(), 'OWNED_ALPHA_TOKEN');
  for (const name of ['config.json', 'credential.json']) {
    await fs.copyFile(path.join(a.stateDirectory, name), path.join(b.stateDirectory, name));
    await fs.chmod(path.join(b.stateDirectory, name), 0o600);
  }
  await assert.rejects(
    async () => {
      const beta = await RemoteStateStore.open(b.stateDirectory);
      await beta.credential();
    },
    (error) => ['REMOTE_SCOPE', 'REMOTE_CREDENTIAL'].includes(error.code),
  );
  assert.equal((await alpha.credential()).token, 'OWNED_ALPHA_TOKEN');
});

test('an opened named store refuses a substituted managed parent before writing', async (t) => {
  const f = await fixture(t);
  const report = await f.run([...f.setup, '--profile', 'alpha', '--apply']);
  const store = await RemoteStateStore.open(report.stateDirectory);
  const collection = path.dirname(report.stateDirectory),
    retained = collection + '-retained';
  await fs.rename(collection, retained);
  await fs.mkdir(report.stateDirectory, { recursive: true, mode: 0o700 });
  await fs.copyFile(
    path.join(retained, 'alpha', 'config.json'),
    path.join(report.stateDirectory, 'config.json'),
  );
  await fs.chmod(path.join(report.stateDirectory, 'config.json'), 0o600);
  await assert.rejects(
    store.runtime({ state: 'online', at: new Date().toISOString() }),
    (error) => error.code === 'REMOTE_STATE',
  );
  assert.equal(
    await fs.stat(path.join(report.stateDirectory, 'running.json')).then(
      () => true,
      () => false,
    ),
    false,
  );
});

test('protected profile scope rejects copied credentials even when public configuration has the new scope', async (t) => {
  const f = await fixture(t);
  const a = await f.run([...f.setup, '--profile', 'alpha', '--apply']);
  const b = await f.run([...f.setup, '--profile', 'beta', '--apply']);
  const alpha = await RemoteStateStore.open(a.stateDirectory),
    deviceId = randomUUID();
  await alpha.savePairing(deviceId, 'OWNED_ALPHA_BOUND_TOKEN');
  const betaConfig = path.join(b.stateDirectory, 'config.json');
  const config = JSON.parse(await fs.readFile(betaConfig, 'utf8'));
  await fs.writeFile(betaConfig, JSON.stringify({ ...config, deviceId }), { mode: 0o600 });
  await fs.copyFile(
    path.join(a.stateDirectory, 'credential.json'),
    path.join(b.stateDirectory, 'credential.json'),
  );
  await fs.chmod(path.join(b.stateDirectory, 'credential.json'), 0o600);
  const beta = await RemoteStateStore.open(b.stateDirectory);
  await assert.rejects(beta.credential(), (error) => error.code === 'REMOTE_CREDENTIAL');
  assert.equal((await alpha.credential()).token, 'OWNED_ALPHA_BOUND_TOKEN');
});

test('development refuses legacy production config before status or stop and preserves every state byte', async (t) => {
  const f = await fixture(t),
    state = path.join(f.base, 'legacy-state');
  await f.run([...f.setup, '--state-dir', state, '--apply']);
  const legacy = await RemoteStateStore.open(state),
    instance = randomUUID();
  await legacy.savePairing(randomUUID(), 'OWNED_LEGACY_TOKEN');
  await legacy.acquire(instance);
  const before = new Map(
    await Promise.all(
      (await fs.readdir(state)).map(async (name) => [name, await fs.readFile(path.join(state, name))]),
    ),
  );
  for (const command of ['status', 'stop', 'pair', 'start', 'revoke'])
    await assert.rejects(
      remoteMain([command, '--dev', '--state-dir', state]),
      (error) => error.code === 'REMOTE_SCOPE',
    );
  assert.deepEqual((await fs.readdir(state)).sort(), [...before.keys()].sort());
  for (const [name, bytes] of before) assert.deepEqual(await fs.readFile(path.join(state, name)), bytes);
  assert.equal((await legacy.credential()).token, 'OWNED_LEGACY_TOKEN');
  await legacy.release(instance);
});

test('development-bound arbitrary state is not readable or stoppable through a production selection', async (t) => {
  const f = await fixture(t),
    state = path.join(f.base, 'development-explicit');
  const setup = await f.run([...f.setup, '--dev', '--state-dir', state, '--apply']);
  assert.equal(setup.stateScope.environment, 'development');
  const dev = await RemoteStateStore.open(state, false, 'development');
  const instance = randomUUID();
  await dev.acquire(instance);
  await assert.rejects(
    remoteMain(['stop', '--environment', 'production', '--state-dir', state]),
    (error) => error.code === 'REMOTE_SCOPE',
  );
  assert.equal(await dev.stopRequested(instance), false);
  await dev.release(instance);
});

test('explicit environment and generated argv retain their target across ambient environment changes', async (t) => {
  const f = await fixture(t);
  const report = await f.run([...f.setup, '--profile', 'alpha', '--apply']);
  process.env.MTERM_ENV = 'development';
  const args = [...report.nextCommand.args];
  args[1] = 'status';
  const observed = await f.run(args.slice(1));
  assert.equal(observed.environment, 'production');
  assert.equal(observed.stateDirectory, report.stateDirectory);
  await assert.rejects(
    remoteMain(['status', '--dev', '--state-dir', report.stateDirectory]),
    (error) => error.code === 'REMOTE_SCOPE',
  );
  await assert.rejects(remoteMain(['status', '--profile', 'alpha']));
  await assert.rejects(remoteMain(['status', '--dev', '--environment', 'production']));
});

test('linked managed collections are refused without writing through the link', async (t) => {
  const f = await fixture(t);
  const namespace = path.join(f.stateHome, 'MTerm-CLI'),
    outside = path.join(f.base, 'outside');
  await fs.mkdir(namespace, { recursive: true, mode: 0o700 });
  await fs.mkdir(outside, { mode: 0o700 });
  await fs.symlink(
    outside,
    path.join(namespace, 'remote-profiles'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  await assert.rejects(
    remoteMain([...f.setup, '--profile', 'alpha', '--apply']),
    (error) => error.code === 'REMOTE_STATE',
  );
  assert.deepEqual(await fs.readdir(outside), []);
});

test('profile inventory bounds entry count and does not guess an unknown profile', async (t) => {
  const f = await fixture(t);
  const a = await f.run([...f.setup, '--profile', 'alpha', '--apply']);
  const collection = path.dirname(a.stateDirectory);
  for (let i = 0; i < 70; i++) await fs.mkdir(path.join(collection, 'profile-' + i), { mode: 0o700 });
  const report = await f.run(['profiles', '--json']);
  assert.equal(report.truncated, true);
  assert.equal(report.profiles.length, 64);
  assert.equal(report.credentialsChecked, false);
  await assert.rejects(remoteMain(['status', '--profile', 'unconfigured']));
  assert.equal(
    await fs.stat(path.join(collection, 'unconfigured')).then(
      () => true,
      () => false,
    ),
    false,
  );
});

test('stop and revoke select one profile without changing the other profile or its owned lock', async (t) => {
  const f = await fixture(t);
  const a = await f.run([...f.setup, '--profile', 'alpha', '--apply']);
  const b = await f.run([...f.setup, '--profile', 'beta', '--apply']);
  const alpha = await RemoteStateStore.open(a.stateDirectory),
    beta = await RemoteStateStore.open(b.stateDirectory);
  const aId = randomUUID(),
    bId = randomUUID(),
    aRun = randomUUID(),
    bRun = randomUUID();
  await alpha.savePairing(aId, 'OWNED_TOKEN_ALPHA');
  await beta.savePairing(bId, 'OWNED_TOKEN_BETA');
  await alpha.acquire(aRun);
  await beta.acquire(bRun);
  const before = new Map(
    await Promise.all(
      (await fs.readdir(b.stateDirectory)).map(async (name) => [
        name,
        await fs.readFile(path.join(b.stateDirectory, name)),
      ]),
    ),
  );
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: String(url), headers: new Headers(options.headers), body: JSON.parse(options.body) });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  const stopped = await f.run(['stop', '--profile', 'alpha']);
  assert.equal(stopped.stopRequested, true);
  assert.equal(await alpha.stopRequested(aRun), true);
  assert.equal(await beta.stopRequested(bRun), false);
  await f.run(['revoke', '--profile', 'alpha']);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://gateway.test/api/agent/revoke');
  assert.equal(calls[0].headers.get('authorization'), 'Bearer OWNED_TOKEN_ALPHA');
  assert.equal(calls[0].body.deviceId, aId);
  assert.equal((await alpha.config()).deviceId, undefined);
  assert.equal((await beta.credential()).token, 'OWNED_TOKEN_BETA');
  for (const [name, bytes] of before)
    assert.deepEqual(await fs.readFile(path.join(b.stateDirectory, name)), bytes);
  assert.deepEqual((await fs.readdir(b.stateDirectory)).sort(), [...before.keys()].sort());
  await alpha.release(aRun);
  await beta.release(bRun);
});

test('pairing and actual foreground agent startup retain the selected profile and protected credential', async (t) => {
  const f = await fixture(t);
  const report = await f.run([...f.setup, '--dev', '--profile', 'alpha', '--apply']);
  const pairId = randomUUID(),
    deviceId = randomUUID(),
    token = 'OWNED_DEV_PAIR_TOKEN';
  const seen = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    seen.push({ url: String(url), headers: new Headers(options.headers), body: JSON.parse(options.body) });
    const response = String(url).endsWith('/start')
      ? {
          pairId,
          deviceCode: 'OWNED_DEVICE_CODE_AT_LEAST_24_CHARACTERS',
          userCode: 'TEST-12345',
          verificationUri: 'https://gateway.test/pair?pairId=' + pairId,
          expiresAt: Date.now() + 20000,
          pollIntervalMs: 1000,
        }
      : { deviceId, deviceToken: token };
    return new Response(JSON.stringify(response), { status: 200 });
  });
  const paired = await f.run(['pair', '--dev', '--profile', 'alpha']);
  assert.deepEqual(paired.nextCommand.args, [
    'remote',
    'start',
    '--environment',
    'development',
    '--profile',
    'alpha',
  ]);
  assert.equal(
    f.messages.some((message) => message.includes(token)),
    false,
  );
  assert.equal(seen.length, 2);
  assert.equal(
    seen.every((request) => request.headers.get('authorization') === null),
    true,
  );
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(String(url), 'https://gateway.test/api/agent/poll');
    assert.equal(new Headers(options.headers).get('authorization'), 'Bearer ' + token);
    assert.equal(JSON.parse(options.body).deviceId, deviceId);
    return new Response('{}', { status: 410 });
  });
  assert.equal(await remoteMain(paired.nextCommand.args.slice(1)), 2);
  assert.equal(
    await fs.stat(path.join(report.stateDirectory, 'run.lock')).then(
      () => true,
      () => false,
    ),
    false,
  );
  const store = await RemoteStateStore.open(report.stateDirectory, false, 'development');
  assert.equal((await store.status()).runtime.state, 'revoked');
  assert.equal(
    (await store.credential()).token,
    token,
    'revocation observation does not silently change local pairing',
  );
});

test('actual CLI status honors explicit profile/environment and ignores launcher configuration', async (t) => {
  const f = await fixture(t);
  const report = await f.run([...f.setup, '--profile', 'alpha', '--apply']);
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      ['systemroot', 'windir', 'comspec', 'path', 'pathext', 'lang'].includes(key.toLowerCase()),
    ),
  );
  Object.assign(env, {
    HOME: f.base,
    USERPROFILE: f.base,
    LOCALAPPDATA: f.stateHome,
    XDG_STATE_HOME: f.stateHome,
    MTERM_ENV: 'development',
    MTERM_CONFIG_PATH: path.join(f.base, 'unused-config.json'),
    CODEX_HOME: path.join(f.base, 'unused-codex'),
  });
  const output = await exec(
    process.execPath,
    [
      path.join(runtimeRoot, 'bin/mterm-cli.js'),
      'remote',
      'status',
      '--environment',
      'production',
      '--profile',
      'alpha',
      '--json',
    ],
    { env, cwd: f.base, timeout: 10000, maxBuffer: 16384, windowsHide: true },
  );
  const status = JSON.parse(output.stdout);
  assert.equal(status.stateDirectory, report.stateDirectory);
  assert.equal(status.environment, 'production');
  assert.equal(status.networkChecked, false);
  assert.equal(
    await fs.stat(env.MTERM_CONFIG_PATH).then(
      () => true,
      () => false,
    ),
    false,
  );
});

test('owned profile stop remains available after its exposed workspace disappears', async (t) => {
  const f = await fixture(t);
  const report = await f.run([...f.setup, '--profile', 'alpha', '--apply']);
  const store = await RemoteStateStore.open(report.stateDirectory),
    instance = randomUUID();
  await store.acquire(instance);
  await fs.rename(f.root, f.root + '-moved');
  const stopped = await f.run(['stop', '--profile', 'alpha']);
  assert.equal(stopped.stopRequested, true);
  assert.equal(await store.stopRequested(instance), true);
  await store.release(instance);
});

test('invalid runtime metadata does not turn a recorded pairing into a false unpaired claim', async (t) => {
  const f = await fixture(t);
  const report = await f.run([...f.setup, '--profile', 'alpha', '--apply']);
  const store = await RemoteStateStore.open(report.stateDirectory);
  await store.savePairing(randomUUID(), 'OWNED_TOKEN_RECORDED');
  await fs.writeFile(path.join(report.stateDirectory, 'running.json'), 'malformed {', { mode: 0o600 });
  const inventory = await f.run(['profiles', '--json']);
  assert.equal(inventory.profiles[0].paired, null);
  assert.equal(inventory.profiles[0].status, 'invalid-or-unconfigured');
  assert.ok((await store.config()).deviceId);
});

test('a user-valid profile name cannot act as a hidden collection admission probe', async (t) => {
  const f = await fixture(t);
  const report = await f.run([...f.setup, '--profile', 'alpha', '--apply']);
  await fs.writeFile(
    path.join(path.dirname(report.stateDirectory), 'inventory-probe'),
    'owned unrelated file',
  );
  const inventory = await f.run(['profiles', '--json']);
  assert.equal(inventory.profiles.length, 1);
  assert.equal(inventory.profiles[0].profile, 'alpha');
  assert.equal(inventory.invalidEntries, 1);
});

test('legacy private state remains usable under an owner-controlled readable namespace', async (t) => {
  const f = await fixture(t);
  const state = path.join(f.stateHome, 'MTerm-CLI', 'remote');
  await fs.mkdir(state, { recursive: true, mode: 0o700 });
  await fs.chmod(path.dirname(state), 0o755);
  await fs.writeFile(
    path.join(state, 'config.json'),
    JSON.stringify({ schemaVersion: 1, gateway: 'https://gateway.test', root: f.root, name: 'Legacy' }),
    { mode: 0o600 },
  );
  const store = await RemoteStateStore.open(state, false, 'production');
  assert.equal((await store.config()).stateScope, undefined);
  assert.equal((await f.run(['profiles', '--json'])).profiles[0].profile, 'default');
  if (process.platform !== 'win32') {
    await fs.chmod(path.dirname(state), 0o777);
    await assert.rejects(
      RemoteStateStore.open(state, false, 'production'),
      (error) => error.code === 'REMOTE_STATE_PERMISSIONS',
    );
    await fs.chmod(path.dirname(state), 0o755);
    await fs.chmod(state, 0o755);
    await assert.rejects(
      RemoteStateStore.open(state, false, 'production'),
      (error) => error.code === 'REMOTE_STATE_PERMISSIONS',
    );
  }
});

test('platform path aliases cannot downgrade named profile state to a legacy store', async (t) => {
  const f = await fixture(t);
  const component = process.platform === 'win32' ? 'REMOTE-PROFILES' : 'remote-profiles';
  const state = path.join(f.stateHome, 'MTerm-CLI', component, 'alpha');
  const prospective = await admitRemoteStateDirectory(state, 'production', false, true);
  assert.equal(prospective.requiresBoundScope, true);
  const created = await admitRemoteStateDirectory(state, 'production', true);
  assert.equal(created.requiresBoundScope, true);
  await fs.writeFile(
    path.join(state, 'config.json'),
    JSON.stringify({ schemaVersion: 1, gateway: 'https://gateway.test', root: f.root, name: 'Unbound' }),
    { mode: 0o600 },
  );
  await assert.rejects(
    RemoteStateStore.open(state, false, 'production'),
    (error) => error.code === 'REMOTE_SCOPE',
  );
});
