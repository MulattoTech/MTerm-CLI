// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-21-orchestrator-ready (OpenAI / GPT-6)
// Independent AO setup resolver: main does not yet contain the helper in pending PR #52.
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
      if (path.basename(resolved) === 'npm-cli.js' && (await fs.stat(resolved)).isFile()) {
        return resolved;
      }
    } catch (e) {
      if (!['ENOENT', 'ENOTDIR'].includes(e.code)) throw e;
    }
  }
  throw new Error('npm CLI missing beside this Node runtime. Install Node.js 24 LTS with npm.');
}
