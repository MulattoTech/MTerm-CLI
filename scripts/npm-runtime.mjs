// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-05-codex-parity-foundation
// Development-only resolver; never downloads or invokes a shell to locate npm.
import fs from 'node:fs/promises';
import path from 'node:path';
export async function resolveNpmEntry({ execPath = process.execPath, env = process.env } = {}) {
  const bin = path.dirname(execPath);
  const candidates = [
    env.npm_execpath,
    path.join(bin, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.resolve(bin, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ];
  for (const candidate of candidates) {
    if (!candidate || !path.isAbsolute(candidate)) continue;
    try {
      const resolved = await fs.realpath(candidate);
      if (path.basename(resolved) === 'npm-cli.js' && (await fs.stat(resolved)).isFile()) return resolved;
    } catch (e) {
      if (!['ENOENT', 'ENOTDIR'].includes(e.code)) throw e;
    }
  }
  throw Error(
    'npm CLI could not be located beside this Node runtime; run from npm or install the supported Node distribution.',
  );
}
