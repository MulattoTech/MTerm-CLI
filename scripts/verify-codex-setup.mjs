// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-04-local-mcp
// Uses only a new CODEX_HOME. Never reads or changes the user's actual Codex configuration.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
import { resolveCodex } from '../dist/codex.js';
const exec = promisify(execFile);
const root = path.resolve('.');
const evidence = await fs.mkdtemp(path.join(root, 'artifacts', 'codex-registration-'));
const isolated = path.join(evidence, 'isolated-codex-home');
await fs.mkdir(isolated);
const scope = path.join(evidence, 'workspace');
await fs.mkdir(scope);
const codex = await resolveCodex();
const env = { ...process.env, CODEX_HOME: isolated, MTERM_CONFIG_PATH: path.join(evidence, 'mterm.json') };
const command = async (args) =>
  exec(codex.command, [...codex.prefix, ...args], {
    env,
    timeout: 10000,
    maxBuffer: 262144,
    windowsHide: true,
  });
const version = (await command(['--version'])).stdout.trim();
assert.match(version, /codex/i);
const plan = JSON.parse(
  (
    await exec(
      process.execPath,
      [
        path.join(root, 'bin', 'mterm-cli.js'),
        'setup',
        'codex',
        '--root',
        scope,
        '--allow-write',
        '--allow-exec',
      ],
      { env, timeout: 10000 },
    )
  ).stdout,
);
let added = false;
try {
  await command(plan.add.args);
  added = true;
  const stored = JSON.parse((await command(plan.verify.args)).stdout);
  const transport = stored.transport ?? stored;
  assert.equal(transport.type, 'stdio');
  assert.equal(transport.command, process.execPath);
  assert.deepEqual(transport.args, plan.add.args.slice(plan.add.args.indexOf('--') + 2));
  await command(plan.remove.args);
  added = false;
  const list = JSON.parse((await command(['mcp', 'list', '--json'])).stdout);
  assert.ok(Array.isArray(list) && !list.some((x) => x.name === 'mterm-local'));
  const result = {
    codexVersion: version,
    mode: codex.mode,
    setupRegistered: true,
    configurationRoundTrip: true,
    removedOwnedEntry: true,
    realUserConfigChanged: false,
    modelCalls: 0,
    scope: 'isolated temporary CODEX_HOME',
    sourceRoot: root,
  };
  await fs.writeFile(path.join(evidence, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  console.log('EVIDENCE=' + evidence);
} finally {
  if (added) await command(plan.remove.args).catch(() => {});
}
