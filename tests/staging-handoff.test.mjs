// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-staging-handoff (OpenAI / GPT-6 Astra Pro; self-reported)
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

const REPO = fileURLToPath(new URL('../', import.meta.url));
const CHILD = '--controlled-handoff-fixture';
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
const FIXED_NOW = Date.parse('2026-11-09T15:00:00.000Z');
const hash = (s) => createHash('sha256').update(s).digest('hex');
const bytes = (s) => new TextEncoder().encode(s);
const b64 = (s) => Buffer.from(s).toString('base64url');
const from64 = (s) => new Uint8Array(Buffer.from(s, 'base64url'));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

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
    tokenName: challenge.tokenName,
    tokenDuration: challenge.tokenDuration,
    tokenId: challenge.mode === 'probe' ? null : TOKEN,
    tokenCreatedAt: challenge.mode === 'probe' ? null : FIXED_NOW,
    tokenExpiresAt: challenge.mode === 'probe' ? null : FIXED_NOW + 1800000,
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
  const plaintext = scenario.plaintext ?? JSON.stringify(challenge.mode === 'probe' ? PROBE : SYNTHETIC);
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
              childInputMatches = String(chunk) === JSON.stringify(PROBE) + '\n';
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
      childInputMatches = supplied === JSON.stringify(scenario.mode === 'smoke' ? SYNTHETIC : PROBE) + '\n';
      if (scenario.child === 'hang') return;
      if (scenario.child === 'stderr') child.stderr.write(PRIVATE_ERROR);
      if (scenario.child === 'leak') child.stdout.write(PRIVATE_ERROR + '\n');
      if (scenario.child === 'overflow') child.stdout.write('x'.repeat(65537));
      if (scenario.child === 'bad-summary')
        child.stdout.write('{"result":"passed","client_secret":"' + PRIVATE_ERROR + '"}\n');
      else if (scenario.mode === 'smoke')
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
      else child.stdout.write('{"type":"mterm-staging-handoff-probe-child","received":true}\n');
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
      MTERM_STAGING_HANDOFF_MODE: scenario.mode ?? 'probe',
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
      randomBytes: (n) => Buffer.from(webcrypto.getRandomValues(new Uint8Array(n))),
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
      await Promise.race([
        pendingFinal,
        running.then(() => {
          throw new Error('Pending native Writable final barrier was not reached');
        }),
      ]);
      let observer;
      try {
        settledBeforeFixtureCleanup = await Promise.race([
          running.then(() => true),
          new Promise((resolve) => {
            observer = setTimeout(() => resolve(false), 80);
          }),
        ]);
      } finally {
        clearTimeout(observer);
        // Only the fixture intervenes after the observation, to release old source
        // without an orphaned test. Corrected source already destroys this pipe.
        ownedPendingChild.stdin.destroy();
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
      challenge: challenge
        ? {
            mode: challenge.mode,
            localSourceCommit: challenge.localSourceCommit,
            expectedDeployedSourceCommit: challenge.expectedDeployedSourceCommit,
          }
        : null,
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

async function senderFixture(scenario) {
  const source = await fs.readFile(path.join(REPO, 'scripts/staging-handoff-seal.mjs'), 'utf8');
  const pair = await webcrypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: scenario.weakKey ? 2048 : 3072,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    false,
    ['encrypt', 'decrypt'],
  );
  const spki = new Uint8Array(await webcrypto.subtle.exportKey('spki', pair.publicKey));
  let wall = FIXED_NOW;
  const challenge = {
    type: 'mterm-staging-handoff-challenge',
    protocol: 1,
    purpose: 'mterm-staging-handoff',
    mode: scenario.mode ?? 'smoke',
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
    tokenName: 'mterm-staging-handoff-' + 'ab'.repeat(16),
    tokenDuration: '30m',
    publicKey: b64(spki),
    ...(scenario.challenge ?? {}),
  };
  const calls = [],
    cryptoCalls = [];
  let created = false;
  const api = {
    async request(request) {
      calls.push(request);
      if (scenario.throwingApi) throw new Error(PRIVATE_ERROR);
      if (request.method === 'POST') {
        created = true;
        if (scenario.createFailure) throw new Error(PRIVATE_ERROR);
        if (scenario.expireAfterCreate) wall += 120000;
        return {
          success: true,
          result: {
            id: TOKEN,
            name: challenge.tokenName,
            duration: '30m',
            created_at: new Date(FIXED_NOW).toISOString(),
            enabled: true,
            ...SYNTHETIC,
            ...(scenario.response ?? {}),
          },
        };
      }
      if (request.method === 'DELETE') {
        if (scenario.deleteFailure) throw new Error(PRIVATE_ERROR);
        return {
          success: !scenario.deleteRejected,
          result: { id: scenario.deleteMismatch ? 'd174e90a-fafe-4643-bbbc-4a0ed4fc8415' : TOKEN },
        };
      }
      throw new Error('unexpected API operation');
    },
  };
  const subtle = {};
  for (const method of ['generateKey', 'exportKey', 'importKey', 'digest', 'encrypt'])
    subtle[method] = async (...args) => {
      cryptoCalls.push({ method, beforeCreate: !created });
      if (
        (scenario.cryptoFailure && !created && method === scenario.cryptoFailure) ||
        (scenario.sealFailure && created && method === 'encrypt')
      )
        throw new Error(PRIVATE_ERROR);
      const answer = await webcrypto.subtle[method](...args);
      if (scenario.expireAt === method || (scenario.expireAfterSeal && created && method === 'encrypt'))
        wall = FIXED_NOW + 120000 + (scenario.offset ?? 0);
      return answer;
    };
  class FixtureDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [wall]));
    }
    static now() {
      return wall;
    }
  }
  const context = vm.createContext({
    crypto: { subtle, getRandomValues: (v) => webcrypto.getRandomValues(v) },
    TextEncoder,
    TextDecoder,
    Date: FixtureDate,
    performance: { now: () => wall - FIXED_NOW },
    Uint8Array,
    btoa,
    atob,
  });
  const module = new vm.SourceTextModule(source, { context });
  await module.link(() => {
    throw new Error('sealer must be self-contained');
  });
  await module.evaluate();
  const reviewed = scenario.noReviewed
    ? undefined
    : {
        mode: scenario.mode ?? 'smoke',
        localSourceCommit: LOCAL,
        localBundleSha256: 'e3'.repeat(32),
        receiverSha256: 'a4'.repeat(32),
        sealerSha256: 'b5'.repeat(32),
        harnessSha256: '208ac5b3296ae8c55986db8e947ec92c7bd678f0c045cf37014b2910ec7c811e',
        expectedDeployedSourceCommit: DEPLOYED,
        ...(scenario.reviewed ?? {}),
      };
  const result = await module.namespace.sealStagingHandoff(
    challenge,
    api,
    scenario.account ?? ACCOUNT,
    reviewed,
  );
  let independentlyDecrypted = false,
    completeHeaderMatches = false,
    frameProfileValid = false,
    boundHeader = null;
  if (result.result === 'sealed') {
    const frame = JSON.parse(result.frame);
    const protectedText = Buffer.from(frame.protected, 'base64url').toString();
    boundHeader = JSON.parse(protectedText);
    completeHeaderMatches = protectedText === JSON.stringify(header(challenge));
    frameProfileValid =
      same(Object.keys(frame), ['protected', 'encryptedKey', 'iv', 'ciphertext']) &&
      Object.values(frame).every(
        (v) => typeof v === 'string' && /^[A-Za-z0-9_-]+$/.test(v) && b64(from64(v)) === v,
      ) &&
      from64(frame.encryptedKey).length === 384 &&
      from64(frame.iv).length === 12 &&
      from64(frame.ciphertext).length ===
        bytes(JSON.stringify(challenge.mode === 'probe' ? PROBE : SYNTHETIC)).length + 16;
    const raw = await webcrypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      pair.privateKey,
      from64(frame.encryptedKey),
    );
    const aes = await webcrypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    const clear = await webcrypto.subtle.decrypt(
      { name: 'AES-GCM', iv: from64(frame.iv), additionalData: bytes(frame.protected), tagLength: 128 },
      aes,
      from64(frame.ciphertext),
    );
    independentlyDecrypted = same(
      JSON.parse(new TextDecoder().decode(clear)),
      challenge.mode === 'probe' ? PROBE : SYNTHETIC,
    );
  }
  const serialized = JSON.stringify(result);
  return {
    result,
    calls,
    cryptoCalls,
    independentlyDecrypted,
    completeHeaderMatches,
    frameProfileValid,
    boundHeader,
    leaked: [
      SYNTHETIC.client_id,
      SYNTHETIC.client_secret,
      PROBE.client_id,
      PROBE.client_secret,
      PRIVATE_ERROR,
    ].some((s) => serialized.includes(s)),
  };
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

function denied(result, code) {
  assert.equal(result.result.result, 'failed');
  if (code) assert.equal(result.result.code, code);
  assert.equal(result.childCount, 0);
  assert.equal(result.networkCalls, 0);
  assert.equal(result.plaintextInOutput, false);
  assert.equal(result.inputDestroyed, true);
  assert.equal(result.timersLeft, 0);
}

async function ownRepo() {
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-handoff-test-')));
  for (const name of ['staging-handoff.mjs', 'staging-handoff-seal.mjs', 'verify-remote-staging.mjs']) {
    await fs.mkdir(path.join(dir, 'scripts'), { recursive: true });
    await fs.copyFile(path.join(REPO, 'scripts', name), path.join(dir, 'scripts', name));
  }
  const files = {
    'package.json': '{"type":"module"}\n',
    'package-lock.json': '{}\n',
    'tsconfig.json': '{}\n',
    'src/probe.ts': '// nonexecuted source fixture\n',
    'dist/probe.js': '// nonexecuted runtime fixture\n',
    'node_modules/@modelcontextprotocol/client/package.json': '{"version":"2.3.0"}\n',
  };
  for (const [name, value] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(dir, name)), { recursive: true });
    await fs.writeFile(path.join(dir, name), value);
  }
  const environment = safeEnvironment();
  for (const args of [
    ['init', '-q'],
    ['add', '--', 'scripts', 'src', 'package.json', 'package-lock.json', 'tsconfig.json'],
    [
      '-c',
      'user.name=Owned Test',
      '-c',
      'user.email=owned-test@example.invalid',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '-qm',
      'owned synthetic fixture',
    ],
  ]) {
    const child = spawnSync('git', args, { cwd: dir, env: environment, encoding: 'utf8', timeout: 10000 });
    assert.equal(child.status, 0, child.stderr);
  }
  return dir;
}
async function withOwnedAlias(dir, action) {
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-handoff-alias-')));
  const alias = path.join(parent, 'repo');
  let linked = false;
  try {
    await fs.symlink(dir, alias, process.platform === 'win32' ? 'junction' : 'dir');
    linked = true;
    await action(alias);
  } finally {
    if (linked) await fs.unlink(alias);
    await fs.rmdir(parent);
  }
}
function safeEnvironment() {
  const env = {};
  for (const name of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP'])
    if (process.env[name]) env[name] = process.env[name];
  return env;
}
function inspect(dir) {
  const child = spawnSync(
    process.execPath,
    [path.join(dir, 'scripts/staging-handoff.mjs'), '--describe-source'],
    { cwd: dir, env: safeEnvironment(), encoding: 'utf8', timeout: 15000, maxBuffer: 16384 },
  );
  assert.equal(child.status, 0, child.stderr || child.stdout);
  assert.equal(child.stderr, '');
  const result = JSON.parse(child.stdout);
  assert.match(result.localSourceCommit, /^[a-f0-9]{40}$/);
  assert.match(result.bundleSha256, /^[a-f0-9]{64}$/);
  return result;
}
async function realProbe(dir, alter = {}) {
  const source = inspect(dir);
  const env = {
    ...safeEnvironment(),
    MTERM_STAGING_HANDOFF_MODE: 'probe',
    MTERM_STAGING_LOCAL_SOURCE_COMMIT: source.localSourceCommit,
    MTERM_STAGING_HANDOFF_BUNDLE_SHA256: source.bundleSha256,
    MTERM_STAGING_EXPECTED_SOURCE_COMMIT: DEPLOYED,
    ...alter.env,
  };
  let child,
    watchdog,
    outerTimer,
    closed = false,
    hardStopped = false,
    workError,
    work;
  let output = '',
    error = '',
    pending = '',
    sent = false,
    closedPromise;
  const retain = () =>
    Object.assign(
      new Error('Owned probe closure is unconfirmed; retain fixture for exact-process review: ' + dir),
      { retainFixture: true },
    );
  try {
    child = spawn(process.execPath, [path.join(dir, 'scripts/staging-handoff.mjs')], {
      cwd: dir,
      env,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    closedPromise = new Promise((resolve) => {
      child.once('error', () => {
        workError = new Error('Owned probe spawn failed');
      });
      child.once('close', (code, signal) => {
        closed = true;
        resolve({ code, signal });
      });
    });
    watchdog = setTimeout(() => {
      hardStopped = true;
      try {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      } catch {
        /* retained failure below */
      }
      child.stdin.destroy();
    }, 15000);
    const outerBound = new Promise((_, reject) => {
      outerTimer = setTimeout(() => reject(retain()), 20000);
    });
    child.stdin.on('error', () => {});
    child.stdout.on('data', (chunk) => {
      output += chunk;
      pending += chunk;
      if (output.length > 65536) {
        workError = new Error('Owned probe output exceeded fixture bound');
        child.stdin.destroy();
        return;
      }
      for (;;) {
        const end = pending.indexOf('\n');
        if (end < 0) break;
        const line = pending.slice(0, end);
        pending = pending.slice(end + 1);
        let value;
        try {
          value = JSON.parse(line);
        } catch {
          continue;
        }
        if (value.type === 'mterm-staging-handoff-challenge') {
          work = (async () => {
            if (alter.drift) await fs.appendFile(path.join(dir, 'dist/probe.js'), '// drift\n');
            const frame = await independentEnvelope(value, alter);
            sent = true;
            child.stdin.write(frame + '\n' + (alter.secondFrame ? frame + '\n' : ''));
          })().catch(() => {
            workError = new Error('Owned fixture envelope construction failed');
            child.stdin.destroy();
          });
        }
      }
    });
    child.stderr.on('data', (chunk) => {
      error += chunk;
    });
    const ended = await Promise.race([closedPromise, outerBound]);
    if (work) await Promise.race([work, outerBound]);
    const records = output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const receipt = records.at(-1);
    // Native receiver close plus a fixed-child receipt is not an independent
    // OS process-tree inventory. Root's later Windows gate remains separate.
    if (
      hardStopped ||
      !closed ||
      (sent && (!receipt?.child || receipt.type !== 'mterm-staging-handoff-result')) ||
      (receipt?.child?.started && receipt.child.closed !== true)
    )
      throw retain();
    if (workError) throw workError;
    return {
      ...ended,
      records,
      error,
      sent,
      parentNaturallyClosed: true,
      leaked: [
        PROBE.client_id,
        PROBE.client_secret,
        SYNTHETIC.client_id,
        SYNTHETIC.client_secret,
        PRIVATE_ERROR,
      ].some((v) => output.includes(v) || error.includes(v)),
    };
  } catch (error) {
    if (child && (!closed || hardStopped || sent)) error.retainFixture = true;
    throw error;
  } finally {
    clearTimeout(watchdog);
    clearTimeout(outerTimer);
    if (child) {
      child.stdin.destroy();
      try {
        if (!closed && child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      } catch {
        /* preserve unconfirmed fixture */
      }
      let cleanupTimer;
      if (!closed && closedPromise) {
        try {
          await Promise.race([
            closedPromise,
            new Promise((resolve) => {
              cleanupTimer = setTimeout(resolve, 5000);
            }),
          ]);
        } finally {
          clearTimeout(cleanupTimer);
        }
      }
      child.stdout.destroy();
      child.stderr.destroy();
      if (!closed) child.unref();
    }
  }
}

if (process.argv.includes(CHILD)) {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const { kind, scenario } = JSON.parse(input);
  process.stdout.write(
    JSON.stringify(await (kind === 'sender' ? senderFixture(scenario) : unitFixture(scenario))),
  );
} else {
  for (const mode of ['probe', 'smoke'])
    test('handoff receiver: independent real-crypto ' + mode + ' frame reaches only the fixed child', () => {
      const r = unit('receiver', { mode, replay: true });
      assert.equal(r.result.result, 'passed');
      assert.equal(r.childCount, 1);
      assert.equal(r.childInputMatches, true);
      assert.equal(r.privateKeyNonextractable, true);
      assert.equal(r.decryptCalls, 2);
      assert.ok(r.nativeDigestCalls >= 1);
      assert.equal(r.challenge.localSourceCommit, LOCAL);
      assert.equal(r.challenge.expectedDeployedSourceCommit, DEPLOYED);
      assert.deepEqual(r.childArgs, [
        '/trusted/node',
        '/virtual/repo/scripts/' + (mode === 'probe' ? 'staging-handoff.mjs' : 'verify-remote-staging.mjs'),
        ...(mode === 'probe' ? ['--probe-child'] : []),
      ]);
      assert.equal(r.childEnvKeys.includes('SECRET_PARENT_ENV'), false);
      assert.equal(r.childEnvContainsPlaintext, false);
      assert.equal(r.plaintextInOutput, false);
      assert.equal(r.inputDestroyed, true);
      assert.equal(r.childClosed, true);
      assert.equal(r.timersLeft, 0);
      assert.equal(r.replay.result, 'failed');
      assert.equal(r.replay.code, 'RECEIVER_ALREADY_USED');
      assert.ok(r.timerBudgets.includes(450000));
    });
  test('handoff receiver: concurrent invocation cannot create another key or child', () => {
    const r = unit('receiver', { concurrent: true });
    assert.equal(r.result.result, 'passed');
    assert.equal(r.childCount, 1);
    assert.equal(r.replay.code, 'RECEIVER_ALREADY_USED');
  });
  test('handoff receiver: a second chunk during native unwrap is rejected by the closed input', () => {
    const r = unit('receiver', { lateDuplicate: true });
    assert.equal(r.result.result, 'passed');
    assert.equal(r.lateDuplicateRejected, true);
    assert.equal(r.childCount, 1);
  });
  for (const [label, scenario] of [
    ['mode', { env: { MTERM_STAGING_HANDOFF_MODE: '' } }],
    ['local commit', { env: { MTERM_STAGING_LOCAL_SOURCE_COMMIT: 'A'.repeat(40) } }],
    ['deployed commit', { env: { MTERM_STAGING_EXPECTED_SOURCE_COMMIT: '' } }],
    ['bundle', { env: { MTERM_STAGING_HANDOFF_BUNDLE_SHA256: '00' } }],
    ['preload argv', { preload: true }],
    ['NODE_OPTIONS', { env: { NODE_OPTIONS: '--import=' + PRIVATE_ERROR } }],
    ['case insensitive NODE_OPTIONS', { env: { node_options: '--require=' + PRIVATE_ERROR } }],
    ['TLS override', { env: { NODE_TLS_REJECT_UNAUTHORIZED: '0' } }],
    ['dirty source', { dirty: true }],
    ['wrong HEAD', { wrongHead: true }],
    ['symlink runtime', { symlink: true }],
  ])
    test('handoff receiver: rejects invalid ' + label + ' before challenge', () => {
      const r = unit('receiver', scenario);
      denied(r);
      assert.equal(r.challenge, null);
      assert.equal(r.decryptCalls, 0);
    });
  for (const [key, value] of [
    ['protocol', 2],
    ['purpose', 'other'],
    ['mode', 'smoke'],
    ['alg', 'RSA-OAEP'],
    ['enc', 'A128GCM'],
    ['runNonce', 'cd'.repeat(16)],
    ['recipientKeySha256', '00'.repeat(32)],
    ['expiresAt', FIXED_NOW + 120001],
    ['accountId', '00'.repeat(16)],
    ['origins', ['https://untrusted.invalid']],
    ['localSourceCommit', DEPLOYED],
    ['localBundleSha256', '00'.repeat(32)],
    ['receiverSha256', '00'.repeat(32)],
    ['sealerSha256', '00'.repeat(32)],
    ['harnessSha256', '00'.repeat(32)],
    ['expectedDeployedSourceCommit', LOCAL],
    ['tokenName', 'other'],
    ['tokenDuration', '8760h'],
    ['tokenId', TOKEN],
  ])
    test('handoff receiver: authenticated mismatching ' + key + ' is denied', () =>
      denied(unit('receiver', { header: { [key]: value } })),
    );
  for (const option of [
    'headerWhitespace',
    'duplicateHeader',
    'frameExtra',
    'badEncoding',
    'shortIv',
    'shortKey',
    'shortAes',
    'shortCiphertext',
    'outerWhitespace',
    'duplicateOuter',
    'invalidJson',
    'oversized',
    'truncated',
    'secondFrame',
    'eof',
    'wrongKey',
  ]) {
    test('handoff receiver: rejects ' + option + ' without a child', () =>
      denied(unit('receiver', { [option]: true })),
    );
  }
  for (const part of ['encryptedKey', 'iv', 'ciphertext'])
    test('handoff receiver: tampered ' + part + ' fails native crypto', () =>
      denied(unit('receiver', { tamper: part })),
    );
  for (const where of [
    'generateKey',
    'exportKey',
    'digest',
    'unwrap',
    'importKey',
    'decrypt',
    'source',
    'post-decrypt-source',
  ]) {
    test('handoff receiver: exact deadline after ' + where + ' is denied', () =>
      denied(unit('receiver', { expireAt: where }), 'HANDOFF_EXPIRED'),
    );
  }
  test('handoff receiver: wall rollback cannot extend monotonic deadline', () =>
    denied(unit('receiver', { rollbackAt: 'unwrap' }), 'HANDOFF_EXPIRED'));
  test('handoff receiver: one millisecond before final crypto deadline remains valid', () => {
    const r = unit('receiver', { expireAt: 'decrypt', offset: -1 });
    assert.equal(r.result.result, 'passed');
    assert.equal(r.childInputMatches, true);
  });
  test('handoff receiver: expiry after child spawn prevents plaintext pipe release', () => {
    const r = unit('receiver', { expireAt: 'spawn' });
    assert.equal(r.result.result, 'failed');
    assert.equal(r.result.code, 'HANDOFF_EXPIRED');
    assert.equal(r.childCount, 1);
    assert.equal(r.childInputMatches, false);
    assert.equal(r.childClosed, true);
    assert.equal(r.timersLeft, 0);
  });
  test('handoff receiver: source drift after spawn prevents plaintext release', () => {
    const r = unit('receiver', { driftAt: 'spawn' });
    assert.equal(r.result.result, 'failed');
    assert.equal(r.result.code, 'SOURCE_MISMATCH');
    assert.equal(r.childCount, 1);
    assert.equal(r.childInputMatches, false);
    assert.equal(r.childClosed, true);
  });
  for (const [field, value] of [
    ['tokenId', null],
    ['tokenId', '../other'],
    ['tokenCreatedAt', null],
    ['tokenCreatedAt', FIXED_NOW + 1800000],
    ['tokenExpiresAt', FIXED_NOW],
    ['tokenExpiresAt', FIXED_NOW + 3600000],
  ]) {
    test('handoff receiver: smoke token metadata rejects ' + field + ' ' + String(value), () =>
      denied(unit('receiver', { mode: 'smoke', header: { [field]: value } })),
    );
  }
  test('handoff receiver: source drift after native decrypt denies admission', () =>
    denied(unit('receiver', { driftAt: 'decrypt' }), 'SOURCE_MISMATCH'));
  test('handoff receiver: closes an idle ciphertext input on bounded timeout', () =>
    denied(unit('receiver', { inputTimeout: true }), 'HANDOFF_EXPIRED'));
  test('handoff receiver: probe rejects nonfixed synthetic credentials', () =>
    denied(unit('receiver', { plaintext: JSON.stringify(SYNTHETIC) }), 'PROBE_PAYLOAD_REJECTED'));
  for (const plaintext of [
    '{}',
    '{"client_id":"bad","client_secret":"short"}',
    JSON.stringify({ ...PROBE, command: PRIVATE_ERROR }),
  ]) {
    test('handoff receiver: credential shape rejection stays private ' + hash(plaintext).slice(0, 8), () =>
      denied(unit('receiver', { plaintext })),
    );
  }
  for (const child of [
    'spawn-throw',
    'early-exit',
    'stdin-error',
    'hang',
    'stderr',
    'leak',
    'overflow',
    'bad-summary',
    'failed',
    'late-output-before-close',
  ]) {
    test('handoff receiver: child ' + child + ' fails with filtered output and lifecycle state', () => {
      const r = unit('receiver', { child });
      assert.equal(r.result.result, 'failed');
      assert.equal(r.childCount, 1);
      assert.equal(r.plaintextInOutput, false);
      assert.equal(r.inputDestroyed, true);
      assert.equal(r.timersLeft, 0);
      if (child !== 'spawn-throw') assert.equal(r.childClosed || r.result.cleanup === 'unconfirmed', true);
      assert.equal(r.childEnvContainsPlaintext, false);
      if (child === 'hang' || child === 'overflow') {
        assert.equal(r.killCalls, 1);
        assert.equal(r.result.cleanup, 'unconfirmed');
      }
    });
  }
  test('handoff receiver: outer deadline settles a pending native stdin final when kill is unconfirmed', () => {
    const r = unit('receiver', { child: 'pending-write-kill-false' });
    assert.equal(r.pendingFinalReached, true);
    assert.equal(r.childInputMatches, true);
    assert.equal(r.killCalls, 1);
    assert.equal(r.settledBeforeFixtureCleanup, true);
    assert.equal(r.result.result, 'failed');
    assert.equal(r.result.code, 'CHILD_TIMEOUT');
    assert.equal(r.result.cleanup, 'unconfirmed');
    assert.equal(r.childClosed, false);
    assert.equal(r.pendingPipeDestroyed, true);
    assert.equal(r.inputDestroyed, true);
    assert.equal(r.timersLeft, 0);
    assert.equal(r.plaintextInOutput, false);
  });
  for (const mode of ['probe', 'smoke'])
    test('handoff sealer: independent decryption verifies fixed ' + mode + ' envelope', () => {
      const r = unit('sender', { mode });
      assert.equal(r.result.result, 'sealed');
      assert.equal(r.independentlyDecrypted, true);
      assert.equal(r.completeHeaderMatches, true);
      assert.equal(r.frameProfileValid, true);
      assert.equal(r.leaked, false);
      assert.equal(r.boundHeader.localSourceCommit, LOCAL);
      assert.equal(r.boundHeader.expectedDeployedSourceCommit, DEPLOYED);
      assert.equal(r.boundHeader.alg, 'RSA-OAEP-256');
      assert.equal(r.boundHeader.enc, 'A256GCM');
      assert.equal(r.calls.length, mode === 'probe' ? 0 : 1);
      if (mode === 'smoke') {
        assert.deepEqual(r.calls[0], {
          method: 'POST',
          path: '/accounts/' + ACCOUNT + '/access/service_tokens',
          body: { name: 'mterm-staging-handoff-' + 'ab'.repeat(16), duration: '30m' },
        });
        assert.ok(r.cryptoCalls.filter((c) => c.beforeCreate && c.method === 'encrypt').length >= 2);
      }
    });
  for (const [label, scenario] of [
    ['weak key', { weakKey: true }],
    ['missing reviewed selection', { noReviewed: true }],
    ['reviewed mode mismatch', { reviewed: { mode: 'probe' } }],
    ['reviewed local mismatch', { reviewed: { localSourceCommit: DEPLOYED } }],
    ['reviewed bundle mismatch', { reviewed: { localBundleSha256: '00'.repeat(32) } }],
    ['reviewed deployed mismatch', { reviewed: { expectedDeployedSourceCommit: LOCAL } }],
    ['reviewed receiver mismatch', { reviewed: { receiverSha256: '00'.repeat(32) } }],
    ['reviewed sealer mismatch', { reviewed: { sealerSha256: '00'.repeat(32) } }],
    ['reviewed harness mismatch', { reviewed: { harnessSha256: '00'.repeat(32) } }],
    ['wrong selected account', { account: '00'.repeat(16) }],
    ['bad key digest', { challenge: { recipientKeySha256: '00'.repeat(32) } }],
    ['unbounded expiry', { challenge: { expiresAt: FIXED_NOW + 120001 } }],
    ['already expired', { challenge: { expiresAt: FIXED_NOW } }],
    ['untrusted origin', { challenge: { origins: ['https://untrusted.invalid'] } }],
    ['wrong harness', { challenge: { harnessSha256: '00'.repeat(32) } }],
    ['year default', { challenge: { tokenDuration: '8760h' } }],
    ['invalid local commit', { challenge: { localSourceCommit: 'bad' } }],
    ['extra security field', { challenge: { url: 'https://untrusted.invalid' } }],
  ])
    test('handoff sealer: ' + label + ' is rejected before resource creation', () => {
      const r = unit('sender', scenario);
      assert.equal(r.result.result, 'failed');
      assert.equal(r.calls.length, 0);
      assert.equal(r.leaked, false);
    });
  test('handoff sealer: public probe never calls even a throwing API adapter', () => {
    const r = unit('sender', { mode: 'probe', throwingApi: true });
    assert.equal(r.result.result, 'sealed');
    assert.equal(r.calls.length, 0);
    assert.equal(r.independentlyDecrypted, true);
    assert.equal(r.leaked, false);
  });
  for (const expireAt of ['importKey', 'digest', 'encrypt'])
    test('handoff sealer: exact expiry after native ' + expireAt + ' precedes creation', () => {
      const r = unit('sender', { expireAt });
      assert.equal(r.result.result, 'failed');
      assert.equal(r.calls.length, 0);
      assert.equal(r.leaked, false);
    });
  test('handoff sealer: one millisecond before post-crypto expiry admits the exact create', () => {
    const r = unit('sender', { expireAt: 'encrypt', offset: -1 });
    assert.equal(r.result.result, 'sealed');
    assert.equal(r.calls.length, 1);
    assert.equal(r.independentlyDecrypted, true);
    assert.equal(r.completeHeaderMatches, true);
    assert.equal(r.frameProfileValid, true);
  });
  for (const cryptoFailure of ['importKey', 'digest', 'encrypt'])
    test('handoff sealer: crypto ' + cryptoFailure + ' failure precedes creation', () => {
      const r = unit('sender', { cryptoFailure });
      assert.equal(r.result.result, 'failed');
      assert.equal(r.calls.length, 0);
      assert.equal(r.leaked, false);
    });
  test('handoff sealer: create failure is unknown and never blindly retried', () => {
    const r = unit('sender', { createFailure: true });
    assert.equal(r.result.result, 'failed');
    assert.equal(r.calls.length, 1);
    assert.equal(r.result.cleanup.status, 'creation-outcome-unknown');
    assert.equal(r.leaked, false);
  });
  for (const [label, scenario] of [
    ['sealing failure', { sealFailure: true }],
    ['late expiry', { expireAfterCreate: true }],
    ['expiry after sealing', { expireAfterSeal: true }],
    ['bad credential', { response: { client_secret: PRIVATE_ERROR + '!' } }],
    ['wrong token name', { response: { name: 'other' } }],
  ]) {
    test('handoff sealer: ' + label + ' deletes only the exact newly returned token', () => {
      const r = unit('sender', scenario);
      assert.equal(r.result.result, 'failed');
      assert.equal(r.calls.length, 2);
      assert.deepEqual(r.calls[1], {
        method: 'DELETE',
        path: '/accounts/' + ACCOUNT + '/access/service_tokens/' + TOKEN,
      });
      assert.equal(r.result.cleanup.status, 'deleted');
      assert.equal(r.leaked, false);
    });
  }
  for (const option of ['deleteFailure', 'deleteRejected', 'deleteMismatch'])
    test('handoff sealer: ' + option + ' keeps exact resource reconciliation pending', () => {
      const r = unit('sender', { sealFailure: true, [option]: true });
      assert.equal(r.result.result, 'failed');
      assert.equal(r.calls.length, 2);
      assert.equal(r.result.cleanup.status, 'delete-unconfirmed');
      assert.equal(r.result.cleanup.tokenId, TOKEN);
      assert.equal(r.leaked, false);
    });
  test('handoff sealer: malformed creation ID is never used in a deletion path', () => {
    const r = unit('sender', { response: { id: '../' + PRIVATE_ERROR } });
    assert.equal(r.result.result, 'failed');
    assert.equal(r.calls.length, 1);
    assert.equal(r.result.cleanup.status, 'creation-outcome-unknown');
    assert.equal(r.leaked, false);
  });
  for (const [label, alter, expected] of [
    ['normal', {}, 0],
    ['source drift', { drift: true }, 1],
    ['wrong probe payload', { plaintext: JSON.stringify(SYNTHETIC) }, 1],
    ['duplicate frame', { secondFrame: true }, 1],
  ]) {
    test(
      'handoff real process: ' +
        label +
        ' observes receiver closure and fixed-child receipt while writer stays open',
      async () => {
        const dir = await ownRepo();
        let retainFixture = false;
        try {
          const r = await realProbe(dir, alter);
          assert.equal(r.parentNaturallyClosed, true);
          assert.equal(r.code, expected);
          assert.equal(r.signal, null);
          assert.equal(r.error, '');
          assert.equal(r.leaked, false);
          assert.equal(r.sent, true);
          assert.equal(r.records.at(-1).type, 'mterm-staging-handoff-result');
          if (!expected) {
            assert.equal(r.records.at(-1).result, 'passed');
            assert.equal(r.records.at(-1).child.closed, true);
          }
        } catch (error) {
          retainFixture = error.retainFixture === true;
          throw error;
        } finally {
          if (!retainFixture) await fs.rm(dir, { recursive: true, force: true });
        }
      },
    );
  }
  test('handoff real process: bare probe child has child-only evidence and no parent success claim', async () => {
    const dir = await ownRepo();
    try {
      const child = spawnSync(
        process.execPath,
        [path.join(dir, 'scripts/staging-handoff.mjs'), '--probe-child'],
        { env: safeEnvironment(), input: JSON.stringify(PROBE) + '\n', encoding: 'utf8', timeout: 5000 },
      );
      assert.equal(child.status, 0);
      assert.equal(child.stderr, '');
      assert.deepEqual(JSON.parse(child.stdout), {
        type: 'mterm-staging-handoff-probe-child',
        received: true,
      });
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
  test('handoff native path: directory alias selects the real descriptor entry point', async () => {
    const dir = await ownRepo();
    try {
      const expected = inspect(dir);
      await withOwnedAlias(dir, async (alias) => {
        const child = spawnSync(
          process.execPath,
          [path.join(alias, 'scripts/staging-handoff.mjs'), '--describe-source'],
          { cwd: dir, env: safeEnvironment(), encoding: 'utf8', timeout: 15000, maxBuffer: 16384 },
        );
        assert.ifError(child.error);
        assert.equal(child.status, 0);
        assert.equal(child.signal, null);
        assert.equal(child.stderr, '');
        assert.notEqual(child.stdout, '', 'aliased CLI invocation emits its source descriptor');
        assert.deepEqual(JSON.parse(child.stdout), expected);
      });
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
  test('handoff native path: directory alias selects only the fixed probe child', async () => {
    const dir = await ownRepo();
    try {
      await withOwnedAlias(dir, async (alias) => {
        const child = spawnSync(
          process.execPath,
          [path.join(alias, 'scripts/staging-handoff.mjs'), '--probe-child'],
          {
            cwd: dir,
            env: safeEnvironment(),
            input: JSON.stringify(PROBE) + '\n',
            encoding: 'utf8',
            timeout: 5000,
            maxBuffer: 16384,
          },
        );
        assert.ifError(child.error);
        assert.equal(child.status, 0);
        assert.equal(child.signal, null);
        assert.equal(child.stderr, '');
        assert.notEqual(child.stdout, '', 'aliased CLI invocation emits its child-only receipt');
        assert.deepEqual(JSON.parse(child.stdout), {
          type: 'mterm-staging-handoff-probe-child',
          received: true,
        });
      });
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
  test('handoff native path: importing from a different file never selects the CLI', async () => {
    const dir = await ownRepo();
    try {
      const wrapper = path.join(dir, 'import-only.mjs');
      const marker = '{"type":"owned-import-wrapper"}\n';
      await fs.writeFile(
        wrapper,
        "import './scripts/staging-handoff.mjs';\nprocess.stdout.write(" + JSON.stringify(marker) + ');\n',
      );
      const child = spawnSync(process.execPath, [wrapper], {
        cwd: dir,
        env: safeEnvironment(),
        input: JSON.stringify(PROBE) + '\n',
        encoding: 'utf8',
        timeout: 5000,
        maxBuffer: 16384,
      });
      assert.ifError(child.error);
      assert.equal(child.status, 0);
      assert.equal(child.signal, null);
      assert.equal(child.stderr, '');
      assert.equal(child.stdout, marker);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
}
