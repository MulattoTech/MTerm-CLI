// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-21-orchestrator-ready (OpenAI / GPT-6)
// Deterministic local validation. No Codex agent prompt, credential export, or remote mutation.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { resolveNpmEntry } from './npm-entry.mjs';

const root = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const opts = process.argv.slice(2);
const accepted = new Set(['--quick', '--full', '--dry-run']);
if (opts.some((x) => !accepted.has(x)) || (opts.includes('--quick') && opts.includes('--full'))) {
  process.stderr.write('Usage: node scripts/orchestration/verify.mjs [--quick|--full] [--dry-run]\n');
  process.exitCode = 2;
} else {
  if (
    !(await fs
      .stat(path.join(root, 'package-lock.json'))
      .then((s) => s.isFile())
      .catch(() => false))
  ) {
    throw new Error('Pinned package-lock.json required for verification.');
  }
  const npm = await resolveNpmEntry();
  const full = opts.includes('--full');
  const managedCodexVerifier = await fs
    .stat(path.join(root, 'scripts/verify-managed-codex.mjs'))
    .then((s) => s.isFile())
    .catch(() => false);
  const codexVerifier = managedCodexVerifier
    ? 'scripts/verify-managed-codex.mjs'
    : 'scripts/verify-codex-setup.mjs';
  const steps = [
    {
      name: 'reviewed build',
      executable: process.execPath,
      args: [npm, 'run', 'build'],
      timeoutMs: 4 * 60_000,
    },
    {
      name: 'normal acceptance tests',
      executable: process.execPath,
      args: [npm, 'run', 'check'],
      timeoutMs: 6 * 60_000,
    },
    ...(full
      ? [
          {
            name: 'portable package',
            executable: process.execPath,
            args: ['scripts/verify-package.mjs'],
            timeoutMs: 6 * 60_000,
          },
          {
            name: 'isolated Codex registration',
            executable: process.execPath,
            args: [codexVerifier],
            timeoutMs: 6 * 60_000,
          },
        ]
      : []),
  ];
  if (opts.includes('--dry-run')) {
    console.log(
      JSON.stringify(
        {
          schemaVersion: 1,
          cwd: root,
          node: process.version,
          mode: full ? 'full' : 'quick',
          steps,
          realModelCalls: 0,
          changesLiveCodexConfig: false,
          skipLinkedWorktreeSelfHost: true,
        },
        null,
        2,
      ),
    );
  } else {
    for (const step of steps) {
      console.log('== MTerm validation: ' + step.name + ' ==');
      const result = spawnSync(step.executable, step.args, {
        cwd: root,
        env: process.env,
        timeout: step.timeoutMs,
        windowsHide: true,
        stdio: 'inherit',
      });
      if (result.error || result.status !== 0) {
        throw new Error(step.name + ' failed: ' + (result.error?.message || 'exit ' + result.status));
      }
    }
    console.log(
      'MTerm validation PASS (' +
        (full ? 'full local' : 'quick local') +
        '); hosted CI and product acceptance are separate.',
    );
  }
}
