// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-staging-handoff (OpenAI / GPT-6 Astra Pro; self-reported)
// Fixed-purpose, one-shot receiver. Only ciphertext crosses the outer stdin.
// Source bindings are reviewed-byte observations, not hostile-host attestation.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, webcrypto, randomBytes } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ACCOUNT = '9e18ebcb3c1a920c9ef58a3d61b8d6b6';
const ORIGINS = ['https://mcp-staging.m-techlabs.com', 'https://mterm-staging.m-techlabs.com'];
const HARNESS = '208ac5b3296ae8c55986db8e947ec92c7bd678f0c045cf37014b2910ec7c811e';
const PROBE = {
  client_id: 'mterm_public_probe.access',
  client_secret: 'MTERM_PUBLIC_PROBE_ONLY_NO_CREDENTIAL',
};
const PROBE_RECEIPT = { type: 'mterm-staging-handoff-probe-child', received: true };
const SOURCES = [
  'scripts/staging-handoff.mjs',
  'scripts/staging-handoff-seal.mjs',
  'scripts/verify-remote-staging.mjs',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'src',
];
const SOURCE_FILES = SOURCES.filter((p) => p !== 'src');
const DELIVERY_MS = 120000,
  CHILD_MS = 450000,
  CLOSE_MS = 5000,
  FRAME_BYTES = 16384,
  OUTPUT_BYTES = 65536;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HEX40 = /^[0-9a-f]{40}$/,
  HEX64 = /^[0-9a-f]{64}$/;
const CHECKS = new Set([
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
  'final_staging_build_identity',
]);
let receiverUsed = false;
class HandoffError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
function requireValue(value, code) {
  if (!value) throw new HandoffError(code);
}
function failure(error) {
  return error instanceof HandoffError ? error.code : 'HANDOFF_FAILED';
}
const digest = (value) => createHash('sha256').update(value).digest('hex');
const canonical = (value, pattern) => typeof value === 'string' && pattern.test(value);
function samePath(a, b) {
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}
function runtime() {
  requireValue(Number(process.versions.node.split('.')[0]) >= 24, 'NODE_24_REQUIRED');
  requireValue(process.execArgv.length === 0, 'RUNTIME_HOOKS_REJECTED');
  const blocked =
    /^(NODE_OPTIONS|NODE_PATH|NODE_EXTRA_CA_CERTS|NODE_TLS_REJECT_UNAUTHORIZED|NODE_V8_COVERAGE|NODE_REPL_EXTERNAL_MODULE|SSLKEYLOGFILE|LD_PRELOAD|LD_LIBRARY_PATH|DYLD_INSERT_LIBRARIES|DYLD_LIBRARY_PATH)$/i;
  requireValue(
    !Object.entries(process.env).some(([key, value]) => blocked.test(key) && value),
    'RUNTIME_HOOKS_REJECTED',
  );
}
function environment(git = false) {
  const result = {};
  for (const name of ['SystemRoot', 'WINDIR', 'TEMP', 'TMP']) {
    const entry = Object.entries(process.env).find(([key]) => key.toLowerCase() === name.toLowerCase());
    if (entry && typeof entry[1] === 'string' && entry[1].length <= 4096 && !/[\x00-\x1f\x7f]/.test(entry[1]))
      result[name] = entry[1];
  }
  if (git) {
    const entry = Object.entries(process.env).find(([key]) => key.toLowerCase() === 'path');
    if (entry) result.PATH = entry[1];
    result.GIT_NO_REPLACE_OBJECTS = '1';
    result.GIT_OPTIONAL_LOCKS = '0';
  } else if (process.platform === 'win32') {
    requireValue(
      typeof result.SystemRoot === 'string' && /^[A-Za-z]:\\/.test(result.SystemRoot),
      'SYSTEM_ROOT_REQUIRED',
    );
    result.PATH =
      result.SystemRoot + '\\System32;' + result.SystemRoot + '\\System32\\WindowsPowerShell\\v1.0';
  } else result.PATH = '/usr/bin:/bin';
  return result;
}
function git(args) {
  return new Promise((resolve, reject) => {
    execFile(
      'git',
      ['--no-optional-locks', ...args],
      {
        cwd: ROOT,
        env: environment(true),
        shell: false,
        windowsHide: true,
        timeout: 5000,
        maxBuffer: 2097152,
        encoding: 'utf8',
      },
      (error, stdout, stderr) => {
        if (error || stderr) reject(new HandoffError('SOURCE_GIT_FAILED'));
        else resolve(stdout);
      },
    );
  });
}
export async function describeSource() {
  runtime();
  const rootStat = await fs.lstat(ROOT);
  requireValue(
    rootStat.isDirectory() && !rootStat.isSymbolicLink() && samePath(await fs.realpath(ROOT), ROOT),
    'SOURCE_UNSAFE',
  );
  const localSourceCommit = (await git(['rev-parse', '--verify', 'HEAD'])).trim();
  requireValue(canonical(localSourceCommit, HEX40), 'SOURCE_MISMATCH');
  // Object reads avoid diff drivers, clean filters, hooks and dependency execution.
  const rawTree = await git(['ls-tree', '-r', '-z', 'HEAD', '--', ...SOURCES]);
  const committed = new Map();
  for (const row of rawTree.split('\0').filter(Boolean)) {
    const match = /^(100644|100755) blob ([0-9a-f]{40})\t([^\x00-\x1f\x7f]+)$/.exec(row);
    requireValue(
      match && (SOURCE_FILES.includes(match[3]) || match[3].startsWith('src/')),
      'SOURCE_MISMATCH',
    );
    committed.set(match[3], match[2]);
  }
  requireValue(
    SOURCE_FILES.every((name) => committed.has(name)),
    'SOURCE_MISMATCH',
  );
  const files = new Map();
  let total = 0;
  async function visit(relative, depth = 0) {
    requireValue(depth <= 32 && files.size < 20000 && !/[\x00-\x1f\x7f]/.test(relative), 'SOURCE_LIMIT');
    const full = path.join(ROOT, ...relative.split('/'));
    const stat = await fs.lstat(full);
    requireValue(!stat.isSymbolicLink() && samePath(await fs.realpath(full), full), 'SOURCE_UNSAFE');
    if (stat.isDirectory()) {
      for (const entry of await fs.readdir(full, { withFileTypes: true })) {
        if (relative === 'node_modules' && entry.name === '.bin') continue;
        requireValue(
          entry.name !== '.' &&
            entry.name !== '..' &&
            !entry.name.includes('/') &&
            !entry.name.includes('\\'),
          'SOURCE_UNSAFE',
        );
        await visit(relative + '/' + entry.name, depth + 1);
      }
      return;
    }
    requireValue(stat.isFile() && !(stat.nlink > 1) && stat.size <= 67108864, 'SOURCE_UNSAFE');
    total += stat.size;
    requireValue(total <= 268435456, 'SOURCE_LIMIT');
    const content = await fs.readFile(full);
    requireValue(content.length === stat.size, 'SOURCE_MISMATCH');
    if (SOURCE_FILES.includes(relative) || relative.startsWith('src/')) {
      const object = createHash('sha1')
        .update('blob ' + content.length + '\0')
        .update(content)
        .digest('hex');
      requireValue(committed.get(relative) === object, 'SOURCE_MISMATCH');
      committed.delete(relative);
    }
    files.set(relative, digest(content));
  }
  for (const item of [...SOURCES, 'dist', 'node_modules']) await visit(item);
  requireValue(
    committed.size === 0 && files.get('scripts/verify-remote-staging.mjs') === HARNESS,
    'SOURCE_MISMATCH',
  );
  const bundleSha256 = digest(
    [...files]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([name, sha]) => name + '\0' + sha + '\n')
      .join(''),
  );
  return {
    type: 'mterm-staging-handoff-source',
    localSourceCommit,
    bundleSha256,
    receiverSha256: files.get('scripts/staging-handoff.mjs'),
    sealerSha256: files.get('scripts/staging-handoff-seal.mjs'),
    harnessSha256: HARNESS,
    fileCount: files.size,
    byteCount: total,
  };
}
function deadline() {
  const expiresAt = Date.now() + DELIVERY_MS,
    end = performance.now() + DELIVERY_MS;
  let expired = false;
  const check = () =>
    requireValue(!expired && Date.now() < expiresAt && performance.now() < end, 'HANDOFF_EXPIRED');
  return {
    expiresAt,
    check,
    async wait(action) {
      check();
      let timer;
      try {
        const answer = await Promise.race([
          Promise.resolve().then(action),
          new Promise((_, reject) => {
            timer = setTimeout(
              () => {
                expired = true;
                reject(new HandoffError('HANDOFF_EXPIRED'));
              },
              Math.max(1, Math.min(end - performance.now(), expiresAt - Date.now())),
            );
          }),
        ]);
        check();
        return answer;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
function readFrame(input, limit) {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0),
      finished = false;
    const finish = (error, value) => {
      if (finished) return;
      finished = true;
      input.removeListener('data', data);
      input.removeListener('end', ended);
      input.removeListener('close', ended);
      input.removeListener('error', failed);
      buffer.fill(0);
      buffer = Buffer.alloc(0);
      // pause/close of readline alone can leave a Windows input handle alive.
      input.destroy();
      if (error) reject(error);
      else resolve(value);
    };
    const failed = () => finish(new HandoffError('INPUT_REJECTED'));
    const ended = () => finish(new HandoffError('INPUT_CLOSED'));
    const data = (chunk) => {
      if (buffer.length + chunk.length > limit + 1) return finish(new HandoffError('INPUT_LIMIT'));
      buffer = Buffer.concat([buffer, Buffer.from(chunk)]);
      const at = buffer.indexOf(10);
      if (at < 0) return;
      if (at !== buffer.length - 1) return finish(new HandoffError('INPUT_MULTIPLE_FRAMES'));
      try {
        const value = new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, at));
        finish(null, value);
      } catch {
        failed();
      }
    };
    input.on('data', data);
    input.once('end', ended);
    input.once('close', ended);
    input.once('error', failed);
    input.resume();
  });
}
function exactObject(text, keys) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new HandoffError('ENVELOPE_REJECTED');
  }
  requireValue(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      JSON.stringify(Object.keys(value)) === JSON.stringify(keys) &&
      JSON.stringify(value) === text,
    'ENVELOPE_REJECTED',
  );
  return value;
}
function unbase64(value, maximum, length) {
  requireValue(
    typeof value === 'string' && value.length <= Math.ceil(maximum / 3) * 4 && /^[A-Za-z0-9_-]+$/.test(value),
    'ENVELOPE_REJECTED',
  );
  const data = Buffer.from(value, 'base64url');
  requireValue(
    data.length <= maximum &&
      data.toString('base64url') === value &&
      (length === undefined || data.length === length),
    'ENVELOPE_REJECTED',
  );
  return data;
}
function protectedHeader(challenge, token) {
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
    tokenId: token.tokenId,
    tokenCreatedAt: token.tokenCreatedAt,
    tokenExpiresAt: token.tokenExpiresAt,
  };
}
function credentials(text, mode) {
  const value = exactObject(text, ['client_id', 'client_secret']);
  requireValue(
    typeof value.client_id === 'string' &&
      /^[A-Za-z0-9_-]{8,256}\.access$/.test(value.client_id) &&
      typeof value.client_secret === 'string' &&
      /^[A-Za-z0-9_-]{16,1024}$/.test(value.client_secret),
    'CREDENTIAL_REJECTED',
  );
  requireValue(mode !== 'probe' || JSON.stringify(value) === JSON.stringify(PROBE), 'PROBE_PAYLOAD_REJECTED');
  return value;
}
function matchSource(actual, selected) {
  requireValue(
    actual.localSourceCommit === selected.localSourceCommit && actual.bundleSha256 === selected.bundleSha256,
    'SOURCE_MISMATCH',
  );
}
async function fixedChild(clear, mode, deployed, source, clock, state) {
  clock.check();
  const childEnv = environment();
  childEnv.MTERM_STAGING_EXPECTED_SOURCE_COMMIT = deployed;
  const args =
    mode === 'probe'
      ? [path.join(ROOT, 'scripts', 'staging-handoff.mjs'), '--probe-child']
      : [path.join(ROOT, 'scripts', 'verify-remote-staging.mjs')];
  clock.check();
  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    env: childEnv,
    shell: false,
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  state.started = Number.isSafeInteger(child.pid) && child.pid > 0;
  if (state.started) state.pid = child.pid;
  let settleClose,
    settleSpawn,
    closeTimer,
    outerTimer,
    failed,
    hard = false,
    released = false,
    writeFinished = false,
    output = '',
    bytes = 0,
    finalReceipt;
  const closed = new Promise((resolve) => {
    settleClose = resolve;
  });
  const spawned = new Promise((resolve) => {
    settleSpawn = resolve;
  });
  const stop = (code) => {
    if (hard) return;
    hard = true;
    failed ||= code;
    state.terminationRequested = true;
    closeTimer = setTimeout(() => settleClose(), CLOSE_MS);
    try {
      if (!state.closed && child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    } catch {
      /* Failure is not proof of termination. */
    }
  };
  const rejectOutput = () => {
    failed ||= 'CHILD_OUTPUT_REJECTED';
  };
  const line = (text) => {
    if (mode === 'probe') {
      if (text === JSON.stringify(PROBE_RECEIPT) && !finalReceipt) finalReceipt = { probe: true };
      else rejectOutput();
      return;
    }
    if (text === 'INPUT_REQUIRED') return;
    let value;
    try {
      value = JSON.parse(text);
    } catch {
      rejectOutput();
      return;
    }
    if (
      CHECKS.has(value?.check) &&
      ['passed', 'failed'].includes(value.status) &&
      Object.keys(value).every((k) =>
        ['check', 'status', 'code', 'httpStatus', 'runtimeErrorCode', 'protocolErrorCode'].includes(k),
      )
    ) {
      if (value.status === 'failed') failed ||= 'CHILD_FAILED';
      return;
    }
    const keys = [
      'result',
      'reportPath',
      'realWindowsReadViaDeployedGatewayAndSdk',
      'passedChecks',
      'humanLoginVerified',
      'chatgptConnectorVerified',
    ];
    if (
      !value ||
      JSON.stringify(Object.keys(value)) !== JSON.stringify(keys) ||
      finalReceipt ||
      !['passed', 'failed'].includes(value.result) ||
      typeof value.reportPath !== 'string' ||
      !Number.isSafeInteger(value.passedChecks) ||
      value.passedChecks < 0 ||
      value.passedChecks > 12 ||
      value.humanLoginVerified !== false ||
      value.chatgptConnectorVerified !== false ||
      typeof value.realWindowsReadViaDeployedGatewayAndSdk !== 'boolean'
    ) {
      rejectOutput();
      return;
    }
    const basename = path.basename(value.reportPath);
    if (
      path.dirname(value.reportPath) !== path.join(ROOT, 'artifacts', 'remote-staging-smoke') ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/.test(
        basename,
      )
    ) {
      rejectOutput();
      return;
    }
    finalReceipt = { reportFile: basename, passedChecks: value.passedChecks };
    if (
      value.result !== 'passed' ||
      !value.realWindowsReadViaDeployedGatewayAndSdk ||
      value.passedChecks !== 12
    )
      failed ||= 'CHILD_FAILED';
  };
  child.once('spawn', () => settleSpawn(true));
  child.on('error', () => {
    failed ||= 'CHILD_START_FAILED';
    settleSpawn(false);
    if (!state.started) settleClose();
  });
  child.once('close', (code, signal) => {
    state.closed = true;
    state.exitCode = Number.isSafeInteger(code) ? code : null;
    state.signal =
      signal === null
        ? null
        : ['SIGKILL', 'SIGTERM', 'SIGINT', 'SIGABRT', 'SIGSEGV'].includes(signal)
          ? signal
          : 'other';
    settleSpawn(false);
    settleClose();
  });
  child.stdin.on('error', () => {
    failed ||= 'CHILD_STDIN_FAILED';
  });
  child.stdout.on('error', rejectOutput);
  child.stderr.on('error', rejectOutput);
  child.stderr.on('data', (chunk) => {
    rejectOutput();
    bytes += chunk.length;
    if (bytes > OUTPUT_BYTES) stop('CHILD_OUTPUT_LIMIT');
  });
  child.stdout.on('data', (chunk) => {
    bytes += chunk.length;
    if (bytes > OUTPUT_BYTES) {
      output = '';
      stop('CHILD_OUTPUT_LIMIT');
      return;
    }
    if (hard) return;
    output += chunk.toString('utf8');
    if (output.length > 8192 && !output.includes('\n')) {
      output = '';
      stop('CHILD_OUTPUT_LIMIT');
      return;
    }
    for (;;) {
      const end = output.indexOf('\n');
      if (end < 0) break;
      const next = output.slice(0, end);
      output = output.slice(end + 1);
      line(next);
    }
  });
  outerTimer = setTimeout(() => stop('CHILD_TIMEOUT'), CHILD_MS);
  try {
    requireValue(await clock.wait(() => spawned), 'CHILD_START_FAILED');
    matchSource(await clock.wait(describeSource), source);
    clock.check();
    requireValue(
      !failed &&
        !state.closed &&
        child.exitCode === null &&
        child.signalCode === null &&
        !child.stdin.destroyed,
      'CHILD_STDIN_FAILED',
    );
    // No await after this final deadline/source decision and before pipe release.
    const written = new Promise((resolve, reject) => {
      child.stdin.once('error', () => reject(new HandoffError('CHILD_STDIN_FAILED')));
      child.stdin.once('finish', () => {
        writeFinished = true;
        resolve();
      });
      child.stdin.once('close', () => {
        if (!writeFinished) reject(new HandoffError('CHILD_STDIN_FAILED'));
      });
      released = true;
      child.stdin.end(JSON.stringify(clear) + '\n');
    });
    await Promise.race([
      written,
      closed.then(() => {
        requireValue(writeFinished, failed || 'CHILD_STDIN_FAILED');
      }),
    ]);
    clear.client_id = '';
    clear.client_secret = '';
    await closed;
    requireValue(
      state.closed &&
        state.exitCode === 0 &&
        state.signal === null &&
        writeFinished &&
        !failed &&
        !output &&
        finalReceipt,
      failed || 'CHILD_FAILED',
    );
    if (mode === 'smoke') state.reportFile = finalReceipt.reportFile;
  } finally {
    clearTimeout(outerTimer);
    if (!state.closed) {
      // Before credentials are released, EOF allows the fixed child to fail naturally.
      if (!released && !child.stdin.destroyed) child.stdin.end();
      if (!released) {
        let grace;
        try {
          await Promise.race([
            closed,
            new Promise((resolve) => {
              grace = setTimeout(resolve, CLOSE_MS);
            }),
          ]);
        } finally {
          clearTimeout(grace);
        }
      }
      if (!state.closed) {
        stop('CHILD_TERMINATION_UNCONFIRMED');
        await closed;
      }
    }
    clearTimeout(closeTimer);
    child.stdin.destroy();
    child.stdout.destroy();
    child.stderr.destroy();
    if (!state.closed) child.unref();
  }
}
export async function runReceiver() {
  const child = { started: false, closed: false, terminationRequested: false };
  if (receiverUsed)
    return {
      type: 'mterm-staging-handoff-result',
      result: 'failed',
      code: 'RECEIVER_ALREADY_USED',
      child,
      cleanup: 'not-started',
    };
  receiverUsed = true;
  let mode,
    runNonce,
    keys,
    clear,
    rawKey,
    plaintext,
    outputFailed = false;
  const clock = deadline();
  const onOutputError = () => {
    outputFailed = true;
  };
  process.stdout.on?.('error', onOutputError);
  try {
    runtime();
    mode = process.env.MTERM_STAGING_HANDOFF_MODE;
    requireValue(mode === 'probe' || mode === 'smoke', 'MODE_REQUIRED');
    requireValue(mode !== 'smoke' || process.platform === 'win32', 'SMOKE_REQUIRES_WINDOWS');
    const selected = {
      localSourceCommit: process.env.MTERM_STAGING_LOCAL_SOURCE_COMMIT,
      bundleSha256: process.env.MTERM_STAGING_HANDOFF_BUNDLE_SHA256,
    };
    const deployed = process.env.MTERM_STAGING_EXPECTED_SOURCE_COMMIT;
    requireValue(
      canonical(selected.localSourceCommit, HEX40) &&
        canonical(selected.bundleSha256, HEX64) &&
        canonical(deployed, HEX40),
      'SOURCE_SELECTION_REQUIRED',
    );
    const source = await clock.wait(describeSource);
    matchSource(source, selected);
    keys = await clock.wait(() =>
      webcrypto.subtle.generateKey(
        { name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
        false,
        ['encrypt', 'decrypt'],
      ),
    );
    requireValue(keys.privateKey.extractable === false, 'PRIVATE_KEY_EXTRACTABLE');
    const spki = await clock.wait(() => webcrypto.subtle.exportKey('spki', keys.publicKey));
    const keyHash = await clock.wait(() => webcrypto.subtle.digest('SHA-256', spki));
    matchSource(await clock.wait(describeSource), selected);
    runNonce = randomBytes(16).toString('hex');
    const challenge = {
      type: 'mterm-staging-handoff-challenge',
      protocol: 1,
      purpose: 'mterm-staging-handoff',
      mode,
      runNonce,
      recipientKeySha256: Buffer.from(keyHash).toString('hex'),
      expiresAt: clock.expiresAt,
      accountId: ACCOUNT,
      origins: ORIGINS,
      localSourceCommit: source.localSourceCommit,
      localBundleSha256: source.bundleSha256,
      receiverSha256: source.receiverSha256,
      sealerSha256: source.sealerSha256,
      harnessSha256: source.harnessSha256,
      expectedDeployedSourceCommit: deployed,
      tokenName: 'mterm-staging-handoff-' + runNonce,
      tokenDuration: '30m',
      publicKey: Buffer.from(spki).toString('base64url'),
    };
    clock.check();
    requireValue(!outputFailed, 'OUTPUT_CLOSED');
    process.stdout.write(JSON.stringify(challenge) + '\n');
    const frame = exactObject(await clock.wait(() => readFrame(process.stdin, FRAME_BYTES)), [
      'protected',
      'encryptedKey',
      'iv',
      'ciphertext',
    ]);
    const headerText = new TextDecoder('utf-8', { fatal: true }).decode(unbase64(frame.protected, 4096));
    let header;
    try {
      header = JSON.parse(headerText);
    } catch {
      throw new HandoffError('ENVELOPE_REJECTED');
    }
    const expected = protectedHeader(challenge, header ?? {});
    requireValue(JSON.stringify(expected) === headerText, 'ENVELOPE_REJECTED');
    if (mode === 'probe')
      requireValue(
        header.tokenId === null && header.tokenCreatedAt === null && header.tokenExpiresAt === null,
        'ENVELOPE_REJECTED',
      );
    else
      requireValue(
        canonical(header.tokenId, UUID) &&
          Number.isSafeInteger(header.tokenCreatedAt) &&
          Number.isSafeInteger(header.tokenExpiresAt) &&
          header.tokenCreatedAt <= Date.now() + 5000 &&
          header.tokenExpiresAt === header.tokenCreatedAt + 1800000 &&
          header.tokenExpiresAt > Date.now() + CHILD_MS,
        'ENVELOPE_REJECTED',
      );
    const encryptedKey = unbase64(frame.encryptedKey, 384, 384),
      iv = unbase64(frame.iv, 12, 12),
      ciphertext = unbase64(frame.ciphertext, 2064);
    requireValue(ciphertext.length >= 16, 'ENVELOPE_REJECTED');
    rawKey = new Uint8Array(
      await clock.wait(() => webcrypto.subtle.decrypt({ name: 'RSA-OAEP' }, keys.privateKey, encryptedKey)),
    );
    requireValue(rawKey.length === 32, 'ENVELOPE_REJECTED');
    const aes = await clock.wait(() =>
      webcrypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']),
    );
    rawKey.fill(0);
    rawKey = undefined;
    plaintext = new Uint8Array(
      await clock.wait(() =>
        webcrypto.subtle.decrypt(
          { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(frame.protected), tagLength: 128 },
          aes,
          ciphertext,
        ),
      ),
    );
    keys = undefined;
    clear = credentials(new TextDecoder('utf-8', { fatal: true }).decode(plaintext), mode);
    plaintext.fill(0);
    plaintext = undefined;
    matchSource(await clock.wait(describeSource), selected);
    clock.check();
    requireValue(!outputFailed, 'OUTPUT_CLOSED');
    await fixedChild(clear, mode, deployed, source, clock, child);
    return {
      type: 'mterm-staging-handoff-result',
      result: 'passed',
      mode,
      runNonce,
      localSourceCommit: source.localSourceCommit,
      localBundleSha256: source.bundleSha256,
      expectedDeployedSourceCommit: deployed,
      child,
      cleanup: mode === 'probe' ? 'not-applicable' : 'child-report-requires-review',
      liveAcceptance: false,
    };
  } catch (error) {
    return {
      type: 'mterm-staging-handoff-result',
      result: 'failed',
      code: failure(error),
      ...(mode === 'probe' || mode === 'smoke' ? { mode } : {}),
      ...(runNonce ? { runNonce } : {}),
      child,
      cleanup: child.started ? 'unconfirmed' : 'not-started',
      liveAcceptance: false,
    };
  } finally {
    process.stdin.destroy();
    keys = undefined;
    rawKey?.fill(0);
    plaintext?.fill(0);
    if (clear) {
      clear.client_id = '';
      clear.client_secret = '';
    }
    process.stdout.removeListener?.('error', onOutputError);
  }
}
async function cli() {
  const args = process.argv.slice(2);
  let answer;
  try {
    if (args.length === 1 && args[0] === '--describe-source') answer = await describeSource();
    else if (args.length === 1 && args[0] === '--probe-child') {
      runtime();
      let timer;
      try {
        const line = await Promise.race([
          readFrame(process.stdin, 2048),
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new HandoffError('PROBE_INPUT_TIMEOUT')), 10000);
          }),
        ]);
        credentials(line, 'probe');
        answer = PROBE_RECEIPT;
      } finally {
        clearTimeout(timer);
      }
    } else {
      requireValue(args.length === 0, 'ARGUMENTS_REJECTED');
      answer = await runReceiver();
    }
  } catch (error) {
    answer = {
      type: 'mterm-staging-handoff-result',
      result: 'failed',
      code: failure(error),
      child: { started: false, closed: false },
      cleanup: 'not-started',
    };
  } finally {
    process.stdin.destroy();
  }
  process.stdout.on('error', () => {
    process.exitCode = 1;
  });
  process.stdout.write(JSON.stringify(answer) + '\n');
  process.exitCode = answer.result === 'failed' ? 1 : 0;
}
async function isEntryPoint() {
  if (!process.argv[1]) return false;
  const entry = path.resolve(process.argv[1]),
    moduleFile = fileURLToPath(import.meta.url);
  if (samePath(entry, moduleFile)) return true;
  try {
    // Node can canonicalize the module URL while argv retains a directory alias.
    return samePath(await fs.realpath(entry), await fs.realpath(moduleFile));
  } catch {
    // An unresolved importing argv does not identify this module as the CLI.
    return false;
  }
}
if (await isEntryPoint()) await cli();
