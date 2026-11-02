// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-windows-dpapi-bounds (OpenAI / GPT-6 Astra Pro; self-reported)
// Synthetic local state only; import the installed runtime and observe owned protection children.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { pathToFileURL } from 'node:url';

let phase = 'input-binding';
const verify = (condition, message) => {
  if (!condition) {
    const error = new Error(message);
    error.code = 'INSTALLED_REMOTE_STATE_ASSERTION';
    throw error;
  }
};
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const absent = async (file) =>
  fs.lstat(file).then(
    () => false,
    (error) => {
      if (error.code === 'ENOENT') return true;
      throw error;
    },
  );
const expectCode = async (operation, code) => {
  let actual;
  try {
    await operation();
  } catch (error) {
    actual = error.code;
  }
  verify(actual === code, 'Installed remote state refusal returned an unexpected code');
};

async function main() {
  const [selectedEntry, selectedPrefix, selectedEvidence, expectedVersion, selectedSnapshot] =
    process.argv.slice(2);
  for (const value of [selectedEntry, selectedPrefix, selectedEvidence, selectedSnapshot])
    verify(value && path.isAbsolute(value), 'Explicit test-owned absolute paths are required');
  const prefix = await fs.realpath(selectedPrefix);
  const entry = await fs.realpath(selectedEntry);
  const packageRoot = path.join(prefix, 'node_modules', 'mterm-cli');
  verify(entry === path.join(packageRoot, 'bin', 'mterm-cli.js'), 'Expected an installed package entry');
  verify((await fs.lstat(selectedEntry)).isFile(), 'Installed entry must be a regular file');
  const manifest = JSON.parse(await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  verify(
    manifest.name === 'mterm-cli' && manifest.version === expectedVersion,
    'Installed package identity differs',
  );
  verify(manifest.bin?.['mterm-cli'] === 'bin/mterm-cli.js', 'Installed package entry differs');
  const evidence = await fs.realpath(selectedEvidence);
  const snapshotPath = await fs.realpath(selectedSnapshot);
  verify(path.dirname(snapshotPath) === evidence, 'Public source snapshot must be verifier-owned');
  const snapshotBytes = await fs.readFile(snapshotPath);
  const snapshot = JSON.parse(snapshotBytes.toString('utf8'));
  verify(snapshot.schemaVersion === 1 && Array.isArray(snapshot.files), 'Invalid public source snapshot');
  const moduleBindings = [];
  for (const expected of snapshot.files) {
    verify(/^dist\/remote\/[a-z0-9-]+\.js$/.test(expected.path), 'Unexpected remote module path');
    const file = path.join(packageRoot, expected.path);
    verify(
      (await fs.lstat(file)).isFile() && (await fs.realpath(file)) === file,
      'Installed module must be a regular file at its expected path',
    );
    const bytes = await fs.readFile(file);
    verify(
      bytes.length === expected.bytes && sha256(bytes) === expected.sha256,
      'Installed remote module differs from the pre-pack snapshot',
    );
    moduleBindings.push({ path: expected.path, bytes: bytes.length, sha256: sha256(bytes) });
  }
  const names = (await fs.readdir(path.join(packageRoot, 'dist', 'remote')))
    .filter((p) => p.endsWith('.js'))
    .sort();
  verify(
    JSON.stringify(names.map((p) => 'dist/remote/' + p)) ===
      JSON.stringify(moduleBindings.map((p) => p.path)),
    'Installed remote module inventory differs',
  );
  verify(
    moduleBindings.some((p) => p.path === 'dist/remote/state.js'),
    'Installed remote state module missing',
  );

  const fixture = await fs.mkdtemp(path.join(evidence, 'remote-state-'));
  const root = path.join(fixture, 'root');
  const state = path.join(fixture, 'state');
  const missingSystemRoot = path.join(fixture, 'missing-system-root');
  const originalSystemRoot = process.env.SystemRoot;
  const originalSpawn = childProcess.spawn;
  const observed = [];
  let expectedBinary;
  const restoreSystemRoot = () => {
    if (originalSystemRoot === undefined) delete process.env.SystemRoot;
    else process.env.SystemRoot = originalSystemRoot;
  };
  const selectPhase = (name, missing = false) => {
    phase = name;
    if (missing) process.env.SystemRoot = missingSystemRoot;
    else restoreSystemRoot();
    expectedBinary = path.join(
      process.env.SystemRoot ?? 'C:\\Windows',
      'System32',
      'WindowsPowerShell',
      'v1.0',
      'powershell.exe',
    );
  };
  const awaitClose = async (record) => {
    let timer;
    try {
      await Promise.race([
        record.closed,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Owned protection child did not close')), 5000);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  };
  const verifyPhaseChild = async (spawned) => {
    if (process.platform !== 'win32') return;
    const records = observed.filter((r) => r.proof.phase === phase);
    verify(records.length === 1, 'Expected exactly one protection attempt in this phase');
    const record = records[0];
    record.proof.closedWhenOperationSettled = record.proof.closeObserved;
    if (spawned) verify(record.proof.closeObserved, 'Protection operation settled before its child closed');
    await awaitClose(record);
    verify(record.proof.spawnObserved === spawned, 'Protection spawn observation differs');
    if (spawned)
      verify(
        Number.isInteger(record.proof.pid) &&
          record.proof.pid > 0 &&
          record.proof.exitObserved &&
          record.proof.exitCode === 0 &&
          record.proof.closeCode === 0,
        'Successful protection child exit was not observed',
      );
    else
      verify(
        record.proof.pid === null && record.proof.errorCode === 'ENOENT' && !record.proof.exitObserved,
        'Missing executable did not fail before process creation',
      );
  };
  childProcess.spawn = (...args) => {
    verify(
      process.platform === 'win32' && args[0] === expectedBinary,
      'Unexpected child process in synthetic state verifier',
    );
    const child = originalSpawn(...args);
    const proof = {
      phase,
      pid: child.pid ?? null,
      spawnObserved: false,
      exitObserved: false,
      exitCode: null,
      closeObserved: false,
      closeCode: null,
      errorCode: null,
    };
    let close;
    const closed = new Promise((resolve) => {
      close = resolve;
    });
    observed.push({ child, proof, closed });
    child.once('spawn', () => {
      proof.spawnObserved = true;
    });
    child.once('error', (error) => {
      proof.errorCode = error.code === 'ENOENT' ? 'ENOENT' : 'other';
    });
    child.once('exit', (code) => {
      proof.exitObserved = true;
      proof.exitCode = code;
    });
    child.once('close', (code) => {
      proof.closeObserved = true;
      proof.closeCode = code;
      close();
    });
    return child;
  };
  syncBuiltinESMExports();
  const windows = process.platform === 'win32';
  try {
    const { RemoteStateStore } = await import(
      pathToFileURL(path.join(packageRoot, 'dist', 'remote', 'state.js')).href
    );
    await fs.mkdir(root);
    const store = await RemoteStateStore.open(state);
    await store.configure({
      schemaVersion: 1,
      gateway: 'https://gateway.test',
      root,
      name: 'Installed synthetic fixture',
    });
    const configPath = path.join(state, 'config.json');
    const credentialPath = path.join(state, 'credential.json');
    const initialConfig = await fs.readFile(configPath);
    const deviceId = randomUUID();
    const token = 'MTERM_INSTALLED_SYNTHETIC_TOKEN_' + randomUUID();
    const verifyStateFiles = async (names) =>
      verify(
        JSON.stringify((await fs.readdir(state)).sort()) === JSON.stringify(names),
        'Unexpected state lock or staging residue',
      );

    if (windows) {
      selectPhase('protect-spawn-failure', true);
      await expectCode(() => store.savePairing(deviceId, token), 'REMOTE_SECRET_STORAGE');
      await verifyPhaseChild(false);
      verify(
        (await fs.readFile(configPath)).equals(initialConfig) && (await absent(credentialPath)),
        'Protection refusal changed unpaired state',
      );
      await verifyStateFiles(['config.json']);
    }
    selectPhase('protect-roundtrip');
    await store.savePairing(deviceId, token);
    await verifyPhaseChild(true);
    selectPhase('unprotect-roundtrip');
    const credential = await store.credential();
    await verifyPhaseChild(true);
    verify(
      credential.deviceId === deviceId && credential.token === token,
      'Synthetic credential roundtrip differs',
    );
    const pairedConfig = await fs.readFile(configPath);
    const protectedBytes = await fs.readFile(credentialPath);
    verify(!pairedConfig.includes(token), 'Public configuration exposed the synthetic token');
    if (windows) verify(!protectedBytes.includes(token), 'Windows credential was not protected');
    else
      verify(((await fs.stat(credentialPath)).mode & 0o777) === 0o600, 'POSIX credential permissions differ');
    await verifyStateFiles(['config.json', 'credential.json']);
    if (windows) {
      selectPhase('unprotect-spawn-failure', true);
      await expectCode(() => store.credential(), 'REMOTE_CREDENTIAL');
      await verifyPhaseChild(false);
      verify(
        (await fs.readFile(configPath)).equals(pairedConfig) &&
          (await fs.readFile(credentialPath)).equals(protectedBytes),
        'Unprotect refusal changed paired state',
      );
      await verifyStateFiles(['config.json', 'credential.json']);
    }
    selectPhase('clear-pairing');
    await store.clearPairing();
    await expectCode(() => store.credential(), 'REMOTE_UNPAIRED');
    verify(
      (await fs.readFile(configPath)).equals(initialConfig),
      'Clearing synthetic pairing changed public configuration',
    );
    await verifyStateFiles(['config.json']);
    verify(observed.length === (windows ? 4 : 0), 'Unexpected protection attempt count');
  } finally {
    restoreSystemRoot();
    childProcess.spawn = originalSpawn;
    syncBuiltinESMExports();
    const cleanup = await Promise.allSettled(
      observed.map(async (record) => {
        if (!record.proof.closeObserved) {
          if (record.proof.spawnObserved && !record.proof.exitObserved) record.child.kill();
          await awaitClose(record);
        }
        verify(
          !record.proof.spawnObserved || record.proof.exitObserved,
          'Owned protection process exit unconfirmed',
        );
      }),
    );
    await fs.rm(fixture, { recursive: true, force: true });
    verify(
      cleanup.every((r) => r.status === 'fulfilled'),
      'Owned protection child cleanup was not confirmed',
    );
  }
  verify(await absent(fixture), 'Synthetic state fixture cleanup was not confirmed');
  phase = 'complete';
  return {
    ok: true,
    packageVersion: manifest.version,
    installedModule: path.join(packageRoot, 'dist', 'remote', 'state.js'),
    sourceSnapshotSHA256: sha256(snapshotBytes),
    moduleBindings,
    syntheticOnly: true,
    actualRemoteEnrollment: false,
    realUserStateAccessed: false,
    windowsDpapiExercised: windows,
    protectionFailurePreservesState: windows ? true : null,
    unprotectFailurePreservesState: windows ? true : null,
    platform: process.platform,
    protection: windows ? 'windows-dpapi-current-user' : 'posix-0600',
    syntheticCredentialRoundtrip: true,
    spawnedProtectionChildren: windows ? observed.filter((r) => r.proof.spawnObserved).length : null,
    ownedProcessExitsVerified: windows ? true : null,
    childObservations: observed.map((r) => r.proof),
    fixtureCleanupVerified: true,
    modelCalls: 0,
  };
}

try {
  console.log(JSON.stringify(await main(), null, 2));
} catch (error) {
  // Assertion messages are fixed labels; unexpected exceptions never dump credential-bearing values.
  const message =
    error.code === 'INSTALLED_REMOTE_STATE_ASSERTION'
      ? error.message
      : 'Unexpected installed remote state verification failure';
  console.error(JSON.stringify({ ok: false, phase, message }));
  process.exitCode = 1;
}
