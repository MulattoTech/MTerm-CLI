// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-05-codex-parity-foundation
// Modified: 2026-11-09-managed-process-budgets; verify explicit policy through real Codex and both registered sessions.
// Modified: 2026-11-02-config-installed-qualification; synthetic multi-root configuration discovery and persistence.
// Real Codex only receives isolated synthetic config. No model calls or auth access.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { resolveCodex } from '../dist/codex.js';
const exec = promisify(execFile),
  root = path.resolve('.');
async function verifyProcessExit(pid) {
  assert.ok(Number.isInteger(pid) && pid > 0);
  const deadline = Date.now() + 5000;
  do {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error.code === 'ESRCH') return;
      throw error;
    }
    await delay(25);
  } while (Date.now() < deadline);
  throw new Error('The registered MCP child exit was not independently observed');
}

// The real Codex registration exercises a canonical decimal above the safe Number range.
// Every actual job explicitly requests zero scratch; this is admission, not a disk-write quota.
const selectedProcessBudget = Object.freeze({
  maxSessions: 1,
  maxPendingStarts: 2,
  maxOutputBytes: 4096,
  maxRuntimeMs: 60000,
  admissionTimeoutMs: 3000,
  disk: Object.freeze({
    minFreeBytes: '0',
    highWaterPercent: 100,
    maxJobScratchBytes: '9007199254740993',
  }),
});
const processBudgetArgument = JSON.stringify(selectedProcessBudget);

async function verifyRegisteredProcessBudget(callTool, iteration, observationPath) {
  const observations = [],
    owned = new Map(),
    fallbackCleanup = [];
  let completed = false,
    failure = null,
    summary;
  const observe = async (name, args = {}) => {
    const response = await callTool({ name, arguments: args });
    observations.push({ name, arguments: args, response });
    const value = response.structuredContent;
    if (name === 'mterm_start_process' && typeof value?.sessionId === 'string')
      owned.set(value.sessionId, value.pid);
    assert.ok(observations.length <= 512, 'Managed budget observation count exceeded its bound');
    return response;
  };
  const success = async (name, args = {}) => {
    const response = await observe(name, args);
    assert.equal(response.isError, false, name + ' did not succeed');
    assert.ok(response.structuredContent && typeof response.structuredContent === 'object');
    return response.structuredContent;
  };
  const until = async (name, args, predicate) => {
    const deadline = Date.now() + 5000;
    let last;
    do {
      last = await success(name, args);
      if (predicate(last)) return last;
      await delay(50);
    } while (Date.now() < deadline);
    assert.fail('Managed budget condition did not occur: ' + JSON.stringify(last));
  };
  const textOf = (output) => output.events.map((event) => event.text).join('');
  const outputArgs = (sessionId) => ({ sessionId, afterSeq: 0, maxBytes: 4096 });
  const baseRequest = { command: process.execPath, scratchBytes: '0' };
  const finishNaturally = async (job, marker) => {
    const output = await until('mterm_read_process_output', outputArgs(job.sessionId), (x) => !x.running);
    assert.equal(output.exitCode, 0);
    assert.equal(output.signal, null);
    assert.equal(output.timedOut, false);
    assert.equal(output.lostOutput, false);
    assert.ok(textOf(output).includes(marker));
    assert.ok(output.retainedBytes <= selectedProcessBudget.maxOutputBytes);
    await verifyProcessExit(job.pid);
    owned.delete(job.sessionId);
    return output;
  };
  try {
    const capabilities = await success('mterm_capabilities');
    assert.equal(capabilities.executionEnabled, true); // Existing explicit --allow-exec grant.
    assert.deepEqual(capabilities.resources.limits, selectedProcessBudget);
    const initial = await success('mterm_list_sessions');
    assert.deepEqual(initial.resources.limits, selectedProcessBudget);
    assert.equal(initial.resources.scope, 'host-instance');
    assert.equal(initial.resources.usage.activeJobs, 0);
    assert.equal(initial.resources.usage.pendingStarts, 0);
    assert.equal(initial.sessions.length, 0);
    for (const extra of [
      { maxOutputBytes: selectedProcessBudget.maxOutputBytes + 1 },
      { timeoutMs: selectedProcessBudget.maxRuntimeMs + 1 },
    ]) {
      const denied = await observe('mterm_start_process', {
        ...baseRequest,
        args: ['-e', 'process.stdout.write("UNEXPECTED_BUDGET_SPAWN")'],
        ...extra,
      });
      assert.equal(denied.isError, true);
      assert.equal(denied.structuredContent?.error?.code, 'BUDGET_EXCEEDED');
    }
    const afterCeilings = await success('mterm_list_sessions');
    assert.equal(afterCeilings.sessions.length, 0);
    assert.equal(afterCeilings.resources.usage.activeJobs, 0);
    const held = await success('mterm_start_process', {
      ...baseRequest,
      args: [
        '-e',
        'process.stdout.write("BUDGET_READY\\n");process.stdin.resume();process.stdin.once("data",()=>{process.stdout.write("BUDGET_RELEASED\\n");process.stdin.destroy();});',
      ],
    });
    assert.ok(Number.isInteger(held.pid) && held.pid > 0);
    assert.equal(held.budget.timeoutMs, selectedProcessBudget.maxRuntimeMs);
    assert.equal(held.budget.maxOutputBytes, selectedProcessBudget.maxOutputBytes);
    assert.equal(held.budget.scratchBytes, '0');
    assert.equal(held.budget.disk.backend, 'node:fs.statfs');
    await until(
      'mterm_read_process_output',
      outputArgs(held.sessionId),
      (x) => x.running && textOf(x).includes('BUDGET_READY'),
    );
    const denied = await observe('mterm_start_process', {
      ...baseRequest,
      args: ['-e', 'process.stdout.write("UNEXPECTED_SECOND_JOB")'],
    });
    assert.equal(denied.isError, true);
    assert.equal(denied.structuredContent?.error?.code, 'SESSION_LIMIT');
    const occupied = await success('mterm_list_sessions');
    assert.equal(occupied.resources.usage.activeJobs, 1);
    assert.equal(occupied.resources.usage.pendingStarts, 0);
    assert.equal(occupied.sessions.length, 1);
    assert.equal(occupied.sessions[0].sessionId, held.sessionId);
    await success('mterm_process_input', { sessionId: held.sessionId, text: 'release\n' });
    const released = await finishNaturally(held, 'BUDGET_RELEASED');
    const afterRelease = await success('mterm_list_sessions');
    assert.equal(afterRelease.resources.usage.activeJobs, 0);
    const reused = await success('mterm_start_process', {
      ...baseRequest,
      args: ['-e', 'process.stdout.write("BUDGET_REUSED\\n")'],
    });
    assert.ok(Number.isInteger(reused.pid) && reused.pid > 0);
    const finished = await finishNaturally(reused, 'BUDGET_REUSED');
    const final = await success('mterm_list_sessions');
    assert.equal(final.resources.usage.activeJobs, 0);
    assert.equal(final.resources.usage.pendingStarts, 0);
    assert.equal(final.resources.usage.reservedScratchBytes, '0');
    assert.equal(final.sessions.length, 2);
    assert.ok(final.sessions.every((session) => !session.running));
    completed = true;
    summary = {
      iteration,
      selectedPolicyVerified: true,
      actualOwnedJobs: 2,
      ownedJobSessionIds: [held.sessionId, reused.sessionId],
      ownedJobPids: [held.pid, reused.pid],
      sessionLimitDenials: 1,
      ownerCeilingDenials: 2,
      confirmedNaturalJobClosures: 2,
      fallbackStopUsed: false,
      releasePermittedNextJob: true,
      finalActiveJobs: 0,
      finalPendingStarts: 0,
      finalReservedScratchBytes: '0',
      closureExitCodes: [released.exitCode, finished.exitCode],
      closureSignals: [released.signal, finished.signal],
      realDiskAdmissionWithZeroScratch: true,
      observationPath,
    };
  } catch (error) {
    failure = { name: error.name, message: error.message };
    throw error;
  } finally {
    const cleanupErrors = [];
    for (const [sessionId, pid] of owned) {
      try {
        const stopped = await success('mterm_stop_process', { sessionId });
        assert.equal(stopped.running, false);
        await verifyProcessExit(pid);
        fallbackCleanup.push({ sessionId, pid, confirmedClosed: true });
      } catch (error) {
        cleanupErrors.push(error);
        fallbackCleanup.push({ sessionId, pid, confirmedClosed: false, error: error.message });
      }
    }
    const raw =
      JSON.stringify({ iteration, completed, failure, observations, fallbackCleanup }, null, 2) + '\n';
    await fs.writeFile(observationPath, raw);
    if (summary) {
      summary.observationCount = observations.length;
      summary.observationBytes = Buffer.byteLength(raw);
      summary.observationSha256 = createHash('sha256').update(raw).digest('hex');
    }
    assert.ok(
      Buffer.byteLength(raw) <= 2097152,
      'Managed budget observation exceeded 2 MiB; full bytes retained',
    );
    if (cleanupErrors.length)
      throw new AggregateError(cleanupErrors, 'Owned managed-budget job cleanup was not confirmed');
  }
  return summary;
}

// CI must select the pinned test-owned native binary, never a user/global wrapper
// discovered through PATH or APPDATA. This selection belongs to verification only.
async function selectTestCodex() {
  const requestedPrefix = process.env.MTERM_CODEX_TEST_PREFIX;
  const expectedVersion = process.env.MTERM_CODEX_EXPECTED_VERSION;
  const ci =
    process.env.GITHUB_ACTIONS === 'true' || (!!process.env.CI && !['false', '0'].includes(process.env.CI));
  if (!requestedPrefix && !expectedVersion) {
    assert.ok(!ci, 'CI requires MTERM_CODEX_TEST_PREFIX and MTERM_CODEX_EXPECTED_VERSION');
    return undefined;
  }
  assert.ok(requestedPrefix && expectedVersion, 'Provide both Codex test prefix and expected version');
  assert.match(expectedVersion, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  const contains = (parent, candidate) => {
    const relative = path.relative(parent, candidate);
    return (
      relative !== '' &&
      !path.isAbsolute(relative) &&
      relative !== '..' &&
      !relative.startsWith('..' + path.sep)
    );
  };
  const artifacts = await fs.realpath(path.join(root, 'artifacts'));
  const prefix = await fs.realpath(path.resolve(root, requestedPrefix));
  assert.ok(
    contains(artifacts, prefix),
    'Codex test prefix must be inside this checkout artifacts directory',
  );
  const packageRoot = async (name, manifestName = name, manifestVersion = expectedVersion) => {
    const directory = await fs.realpath(path.join(prefix, 'node_modules', ...name.split('/')));
    assert.ok(contains(prefix, directory), 'Codex fixture package escapes its test prefix');
    const manifest = JSON.parse(await fs.readFile(path.join(directory, 'package.json'), 'utf8'));
    assert.equal(manifest.name, manifestName, 'Unexpected Codex fixture package');
    assert.equal(manifest.version, manifestVersion, 'Codex fixture package version differs from the pin');
    return { directory, manifest };
  };
  const wrapper = await packageRoot('@openai/codex');
  const platformPackage = '@openai/codex-' + process.platform + '-' + process.arch;
  const platformVersion = expectedVersion + '-' + process.platform + '-' + process.arch;
  assert.equal(
    wrapper.manifest.optionalDependencies?.[platformPackage],
    'npm:@openai/codex@' + platformVersion,
    'Codex platform dependency must be the exact pinned official npm alias',
  );
  const nativePackage = await packageRoot(platformPackage, '@openai/codex', platformVersion);
  assert.deepEqual(nativePackage.manifest.os, [process.platform]);
  assert.deepEqual(nativePackage.manifest.cpu, [process.arch]);
  const nativeRoot = nativePackage.directory;
  const vendor = await fs.realpath(path.join(nativeRoot, 'vendor'));
  assert.ok(contains(nativeRoot, vendor), 'Codex vendor directory escapes its platform package');
  const executableName = process.platform === 'win32' ? 'codex.exe' : 'codex';
  const candidates = [];
  for (const triple of await fs.readdir(vendor, { withFileTypes: true })) {
    if (!triple.isDirectory() || triple.isSymbolicLink()) continue;
    try {
      const executable = await fs.realpath(path.join(vendor, triple.name, 'bin', executableName));
      assert.ok(contains(nativeRoot, executable), 'Codex native executable escapes its platform package');
      if ((await fs.stat(executable)).isFile()) candidates.push(executable);
    } catch (error) {
      if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error;
    }
  }
  assert.equal(candidates.length, 1, 'Expected exactly one test-owned platform-native Codex executable');
  process.env.MTERM_CODEX_EXECUTABLE = candidates[0];
  return { prefix, executable: candidates[0], expectedVersion };
}

const testCodex = await selectTestCodex();
await fs.mkdir(path.join(root, 'artifacts'), { recursive: true });
const evidence = await fs.mkdtemp(path.join(root, 'artifacts', 'managed-codex-'));
const home = path.join(evidence, 'home'),
  workspace = path.join(evidence, 'workspace spaces'),
  secondWorkspace = path.join(evidence, 'second workspace');
await fs.mkdir(home);
await fs.mkdir(workspace);
await fs.mkdir(secondWorkspace);
const original =
  '# untouched CRLF comment\r\n[mcp_servers.unrelated]\r\ncommand = "fixture-only-never-run"\r\n';
const config = path.join(home, 'config.toml');
await fs.writeFile(config, original);
const env = { ...process.env, CODEX_HOME: home, MTERM_CONFIG_PATH: path.join(evidence, 'mterm.json') };
const compatibilityFile = path.join(path.dirname(env.MTERM_CONFIG_PATH), 'compat-policy.json');
const canonicalCompatibilityFile = path.join(
  await fs.realpath(path.dirname(compatibilityFile)),
  path.basename(compatibilityFile),
);
const canonicalRoots = await Promise.all(
  [workspace, secondWorkspace].map((directory) => fs.realpath(directory)),
);
const codex = await resolveCodex();
if (testCodex) assert.equal(await fs.realpath(codex.command), testCodex.executable);
const codexRun = async (args) =>
  exec(codex.command, [...codex.prefix, ...args], {
    env,
    timeout: 20000,
    maxBuffer: 1048576,
    windowsHide: true,
  });
const bin = process.env.MTERM_VERIFY_BIN
  ? path.resolve(process.env.MTERM_VERIFY_BIN)
  : path.join(root, 'bin', 'mterm-cli.js');
const mterm = async (args) =>
  JSON.parse(
    (
      await exec(process.execPath, [bin, ...args], {
        env,
        cwd: workspace,
        timeout: 40000,
        maxBuffer: 1048576,
        windowsHide: true,
      })
    ).stdout,
  );
const version = (await codexRun(['--version'])).stdout.trim();
if (testCodex)
  assert.equal(
    /^codex(?:-cli)? (\S+)$/.exec(version)?.[1],
    testCodex.expectedVersion,
    'Native Codex --version differs from the test pin',
  );
const args = [
  'setup',
  'codex',
  '--root',
  workspace,
  '--root',
  secondWorkspace,
  '--allow-write',
  '--allow-exec',
  '--process-budget',
  processBudgetArgument,
  '--compat-desktop-commander',
  '--compat-config',
  compatibilityFile,
  '--allow-config-write',
  '--apply',
];
assert.equal((await mterm(args)).changed, true);
const installed = await fs.readFile(config, 'utf8');
assert.ok(installed.startsWith(original));
assert.equal((await mterm(args)).changed, false);
assert.equal(await fs.readFile(config, 'utf8'), installed);
const parsed = JSON.parse((await codexRun(['mcp', 'get', 'mterm-local', '--json'])).stdout);
const spec = parsed.transport ?? parsed;
assert.equal(spec.type, 'stdio');
assert.equal(spec.command, process.execPath);
assert.equal(path.resolve(spec.args[0]), bin);
assert.ok(spec.args.includes('--allow-config-write'));
assert.equal(spec.args[spec.args.indexOf('--compat-config') + 1], compatibilityFile);
assert.equal(spec.args.filter((argument) => argument === '--process-budget').length, 1);
assert.equal(spec.args[spec.args.indexOf('--process-budget') + 1], processBudgetArgument);
assert.deepEqual(JSON.parse(spec.args[spec.args.indexOf('--process-budget') + 1]), selectedProcessBudget);
const budgetRounds = [];
const mcpCwd = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-managed-codex-cwd-')));
const selectedPackageRoot = await fs.realpath(path.resolve(path.dirname(bin), '..'));
for (const parent of [await fs.realpath(root), selectedPackageRoot]) {
  const relative = path.relative(parent, mcpCwd);
  assert.ok(
    relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative),
    'Managed MCP cwd must be outside the checkout and selected package',
  );
}
const cwdReceipt = path.join(evidence, 'registered-mcp-cwd.json');
await fs.writeFile(
  cwdReceipt,
  JSON.stringify(
    { cwd: mcpCwd, outsideCheckout: true, outsideSelectedPackage: true, cleanup: 'PENDING' },
    null,
    2,
  ) + '\n',
);
// Launch twice from the actual config Codex parsed. No independent foreground server is needed.
for (let iteration = 0; iteration < 2; iteration++) {
  const transport = new StdioClientTransport({
    command: spec.command,
    args: spec.args,
    env,
    cwd: mcpCwd,
    stderr: 'pipe',
  });
  const client = new Client({ name: 'mterm-managed-codex-fixture', version: '1.0.0' });
  const callTool = (args) => client.callTool(args, { timeout: 5000 });
  let childPid = null;
  let stderrTail = '';
  transport.stderr.on('data', (chunk) => {
    stderrTail = (stderrTail + chunk.toString('utf8')).slice(-4096);
  });
  try {
    const connected = client.connect(transport, { timeout: 5000 });
    childPid = transport.pid;
    await connected;
    assert.ok(Number.isInteger(childPid) && childPid > 0);
    await client.ping({ timeout: 5000 });
    const toolList = await client.listTools(undefined, { timeout: 5000 });
    assert.ok(toolList.tools.some((x) => x.name === 'mterm_write_file'));
    assert.ok(toolList.tools.some((x) => x.name === 'read_file'));
    assert.ok(toolList.tools.some((x) => x.name === 'get_config'));
    assert.ok(toolList.tools.some((x) => x.name === 'set_config_value'));
    budgetRounds.push(
      await verifyRegisteredProcessBudget(
        callTool,
        iteration,
        path.join(evidence, `managed-budget-round-${iteration}.json`),
      ),
    );
    const configuration = await callTool({ name: 'get_config', arguments: {} });
    assert.equal(configuration.isError, false);
    const preferences = configuration.structuredContent.config;
    assert.equal(preferences.mterm.configFile, canonicalCompatibilityFile);
    assert.deepEqual(preferences.allowedDirectories, canonicalRoots);
    assert.equal(preferences.currentClient.name, 'mterm-managed-codex-fixture');
    assert.equal(preferences.fileReadLineLimit, iteration === 0 ? 1000 : 2);
    const response = await callTool({ name: 'mterm_read_file', arguments: { path: 'fixture.txt' } });
    if (iteration === 0) {
      assert.equal(
        (
          await callTool({
            name: 'set_config_value',
            arguments: { key: 'fileReadLineLimit', value: 2 },
          })
        ).isError,
        false,
      );
      assert.equal(
        (
          await callTool({
            name: 'mterm_write_file',
            arguments: {
              path: path.join(secondWorkspace, 'config-fixture.txt'),
              text: 'first\nsecond\nthird\n',
              expectedVersion: 'missing',
            },
          })
        ).isError,
        false,
      );
      assert.equal(response.isError, true);
      assert.equal(
        (
          await callTool({
            name: 'mterm_write_file',
            arguments: { path: 'fixture.txt', text: 'configured MCP works', expectedVersion: 'missing' },
          })
        ).isError,
        false,
      );
    } else {
      assert.equal(response.isError, false);
      assert.equal(response.structuredContent.text, 'configured MCP works');
      const compatible = await callTool({
        name: 'read_file',
        arguments: { path: path.join(workspace, 'fixture.txt') },
      });
      assert.equal(compatible.isError, false);
      assert.match(compatible.content[0].text, /configured MCP works/);
      const configuredRead = await callTool({
        name: 'read_file',
        arguments: { path: path.join(secondWorkspace, 'config-fixture.txt') },
      });
      assert.equal(configuredRead.isError, false);
      assert.equal(
        configuredRead.content[0].text,
        '[Reading 2 lines from start (total: 3 lines, 1 remaining)]\n\nfirst\nsecond',
      );
    }
  } finally {
    try {
      await client.close();
    } finally {
      await transport.close();
      if (childPid !== null) await verifyProcessExit(childPid);
      await fs.writeFile(path.join(evidence, `mcp-stderr-${iteration}.log`), stderrTail);
    }
  }
  assert.equal(transport.pid, null);
}
assert.equal(budgetRounds.length, 2);
await fs.rmdir(mcpCwd);
await fs.writeFile(
  cwdReceipt,
  JSON.stringify(
    {
      cwd: mcpCwd,
      outsideCheckout: true,
      outsideSelectedPackage: true,
      cleanup: 'REMOVED_EMPTY_OWNED_CWD_AFTER_CONFIRMED_MCP_EXIT',
    },
    null,
    2,
  ) + '\n',
);
const extra = '\n[mcp_servers.after_setup]\ncommand="another-unrelated"\n';
await fs.appendFile(config, extra);
assert.equal((await mterm(['remove', 'codex'])).applied, false);
assert.equal(await fs.readFile(config, 'utf8'), installed + extra);
assert.equal((await mterm(['remove', 'codex', '--apply'])).removed, true);
assert.equal(await fs.readFile(config, 'utf8'), original + extra);
assert.equal((await mterm(['remove', 'codex', '--apply'])).changed, false);
const list = JSON.parse((await codexRun(['mcp', 'list', '--json'])).stdout);
assert.ok(list.some((x) => x.name === 'unrelated'));
assert.ok(list.some((x) => x.name === 'after_setup'));
assert.ok(!list.some((x) => x.name === 'mterm-local'));
const report = {
  codexVersion: version,
  codexExpectedVersion: testCodex?.expectedVersion ?? null,
  testOwnedCodex: !!testCodex,
  codexTestPrefix: testCodex ? path.relative(root, testCodex.prefix).split(path.sep).join('/') : null,
  codexNativeExecutable: testCodex
    ? path.relative(testCodex.prefix, testCodex.executable).split(path.sep).join('/')
    : null,
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  setupApplied: true,
  setupIdempotent: true,
  configurationParsedByCodex: true,
  managedProcessBudget: {
    selectedPolicy: selectedProcessBudget,
    exactSingleArgumentParsedByCodex: true,
    registeredSessionRounds: budgetRounds.length,
    rounds: budgetRounds,
    registeredMcpCwdOutsideCheckoutAndSelectedPackage: true,
    registeredMcpCwdRemovedAfterConfirmedExit: true,
    injectedOwnershipTable: false,
    rawObservationRetention:
      'Runner-local files; reported hashes do not establish independent retrieval or rehashing.',
    registeredMcpCwdReceipt: {
      path: cwdReceipt,
      bytes: (await fs.stat(cwdReceipt)).size,
      sha256: createHash('sha256')
        .update(await fs.readFile(cwdReceipt))
        .digest('hex'),
    },
    crossHostOrHardQuotaAcceptance: false,
  },
  registeredCommandMcpRounds: 2,
  compatibilityProfilePersisted: true,
  configurationToolsDiscovered: ['get_config', 'set_config_value'],
  syntheticConfigurationPathVerified: true,
  multipleRootsParsedByCodex: true,
  configurationPersistsAcrossRegisteredCommandRestarts: true,
  configuredReadLimitExercised: true,
  shutdownVerified: true,
  shutdownEvidence:
    'The original MCP process IDs returned ESRCH to bounded signal-0 polling after SDK close.',
  removalPreservesUnrelatedBytes: true,
  backupsRetained: true,
  actualCodexAgentToolInvocation: false,
  realUserConfigChanged: false,
  modelCalls: 0,
  installedEntry: !!process.env.MTERM_VERIFY_BIN,
  evidence,
};
await fs.writeFile(path.join(evidence, 'result.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
