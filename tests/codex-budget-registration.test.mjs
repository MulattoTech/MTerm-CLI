// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-managed-process-budgets (OpenAI / GPT-6 Astra Pro; self-reported)
// Owned source/installed fixtures. Injected TOML tables do not establish native Codex acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const checkout = await fs.realpath(new URL('../', import.meta.url));
const entry = await fs.realpath(
  path.resolve(process.env.MTERM_VERIFY_BIN ?? path.join(checkout, 'bin/mterm-cli.js')),
);
const packageRoot = await fs.realpath(path.resolve(path.dirname(entry), '..'));
assert.equal(entry, path.join(packageRoot, 'bin/mterm-cli.js'));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const inside = (root, candidate) => {
  const relative = path.relative(root, candidate);
  return (
    relative === '' ||
    (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep))
  );
};
const moduleUrl = async (name) => {
  const target = await fs.realpath(path.join(packageRoot, 'dist', name));
  assert.equal(target, path.join(packageRoot, 'dist', name), 'Selected module must stay in its package');
  return pathToFileURL(target).href;
};
const registration = await import(await moduleUrl('codex-registration.js'));
const { RootPolicy } = await import(await moduleUrl('policy.js'));
const { parseHost } = await import(await moduleUrl('cli.js'));
const { parseProcessBudget } = await import(await moduleUrl('resource-budget-policy.js'));
const selectedBindings = {};
async function compiledPaths(relative = 'dist') {
  const paths = [];
  for (const item of (await fs.readdir(path.join(packageRoot, relative), { withFileTypes: true })).sort(
    (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  )) {
    assert.ok(!item.isSymbolicLink(), 'Selected compiled inputs must not be redirected');
    const name = relative + '/' + item.name;
    if (item.isDirectory()) paths.push(...(await compiledPaths(name)));
    else if (item.name.endsWith('.js')) paths.push(name);
  }
  return paths;
}
for (const name of ['bin/mterm-cli.js', 'package.json', ...(await compiledPaths())]) {
  selectedBindings[name] = sha(await fs.readFile(path.join(packageRoot, name)));
}
const bindingHash = sha(JSON.stringify(selectedBindings));
const defaults = {
  maxSessions: 8,
  maxPendingStarts: 4,
  maxOutputBytes: 262144,
  maxRuntimeMs: 3600000,
  admissionTimeoutMs: 3000,
};
const selected = {
  maxSessions: 2,
  maxPendingStarts: 2,
  maxOutputBytes: 8192,
  maxRuntimeMs: 1500,
  admissionTimeoutMs: 400,
  disk: { minFreeBytes: '9007199254740993', highWaterPercent: 97, maxJobScratchBytes: '9007199254740995' },
};
const reordered = () => ({
  disk: { maxJobScratchBytes: '9007199254740995', highWaterPercent: 97, minFreeBytes: '9007199254740993' },
  admissionTimeoutMs: 400,
  maxRuntimeMs: 1500,
  maxOutputBytes: 8192,
  maxPendingStarts: 2,
  maxSessions: 2,
});
const options = { concurrency: false, timeout: 45000 };
const readonlyTools = [
  'mterm_ai_review_diff',
  'mterm_audit_list',
  'mterm_capabilities',
  'mterm_file_info',
  'mterm_fleet_status',
  'mterm_git_diff',
  'mterm_git_status',
  'mterm_lint_check',
  'mterm_list_directory',
  'mterm_lsp_definition',
  'mterm_lsp_references',
  'mterm_lsp_symbols',
  'mterm_read_file',
  'mterm_repo_map',
  'mterm_search_content',
  'mterm_search_files',
  'mterm_system_info',
  'mterm_validate_syntax',
];

function environment(home) {
  const inherited = new Set(['systemroot', 'windir', 'comspec', 'path', 'pathext', 'lang', 'lc_all']);
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key, value]) => value !== undefined && inherited.has(key.toLowerCase()),
    ),
  );
  return {
    ...env,
    HOME: home,
    USERPROFILE: home,
    APPDATA: path.join(home, 'appdata'),
    LOCALAPPDATA: path.join(home, 'localappdata'),
    XDG_CONFIG_HOME: path.join(home, 'xdg'),
    CODEX_HOME: path.join(home, 'codex'),
    TEMP: path.join(home, 'temp'),
    TMP: path.join(home, 'temp'),
    TMPDIR: path.join(home, 'temp'),
    ...(process.platform === 'win32'
      ? {
          HOMEDRIVE: path.parse(home).root.slice(0, -1),
          HOMEPATH: home.slice(path.parse(home).root.length - 1),
        }
      : {}),
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
    GIT_TERMINAL_PROMPT: '0',
  };
}
async function bounded(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(Object.assign(new Error(label + ' exceeded its bound'), { code: 'FIXTURE_TIMEOUT' })),
          ms,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
const errorValue = (error) => ({
  name: error?.name ?? 'Error',
  code: error?.code ?? null,
  message: String(error?.message ?? error),
});
async function outcome(operation) {
  try {
    return { status: 'fulfilled', value: await operation() };
  } catch (error) {
    return { status: 'rejected', error: errorValue(error) };
  }
}
function diagnostic(t, caseId, detail) {
  t.diagnostic(
    JSON.stringify({
      kind: 'managed-budget-observation',
      caseId,
      entry,
      packageRoot,
      selectedBindingSha256: bindingHash,
      ...detail,
    }),
  );
}
async function manifest(root) {
  const entries = [];
  let bytes = 0;
  async function visit(dir) {
    for (const name of (await fs.readdir(dir)).sort()) {
      const full = path.join(dir, name),
        st = await fs.lstat(full);
      assert.ok(entries.length < 256, 'Owned manifest entry bound');
      assert.ok(!st.isSymbolicLink(), 'No unreviewed owned fixture link');
      const item = {
        path: path.relative(root, full).split(path.sep).join('/'),
        mode: st.mode,
        type: st.isDirectory() ? 'directory' : 'file',
      };
      if (st.isDirectory()) {
        entries.push(item);
        await visit(full);
      } else {
        assert.ok(
          st.isFile() && st.nlink === 1 && st.size <= 1048576,
          'Owned regular single-link bounded file',
        );
        const data = await fs.readFile(full);
        bytes += data.length;
        assert.ok(bytes <= 2097152, 'Owned manifest byte bound');
        entries.push({ ...item, bytes: data.length, sha256: sha(data) });
      }
    }
  }
  await visit(root);
  return entries;
}
async function fixture(t) {
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-codex-budget-')));
  const f = {
    parent,
    root: path.join(parent, 'workspace space'),
    second: path.join(parent, 'other root'),
    cwd: path.join(parent, 'external cwd'),
    home: path.join(parent, 'owned home'),
    children: [],
    operations: [],
  };
  f.env = environment(f.home);
  f.codex = f.env.CODEX_HOME;
  f.config = path.join(f.codex, 'config.toml');
  f.auth = path.join(f.codex, 'auth.json');
  f.store = path.join(f.codex, '.mterm-registration');
  f.journal = path.join(f.store, 'mterm-local.json');
  f.compat = path.join(parent, 'compatibility.json');
  f.original =
    '# independent configuration\r\nmodel = "synthetic-fixture"\r\n[mcp_servers.other]\r\ncommand = "other"\r\n';
  f.authBytes = Buffer.from('{"fixture":"synthetic-not-a-credential"}\n');
  t.after(async () => {
    assert.ok(
      f.operations.every((record) => record.settled),
      'Retain fixture until controlled operations settle: ' + parent,
    );
    assert.ok(
      f.children.every((record) => record.closed),
      'Retain fixture until every owned close is observed: ' + parent,
    );
    await fs.rm(parent, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  });
  assert.ok(
    !inside(checkout, parent) && !inside(packageRoot, parent),
    'Owned cwd/home must be outside checkout and selected package',
  );
  for (const dir of [
    f.root,
    f.second,
    f.cwd,
    f.home,
    f.codex,
    f.store,
    ...['appdata', 'localappdata', 'xdg', 'temp'].map((n) => path.join(f.home, n)),
  ])
    await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(f.config, f.original);
  await fs.writeFile(f.auth, f.authBytes);
  await fs.writeFile(path.join(f.root, 'sentinel.txt'), 'unchanged-workspace\n');
  return f;
}
function independentPlan(f, budget, flags = false) {
  return {
    name: 'mterm-local',
    command: process.execPath,
    root: f.root,
    args: [
      entry,
      'mcp',
      '--stdio',
      '--root',
      f.root,
      ...(flags
        ? [
            '--root',
            f.second,
            '--allow-write',
            '--allow-exec',
            '--compat-desktop-commander',
            '--compat-config',
            f.compat,
            '--allow-config-write',
            '--allow-shell',
            process.execPath,
          ]
        : []),
      ...(budget === undefined ? [] : ['--process-budget', JSON.stringify(budget)]),
    ],
  };
}
const planHash = (plan) => sha(JSON.stringify(plan));
const table = async (plan) =>
  `[mcp_servers.${plan.name}]\ncommand = ${JSON.stringify(plan.command)}\nargs = ${JSON.stringify(plan.args)}\n`;
async function cli(f, args) {
  const child = spawn(process.execPath, [entry, ...args], {
    cwd: f.cwd,
    env: f.env,
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const record = { kind: 'cli', closed: false };
  f.children.push(record);
  const result = {
    argv: [entry, ...args],
    cwd: f.cwd,
    pid: null,
    stdout: '',
    stderr: '',
    stdoutBytes: 0,
    stderrBytes: 0,
    captureTruncated: false,
    errors: [],
    killAttempts: [],
    timedOut: false,
  };
  const buffers = { stdout: [], stderr: [] };
  const kill = child.kill.bind(child);
  child.kill = (signal) => {
    result.killAttempts.push(signal ?? 'SIGTERM');
    return kill(signal);
  };
  for (const stream of ['stdout', 'stderr'])
    child[stream].on('data', (chunk) => {
      result[stream + 'Bytes'] += chunk.length;
      if (result[stream + 'Bytes'] <= 262144) buffers[stream].push(chunk);
      else if (!result.captureTruncated) {
        result.captureTruncated = true;
        child.kill('SIGKILL');
      }
    });
  child.on('error', (error) => result.errors.push(errorValue(error)));
  child.stdin.on('error', (error) => result.errors.push(errorValue(error)));
  const closed = new Promise((resolve) =>
    child.once('close', (code, signal) => {
      record.closed = true;
      result.close = { code, signal };
      resolve();
    }),
  );
  const timer = setTimeout(() => {
    result.timedOut = true;
    child.kill('SIGKILL');
  }, 15000);
  child.stdin.end();
  try {
    await bounded(closed, 20000, 'CLI close');
  } finally {
    clearTimeout(timer);
    if (!record.closed) {
      child.kill('SIGKILL');
      await bounded(closed, 5000, 'Owned CLI fallback');
    }
  }
  result.pid = child.pid ?? null;
  for (const stream of ['stdout', 'stderr']) result[stream] = Buffer.concat(buffers[stream]).toString('utf8');
  return result;
}
function naturalCli(result) {
  assert.equal(result.captureTruncated, false, 'Incomplete fixture capture is invalid');
  assert.equal(result.timedOut, false, 'Timed-out fixture is invalid');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.killAttempts, []);
  assert.equal(result.close.signal, null);
  assert.ok(Number.isInteger(result.close.code));
}
async function preview(f, budget) {
  const result = await cli(f, [
    'setup',
    'codex',
    '--root',
    f.root,
    ...(budget === undefined ? [] : ['--process-budget', JSON.stringify(budget)]),
  ]);
  const parsed = result.close.code === 0 ? JSON.parse(result.stdout) : null;
  return { result, parsed };
}
function assertPreview(previewed, expected) {
  naturalCli(previewed.result);
  assert.equal(previewed.result.close.code, 0);
  assert.equal(previewed.result.stderr, '');
  assert.equal(previewed.parsed.applied, false);
  assert.deepEqual(previewed.parsed.add, {
    command: 'codex',
    args: ['mcp', 'add', 'mterm-local', '--', expected.command, ...expected.args],
  });
}

test('managed budget omission preserves the exact legacy argv and ownership hash', options, async (t) => {
  const f = await fixture(t),
    before = await manifest(f.parent);
  const actual = await registration.planCodexRegistration({
    root: f.root,
    roots: [f.root, f.second],
    allowWrite: true,
    allowExec: true,
    compatDesktopCommander: true,
    compatConfig: f.compat,
    allowConfigWrite: true,
    allowedShells: [process.execPath],
  });
  const expected = independentPlan(f, undefined, true),
    observed = await preview(f, undefined);
  const after = await manifest(f.parent);
  diagnostic(t, 'omission', {
    selectedBindings,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    fixtureSha256: sha(await fs.readFile(fileURLToPath(import.meta.url))),
    actual,
    expected,
    actualPlanHash: planHash(actual),
    expectedPlanHash: planHash(expected),
    preview: observed,
    before,
    after,
  });
  assert.deepEqual(actual, expected);
  assert.equal(planHash(actual), planHash(expected));
  assert.ok(!actual.args.includes('--process-budget'));
  assertPreview(observed, independentPlan(f));
  assert.deepEqual(after, before);
});

test('managed budget explicit empty policy remains selected and preview is readonly', options, async (t) => {
  const f = await fixture(t),
    before = await manifest(f.parent);
  const actual = await registration.planCodexRegistration({ root: f.root, processBudget: {} });
  const omitted = await registration.planCodexRegistration({ root: f.root });
  const observed = await preview(f, {}),
    after = await manifest(f.parent),
    expected = independentPlan(f, defaults);
  diagnostic(t, 'explicit-empty', { actual, omitted, expected, preview: observed, before, after });
  assert.deepEqual(actual, expected);
  assert.notEqual(planHash(actual), planHash(omitted));
  assert.equal(actual.args.filter((v) => v === '--process-budget').length, 1);
  assertPreview(observed, expected);
  assert.deepEqual(after, before);
});

test(
  'managed budget preview preserves normalized limits and exact large decimal strings',
  options,
  async (t) => {
    const f = await fixture(t),
      before = await manifest(f.parent),
      input = reordered();
    const actual = await registration.planCodexRegistration({ root: f.root, processBudget: input });
    const observed = await preview(f, input),
      expected = independentPlan(f, selected),
      after = await manifest(f.parent);
    diagnostic(t, 'selected-policy', { input, actual, expected, preview: observed, before, after });
    assert.deepEqual(actual, expected);
    assertPreview(observed, expected);
    assert.deepEqual(after, before);
    const parsed = parseHost(actual.args.slice(2));
    assert.deepEqual(parsed.processBudget, selected);
    assert.ok(Object.isFrozen(parsed.processBudget) && Object.isFrozen(parsed.processBudget.disk));
    assert.equal(parsed.allowExec, false);
    assert.equal(parsed.allowWrite, false);
  },
);

test(
  'managed budget malformed inputs and separate unsupported policies preserve owned bytes',
  options,
  async (t) => {
    const f = await fixture(t),
      before = await manifest(f.parent);
    const vectors = [
      ['malformed-json', ['--process-budget', '{bad'], 2, 'USAGE'],
      ['duplicate', ['--process-budget', '{}', '--process-budget', '{}'], 2, 'USAGE'],
      ['oversized', ['--process-budget', ' '.repeat(1025)], 2, 'USAGE'],
      ['unknown-field', ['--process-budget', '{"cpuPercent":1}'], 1, 'INVALID_ARGUMENT'],
      ['out-of-range', ['--process-budget', '{"maxSessions":9}'], 1, 'INVALID_ARGUMENT'],
      ['array', ['--process-budget', '[]'], 1, 'INVALID_ARGUMENT'],
      ['noncanonical-byte', ['--process-budget', '{"disk":{"minFreeBytes":"01"}}'], 1, 'INVALID_ARGUMENT'],
      [
        'isolation',
        [
          '--isolation-policy',
          JSON.stringify({ socketPath: '/fixture.sock', imageId: 'sha256:' + 'a'.repeat(64) }),
        ],
        2,
        'USAGE',
      ],
      ['pack', ['--pack-registry', path.join(f.parent, 'absent-registry.json')], 2, 'USAGE'],
    ];
    const observations = [];
    for (const [name, flags, exitCode, errorCode] of vectors) {
      const result = await cli(f, ['setup', 'codex', '--root', f.root, ...flags]);
      observations.push({ name, exitCode, errorCode, result, after: await manifest(f.parent) });
    }
    diagnostic(t, 'existing-refusals', { before, observations });
    for (const v of observations) {
      naturalCli(v.result);
      assert.equal(v.result.close.code, v.exitCode);
      assert.equal(v.result.stdout, '');
      assert.ok(v.result.stderr.startsWith(v.errorCode + ': '));
      assert.deepEqual(v.after, before);
      if (v.name === 'isolation') assert.match(v.result.stderr, /does not yet preserve isolation policy/);
      if (v.name === 'pack') assert.match(v.result.stderr, /does not yet preserve optional-pack grants/);
    }
  },
);

test('managed budget API validation precedes the first root-validation call', options, async (t) => {
  const f = await fixture(t),
    before = await manifest(f.parent),
    original = RootPolicy.create;
  const observations = [];
  try {
    for (const input of [null, { maxSessions: 9 }, { cpuPercent: 1 }]) {
      let rootCalls = 0;
      RootPolicy.create = async () => {
        rootCalls++;
        throw Object.assign(new Error('Observed root validation before budget refusal'), {
          code: 'FIXTURE_ROOT_REACHED',
        });
      };
      const result = await outcome(() =>
        registration.planCodexRegistration({ root: f.root, processBudget: input }),
      );
      observations.push({ input, rootCalls, result });
    }
  } finally {
    RootPolicy.create = original;
  }
  const after = await manifest(f.parent);
  diagnostic(t, 'validation-order', {
    observations,
    rootMethodRestored: RootPolicy.create === original,
    before,
    after,
  });
  for (const observed of observations) {
    assert.equal(observed.rootCalls, 0);
    assert.equal(observed.result.status, 'rejected');
    assert.equal(observed.result.error.code, 'INVALID_ARGUMENT');
  }
  assert.deepEqual(after, before);
});

test(
  'managed budget planner snapshots the selected nested policy before its root await',
  options,
  async (t) => {
    const f = await fixture(t),
      before = await manifest(f.parent),
      original = RootPolicy.create;
    const input = reordered(),
      selectedOptions = { root: f.root, processBudget: input };
    let release,
      entered,
      pending,
      rootCalls = 0,
      observed;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const reached = new Promise((resolve) => {
      entered = resolve;
    });
    try {
      RootPolicy.create = async (...args) => {
        rootCalls++;
        entered();
        await gate;
        return original.apply(RootPolicy, args);
      };
      const record = { settled: false };
      f.operations.push(record);
      pending = outcome(() => registration.planCodexRegistration(selectedOptions)).finally(() => {
        record.settled = true;
      });
      await bounded(reached, 5000, 'Controlled root-validation barrier');
      input.maxSessions = 8;
      input.disk.minFreeBytes = '1';
      input.disk.maxJobScratchBytes = '2';
      selectedOptions.processBudget = { maxSessions: 7 };
      release();
      observed = await bounded(pending, 5000, 'Planner after barrier release');
    } finally {
      release();
      RootPolicy.create = original;
      if (pending) await bounded(pending, 5000, 'Planner settlement before fixture cleanup');
    }
    const after = await manifest(f.parent),
      expected = independentPlan(f, selected);
    diagnostic(t, 'snapshot-before-await', {
      observed,
      expected,
      inputAfterMutation: input,
      replacement: selectedOptions.processBudget,
      rootCalls,
      rootMethodRestored: RootPolicy.create === original,
      before,
      after,
    });
    assert.equal(rootCalls, 1);
    assert.equal(observed.status, 'fulfilled');
    assert.deepEqual(observed.value, expected);
    assert.deepEqual(after, before);
  },
);

test(
  'managed budget normalized key order is idempotent through injected-table ownership',
  options,
  async (t) => {
    const f = await fixture(t);
    const firstPlan = await registration.planCodexRegistration({
      root: f.root,
      processBudget: structuredClone(selected),
    });
    const secondPlan = await registration.planCodexRegistration({ root: f.root, processBudget: reordered() });
    const expected = independentPlan(f, selected);
    diagnostic(t, 'normalized-plans', {
      mode: 'injected-table',
      firstPlan,
      secondPlan,
      expected,
      firstPlanHash: planHash(firstPlan),
      secondPlanHash: planHash(secondPlan),
      persistencePhase: 'NOT_REACHED_YET',
    });
    assert.deepEqual(firstPlan, expected);
    assert.deepEqual(secondPlan, expected);
    assert.equal(planHash(firstPlan), planHash(secondPlan));
    const first = await registration.applyCodexRegistration(firstPlan, {
      home: f.codex,
      generateTable: table,
    });
    const beforeRepeat = await manifest(f.parent);
    const second = await registration.applyCodexRegistration(secondPlan, {
      home: f.codex,
      generateTable: table,
    });
    const afterRepeat = await manifest(f.parent),
      journal = JSON.parse(await fs.readFile(f.journal, 'utf8'));
    diagnostic(t, 'normalized-apply', {
      mode: 'injected-table',
      first,
      second,
      journal,
      beforeRepeat,
      afterRepeat,
    });
    assert.equal(first.changed, true);
    assert.equal(second.changed, false);
    assert.deepEqual(afterRepeat, beforeRepeat);
    assert.equal(journal.planHash, planHash(expected));
    assert.equal(journal.phase, 'installed');
    assert.equal(((await fs.readFile(f.config, 'utf8')).match(/# BEGIN MTERM mterm-local/g) ?? []).length, 1);
    assert.deepEqual(await fs.readFile(f.auth), f.authBytes);
  },
);

test(
  'managed budget changes require deliberate removal and preserve the owned registration',
  options,
  async (t) => {
    const f = await fixture(t);
    const firstPlan = await registration.planCodexRegistration({
      root: f.root,
      processBudget: { maxSessions: 1 },
    });
    const secondPlan = await registration.planCodexRegistration({
      root: f.root,
      processBudget: { maxSessions: 2 },
    });
    const first = await registration.applyCodexRegistration(firstPlan, {
      home: f.codex,
      generateTable: table,
    });
    const before = await manifest(f.parent);
    const changed = await outcome(() =>
      registration.applyCodexRegistration(secondPlan, { home: f.codex, generateTable: table }),
    );
    const after = await manifest(f.parent);
    diagnostic(t, 'changed-budget-conflict', {
      mode: 'injected-table',
      firstPlan,
      secondPlan,
      firstPlanHash: planHash(firstPlan),
      secondPlanHash: planHash(secondPlan),
      first,
      changed,
      before,
      after,
    });
    assert.equal(first.changed, true);
    assert.notEqual(planHash(firstPlan), planHash(secondPlan));
    assert.equal(changed.status, 'rejected');
    assert.equal(changed.error.code, 'CONFIG_CONFLICT');
    assert.deepEqual(after, before);
  },
);

test(
  'managed budget independent ownership controls preserve unowned edited and ambiguous bytes',
  options,
  async (t) => {
    const observations = [];
    for (const mode of ['unowned', 'edited', 'ambiguous']) {
      const f = await fixture(t),
        plan = independentPlan(f, { ...defaults, maxSessions: 1 });
      if (mode === 'unowned')
        await fs.appendFile(f.config, '\n[mcp_servers.mterm-local]\ncommand = "user-owned"\n');
      else {
        await registration.applyCodexRegistration(plan, { home: f.codex, generateTable: table });
        const text = await fs.readFile(f.config, 'utf8');
        if (mode === 'edited') await fs.writeFile(f.config, text.replace('"mcp"', '"edited-mcp"'));
        else await fs.appendFile(f.config, JSON.parse(await fs.readFile(f.journal, 'utf8')).addition);
      }
      const before = await manifest(f.parent);
      const apply = await outcome(() =>
        registration.applyCodexRegistration(plan, { home: f.codex, generateTable: table }),
      );
      const remove = await outcome(() =>
        registration.removeCodexRegistration({ home: f.codex, apply: true }),
      );
      observations.push({
        mode,
        planSource: 'independent literal with explicit budget',
        before,
        apply,
        remove,
        after: await manifest(f.parent),
      });
    }
    diagnostic(t, 'ownership-controls', { mode: 'injected-table', observations });
    for (const v of observations) {
      assert.equal(v.apply.status, 'rejected');
      assert.equal(v.apply.error.code, 'CONFIG_CONFLICT');
      if (v.mode === 'unowned') {
        assert.equal(v.remove.status, 'fulfilled');
        assert.equal(v.remove.value.removed, false);
      } else {
        assert.equal(v.remove.status, 'rejected');
        assert.equal(v.remove.error.code, 'CONFIG_CONFLICT');
      }
      assert.deepEqual(v.after, v.before);
    }
  },
);

test('managed budget exact owned removal preserves unrelated auth and backup bytes', options, async (t) => {
  const f = await fixture(t),
    plan = independentPlan(f, selected);
  const applied = await registration.applyCodexRegistration(plan, { home: f.codex, generateTable: table });
  const journal = JSON.parse(await fs.readFile(f.journal, 'utf8'));
  const extra = '\n# independent later change\n[mcp_servers.later]\ncommand = "later"\n';
  await fs.appendFile(f.config, extra);
  const beforePreview = await manifest(f.parent),
    beforeRemoveBytes = await fs.readFile(f.config);
  const previewed = await cli(f, ['remove', 'codex']);
  const afterPreview = await manifest(f.parent);
  const removed = await registration.removeCodexRegistration({ home: f.codex, apply: true });
  const afterRemove = await manifest(f.parent);
  const again = await registration.removeCodexRegistration({ home: f.codex, apply: true });
  const afterAgain = await manifest(f.parent);
  diagnostic(t, 'exact-removal', {
    mode: 'injected-table',
    applied,
    journal,
    preview: previewed,
    removed,
    again,
    beforePreview,
    afterPreview,
    afterRemove,
    afterAgain,
  });
  naturalCli(previewed);
  assert.equal(previewed.close.code, 0);
  assert.equal(previewed.stderr, '');
  assert.equal(JSON.parse(previewed.stdout).applied, false);
  assert.deepEqual(afterPreview, beforePreview);
  assert.equal(journal.planHash, planHash(plan));
  assert.equal(removed.removed, true);
  assert.equal(removed.changed, true);
  assert.equal(await fs.readFile(f.config, 'utf8'), f.original + extra);
  assert.deepEqual(await fs.readFile(f.auth), f.authBytes);
  assert.equal(await fs.readFile(applied.backupPath, 'utf8'), f.original);
  assert.deepEqual(await fs.readFile(removed.backupPath), beforeRemoveBytes);
  await assert.rejects(fs.lstat(f.journal), (e) => e.code === 'ENOENT');
  assert.equal(again.changed, false);
  assert.deepEqual(afterAgain, afterRemove);
});

async function observeReadonlySdk(t, f, plan, budget) {
  const before = await manifest(f.parent),
    observations = { requests: [], errors: [], killAttempts: [], stderrBytes: 0, stderr: '' };
  const transport = new StdioClientTransport({
    command: plan.command,
    args: plan.args,
    cwd: f.cwd,
    env: f.env,
    stderr: 'pipe',
    maxBufferSize: 1048576,
  });
  const client = new Client({ name: 'mterm-managed-budget-fixture', version: '1.0.0' });
  let child, closed, primary;
  transport.stderr.on('data', (chunk) => {
    observations.stderrBytes += chunk.length;
    if (observations.stderrBytes <= 16384) observations.stderr += chunk.toString();
    else if (child && observations.killAttempts.length === 0) child.kill('SIGKILL');
  });
  const start = transport.start.bind(transport);
  transport.start = async () => {
    const starting = start();
    child = transport._process;
    assert.ok(child && typeof child.once === 'function', 'Observe the pinned SDK actual child');
    const record = { kind: 'sdk', closed: false };
    f.children.push(record);
    closed = new Promise((resolve) =>
      child.once('close', (code, signal) => {
        record.closed = true;
        observations.close = { code, signal };
        resolve();
      }),
    );
    child.on('error', (error) => observations.errors.push(errorValue(error)));
    child.stdin.on('error', (error) => observations.errors.push(errorValue(error)));
    const kill = child.kill.bind(child);
    child.kill = (...args) => {
      observations.killAttempts.push(args[0] ?? 'SIGTERM');
      return kill(...args);
    };
    await starting;
    observations.pid = child.pid;
  };
  const call = async (name, args = {}) => {
    const result = await outcome(() => client.callTool({ name, arguments: args }, { timeout: 10000 }));
    assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 65536, 'Bounded SDK result');
    observations.requests.push({ name, result });
    return result;
  };
  const marker = path.join(f.root, 'execution-must-not-run.txt');
  try {
    await bounded(client.connect(transport), 10000, 'SDK initialize');
    observations.tools = await bounded(client.listTools(), 10000, 'SDK discovery');
    await call('mterm_capabilities');
    await call('mterm_start_process', {
      command: process.execPath,
      args: ['-e', 'require("node:fs").writeFileSync(process.argv[1], "UNEXPECTED")', marker],
    });
    await call('mterm_capabilities');
  } catch (error) {
    primary = errorValue(error);
  }
  const cleanup = [];
  try {
    assert.ok(child && closed, 'Actual child is required');
    child.stdin.end();
    await bounded(closed, 10000, 'Natural SDK child close');
  } catch (error) {
    cleanup.push(errorValue(error));
  } finally {
    for (const [name, operation] of [
      ['SDK close', () => client.close()],
      ['transport close', () => transport.close()],
    ]) {
      try {
        await bounded(operation(), 6000, name);
      } catch (error) {
        cleanup.push(errorValue(error));
      }
    }
    if (child && !observations.close) {
      child.kill('SIGKILL');
      try {
        await bounded(closed, 5000, 'Owned SDK fallback close');
      } catch (error) {
        cleanup.push(errorValue(error));
      }
    }
  }
  const after = await manifest(f.parent),
    markerExists = await fs.lstat(marker).then(
      () => true,
      (e) => {
        if (e.code === 'ENOENT') return false;
        throw e;
      },
    );
  diagnostic(t, 'budget-without-execution-sdk', {
    mode: 'actual-sdk-stdio',
    commandSource: 'actual successful CLI preview argv',
    plan,
    expectedBudget: budget,
    observations,
    primary: primary ?? null,
    cleanup,
    before,
    after,
    markerExists,
  });
  assert.equal(primary, undefined);
  assert.deepEqual(cleanup, []);
  assert.deepEqual(observations.errors, []);
  assert.deepEqual(observations.close, { code: 0, signal: null });
  assert.deepEqual(observations.killAttempts, []);
  assert.equal(observations.stderrBytes, 0);
  assert.equal(transport.pid, null);
  assert.deepEqual(observations.tools.tools.map((tool) => tool.name).sort(), readonlyTools);
  assert.ok(
    observations.tools.tools.every(
      (tool) => tool.annotations?.readOnlyHint === true && tool.annotations?.destructiveHint === false,
    ),
  );
  const [first, denied, last] = observations.requests;
  for (const response of [first.result, last.result]) {
    assert.equal(response.status, 'fulfilled');
    assert.equal(response.value.isError, false);
    const caps = response.value.structuredContent;
    assert.deepEqual(JSON.parse(response.value.content[0].text), caps);
    assert.equal(caps.executionEnabled, false);
    assert.equal(caps.writeEnabled, false);
    assert.equal(caps.configWriteEnabled, false);
    assert.equal(caps.networkListener, false);
    assert.deepEqual(caps.ownerRoots, [f.root]);
    assert.deepEqual(caps.effectiveRoots, [f.root]);
    assert.deepEqual(caps.resources.limits, budget);
    assert.equal(caps.resources.usage.activeJobs, 0);
    assert.equal(caps.resources.usage.retainedSessions, 0);
    assert.equal(caps.resources.usage.pendingStarts, 0);
  }
  assert.equal(denied.result.status, 'rejected');
  assert.equal(denied.result.error.code, -32602);
  assert.match(denied.result.error.message, /Tool mterm_start_process not found/);
  assert.equal(markerExists, false);
  assert.deepEqual(after, before);
}

test('managed budget from CLI preview reaches actual SDK without granting execution', options, async (t) => {
  const f = await fixture(t),
    input = { maxSessions: 1, maxOutputBytes: 4096, maxRuntimeMs: 1200 };
  const budget = { ...defaults, ...input },
    before = await manifest(f.parent);
  const observed = await preview(f, input),
    after = await manifest(f.parent);
  diagnostic(t, 'budget-without-execution-preview', {
    preview: observed,
    before,
    after,
    sdkPhase: observed.result.close.code === 0 ? 'READY_NOT_EXECUTED_YET' : 'NOT_REACHED_PREVIEW_REFUSED',
  });
  const expected = independentPlan(f, budget);
  assertPreview(observed, expected);
  assert.deepEqual(after, before);
  assert.ok(!expected.args.includes('--allow-exec') && !expected.args.includes('--allow-write'));
  const args = observed.parsed.add.args;
  const plan = { command: args[4], args: args.slice(5) };
  assert.deepEqual(parseProcessBudget(input), budget);
  await observeReadonlySdk(t, f, plan, budget);
});
