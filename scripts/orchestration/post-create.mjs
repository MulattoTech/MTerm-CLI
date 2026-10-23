// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-21-orchestrator-ready (OpenAI / GPT-6)
// One bounded, side-effect-documented setup operation per new AO worktree.
// Never touches Codex auth, Git refs, user profiles, or existing shared worktrees.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { resolveNpmEntry } from './npm-entry.mjs';

const root = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const argv = process.argv.slice(2);
const permitted = new Set(['--dry-run', '--no-build']);
if (argv.some((a) => !permitted.has(a))) {
  process.stderr.write('Usage: node scripts/orchestration/post-create.mjs [--dry-run] [--no-build]\n');
  process.exitCode = 2;
} else {
  const dryRun = argv.includes('--dry-run');
  const build = !argv.includes('--no-build');
  const lock = path.join(root, 'package-lock.json');
  const manifest = path.join(root, 'package.json');
  const locked = await fs
    .stat(lock)
    .then((s) => s.isFile())
    .catch(() => false);
  const packaged = JSON.parse(await fs.readFile(manifest, 'utf8'));
  if (!locked || packaged.name !== 'mterm-cli') {
    throw new Error('Expected pinned MTerm-CLI package manifest/lock; refusing setup.');
  }
  const major = Number(process.versions.node.split('.')[0]);
  if (!Number.isInteger(major) || major < 24) throw new Error('Node >= 24 is required.');
  if (!process.release.lts)
    process.stderr.write('Note: recommended CI runtime is Node 24 LTS; record actual Node version.\n');
  const npm = await resolveNpmEntry();
  const steps = [
    [npm, 'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-offline', '--no-progress'],
    ...(build ? [[npm, 'run', 'build:code']] : []),
  ];
  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          schemaVersion: 1,
          cwd: root,
          node: process.version,
          dryRun: true,
          steps: steps.map((args, index) => ({
            executable: process.execPath,
            args,
            installLifecycleScriptsDisabled: index === 0,
          })),
          touchesCodexConfig: false,
          invokesModels: false,
        },
        null,
        2,
      ),
    );
  } else {
    for (const [index, args] of steps.entries()) {
      const timeout = index === 0 ? 8 * 60_000 : 2 * 60_000;
      console.log('[MTerm AO setup] step ' + (index + 1) + '/' + steps.length);
      const run = spawnSync(process.execPath, args, {
        cwd: root,
        env: process.env,
        timeout,
        windowsHide: true,
        stdio: 'inherit',
      });
      if (run.error || run.status !== 0) {
        throw new Error(
          'AO worktree setup stopped at step ' +
            (index + 1) +
            ': ' +
            (run.error?.message ?? 'exit ' + run.status),
        );
      }
    }
    console.log('[MTerm AO setup] ready; no provider/model launched.');
  }
}
