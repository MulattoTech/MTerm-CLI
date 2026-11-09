// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-staging-recovery (OpenAI / GPT-6 Astra Pro; self-reported)
// Real WebCrypto and independent envelope construction; controlled I/O/time in the
// VM cases, plus actual owned Node/Git/pipe lifecycle cases. No live API or agent.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, webcrypto } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { spawn, spawnSync } from 'node:child_process';
import * as vm from 'node:vm';
import { createGateway } from '../gateway/app.mjs';
import { MTermRegistry } from '../gateway/registry.mjs';
import { verifyAccess, sha256, randomToken } from '../gateway/security.mjs';

const REPO = fileURLToPath(new URL('../', import.meta.url));
const CHILD = '--controlled-recovery-fixture';
const ACCOUNT = '9e18ebcb3c1a920c9ef58a3d61b8d6b6';
const LOCAL = 'c1'.repeat(20);
const DEPLOYED = 'd2'.repeat(20);
const ORIGINS = ['https://mcp-staging.m-techlabs.com', 'https://mterm-staging.m-techlabs.com'];
const PROBE = {
  client_id: 'mterm_public_probe.access',
  client_secret: 'MTERM_PUBLIC_PROBE_ONLY_NO_CREDENTIAL',
};
const SYNTHETIC = {
  client_id: 'fixture_service_client.access',
  client_secret: 'SYNTHETIC_HANDOFF_SECRET_NEVER_REAL_9pV4',
};
const PRIVATE_ERROR = 'UNTRUSTED_RUNTIME_SECRET_DO_NOT_RETURN';
const TOKEN = 'f174e90a-fafe-4643-bbbc-4a0ed4fc8415';
const VERSION = 'a174e90a-fafe-4643-bbbc-4a0ed4fc8415';
const FIXED_NOW = Date.parse('2026-11-09T15:00:00.000Z');
const hash = (s) => createHash('sha256').update(s).digest('hex');
const bytes = (s) => new TextEncoder().encode(s);
const b64 = (s) => Buffer.from(s).toString('base64url');
const from64 = (s) => new Uint8Array(Buffer.from(s, 'base64url'));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const STAGING = {
  issuer: 'https://broken-breeze-d0bb.cloudflareaccess.com',
  audience: '9533396534dbc90c78bae02791ecdd0fab21f775876ed7164ed3b57bf54e1563',
  registryNamespaceId: 'b66edc2d536e474093e1a18d0e88a24d',
  registryClassName: 'MTermRegistry',
};
const CREATION_NONCE = 'ca'.repeat(16);
const OWNERSHIP = {
  tokenId: TOKEN,
  tokenName: 'mterm-staging-handoff-' + CREATION_NONCE,
  creationRunNonce: CREATION_NONCE,
  originalCreatedAt: new Date(FIXED_NOW - 3600000).toISOString(),
  originalExpiresAt: new Date(FIXED_NOW - 1800000).toISOString(),
  staging: STAGING,
};
const cleartextMarkers = [
  SYNTHETIC.client_id,
  SYNTHETIC.client_secret,
  PRIVATE_ERROR,
  hash(SYNTHETIC.client_id),
  hash(SYNTHETIC.client_secret),
  hash(SYNTHETIC.client_id + '\n' + SYNTHETIC.client_secret),
  hash(STAGING.issuer + '\nservice:' + SYNTHETIC.client_id),
];
const LEAK = (v) => cleartextMarkers.some((s) => JSON.stringify(v).includes(s));
const PUBLIC = ORIGINS[0],
  DASHBOARD = ORIGINS[1];
function cleanupReceipt(overrides = {}) {
  return {
    type: 'mterm-staging-handoff-cleanup-child',
    result: 'passed',
    expectedSourceCommit: DEPLOYED,
    buildIdentity: {
      initial: { edge: DEPLOYED, registry: DEPLOYED },
      final: { edge: DEPLOYED, registry: DEPLOYED },
    },
    identityVerified: true,
    initialInventory: { devices: 2, grants: 1 },
    revoke: { attempted: true, acknowledged: true },
    finalInventoryEmpty: true,
    cleanup: 'remote-revocation-confirmed',
    code: null,
    liveAcceptance: false,
    ...overrides,
  };
}

function header(challenge, extra = {}) {
  return {
    protocol: challenge.protocol,
    purpose: challenge.purpose,
    mode: challenge.mode,
    alg: 'RSA-OAEP-256',
    enc: 'A256GCM',
    runNonce: challenge.runNonce,
    recipientKeySha256: challenge.recipientKeySha256,
    expiresAt: challenge.expiresAt,
    accountId: challenge.accountId,
    origins: challenge.origins,
    localSourceCommit: challenge.localSourceCommit,
    localBundleSha256: challenge.localBundleSha256,
    receiverSha256: challenge.receiverSha256,
    sealerSha256: challenge.sealerSha256,
    harnessSha256: challenge.harnessSha256,
    expectedDeployedSourceCommit: challenge.expectedDeployedSourceCommit,
    ownership: challenge.ownership,
    renewal: challenge.renewal,
    providerObservedAt: FIXED_NOW,
    tokenExpiresAt: FIXED_NOW + 1800000,
    renewed: false,
    rotated: true,
    ...extra,
  };
}

async function independentEnvelope(challenge, scenario = {}) {
  const protectedHeader = header(challenge, scenario.header ?? {});
  let encoded = b64(bytes(JSON.stringify(protectedHeader)));
  if (scenario.headerWhitespace) encoded = b64(bytes(' ' + JSON.stringify(protectedHeader)));
  if (scenario.duplicateHeader)
    encoded = b64(bytes(JSON.stringify(protectedHeader).replace('{', '{"mode":"smoke",')));
  const key = webcrypto.getRandomValues(new Uint8Array(scenario.shortAes ? 16 : 32));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  let publicKey = await webcrypto.subtle.importKey(
    'spki',
    from64(challenge.publicKey),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
  if (scenario.wrongKey) {
    publicKey = (
      await webcrypto.subtle.generateKey(
        { name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
        false,
        ['encrypt', 'decrypt'],
      )
    ).publicKey;
  }
  const encryptedKey = await webcrypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, key);
  const aes = await webcrypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
  key.fill(0);
  const plaintext = scenario.plaintext ?? JSON.stringify(SYNTHETIC);
  const ciphertext = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: bytes(encoded), tagLength: 128 },
    aes,
    bytes(plaintext),
  );
  const frame = {
    protected: encoded,
    encryptedKey: b64(encryptedKey),
    iv: b64(iv),
    ciphertext: b64(ciphertext),
  };
  if (scenario.tamper) {
    const changed = from64(frame[scenario.tamper]);
    changed[changed.length - 1] ^= 1;
    frame[scenario.tamper] = b64(changed);
  }
  if (scenario.frameExtra) frame.url = 'https://untrusted.invalid/';
  if (scenario.badEncoding) frame.iv += '=';
  if (scenario.shortIv) frame.iv = b64(new Uint8Array(8));
  if (scenario.shortKey) frame.encryptedKey = b64(new Uint8Array(256));
  if (scenario.shortCiphertext) frame.ciphertext = b64(new Uint8Array(15));
  let result = JSON.stringify(frame);
  if (scenario.outerWhitespace) result = ' ' + result;
  if (scenario.duplicateOuter) result = result.replace('{', '{"iv":"AA",');
  if (scenario.invalidJson) result = '{';
  if (scenario.oversized) result = 'x'.repeat(16385);
  return result;
}

async function unitFixture(scenario) {
  const receiverSource = await fs.readFile(path.join(REPO, 'scripts/staging-handoff.mjs'), 'utf8');
  const sealerSource = await fs.readFile(path.join(REPO, 'scripts/staging-handoff-seal.mjs'), 'utf8');
  const harnessSource = await fs.readFile(path.join(REPO, 'scripts/verify-remote-staging.mjs'), 'utf8');
  const files = new Map([
    ['scripts/staging-handoff.mjs', receiverSource],
    ['scripts/staging-handoff-seal.mjs', sealerSource],
    ['scripts/verify-remote-staging.mjs', harnessSource],
    ['package.json', '{"type":"module"}\n'],
    ['package-lock.json', '{}\n'],
    ['tsconfig.json', '{}\n'],
    ['src/remote/protocol.ts', '// controlled source\n'],
    ['dist/remote/protocol.js', '// controlled build, never executed\n'],
    ['node_modules/@modelcontextprotocol/client/package.json', '{"version":"2.3.0"}\n'],
  ]);
  let bundle = hash(
    [...files]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([p, s]) => p + '\0' + hash(s) + '\n')
      .join(''),
  );
  const tracked = [...files].filter(
    ([name]) => !name.startsWith('dist/') && !name.startsWith('node_modules/'),
  );
  const tree = tracked
    .map(
      ([name, value]) =>
        '100644 blob ' +
        createHash('sha1')
          .update('blob ' + Buffer.byteLength(value) + '\0')
          .update(value)
          .digest('hex') +
        '\t' +
        name +
        '\0',
    )
    .join('');
  if (scenario.dirty) {
    files.set('package.json', '{"type":"module","changed":true}\n');
    // Caller selects these bytes, but the immutable Git source identity still differs.
    bundle = hash(
      [...files]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([name, value]) => name + '\0' + hash(value) + '\n')
        .join(''),
    );
  }
  let mono = 0,
    wall = FIXED_NOW,
    stdout = '',
    networkCalls = 0,
    childCount = 0,
    childInputMatches = false;
  let childOptions,
    childArgs,
    challenge,
    result,
    phase = 'setup',
    usedPrivateKeyNonextractable = false;
  let timingBarrierHits = 0;
  let decryptCalls = 0,
    nativeDigestCalls = 0,
    sourceChecks = 0,
    killCalls = 0,
    childClosed = false;
  let frameTask,
    sourceDrifted = false,
    lateDuplicateRejected = false;
  let ownedPendingChild,
    pendingFinalReached = false,
    pendingFinalResolve,
    settledBeforeFixtureCleanup;
  const pendingFinal = new Promise((resolve) => {
    pendingFinalResolve = resolve;
  });
  const timers = new Set();
  const timerBudgets = [];
  const input = new PassThrough();
  input.on('error', () => {});
  const vpath = path.posix;
  const virtualRoot = '/virtual/repo';
  const sourceName = (p) => (String(p) === virtualRoot ? '' : String(p).replace(virtualRoot + '/', ''));
  const advance = (where) => {
    if (
      !timingBarrierHits &&
      (scenario.advanceAt === where ||
        (scenario.advanceAt === 'pre-pipe-source' && where === 'source' && childCount > 0))
    ) {
      timingBarrierHits++;
      mono = scenario.advanceBy;
      wall = FIXED_NOW + mono - (scenario.rollbackMs ?? 0);
    }
    if (
      scenario.expireAt === where ||
      (scenario.expireAt === 'post-decrypt-source' && where === 'source' && decryptCalls === 2)
    ) {
      mono = 120000 + (scenario.offset ?? 0);
      wall = FIXED_NOW + mono;
    }
    if (scenario.rollbackAt === where) {
      mono = 120000;
      wall = FIXED_NOW - 300000;
    }
    if (scenario.driftAt === where && !sourceDrifted) {
      files.set('dist/remote/protocol.js', '// changed build\n');
      sourceDrifted = true;
    }
  };
  const subtle = {};
  for (const method of ['generateKey', 'exportKey', 'importKey', 'digest', 'encrypt', 'decrypt']) {
    subtle[method] = async (...args) => {
      const value = await webcrypto.subtle[method](...args);
      let where = method;
      if (method === 'generateKey' && args[0].name === 'RSA-OAEP')
        usedPrivateKeyNonextractable = value.privateKey.extractable === false;
      if (method === 'digest') nativeDigestCalls++;
      if (method === 'decrypt') {
        decryptCalls++;
        where = args[0].name === 'RSA-OAEP' ? 'unwrap' : 'decrypt';
      }
      advance(where);
      if (scenario.lateDuplicate && where === 'unwrap') {
        await new Promise((resolve) =>
          input.write('{}\n', (error) => {
            lateDuplicateRejected = Boolean(error);
            resolve();
          }),
        );
      }
      return value;
    };
  }
  class FixtureDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [wall]));
    }
    static now() {
      return wall;
    }
  }
  const fakeFs = {
    async lstat(p) {
      const name = sourceName(p);
      const file = files.get(name);
      const dir = name === '' || [...files.keys()].some((s) => s.startsWith(name + '/'));
      if (file === undefined && !dir) throw new Error(PRIVATE_ERROR);
      return {
        isFile: () => file !== undefined,
        isDirectory: () => dir,
        isSymbolicLink: () => scenario.symlink && name === 'dist/remote/protocol.js',
        size: file === undefined ? 0 : Buffer.byteLength(file),
      };
    },
    async realpath(p) {
      return String(p);
    },
    async readFile(p) {
      const name = sourceName(p);
      assert.ok(files.has(name), 'virtual read has an explicit fixture file');
      if (name === 'scripts/staging-handoff.mjs') {
        sourceChecks++;
        advance('source');
      }
      return Buffer.from(files.get(name));
    },
    async readdir(p, options) {
      const dir = sourceName(p);
      const names = new Set(
        [...files.keys()]
          .filter((s) => s.startsWith(dir + '/'))
          .map((s) => s.slice(dir.length + 1).split('/')[0]),
      );
      return [...names].map((name) =>
        options?.withFileTypes
          ? {
              name,
              isSymbolicLink: () => false,
              isFile: () => files.has(dir + '/' + name),
              isDirectory: () => !files.has(dir + '/' + name),
            }
          : name,
      );
    },
  };
  const fakeExecFile = (_file, args, _options, callback) => {
    queueMicrotask(() =>
      callback(
        null,
        args.includes('rev-parse')
          ? (scenario.wrongHead ? DEPLOYED : LOCAL) + '\n'
          : args.includes('ls-tree')
            ? tree
            : '',
        '',
      ),
    );
    return { kill() {}, unref() {} };
  };
  const fakeSpawn = (executable, args, options) => {
    childCount++;
    childArgs = [executable, ...args];
    childOptions = options;
    assert.equal(executable, '/trusted/node');
    assert.equal(options.shell, false);
    assert.deepEqual(Array.from(options.stdio), ['pipe', 'pipe', 'pipe']);
    if (scenario.child === 'spawn-throw') throw new Error(PRIVATE_ERROR);
    phase = 'child';
    const child = new EventEmitter();
    child.pid = 4242;
    child.exitCode = null;
    child.signalCode = null;
    child.stdin =
      scenario.child === 'pending-write-kill-false'
        ? new Writable({
            write(chunk, _encoding, callback) {
              childInputMatches = String(chunk) === JSON.stringify(SYNTHETIC) + '\n';
              callback();
            },
            final() {
              pendingFinalReached = true;
              pendingFinalResolve();
            },
          })
        : new PassThrough();
    if (scenario.child === 'pending-write-kill-false') ownedPendingChild = child;
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.unref = () => {};
    let supplied = '',
      closing = false;
    const close = (code = 0, signal = null) => {
      if (closing) return;
      closing = true;
      child.exitCode = code;
      child.signalCode = signal;
      child.emit('exit', code, signal);
      // 'exit' is not stdio closure. Late output must still affect the verdict.
      setTimeout(() => {
        if (scenario.child === 'late-output-before-close') child.stdout.write(PRIVATE_ERROR + '\n');
        childClosed = true;
        child.stdin.destroy();
        child.stdout.end();
        child.stderr.end();
        child.emit('close', code, signal);
      }, 15);
    };
    child.kill = () => {
      killCalls++;
      if (scenario.child === 'pending-write-kill-false') return false;
      close(null, 'SIGKILL');
      return true;
    };
    child.stdin.on('data', (chunk) => {
      supplied += chunk;
    });
    child.stdin.on('finish', () => {
      childInputMatches = supplied === JSON.stringify(SYNTHETIC) + '\n';
      if (scenario.child === 'hang') return;
      if (scenario.child === 'stderr') child.stderr.write(PRIVATE_ERROR);
      if (scenario.child === 'leak') child.stdout.write(PRIVATE_ERROR + '\n');
      if (scenario.child === 'overflow') child.stdout.write('x'.repeat(65537));
      if (scenario.child === 'cleanup-input-required') child.stdout.write('INPUT_REQUIRED\n');
      if (scenario.child === 'bad-summary')
        child.stdout.write('{"result":"passed","client_secret":"' + PRIVATE_ERROR + '"}\n');
      else if (scenario.mode === 'smoke-owned')
        child.stdout.write(
          JSON.stringify({
            result: scenario.child === 'failed' ? 'failed' : 'passed',
            reportPath:
              virtualRoot + '/artifacts/remote-staging-smoke/2026-11-09T15-00-00-000Z-' + TOKEN + '.json',
            realWindowsReadViaDeployedGatewayAndSdk: true,
            passedChecks: 12,
            humanLoginVerified: false,
            chatgptConnectorVerified: false,
          }) + '\n',
        );
      else child.stdout.write(JSON.stringify(cleanupReceipt(scenario.cleanupReceipt ?? {})) + '\n');
      setImmediate(() => close(scenario.child === 'failed' ? 1 : 0));
    });
    setImmediate(() => {
      advance('spawn');
      child.emit('spawn');
      if (scenario.child === 'early-exit') close(1);
      if (scenario.child === 'stdin-error') child.stdin.destroy(new Error(PRIVATE_ERROR));
    });
    return child;
  };
  const fakeProcess = {
    argv: ['/trusted/node'],
    execArgv: scenario.preload ? ['--import=bad'] : [],
    execPath: '/trusted/node',
    platform: 'win32',
    versions: { node: '24.22.1' },
    env: {
      PATH: '/trusted',
      SystemRoot: 'C:\\Windows',
      TEMP: 'C:\\Temp',
      MTERM_STAGING_HANDOFF_MODE: scenario.mode ?? 'cleanup',
      MTERM_STAGING_OWNED_TOKEN_JSON: JSON.stringify({
        ownership: scenario.ownership ?? OWNERSHIP,
        renewal: scenario.renewal ?? 'none',
      }),
      MTERM_STAGING_LOCAL_SOURCE_COMMIT: LOCAL,
      MTERM_STAGING_EXPECTED_SOURCE_COMMIT: DEPLOYED,
      MTERM_STAGING_HANDOFF_BUNDLE_SHA256: bundle,
      SECRET_PARENT_ENV: PRIVATE_ERROR,
      ...(scenario.env ?? {}),
    },
    stdin: input,
    stdout: {
      write(value) {
        stdout += String(value);
        for (const line of String(value).trim().split('\n')) {
          let parsed;
          try {
            parsed = JSON.parse(line);
          } catch {
            continue;
          }
          if (parsed.type === 'mterm-staging-handoff-challenge') {
            challenge = parsed;
            phase = 'input';
            if (scenario.inputTimeout) continue;
            frameTask = independentEnvelope(challenge, scenario).then((frame) => {
              if (scenario.eof) input.end();
              else
                input.write(
                  frame + (scenario.truncated ? '' : '\n') + (scenario.secondFrame ? frame + '\n' : ''),
                );
              if (scenario.truncated) input.end();
            });
          }
        }
        return true;
      },
    },
    stderr: {
      write() {
        throw new Error('receiver must not write raw stderr');
      },
    },
    exitCode: undefined,
  };
  const clockSet = (fn, ms) => {
    timerBudgets.push(ms);
    const short =
      (phase === 'input' && scenario.inputTimeout) ||
      (phase === 'child' && scenario.child === 'hang') ||
      (phase === 'child' && scenario.child === 'pending-write-kill-false' && [450000, 5000].includes(ms));
    const timer = setTimeout(
      () => {
        timers.delete(timer);
        fn();
      },
      short ? 10 : ms,
    );
    timers.add(timer);
    return timer;
  };
  const clockClear = (timer) => {
    clearTimeout(timer);
    timers.delete(timer);
  };
  const context = vm.createContext({
    Buffer,
    TextEncoder,
    TextDecoder,
    URL,
    Headers,
    Response,
    AbortSignal,
    AbortController,
    Date: FixtureDate,
    crypto: { subtle, getRandomValues: (v) => webcrypto.getRandomValues(v) },
    performance: { now: () => mono },
    process: fakeProcess,
    setTimeout: clockSet,
    clearTimeout: clockClear,
    setImmediate,
    clearImmediate,
    fetch() {
      networkCalls++;
      throw new Error('network tripwire');
    },
    btoa,
    atob,
    console: {
      log() {
        throw new Error('raw console output');
      },
    },
  });
  const modules = {
    'node:fs/promises': { default: fakeFs },
    'node:path': { default: vpath },
    'node:url': { fileURLToPath: (value) => new URL(value).pathname },
    'node:crypto': {
      createHash,
      webcrypto: context.crypto,
      randomBytes: (n) =>
        scenario.equalNonce
          ? Buffer.from(CREATION_NONCE, 'hex')
          : Buffer.from(webcrypto.getRandomValues(new Uint8Array(n))),
    },
    'node:child_process': { spawn: fakeSpawn, execFile: fakeExecFile },
    'node:perf_hooks': { performance: context.performance },
  };
  const module = new vm.SourceTextModule(receiverSource, {
    context,
    identifier: 'file:///virtual/repo/scripts/staging-handoff.mjs',
    initializeImportMeta(meta) {
      meta.url = 'file:///virtual/repo/scripts/staging-handoff.mjs';
    },
  });
  await module.link(async (specifier) => {
    assert.ok(modules[specifier], 'receiver imports only declared fixed builtins');
    const value = modules[specifier];
    return new vm.SyntheticModule(
      Object.keys(value),
      function () {
        for (const [k, v] of Object.entries(value)) this.setExport(k, v);
      },
      { context },
    );
  });
  await module.evaluate();
  try {
    const running = module.namespace.runReceiver();
    const concurrent = scenario.concurrent ? await module.namespace.runReceiver() : undefined;
    if (scenario.child === 'pending-write-kill-false') {
      await Promise.race([pendingFinal, running]);
      let observer;
      try {
        settledBeforeFixtureCleanup =
          pendingFinalReached &&
          (await Promise.race([
            running.then(() => true),
            new Promise((resolve) => {
              observer = setTimeout(() => resolve(false), 80);
            }),
          ]));
      } finally {
        clearTimeout(observer);
        // Only the fixture intervenes after the observation, to release old source
        // without an orphaned test. Corrected source already destroys this pipe.
        ownedPendingChild?.stdin.destroy();
      }
    }
    result = await running;
    if (frameTask) await frameTask;
    const replay = scenario.replay ? await module.namespace.runReceiver() : concurrent;
    return {
      result,
      replay,
      lateDuplicateRejected,
      pendingFinalReached,
      settledBeforeFixtureCleanup,
      pendingPipeDestroyed: ownedPendingChild?.stdin.destroyed,
      challenge,
      timingBarrierHits,
      childCount,
      childInputMatches,
      childArgs,
      childEnvKeys: childOptions ? Object.keys(childOptions.env) : [],
      childEnvContainsPlaintext: childOptions
        ? [
            PROBE.client_id,
            PROBE.client_secret,
            SYNTHETIC.client_id,
            SYNTHETIC.client_secret,
            PRIVATE_ERROR,
          ].some((v) => Object.values(childOptions.env).some((e) => String(e).includes(v)))
        : false,
      plaintextInOutput:
        LEAK([stdout, result]) ||
        (stdout + JSON.stringify(result)).includes(SYNTHETIC.client_id) ||
        (stdout + JSON.stringify(result)).includes(PROBE.client_id) ||
        (stdout + JSON.stringify(result)).includes(SYNTHETIC.client_secret) ||
        (stdout + JSON.stringify(result)).includes(PROBE.client_secret) ||
        (stdout + JSON.stringify(result)).includes(PRIVATE_ERROR),
      privateKeyNonextractable: usedPrivateKeyNonextractable,
      decryptCalls,
      nativeDigestCalls,
      sourceChecks,
      networkCalls,
      inputDestroyed: input.destroyed,
      killCalls,
      childClosed,
      timerBudgets,
      timersLeft: timers.size,
    };
  } finally {
    for (const timer of timers) clearTimeout(timer);
    input.destroy();
  }
}

// The sender runs with web globals only. API responses are synthetic; the
// cryptography and independently constructed/decrypted envelopes are real.
async function senderFixture(scenario, bootstrap = false) {
  const source = await fs.readFile(path.join(REPO, 'scripts/staging-handoff-seal.mjs'), 'utf8');
  const pair = bootstrap
    ? null
    : await webcrypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 3072,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        false,
        ['encrypt', 'decrypt'],
      );
  const spki = pair ? new Uint8Array(await webcrypto.subtle.exportKey('spki', pair.publicKey)) : null;
  let wall = FIXED_NOW,
    mono = 0,
    created = false,
    renewed = false,
    rotated = false;
  let contextRound = 0,
    timingBarrierHits = 0,
    networkCalls = 0;
  const calls = [],
    phases = [],
    cryptoCalls = [],
    returnedObjects = [];
  const nonce = Object.hasOwn(scenario, 'nonce') ? scenario.nonce : CREATION_NONCE;
  const name = bootstrap ? 'mterm-staging-handoff-' + nonce : OWNERSHIP.tokenName;
  const rotatedCredentials = { ...SYNTHETIC, client_secret: 'SYNTHETIC_ROTATED_SECRET_NEVER_REAL_3xQ8' };
  const base = '/accounts/' + ACCOUNT + '/access/service_tokens';
  const worker = '/accounts/' + ACCOUNT + '/workers/scripts/mterm-gateway-staging';
  const advance = (phase) => {
    if (!timingBarrierHits && scenario.advanceAt === phase) {
      timingBarrierHits++;
      mono = scenario.advanceBy ?? (bootstrap ? 30000 : 120000);
      wall = FIXED_NOW + mono - (scenario.rollbackMs ?? 0);
    }
  };
  const bindings = (surface) => {
    const values = [
      ['ACCESS_ISSUER', STAGING.issuer],
      ['ACCESS_AUDIENCE', STAGING.audience],
      ['BUILD_SHA', DEPLOYED],
      ['ENVIRONMENT', 'staging'],
      ['MCP_ENABLED', 'true'],
      ['PUBLIC_ORIGIN', PUBLIC],
      ['DASHBOARD_ORIGIN', DASHBOARD],
      ['STAGING_SERVICE_ID', SYNTHETIC.client_id],
    ].map(([name, text]) => ({ name, type: 'plain_text', text }));
    values.push({
      name: 'REGISTRY',
      type: 'durable_object_namespace',
      namespace_id: STAGING.registryNamespaceId,
      class_name: STAGING.registryClassName,
    });
    const mutate =
      scenario.binding &&
      (scenario.bindingRound ?? 1) === contextRound &&
      (!scenario.bindingSurface || scenario.bindingSurface === surface);
    if (mutate) {
      const at = values.findIndex((v) => v.name === scenario.binding);
      if (scenario.bindingAction === 'missing') values.splice(at, 1);
      else if (scenario.bindingAction === 'duplicate') values.push({ ...values[at] });
      else Object.assign(values[at], scenario.bindingChange ?? { text: PRIVATE_ERROR });
    }
    return values;
  };
  const api = {
    async request(request) {
      calls.push(JSON.parse(JSON.stringify(request)));
      let phase, result;
      if (request.method === 'GET' && request.path === worker + '/settings') {
        contextRound++;
        phase = 'settings-' + contextRound;
        result = { bindings: bindings('settings') };
      } else if (request.method === 'GET' && request.path === worker + '/deployments') {
        phase = 'deployments-' + contextRound;
        result = {
          deployments: [
            {
              strategy: scenario.deploymentStrategy ?? 'percentage',
              versions: [{ version_id: VERSION, percentage: 100 }],
            },
          ],
        };
        if (scenario.omitDeploymentStrategy) delete result.deployments[0].strategy;
        if (scenario.splitDeployment)
          result.deployments[0].versions.push({ version_id: TOKEN, percentage: 1 });
        if (scenario.partialDeployment) result.deployments[0].versions[0].percentage = 99;
        if (scenario.deploymentHistory)
          result.deployments.push(
            { strategy: 'percentage', versions: [{ version_id: TOKEN, percentage: 100 }] },
            {
              strategy: 'percentage',
              versions: [
                { version_id: TOKEN, percentage: 50 },
                { version_id: VERSION, percentage: 50 },
              ],
            },
          );
      } else if (request.method === 'GET' && request.path === worker + '/versions/' + VERSION) {
        phase = 'version-' + contextRound;
        result = { id: VERSION, resources: { bindings: bindings('active') } };
      } else if (request.method === 'POST' && request.path === base) {
        assert.equal(bootstrap, true, 'owned sealing never creates a replacement');
        assert.deepEqual(JSON.parse(JSON.stringify(request.body)), { name, duration: '30m' });
        created = true;
        phase = 'create';
        result = {
          id: TOKEN,
          name,
          duration: '30m',
          enabled: true,
          created_at: new Date(FIXED_NOW).toISOString(),
          ...SYNTHETIC,
        };
      } else if (request.method === 'PUT' && request.path === base + '/' + TOKEN) {
        assert.deepEqual(JSON.parse(JSON.stringify(request.body)), { duration: '30m' });
        renewed = true;
        phase = 'renew';
        result = { id: TOKEN };
      } else if (request.method === 'POST' && request.path === base + '/' + TOKEN + '/rotate') {
        assert.deepEqual(JSON.parse(JSON.stringify(request.body)), {});
        rotated = true;
        phase = 'rotate';
        result = { id: TOKEN, name, ...rotatedCredentials };
        // Deliberately no expires_at or created_at: neither is required by rotate's schema.
      } else if (request.method === 'GET' && request.path === base + '/' + TOKEN) {
        phase = bootstrap
          ? 'bootstrap-read'
          : rotated
            ? 'rotated-read'
            : renewed
              ? 'renewed-read'
              : 'initial-read';
        const remaining = rotated
          ? (scenario.rotatedRemaining ?? (renewed ? 1800000 : (scenario.initialRemaining ?? 1200000)))
          : renewed
            ? (scenario.renewedRemaining ?? 1800000)
            : bootstrap
              ? (scenario.bootstrapRemaining ?? 1800000)
              : (scenario.initialRemaining ?? 1200000);
        result = {
          id: TOKEN,
          name,
          client_id: SYNTHETIC.client_id,
          enabled: true,
          created_at: new Date(
            FIXED_NOW - (bootstrap ? 0 : scenario.changedCreatedAt && (renewed || rotated) ? 1000 : 3600000),
          ).toISOString(),
          expires_at: new Date(FIXED_NOW + remaining).toISOString(),
        };
      } else {
        phase = 'forbidden-operation';
        throw new Error('Unexpected synthetic API operation');
      }
      phases.push(phase);
      if (scenario.omitAt === phase) delete result[scenario.field];
      if (scenario.changeAt === phase) result[scenario.field] = scenario.value;
      returnedObjects.push(result);
      advance(phase);
      if (scenario.failAt === phase) throw new Error(PRIVATE_ERROR);
      if (scenario.rejectAt === phase) return { success: false, errors: [{ message: PRIVATE_ERROR }] };
      return { success: true, result };
    },
  };
  const subtle = {};
  for (const method of ['generateKey', 'exportKey', 'importKey', 'digest', 'encrypt', 'decrypt']) {
    subtle[method] = async (...args) => {
      cryptoCalls.push({ method, beforeWrites: !created && !renewed && !rotated });
      if (scenario.cryptoFailure === method || (scenario.sealFailure && rotated && method === 'encrypt'))
        throw new Error(PRIVATE_ERROR);
      const result = await webcrypto.subtle[method](...args);
      advance(rotated && method === 'encrypt' ? 'seal' : 'crypto-' + method);
      return result;
    };
  }
  class FixtureDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [wall]));
    }
    static now() {
      return wall;
    }
  }
  const webGlobals = {
    crypto: { subtle, getRandomValues: (v) => webcrypto.getRandomValues(v) },
    TextEncoder,
    TextDecoder,
    Date: FixtureDate,
    performance: { now: () => mono },
    Uint8Array,
    ArrayBuffer,
    btoa,
    atob,
    setTimeout,
    clearTimeout,
    fetch() {
      networkCalls++;
      throw new Error('network tripwire');
    },
  };
  const context = vm.createContext({ ...webGlobals });
  const module = new vm.SourceTextModule(source, { context });
  await module.link(() => assert.fail('Cloudflare functions must remain self-contained'));
  await module.evaluate();
  // Copy exactly one function, as the connected execution will do. The module
  // and every sibling export are absent in this fresh execution context.
  const isolatedContext = vm.createContext({ ...webGlobals });
  const selectedFunction = bootstrap
    ? module.namespace.bootstrapStagingRecovery
    : module.namespace.sealOwnedStagingHandoff;
  const standalone = vm.runInContext('(' + selectedFunction.toString() + ')', isolatedContext);
  const challenge = bootstrap
    ? null
    : {
        type: 'mterm-staging-handoff-challenge',
        protocol: 2,
        purpose: 'mterm-staging-owned-handoff',
        mode: scenario.mode ?? 'cleanup',
        runNonce: 'ab'.repeat(16),
        recipientKeySha256: hash(spki),
        expiresAt: FIXED_NOW + 120000,
        accountId: ACCOUNT,
        origins: ORIGINS,
        localSourceCommit: LOCAL,
        localBundleSha256: 'e3'.repeat(32),
        receiverSha256: 'a4'.repeat(32),
        sealerSha256: 'b5'.repeat(32),
        harnessSha256: '208ac5b3296ae8c55986db8e947ec92c7bd678f0c045cf37014b2910ec7c811e',
        expectedDeployedSourceCommit: DEPLOYED,
        ownership: OWNERSHIP,
        renewal: scenario.renewal ?? 'none',
        publicKey: b64(spki),
        ...(scenario.challenge ?? {}),
      };
  const reviewed = {
    mode: scenario.mode ?? 'cleanup',
    localSourceCommit: LOCAL,
    localBundleSha256: 'e3'.repeat(32),
    receiverSha256: 'a4'.repeat(32),
    sealerSha256: 'b5'.repeat(32),
    harnessSha256: '208ac5b3296ae8c55986db8e947ec92c7bd678f0c045cf37014b2910ec7c811e',
    expectedDeployedSourceCommit: DEPLOYED,
    ownership: OWNERSHIP,
    renewal: scenario.renewal ?? 'none',
    ...(scenario.reviewed ?? {}),
  };
  const result = bootstrap
    ? await standalone(nonce, api, scenario.account ?? ACCOUNT)
    : await standalone(
        challenge,
        api,
        scenario.account ?? ACCOUNT,
        scenario.noReviewed ? undefined : reviewed,
      );
  let independentlyDecrypted = false,
    fullHeaderMatches = false,
    frameProfileValid = false;
  if (result.result === 'sealed') {
    const frame = JSON.parse(result.frame),
      rawHeader = Buffer.from(frame.protected, 'base64url').toString();
    const finalRemaining =
      scenario.rotatedRemaining ?? (renewed ? 1800000 : (scenario.initialRemaining ?? 1200000));
    fullHeaderMatches =
      rawHeader ===
      JSON.stringify(
        header(challenge, {
          tokenExpiresAt: FIXED_NOW + finalRemaining,
          renewed,
        }),
      );
    frameProfileValid =
      same(Object.keys(frame), ['protected', 'encryptedKey', 'iv', 'ciphertext']) &&
      Object.values(frame).every(
        (v) => typeof v === 'string' && /^[A-Za-z0-9_-]+$/.test(v) && b64(from64(v)) === v,
      ) &&
      from64(frame.encryptedKey).length === 384 &&
      from64(frame.iv).length === 12 &&
      from64(frame.ciphertext).length === bytes(JSON.stringify(rotatedCredentials)).length + 16;
    const raw = await webcrypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      pair.privateKey,
      from64(frame.encryptedKey),
    );
    const aes = await webcrypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    const plaintext = await webcrypto.subtle.decrypt(
      { name: 'AES-GCM', iv: from64(frame.iv), additionalData: bytes(frame.protected), tagLength: 128 },
      aes,
      from64(frame.ciphertext),
    );
    independentlyDecrypted = same(JSON.parse(new TextDecoder().decode(plaintext)), rotatedCredentials);
  }
  const serialized = JSON.stringify(result);
  return {
    result,
    calls,
    phases,
    cryptoCalls,
    created,
    renewed,
    rotated,
    contextRound,
    independentlyDecrypted,
    fullHeaderMatches,
    frameProfileValid,
    timingBarrierHits,
    networkCalls,
    nodeGlobalsAbsent: vm.runInContext(
      'typeof Buffer === "undefined" && typeof process === "undefined"',
      isolatedContext,
    ),
    siblingExportsAbsent: vm.runInContext(
      'typeof sealStagingHandoff === "undefined" && typeof bootstrapStagingRecovery === "undefined" && typeof sealOwnedStagingHandoff === "undefined"',
      isolatedContext,
    ),
    leaked:
      LEAK(result) ||
      serialized.includes(rotatedCredentials.client_secret) ||
      serialized.includes(hash(rotatedCredentials.client_secret)) ||
      serialized.includes(hash(STAGING.issuer + '\nservice:' + SYNTHETIC.client_id)),
  };
}

async function cleanupFixture(scenario, actualGateway) {
  const source = await fs.readFile(path.join(REPO, 'scripts/staging-handoff.mjs'), 'utf8');
  const input = new PassThrough(),
    calls = [],
    timers = new Set();
  let stdout = '',
    filesystemCalls = 0,
    processCalls = 0,
    networkCalls = 0;
  let elapsed = 0,
    requestTimeouts = 0;
  const fakeProcess = {
    argv: ['/trusted/node'],
    execArgv: [],
    execPath: '/trusted/node',
    platform: 'win32',
    versions: { node: '24.22.1' },
    env: { MTERM_STAGING_EXPECTED_SOURCE_COMMIT: scenario.expected ?? DEPLOYED, ...(scenario.env ?? {}) },
    stdin: input,
    stdout: {
      write: (v) => {
        stdout += v;
        return true;
      },
    },
  };
  const failFs = () => {
    filesystemCalls++;
    throw new Error('cleanup filesystem tripwire');
  };
  const failProcess = () => {
    processCalls++;
    throw new Error('cleanup process tripwire');
  };
  const context = vm.createContext({
    process: fakeProcess,
    Buffer,
    TextEncoder,
    TextDecoder,
    URL,
    Headers,
    Response,
    AbortSignal,
    AbortController,
    Date,
    performance: { now: () => elapsed },
    setTimeout(fn, ms) {
      const selectedRequestTimeout = Boolean(scenario.hang) && ms === 30000;
      const timer = setTimeout(
        () => {
          timers.delete(timer);
          if (selectedRequestTimeout) {
            elapsed += ms;
            requestTimeouts++;
          }
          fn();
        },
        selectedRequestTimeout ? 10 : ms,
      );
      timers.add(timer);
      return timer;
    },
    clearTimeout(timer) {
      timers.delete(timer);
      clearTimeout(timer);
    },
    async fetch(url, options = {}) {
      const index = calls.length,
        target = new URL(String(url));
      const headers = new Headers(options.headers);
      calls.push({
        url: String(url),
        method: options.method ?? 'GET',
        redirect: options.redirect,
        origin: headers.get('origin'),
        body: options.body ?? null,
        authMatches:
          headers.get('CF-Access-Client-Id') === SYNTHETIC.client_id &&
          headers.get('CF-Access-Client-Secret') === SYNTHETIC.client_secret,
        hasAnyAuth: headers.has('CF-Access-Client-Id') || headers.has('CF-Access-Client-Secret'),
        hasSignal: options.signal instanceof AbortSignal,
      });
      assert.ok(
        [PUBLIC + '/health', DASHBOARD + '/api/dashboard', DASHBOARD + '/api/revoke-all'].includes(
          String(url),
        ),
        'cleanup may reach only three fixed endpoints',
      );
      if (actualGateway) return actualGateway(String(url), options);
      networkCalls++;
      if (scenario.hang === index + 1)
        return new Promise((_, reject) => {
          if (options.signal.aborted) reject(new Error(PRIVATE_ERROR));
          else
            options.signal.addEventListener('abort', () => reject(new Error(PRIVATE_ERROR)), { once: true });
        });
      if (scenario.failAt === index + 1) throw new Error(PRIVATE_ERROR);
      let body =
        target.pathname === '/health'
          ? { enabled: true, environment: 'staging', build: DEPLOYED }
          : target.pathname === '/api/revoke-all'
            ? { revoked: true }
            : {
                authenticated: true,
                identityKind: 'staging-service',
                build: DEPLOYED,
                devices:
                  index === 1 && !scenario.initialEmpty
                    ? [{ id: 'unreturned-device', actor: PRIVATE_ERROR }]
                    : [],
                grants:
                  index === 1 && !scenario.initialEmpty
                    ? [{ id: 'unreturned-grant', clientId: PRIVATE_ERROR }]
                    : [],
                audit: [
                  { actor: hash(STAGING.issuer + '\nservice:' + SYNTHETIC.client_id), note: PRIVATE_ERROR },
                ],
                sessions: [],
              };
      if (scenario.omitAt === index + 1) delete body[scenario.field];
      if (scenario.changeAt === index + 1) body[scenario.field] = scenario.value;
      if (scenario.extraAt === index + 1) body.client_secret = PRIVATE_ERROR;
      const status = scenario.statusAt === index + 1 ? scenario.status : 200;
      return new Response(scenario.largeAt === index + 1 ? 'x'.repeat(1048577) : JSON.stringify(body), {
        status,
        headers: {
          'content-type': 'application/json',
          ...(status === 302 ? { location: 'https://untrusted.invalid' } : {}),
        },
      });
    },
  });
  const modules = {
    'node:fs/promises': { default: new Proxy({}, { get: () => failFs }) },
    'node:path': { default: path.posix },
    'node:url': { fileURLToPath: (v) => new URL(v).pathname },
    'node:crypto': { createHash, webcrypto, randomBytes: (n) => Buffer.alloc(n) },
    'node:child_process': { execFile: failProcess, spawn: failProcess },
    'node:perf_hooks': { performance: context.performance },
  };
  const module = new vm.SourceTextModule(source, {
    context,
    identifier: 'file:///virtual/repo/scripts/staging-handoff.mjs',
    initializeImportMeta(meta) {
      meta.url = 'file:///virtual/repo/scripts/staging-handoff.mjs';
    },
  });
  await module.link((specifier) => {
    assert.ok(modules[specifier], 'cleanup imports only declared fixed builtins');
    const value = modules[specifier];
    return new vm.SyntheticModule(
      Object.keys(value),
      function () {
        for (const [key, item] of Object.entries(value)) this.setExport(key, item);
      },
      { context },
    );
  });
  await module.evaluate();
  try {
    const pending = module.namespace.runCleanupChild();
    input.end((scenario.input ?? JSON.stringify(SYNTHETIC)) + '\n');
    const result = await pending;
    return {
      result,
      calls,
      inputDestroyed: input.destroyed,
      filesystemCalls,
      processCalls,
      mockedFetchCalls: networkCalls,
      requestTimeouts,
      leaked: LEAK([stdout, result]),
      timersLeft: timers.size,
    };
  } finally {
    for (const timer of timers) clearTimeout(timer);
    input.destroy();
  }
}

const origin = PUBLIC,
  dashboard = DASHBOARD,
  issuer = STAGING.issuer;
class MemoryStorage {
  data = new Map();
  alarmAt = null;
  async get(k) {
    return structuredClone(this.data.get(k));
  }
  async put(k, v) {
    this.data.set(k, structuredClone(v));
  }
  async delete(k) {
    return this.data.delete(k);
  }
  async list({ prefix = '', limit = 1000, startAfter = '' } = {}) {
    return new Map(
      [...this.data]
        .filter(([k]) => k.startsWith(prefix) && k > startAfter)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, limit),
    );
  }
  async getAlarm() {
    return this.alarmAt;
  }
  async setAlarm(time) {
    this.alarmAt = time;
  }
}
async function actualGatewayFixture() {
  const keys = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );
  const jwk = {
    ...(await crypto.subtle.exportKey('jwk', keys.publicKey)),
    kid: randomToken(8),
    alg: 'RS256',
    use: 'sig',
  };
  const env = {
    PUBLIC_ORIGIN: origin,
    DASHBOARD_ORIGIN: dashboard,
    ACCESS_ISSUER: issuer,
    ACCESS_AUDIENCE: STAGING.audience,
    ALLOWED_EMAILS: 'owner@example.test,other@example.test',
    ENVIRONMENT: 'staging',
    BUILD_SHA: DEPLOYED,
    MCP_ENABLED: 'true',
  };
  const storage = new MemoryStorage();
  let queue = Promise.resolve();
  const ctx = {
    storage,
    blockConcurrencyWhile(fn) {
      const next = queue.then(fn);
      queue = next.catch(() => {});
      return next;
    },
  };
  const registry = new MTermRegistry(ctx, env);
  env.REGISTRY = { idFromName: () => 'one', get: () => ({ fetch: (req) => registry.fetch(req) }) };
  const fetcher = async (url) => {
    assert.equal(String(url), issuer + '/cdn-cgi/access/certs');
    return Response.json({ keys: [jwk] });
  };
  const app = createGateway({ fetcher });
  async function identity(email = 'owner@example.test', overrides = {}) {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: jwk.kid })).toString('base64url');
    const claims = Buffer.from(
      JSON.stringify({
        type: 'app',
        iss: issuer,
        aud: [STAGING.audience],
        sub: email,
        email,
        exp: Math.floor(Date.now() / 1000) + 600,
        iat: Math.floor(Date.now() / 1000),
        ...overrides,
      }),
    ).toString('base64url');
    const signature = Buffer.from(
      await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        keys.privateKey,
        new TextEncoder().encode(header + '.' + claims),
      ),
    ).toString('base64url');
    return header + '.' + claims + '.' + signature;
  }
  async function req(path, { method = 'GET', body, token, jwt, host = origin, headers = {}, signal } = {}) {
    const r = new Request(host + path, {
      method,
      signal,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(token ? { authorization: 'Bearer ' + token } : {}),
        ...(jwt ? { 'cf-access-jwt-assertion': jwt } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    });
    return app.fetch(r, env, { waitUntil() {} });
  }
  async function oauth(jwt = null, { defer = false } = {}) {
    jwt ??= await identity();
    const verifier = randomToken(48),
      challenge = await sha256(verifier, 'base64url');
    const registration = await req('/oauth/register', {
      method: 'POST',
      body: {
        client_name: 'Fixture MCP client',
        redirect_uris: ['https://client.test.invalid/callback'],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code'],
      },
    });
    assert.equal(registration.status, 201);
    const client = await registration.json();
    const query = new URLSearchParams({
      response_type: 'code',
      client_id: client.client_id,
      redirect_uri: 'https://client.test.invalid/callback',
      scope: 'mterm:read',
      resource: origin + '/mcp',
      state: randomToken(24),
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    const consent = await req('/oauth/authorize?' + query, { jwt, host: dashboard });
    assert.equal(consent.status, 200);
    const html = await consent.text();
    const nonce = html.match(/name="consent" value="([A-Za-z0-9_-]+)"/)[1];
    const approval = await req('/oauth/authorize', {
      method: 'POST',
      jwt,
      host: dashboard,
      headers: { origin: dashboard, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ consent: nonce, decision: 'approve' }).toString(),
    });
    assert.equal(approval.status, 302);
    const code = new URL(approval.headers.get('location')).searchParams.get('code');
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: client.client_id,
      code,
      code_verifier: verifier,
      redirect_uri: 'https://client.test.invalid/callback',
      resource: origin + '/mcp',
    }).toString();
    if (defer) return { tokenBody, client, jwt };
    const tokenResponse = await req('/oauth/token', {
      method: 'POST',
      body: tokenBody,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    assert.equal(tokenResponse.status, 200);
    return { ...(await tokenResponse.json()), tokenBody, client, jwt };
  }
  async function pair(jwt = null, name = 'Fixture Windows', { deferClaim = false } = {}) {
    jwt ??= await identity();
    const start = await req('/api/pair/start', {
      method: 'POST',
      body: {
        name,
        platform: 'win32',
        capabilities: [
          'mterm_read_file',
          'mterm_file_info',
          'mterm_list_directory',
          'mterm_search_files',
          'mterm_search_content',
        ],
      },
    });
    assert.equal(start.status, 201);
    const p = await start.json();
    const approve = await req('/api/pair/approve', {
      method: 'POST',
      jwt,
      host: dashboard,
      headers: { origin: dashboard },
      body: { pairId: p.pairId, userCode: p.userCode },
    });
    assert.equal(approve.status, 200);
    if (deferClaim) return { pairing: p };
    const claim = await req('/api/pair/poll', {
      method: 'POST',
      body: { pairId: p.pairId, deviceCode: p.deviceCode },
    });
    assert.equal(claim.status, 200);
    return { ...(await claim.json()), pairing: p };
  }
  return { req, oauth, pair, identity, env, fetcher, storage, registry };
}

async function gatewayCleanupFixture() {
  const savedFetch = globalThis.fetch,
    savedNow = Date.now;
  let externalCalls = 0;
  globalThis.fetch = async () => {
    externalCalls++;
    throw new Error('gateway external-network tripwire');
  };
  Date.now = () => FIXED_NOW;
  try {
    const f = await actualGatewayFixture();
    f.env.STAGING_SERVICE_ID = SYNTHETIC.client_id;
    const targetJwt = await f.identity('owner@example.test', {
      sub: '',
      email: undefined,
      common_name: SYNTHETIC.client_id,
    });
    const unrelatedJwt = await f.identity('other@example.test');
    const identity = (jwt) =>
      verifyAccess(
        new Request(DASHBOARD + '/api/dashboard', {
          headers: { 'cf-access-jwt-assertion': jwt },
        }),
        f.env,
        f.fetcher,
      );
    const target = await identity(targetJwt),
      unrelated = await identity(unrelatedJwt);
    assert.equal(target.kind, 'staging-service');
    assert.equal(unrelated.kind, 'user');
    assert.notEqual(target.userId, unrelated.userId);
    const targetDevice = await f.pair(targetJwt, 'Target synthetic device');
    const unrelatedDevice = await f.pair(unrelatedJwt, 'Other synthetic device');
    const targetAuth = await f.oauth(targetJwt),
      unrelatedAuth = await f.oauth(unrelatedJwt);
    const targetCode = await f.oauth(targetJwt, { defer: true });
    const unrelatedCode = await f.oauth(unrelatedJwt, { defer: true });
    const targetPending = await f.pair(targetJwt, 'Target pending', { deferClaim: true });
    const unrelatedPending = await f.pair(unrelatedJwt, 'Other pending', { deferClaim: true });
    const agentPoll = (device) =>
      f.req('/api/agent/poll', {
        method: 'POST',
        token: device.deviceToken,
        body: { version: 1, deviceId: device.deviceId, availableSlots: 0 },
      });
    const clientPing = (auth) =>
      f.req('/mcp', {
        method: 'POST',
        token: auth.access_token,
        body: { jsonrpc: '2.0', id: 1, method: 'ping' },
      });
    for (const device of [targetDevice, unrelatedDevice]) assert.equal((await agentPoll(device)).status, 200);
    for (const auth of [targetAuth, unrelatedAuth]) assert.equal((await clientPing(auth)).status, 200);
    const beforeTargetEpoch = await f.registry.epoch(target.userId);
    const beforeUnrelatedEpoch = await f.registry.epoch(unrelated.userId);
    assert.ok(await f.storage.get('device:' + unrelatedDevice.deviceId));
    assert.ok(await f.storage.get('pair:' + unrelatedPending.pairing.pairId));
    const unrelatedBefore = JSON.stringify({
      device: await f.storage.get('device:' + unrelatedDevice.deviceId),
      grants: await f.registry.userGrants(unrelated.userId),
      pending: await f.storage.get('pair:' + unrelatedPending.pairing.pairId),
    });
    const cleanup = await cleanupFixture({}, async (url, options) => {
      const headers = new Headers(options.headers);
      if (url.startsWith(DASHBOARD)) {
        assert.equal(headers.get('CF-Access-Client-Id'), SYNTHETIC.client_id);
        assert.equal(headers.get('CF-Access-Client-Secret'), SYNTHETIC.client_secret);
        // Synthetic Access edge: the actual gateway still verifies the real signature.
        headers.set('cf-access-jwt-assertion', targetJwt);
      }
      return f.req(new URL(url).pathname, {
        host: new URL(url).origin,
        method: options.method ?? 'GET',
        headers: Object.fromEntries(headers),
        ...(options.body === undefined ? {} : { body: options.body }),
        signal: options.signal,
      });
    });
    const unrelatedAfter = JSON.stringify({
      device: await f.storage.get('device:' + unrelatedDevice.deviceId),
      grants: await f.registry.userGrants(unrelated.userId),
      pending: await f.storage.get('pair:' + unrelatedPending.pairing.pairId),
    });
    const targetEpoch = await f.registry.epoch(target.userId);
    const unrelatedEpoch = await f.registry.epoch(unrelated.userId);
    const claim = (p) =>
      f.req('/api/pair/poll', {
        method: 'POST',
        body: { pairId: p.pairing.pairId, deviceCode: p.pairing.deviceCode },
      });
    const redeem = (o) =>
      f.req('/oauth/token', {
        method: 'POST',
        body: o.tokenBody,
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
    return {
      cleanup,
      actualSignedAccessAndRegistry: true,
      beforeTargetEpoch,
      beforeUnrelatedEpoch,
      targetEpoch,
      unrelatedEpoch,
      unrelatedRecordsUnchanged: unrelatedBefore === unrelatedAfter,
      targetAgentStatus: (await agentPoll(targetDevice)).status,
      targetClientStatus: (await clientPing(targetAuth)).status,
      targetApprovedPairStatus: (await claim(targetPending)).status,
      targetAuthorizationCodeStatus: (await redeem(targetCode)).status,
      unrelatedAgentStatus: (await agentPoll(unrelatedDevice)).status,
      unrelatedClientStatus: (await clientPing(unrelatedAuth)).status,
      unrelatedApprovedPairStatus: (await claim(unrelatedPending)).status,
      unrelatedAuthorizationCodeStatus: (await redeem(unrelatedCode)).status,
      externalCalls,
    };
  } finally {
    globalThis.fetch = savedFetch;
    Date.now = savedNow;
  }
}

function unit(kind, scenario = {}) {
  const child = spawnSync(
    process.execPath,
    [
      '--experimental-vm-modules',
      '--disable-warning=ExperimentalWarning',
      fileURLToPath(import.meta.url),
      CHILD,
    ],
    {
      input: JSON.stringify({ kind, scenario }),
      encoding: 'utf8',
      timeout: 20000,
      maxBuffer: 262144,
      env: { PATH: process.env.PATH ?? '', SystemRoot: process.env.SystemRoot ?? '' },
    },
  );
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.signal, null);
  assert.equal(child.stderr, '');
  return JSON.parse(child.stdout);
}
function senderDenied(r, reached) {
  assert.equal(r.result.result, 'failed');
  assert.equal(r.leaked, false);
  assert.equal(r.networkCalls, 0);
  assert.equal(
    r.calls.some((v) => v.method === 'DELETE'),
    false,
  );
  assert.equal(r.calls.filter((v) => v.method === 'POST' && v.path.endsWith('/rotate')).length <= 1, true);
  if (reached) assert.ok(r.phases.includes(reached), 'the intended controlled API boundary was reached');
}
function receiverDenied(r, { child = false } = {}) {
  assert.equal(r.result.result, 'failed');
  assert.equal(r.plaintextInOutput, false);
  assert.equal(r.networkCalls, 0);
  assert.equal(r.childCount, child ? 1 : 0);
  assert.equal(r.childInputMatches, false);
  assert.equal(r.inputDestroyed, true);
  assert.equal(r.timersLeft, 0);
}
function cleanupSafe(r) {
  assert.equal(r.leaked, false);
  assert.equal(r.filesystemCalls, 0);
  assert.equal(r.processCalls, 0);
  assert.equal(r.inputDestroyed, true);
  assert.equal(r.timersLeft, 0);
  assert.ok(r.calls.length <= 5);
  for (const c of r.calls) {
    assert.equal(c.redirect, 'manual');
    assert.equal(c.hasSignal, true);
    if (c.url.startsWith(PUBLIC)) assert.equal(c.hasAnyAuth, false);
    else assert.equal(c.authMatches, true);
  }
}

if (process.argv.includes(CHILD)) {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const { kind, scenario } = JSON.parse(input);
  const answer =
    kind === 'receiver'
      ? await unitFixture(scenario)
      : kind === 'sender'
        ? await senderFixture(scenario)
        : kind === 'bootstrap'
          ? await senderFixture(scenario, true)
          : kind === 'gateway'
            ? await gatewayCleanupFixture()
            : await cleanupFixture(scenario);
  process.stdout.write(JSON.stringify(answer));
} else {
  for (const mode of ['cleanup', 'smoke-owned']) {
    test('owned sender: real crypto and independent complete ' + mode + ' header', () => {
      const r = unit('sender', { mode, changedCreatedAt: true });
      assert.equal(r.result.result, 'sealed');
      assert.equal(r.independentlyDecrypted, true);
      assert.equal(r.fullHeaderMatches, true);
      assert.equal(r.frameProfileValid, true);
      assert.equal(r.nodeGlobalsAbsent, true);
      assert.equal(r.siblingExportsAbsent, true);
      assert.deepEqual(r.result.operations, {
        renew: { attempted: false, acknowledged: false },
        rotate: { attempted: true, acknowledged: true },
      });
      assert.equal(r.leaked, false);
      assert.equal(r.contextRound, 2);
      assert.equal(r.renewed, false);
      assert.equal(r.rotated, true);
      assert.equal(r.created, false);
      assert.equal(
        r.calls.some((v) => v.method === 'DELETE'),
        false,
      );
      assert.equal(r.networkCalls, 0);
      assert.deepEqual(r.phases, [
        'settings-1',
        'deployments-1',
        'version-1',
        'initial-read',
        'rotate',
        'rotated-read',
        'settings-2',
        'deployments-2',
        'version-2',
      ]);
      assert.ok(r.cryptoCalls.filter((v) => v.beforeWrites).some((v) => v.method === 'encrypt'));
    });
    test('owned receiver: independent ' + mode + ' envelope invokes only its fixed child', () => {
      const r = unit('receiver', { mode, replay: true });
      assert.equal(r.result.result, 'passed');
      assert.equal(r.challenge.protocol, 2);
      assert.equal(r.challenge.purpose, 'mterm-staging-owned-handoff');
      assert.deepEqual(r.challenge.ownership, OWNERSHIP);
      assert.notEqual(r.challenge.runNonce, CREATION_NONCE);
      assert.equal(r.childInputMatches, true);
      assert.equal(r.privateKeyNonextractable, true);
      assert.equal(r.decryptCalls, 2);
      assert.equal(r.childClosed, true);
      assert.equal(r.result.child.closed, true);
      assert.equal(r.result.child.terminationRequested, false);
      assert.equal(r.replay.code, 'RECEIVER_ALREADY_USED');
      assert.equal(r.childEnvContainsPlaintext, false);
      assert.equal(r.childEnvKeys.includes('SECRET_PARENT_ENV'), false);
      assert.equal(r.plaintextInOutput, false);
      assert.equal(r.networkCalls, 0);
      assert.equal(r.timersLeft, 0);
      assert.deepEqual(r.childArgs, [
        '/trusted/node',
        '/virtual/repo/scripts/' + (mode === 'cleanup' ? 'staging-handoff.mjs' : 'verify-remote-staging.mjs'),
        ...(mode === 'cleanup' ? ['--cleanup-child'] : []),
      ]);
    });
  }
  for (const remaining of [-1, 599999, 600000])
    test('owned sender: explicit30m renewal for remaining ' + remaining, () => {
      const r = unit('sender', {
        initialRemaining: remaining,
        renewal: '30m-if-needed',
        changedCreatedAt: true,
      });
      assert.equal(r.result.result, 'sealed');
      assert.equal(r.renewed, true);
      assert.equal(r.fullHeaderMatches, true);
      assert.equal(r.independentlyDecrypted, true);
      assert.equal(r.leaked, false);
      assert.deepEqual(
        r.calls.filter((c) => c.method === 'PUT').map((c) => c.body),
        [{ duration: '30m' }],
      );
      assert.equal(
        r.calls.some((c) => c.method === 'DELETE' || c.path.endsWith('/refresh')),
        false,
      );
    });
  for (const [remaining, pass] of [
    [599999, false],
    [600000, false],
    [600001, true],
    [1805000, true],
    [1805001, false],
  ])
    test('owned sender: no-renewal observed lifetime boundary ' + remaining, () => {
      const r = unit('sender', { initialRemaining: remaining });
      assert.equal(r.result.result, pass ? 'sealed' : 'failed');
      assert.equal(
        r.calls.some((c) => c.method === 'PUT' || c.method === 'DELETE'),
        false,
      );
      assert.ok(r.phases.includes('initial-read'));
      assert.equal(r.rotated, pass);
    });
  test('owned sender: renewal permission does not renew an already sufficient token', () => {
    const r = unit('sender', { renewal: '30m-if-needed' });
    assert.equal(r.result.result, 'sealed');
    assert.equal(r.renewed, false);
  });
  for (const phase of ['renewed', 'rotated'])
    for (const [remaining, pass] of [
      [600000, false],
      [600001, true],
      [1805000, true],
      [1805001, false],
    ])
      test('owned sender: ' + phase + ' independent expiry boundary ' + remaining, () => {
        const r = unit('sender', {
          initialRemaining: -1,
          renewal: '30m-if-needed',
          [phase + 'Remaining']: remaining,
          ...(phase === 'renewed' ? { rotatedRemaining: remaining } : {}),
        });
        assert.equal(r.result.result, pass ? 'sealed' : 'failed');
        assert.ok(r.phases.includes(phase + '-read'));
        assert.equal(
          r.calls.some((c) => c.method === 'DELETE'),
          false,
        );
        assert.equal(r.leaked, false);
      });
  for (const [label, scenario] of [
    ['wrong account', { account: '0'.repeat(32) }],
    ['missing independent selection', { noReviewed: true }],
    ['protocol1 downgrade', { challenge: { protocol: 1 } }],
    ['legacy purpose', { challenge: { purpose: 'mterm-staging-handoff' } }],
    ['legacy mode', { challenge: { mode: 'smoke' } }],
    ['reused creation nonce', { challenge: { runNonce: CREATION_NONCE } }],
    ['reviewed ownership mismatch', { reviewed: { ownership: { ...OWNERSHIP, tokenId: VERSION } } }],
    ['reviewed renewal mismatch', { reviewed: { renewal: '30m-if-needed' } }],
    ['unrecognized renewal', { renewal: 'automatic' }],
  ])
    test('owned sender: rejects ' + label + ' before provider access', () => {
      const r = unit('sender', scenario);
      senderDenied(r);
      assert.equal(r.calls.length, 0);
    });
  for (const [field, value] of [
    ['mode', 'smoke-owned'],
    ['localSourceCommit', 'e4'.repeat(20)],
    ['localBundleSha256', 'f6'.repeat(32)],
    ['receiverSha256', 'f6'.repeat(32)],
    ['sealerSha256', 'f6'.repeat(32)],
    ['harnessSha256', 'f6'.repeat(32)],
    ['expectedDeployedSourceCommit', 'e4'.repeat(20)],
  ])
    test('owned sender: independent reviewed context mismatch ' + field, () => {
      const r = unit('sender', { reviewed: { [field]: value } });
      senderDenied(r);
      assert.equal(r.calls.length, 0);
    });
  for (const [label, scenario] of [
    [
      'reviewed source',
      {
        challenge: { localSourceCommit: 'e'.repeat(39) + '\n' },
        reviewed: { localSourceCommit: 'e'.repeat(39) + '\n' },
      },
    ],
    ['receiver nonce', { challenge: { runNonce: 'b'.repeat(31) + '\n' } }],
    [
      'original nonce',
      {
        challenge: {
          ownership: {
            ...OWNERSHIP,
            creationRunNonce: 'c'.repeat(31) + '\n',
            tokenName: 'mterm-staging-handoff-' + 'c'.repeat(31) + '\n',
          },
        },
        reviewed: {
          ownership: {
            ...OWNERSHIP,
            creationRunNonce: 'c'.repeat(31) + '\n',
            tokenName: 'mterm-staging-handoff-' + 'c'.repeat(31) + '\n',
          },
        },
      },
    ],
    [
      'original timestamp',
      {
        challenge: { ownership: { ...OWNERSHIP, originalCreatedAt: OWNERSHIP.originalCreatedAt + '\n' } },
        reviewed: { ownership: { ...OWNERSHIP, originalCreatedAt: OWNERSHIP.originalCreatedAt + '\n' } },
      },
    ],
  ])
    test('owned sender: terminal newline in ' + label + ' is rejected before provider access', () => {
      const r = unit('sender', scenario);
      senderDenied(r);
      assert.equal(r.calls.length, 0);
    });
  test('owned sender: deployment history preserves the first active sole100percent version', () => {
    const r = unit('sender', { deploymentHistory: true });
    assert.equal(r.result.result, 'sealed');
    assert.equal(r.fullHeaderMatches, true);
    assert.equal(r.independentlyDecrypted, true);
    assert.equal(r.contextRound, 2);
    assert.equal(r.leaked, false);
    assert.equal(r.calls.filter((c) => c.path.endsWith('/versions/' + VERSION)).length, 2);
    assert.equal(
      r.calls.some((c) => c.path.endsWith('/versions/' + TOKEN)),
      false,
    );
  });
  for (const scenario of [{ omitDeploymentStrategy: true }, { deploymentStrategy: 'unknown' }])
    test(
      'owned sender: current deployment must explicitly use percentage strategy ' + Object.keys(scenario)[0],
      () => {
        const r = unit('sender', scenario);
        senderDenied(r, 'deployments-1');
        assert.equal(
          r.calls.some((c) => c.method !== 'GET'),
          false,
        );
      },
    );
  test('owned sender: invalid current rollout cannot fall back to valid older deployment', () => {
    const r = unit('sender', { deploymentHistory: true, partialDeployment: true });
    senderDenied(r, 'deployments-1');
    assert.equal(
      r.calls.some((c) => c.method !== 'GET'),
      false,
    );
    assert.equal(
      r.calls.some((c) => c.path.includes('/versions/')),
      false,
    );
  });
  test('owned sender: newline selector matching token metadata still cannot authorize a write', () => {
    const r = unit('sender', {
      binding: 'STAGING_SERVICE_ID',
      bindingChange: { text: SYNTHETIC.client_id + '\n' },
      changeAt: 'initial-read',
      field: 'client_id',
      value: SYNTHETIC.client_id + '\n',
    });
    senderDenied(r);
    assert.equal(
      r.calls.some((c) => c.method !== 'GET'),
      false,
    );
    assert.equal(r.rotated, false);
  });
  test('owned sender: terminal newline in rotated secret cannot be sealed', () => {
    const r = unit('sender', {
      changeAt: 'rotate',
      field: 'client_secret',
      value: 'SYNTHETIC_ROTATED_SECRET_NEVER_REAL_3xQ8\n',
    });
    senderDenied(r, 'rotate');
    assert.equal(r.result.cleanup.tokenId, TOKEN);
    assert.deepEqual(r.result.operations.rotate, { attempted: true, acknowledged: true });
    assert.equal(r.phases.includes('rotated-read'), false);
  });
  test('owned sender: newline provider expiry is rejected before rotation', () => {
    const r = unit('sender', {
      changeAt: 'initial-read',
      field: 'expires_at',
      value: new Date(FIXED_NOW + 1200000).toISOString() + '\n',
    });
    senderDenied(r, 'initial-read');
    assert.equal(r.rotated, false);
  });
  for (const binding of [
    'ACCESS_ISSUER',
    'ACCESS_AUDIENCE',
    'BUILD_SHA',
    'ENVIRONMENT',
    'MCP_ENABLED',
    'PUBLIC_ORIGIN',
    'DASHBOARD_ORIGIN',
    'STAGING_SERVICE_ID',
    'REGISTRY',
  ])
    for (const action of ['missing', 'duplicate'])
      test('owned sender: unique required binding ' + binding + ' ' + action, () => {
        const r = unit('sender', { binding, bindingAction: action });
        senderDenied(r, 'settings-1');
        assert.equal(
          r.calls.some((c) => c.method !== 'GET'),
          false,
        );
      });
  for (const [label, scenario] of [
    ['issuer', { binding: 'ACCESS_ISSUER' }],
    ['audience', { binding: 'ACCESS_AUDIENCE' }],
    ['store', { binding: 'REGISTRY', bindingChange: { namespace_id: 'other-store' } }],
    ['class', { binding: 'REGISTRY', bindingChange: { class_name: 'OtherRegistry' } }],
    ['cross-script store', { binding: 'REGISTRY', bindingChange: { script_name: 'other-worker' } }],
    ['store environment', { binding: 'REGISTRY', bindingChange: { environment: 'other-env' } }],
    ['secret binding', { binding: 'STAGING_SERVICE_ID', bindingChange: { type: 'secret_text' } }],
    ['active-only mismatch', { binding: 'STAGING_SERVICE_ID', bindingSurface: 'active' }],
    ['partial deployment', { partialDeployment: true }],
    ['split deployment', { splitDeployment: true }],
    ['version ID', { changeAt: 'version-1', field: 'id', value: TOKEN }],
    ['missing version ID', { omitAt: 'version-1', field: 'id' }],
  ])
    test('owned sender: refuses unsafe active context ' + label, () => {
      const r = unit('sender', scenario);
      senderDenied(r, 'settings-1');
      assert.equal(
        r.calls.some((c) => c.method !== 'GET'),
        false,
      );
    });
  for (const [field, value] of [
    ['id', VERSION],
    ['name', 'another-token'],
    ['client_id', 'another_identity.access'],
    ['enabled', false],
    ['expires_at', PRIVATE_ERROR],
    ['expires_at', '2026-11-09T16:00:00+01:00'],
  ])
    test(
      'owned sender: initial exact token denies invalid ' + field + ':' + String(value).slice(0, 15),
      () => {
        const r = unit('sender', { changeAt: 'initial-read', field, value });
        senderDenied(r, 'initial-read');
        assert.equal(r.rotated, false);
        assert.equal(r.renewed, false);
      },
    );
  for (const field of ['id', 'name', 'client_id', 'enabled', 'expires_at'])
    test('owned sender: missing optional token field fails its admission gate ' + field, () => {
      const r = unit('sender', { omitAt: 'initial-read', field });
      senderDenied(r, 'initial-read');
      assert.equal(
        r.calls.some((c) => c.method !== 'GET'),
        false,
      );
    });
  for (const [phase, field, value] of [
    ['renew', 'id', VERSION],
    ['renewed-read', 'client_id', 'other_identity.access'],
    ['rotate', 'id', VERSION],
    ['rotate', 'client_id', 'other_identity.access'],
    ['rotate', 'client_secret', null],
    ['rotated-read', 'id', VERSION],
    ['rotated-read', 'expires_at', null],
  ])
    test('owned sender: mutation readback mismatch retains original resource ' + phase + '/' + field, () => {
      const r = unit('sender', {
        initialRemaining: -1,
        renewal: '30m-if-needed',
        changeAt: phase,
        field,
        value,
      });
      senderDenied(r, phase);
      assert.equal(r.result.cleanup?.tokenId, TOKEN);
      assert.deepEqual(r.result.operations, {
        renew: { attempted: true, acknowledged: true },
        rotate: {
          attempted: ['rotate', 'rotated-read'].includes(phase),
          acknowledged: ['rotate', 'rotated-read'].includes(phase),
        },
      });
    });
  for (const phase of [
    'settings-1',
    'deployments-1',
    'version-1',
    'initial-read',
    'renew',
    'renewed-read',
    'rotate',
    'rotated-read',
    'settings-2',
    'deployments-2',
    'version-2',
  ])
    test('owned sender: uncertain ' + phase + ' has no retry/delete/replacement', () => {
      const r = unit('sender', { initialRemaining: -1, renewal: '30m-if-needed', failAt: phase });
      senderDenied(r, phase);
      assert.equal(r.phases.filter((v) => v === phase).length, 1);
      assert.equal(r.result.cleanup?.tokenId, TOKEN);
      const renewalAttempted = [
        'renew',
        'renewed-read',
        'rotate',
        'rotated-read',
        'settings-2',
        'deployments-2',
        'version-2',
      ].includes(phase);
      const rotationAttempted = [
        'rotate',
        'rotated-read',
        'settings-2',
        'deployments-2',
        'version-2',
      ].includes(phase);
      assert.deepEqual(r.result.operations, {
        renew: { attempted: renewalAttempted, acknowledged: renewalAttempted && phase !== 'renew' },
        rotate: { attempted: rotationAttempted, acknowledged: rotationAttempted && phase !== 'rotate' },
      });
    });
  for (const phase of ['renew', 'rotate'])
    test('owned sender: returned rejection does not acknowledge ' + phase, () => {
      const r = unit('sender', { initialRemaining: -1, renewal: '30m-if-needed', rejectAt: phase });
      senderDenied(r, phase);
      assert.equal(r.result.cleanup?.tokenId, TOKEN);
      assert.deepEqual(r.result.operations, {
        renew: { attempted: true, acknowledged: phase !== 'renew' },
        rotate: { attempted: phase === 'rotate', acknowledged: false },
      });
      assert.equal(r.phases.filter((p) => p === phase).length, 1);
    });
  test('owned sender: sealing failure retains acknowledged rotation and original ownership', () => {
    const r = unit('sender', { initialRemaining: -1, renewal: '30m-if-needed', sealFailure: true });
    senderDenied(r, 'version-2');
    assert.equal(r.result.cleanup?.tokenId, TOKEN);
    assert.deepEqual(r.result.operations, {
      renew: { attempted: true, acknowledged: true },
      rotate: { attempted: true, acknowledged: true },
    });
  });
  test('owned sender: configuration drift after rotation retains the original route', () => {
    const r = unit('sender', {
      binding: 'REGISTRY',
      bindingChange: { namespace_id: 'other-store' },
      bindingRound: 2,
    });
    senderDenied(r, 'settings-2');
    assert.equal(r.rotated, true);
  });
  for (const phase of [
    'crypto-importKey',
    'crypto-digest',
    'crypto-encrypt',
    'initial-read',
    'renew',
    'rotated-read',
    'version-2',
    'seal',
  ])
    test('owned sender: fresh deadline after ' + phase, () => {
      const r = unit('sender', { initialRemaining: -1, renewal: '30m-if-needed', advanceAt: phase });
      senderDenied(r);
      assert.equal(r.timingBarrierHits, 1);
      if (phase.startsWith('crypto-')) assert.equal(r.calls.length, 0);
    });
  test('owned sender: post-encryption ten-minute crossing rejects even before challenge expiry', () => {
    const r = unit('sender', { initialRemaining: 600001, advanceAt: 'seal', advanceBy: 1 });
    senderDenied(r, 'rotated-read');
    assert.equal(r.timingBarrierHits, 1);
  });
  test('owned sender: wall rollback cannot extend its monotonic delivery decision', () => {
    const r = unit('sender', { advanceAt: 'version-2', advanceBy: 120000, rollbackMs: 120000 });
    senderDenied(r, 'version-2');
    assert.equal(r.timingBarrierHits, 1);
  });
  test('bootstrap: one explicit30m creation returns observed public ownership only', () => {
    const r = unit('bootstrap');
    assert.equal(r.result.result, 'created');
    assert.deepEqual(r.result.ownership, {
      ...OWNERSHIP,
      originalCreatedAt: new Date(FIXED_NOW).toISOString(),
      originalExpiresAt: new Date(FIXED_NOW + 1800000).toISOString(),
    });
    assert.deepEqual(r.phases, ['create', 'bootstrap-read']);
    assert.equal(
      r.calls.some((c) => c.method === 'DELETE'),
      false,
    );
    assert.equal(r.leaked, false);
    assert.equal(r.nodeGlobalsAbsent, true);
    assert.equal(r.siblingExportsAbsent, true);
    assert.deepEqual(r.result.operations, { create: { attempted: true, acknowledged: true } });
    assert.equal(r.networkCalls, 0);
  });
  for (const nonce of ['', 'ab'.repeat(15), 'AB'.repeat(16), 'ca'.repeat(16) + '\n', null])
    test('bootstrap: malformed public nonce before any API ' + JSON.stringify(nonce), () => {
      const r = unit('bootstrap', { nonce });
      senderDenied(r);
      assert.equal(r.calls.length, 0);
    });
  for (const field of ['client_id', 'client_secret'])
    test('bootstrap: terminal newline in create ' + field + ' cannot qualify ownership', () => {
      const r = unit('bootstrap', { changeAt: 'create', field, value: SYNTHETIC[field] + '\n' });
      senderDenied(r, 'create');
      assert.equal(r.result.cleanup.tokenId, TOKEN);
      assert.deepEqual(r.result.operations.create, { attempted: true, acknowledged: true });
      assert.deepEqual(r.phases, ['create']);
    });
  for (const [phase, field] of [
    ['create', 'id'],
    ['create', 'name'],
    ['create', 'client_id'],
    ['create', 'client_secret'],
    ['bootstrap-read', 'id'],
    ['bootstrap-read', 'name'],
    ['bootstrap-read', 'client_id'],
    ['bootstrap-read', 'enabled'],
    ['bootstrap-read', 'created_at'],
    ['bootstrap-read', 'expires_at'],
  ])
    test('bootstrap: missing ' + phase + '/' + field + ' stays unqualified without deletion', () => {
      const r = unit('bootstrap', { omitAt: phase, field });
      senderDenied(r, phase);
      if (!(phase === 'create' && field === 'id')) assert.equal(r.result.cleanup?.tokenId, TOKEN);
      else assert.equal(r.result.cleanup?.tokenId, null);
      assert.deepEqual(r.result.operations, { create: { attempted: true, acknowledged: true } });
    });
  for (const phase of ['create', 'bootstrap-read'])
    for (const fault of ['failAt', 'advanceAt'])
      test('bootstrap: ' + fault + ' after ' + phase + ' preserves uncertain ownership', () => {
        const r = unit('bootstrap', { [fault]: phase });
        senderDenied(r, phase);
        if (fault === 'advanceAt') {
          assert.equal(r.timingBarrierHits, 1);
          assert.equal(r.result.cleanup?.tokenId, TOKEN);
        }
        assert.equal(r.calls.filter((c) => c.method === 'POST').length, 1);
        assert.deepEqual(r.result.operations, {
          create: { attempted: true, acknowledged: !(phase === 'create' && fault === 'failAt') },
        });
        if (phase === 'create' && fault === 'failAt') assert.equal(r.result.cleanup?.tokenId, null);
      });
  test('bootstrap: returned create rejection retains unknown outcome without retry', () => {
    const r = unit('bootstrap', { rejectAt: 'create' });
    senderDenied(r, 'create');
    assert.deepEqual(r.result.operations, { create: { attempted: true, acknowledged: false } });
    assert.equal(r.result.cleanup?.tokenId, null);
    assert.equal(r.calls.length, 1);
  });
  for (const remaining of [600000, 1805001])
    test('bootstrap: observed expiry outside bounded window ' + remaining, () => {
      const r = unit('bootstrap', { bootstrapRemaining: remaining });
      senderDenied(r, 'bootstrap-read');
    });
  for (const [key, value] of [
    ['protocol', 1],
    ['purpose', 'mterm-staging-handoff'],
    ['mode', 'smoke'],
    ['ownership', { ...OWNERSHIP, tokenId: VERSION }],
    ['renewal', '30m-if-needed'],
    ['rotated', false],
    ['providerObservedAt', null],
    ['tokenExpiresAt', null],
    ['runNonce', CREATION_NONCE],
  ])
    test('owned receiver: rejects authenticated header mismatch ' + key, () => {
      const r = unit('receiver', { header: { [key]: value } });
      receiverDenied(r);
      assert.ok(r.challenge);
    });
  for (const key of Object.keys(STAGING))
    test('owned receiver: fixed original staging context ' + key, () => {
      const r = unit('receiver', { ownership: { ...OWNERSHIP, staging: { ...STAGING, [key]: 'wrong' } } });
      receiverDenied(r);
      assert.equal(r.challenge ?? null, null);
    });
  for (const field of ['client_id', 'client_secret'])
    test('owned receiver: terminal newline in plaintext ' + field + ' is never piped', () => {
      const r = unit('receiver', {
        plaintext: JSON.stringify({ ...SYNTHETIC, [field]: SYNTHETIC[field] + '\n' }),
      });
      receiverDenied(r);
      assert.equal(r.decryptCalls, 2);
    });
  test('owned receiver: fresh nonce cannot equal original creation nonce', () => {
    const r = unit('receiver', { equalNonce: true });
    receiverDenied(r);
    assert.equal(r.challenge ?? null, null);
  });
  for (const [remaining, pass] of [
    [454999, false],
    [455000, false],
    [455001, true],
  ])
    test('owned receiver: exact final release lifetime boundary ' + remaining, () => {
      const r = unit('receiver', { header: { tokenExpiresAt: FIXED_NOW + remaining } });
      if (pass) {
        assert.equal(r.result.result, 'passed');
        assert.equal(r.childInputMatches, true);
      } else receiverDenied(r);
    });
  for (const phase of ['spawn', 'pre-pipe-source'])
    for (const [advanceBy, pass] of [
      [44999, true],
      [45000, false],
      [45001, false],
    ])
      test('owned receiver: final token decision after ' + phase + ' delay ' + advanceBy, () => {
        const r = unit('receiver', {
          header: { tokenExpiresAt: FIXED_NOW + 500000 },
          advanceAt: phase,
          advanceBy,
        });
        assert.equal(r.timingBarrierHits, 1);
        if (pass) assert.equal(r.result.result, 'passed');
        else receiverDenied(r, { child: true });
      });
  test('owned receiver: small wall rollback cannot extend anchored provider lifetime', () => {
    const r = unit('receiver', {
      header: { tokenExpiresAt: FIXED_NOW + 500000 },
      advanceAt: 'spawn',
      advanceBy: 45000,
      rollbackMs: 5000,
    });
    assert.equal(r.timingBarrierHits, 1);
    receiverDenied(r, { child: true });
  });
  for (const [observed, expiry, pass] of [
    [FIXED_NOW + 5000, FIXED_NOW + 1800000, true],
    [FIXED_NOW + 5001, FIXED_NOW + 1800000, false],
    [FIXED_NOW - 120000, FIXED_NOW + 1680000, true],
    [FIXED_NOW - 120001, FIXED_NOW + 1680000, false],
  ])
    test('owned receiver: sealer observation age/future boundary ' + (observed - FIXED_NOW), () => {
      const r = unit('receiver', { header: { providerObservedAt: observed, tokenExpiresAt: expiry } });
      if (pass) assert.equal(r.result.result, 'passed');
      else receiverDenied(r);
    });
  for (const [label, scenario] of [
    ['pending stdin and unconfirmed kill', { child: 'pending-write-kill-false' }],
    ['late output before close', { child: 'late-output-before-close' }],
    ['smoke input marker in cleanup output', { child: 'cleanup-input-required' }],
    ['forged cleanup ack', { cleanupReceipt: { revoke: { attempted: true, acknowledged: false } } }],
    ['forged cleanup type', { cleanupReceipt: { type: 'mterm-staging-handoff-result' } }],
    ['nonempty cleanup result', { cleanupReceipt: { finalInventoryEmpty: false } }],
    [
      'wrong final build',
      {
        cleanupReceipt: {
          buildIdentity: {
            initial: { edge: DEPLOYED, registry: DEPLOYED },
            final: { edge: LOCAL, registry: DEPLOYED },
          },
        },
      },
    ],
  ])
    test('owned receiver: refuses invalid child evidence ' + label, () => {
      const r = unit('receiver', scenario);
      assert.equal(r.result.result, 'failed');
      assert.equal(r.childCount, 1);
      assert.equal(r.plaintextInOutput, false);
      if (scenario.child === 'pending-write-kill-false') {
        assert.equal(r.pendingFinalReached, true);
        assert.equal(r.settledBeforeFixtureCleanup, true);
        assert.equal(r.result.child.closed, false);
        assert.equal(r.result.cleanup, 'unconfirmed');
      }
    });
  for (const initialEmpty of [false, true])
    test(
      'cleanup child: exact five-request sequence with ' +
        (initialEmpty ? 'empty' : 'nonempty') +
        ' initial inventory',
      () => {
        const r = unit('cleanup', { initialEmpty });
        cleanupSafe(r);
        assert.equal(r.result.result, 'passed');
        assert.equal(r.result.revoke.acknowledged, true);
        assert.equal(r.result.finalInventoryEmpty, true);
        assert.deepEqual(
          r.calls.map((c) => [c.url, c.method]),
          [
            [PUBLIC + '/health', 'GET'],
            [DASHBOARD + '/api/dashboard', 'GET'],
            [DASHBOARD + '/api/revoke-all', 'POST'],
            [PUBLIC + '/health', 'GET'],
            [DASHBOARD + '/api/dashboard', 'GET'],
          ],
        );
        assert.equal(r.calls[2].body, '{}');
        assert.equal(r.calls[2].origin, DASHBOARD);
      },
    );
  for (const failAt of [1, 2, 3, 4, 5])
    test('cleanup child: request failure prefix ' + failAt + ' never upgrades failed ack', () => {
      const r = unit('cleanup', { failAt });
      cleanupSafe(r);
      assert.equal(r.result.result, 'failed');
      assert.equal(r.calls.length, failAt < 3 ? failAt : 5);
      assert.equal(r.calls.filter((c) => c.method === 'POST').length, failAt < 3 ? 0 : 1);
      if (failAt === 3) assert.equal(r.result.revoke.acknowledged, false);
    });
  test('cleanup child: timed-out revoke acknowledgement stays failed after final empty observations', () => {
    const r = unit('cleanup', { hang: 3 });
    cleanupSafe(r);
    assert.equal(r.requestTimeouts, 1);
    assert.equal(r.result.result, 'failed');
    assert.deepEqual(r.result.revoke, { attempted: true, acknowledged: false });
    assert.equal(r.result.finalInventoryEmpty, true);
    assert.equal(r.calls.length, 5);
    assert.equal(r.calls.filter((c) => c.method === 'POST').length, 1);
  });
  for (const [changeAt, field, value] of [
    [1, 'build', LOCAL],
    [1, 'enabled', false],
    [1, 'environment', 'production'],
    [2, 'authenticated', false],
    [2, 'identityKind', 'user'],
    [2, 'devices', null],
    [2, 'build', PRIVATE_ERROR],
    [3, 'revoked', false],
    [3, 'revoked', 'true'],
    [3, 'revoked', null],
    [4, 'build', LOCAL],
    [5, 'identityKind', 'user'],
    [5, 'devices', [{ id: PRIVATE_ERROR }]],
    [5, 'grants', [{ id: PRIVATE_ERROR }]],
    [5, 'build', PRIVATE_ERROR],
  ])
    test('cleanup child: typed response admission ' + changeAt + '/' + field + '/' + typeof value, () => {
      const r = unit('cleanup', { changeAt, field, value });
      cleanupSafe(r);
      assert.equal(r.result.result, 'failed');
      assert.equal(r.calls.length, changeAt < 3 ? changeAt : 5);
      if (changeAt === 3) assert.equal(r.result.revoke.acknowledged, false);
    });
  test('cleanup child: HTTP200 without revoked field is not acknowledgement', () => {
    const r = unit('cleanup', { omitAt: 3, field: 'revoked' });
    cleanupSafe(r);
    assert.equal(r.result.result, 'failed');
    assert.equal(r.result.revoke.acknowledged, false);
    assert.equal(r.calls.length, 5);
  });
  for (const index of [1, 3, 5])
    for (const scenario of [{ statusAt: index, status: 302 }, { largeAt: index }])
      test(
        'cleanup child: bounded redirect/body refusal at request ' + index + '/' + Object.keys(scenario)[0],
        () => {
          const r = unit('cleanup', scenario);
          cleanupSafe(r);
          assert.equal(r.result.result, 'failed');
          assert.equal(r.calls.length, index < 3 ? index : 5);
        },
      );
  for (const scenario of [
    { expected: '' },
    { expected: 'A'.repeat(40) },
    { input: '{bad' },
    { input: JSON.stringify({ ...SYNTHETIC, url: 'https://other.invalid' }) },
    { input: 'x'.repeat(8193) },
  ])
    test(
      'cleanup child: invalid source/input has no requests ' +
        Object.keys(scenario)[0] +
        '/' +
        String(Object.values(scenario)[0]).length,
      () => {
        const r = unit('cleanup', scenario);
        cleanupSafe(r);
        assert.equal(r.result.result, 'failed');
        assert.equal(r.calls.length, 0);
      },
    );
  test('cleanup child: untrusted extra response values never enter the receipt', () => {
    const r = unit('cleanup', { extraAt: 2 });
    cleanupSafe(r);
    assert.equal(r.result.result, 'passed');
  });
  test('cleanup child: actual signed gateway revokes only its original principal and registry authority', () => {
    const r = unit('gateway');
    cleanupSafe(r.cleanup);
    assert.equal(r.actualSignedAccessAndRegistry, true);
    assert.equal(r.cleanup.result.result, 'passed');
    assert.equal(r.targetEpoch, r.beforeTargetEpoch + 1);
    assert.equal(r.unrelatedEpoch, r.beforeUnrelatedEpoch);
    assert.equal(r.unrelatedRecordsUnchanged, true);
    assert.equal(r.targetAgentStatus, 410);
    assert.equal(r.targetClientStatus, 401);
    assert.equal(r.targetApprovedPairStatus, 410);
    assert.equal(r.targetAuthorizationCodeStatus, 400);
    assert.equal(r.unrelatedAgentStatus, 200);
    assert.equal(r.unrelatedClientStatus, 200);
    assert.equal(r.unrelatedApprovedPairStatus, 200);
    assert.equal(r.unrelatedAuthorizationCodeStatus, 200);
    assert.equal(r.externalCalls, 0);
  });
  test('cleanup child: actual owned process rejects invalid source and closes without network', () => {
    const child = spawnSync(
      process.execPath,
      [path.join(REPO, 'scripts/staging-handoff.mjs'), '--cleanup-child'],
      {
        input: '',
        encoding: 'utf8',
        timeout: 10000,
        maxBuffer: 8192,
        env: {
          PATH: process.env.PATH ?? '',
          SystemRoot: process.env.SystemRoot ?? '',
          MTERM_STAGING_EXPECTED_SOURCE_COMMIT: '',
        },
      },
    );
    assert.ifError(child.error);
    assert.equal(child.status, 1);
    assert.equal(child.signal, null);
    assert.equal(child.stderr, '');
    const result = JSON.parse(child.stdout);
    assert.equal(result.type, 'mterm-staging-handoff-cleanup-child');
    assert.equal(result.result, 'failed');
    assert.equal(result.revoke.attempted, false);
    assert.equal(result.liveAcceptance, false);
  });
}
