// SPDX-License-Identifier: MIT
// Modified: 2026-10-05-codex-parity-foundation; shared prevalidation for nested paths.
// AI-Change: 2026-10-04-local-mcp (OpenAI / GPT-6 Astra Pro; self-reported)
import fs from 'node:fs/promises';
import path from 'node:path';
import { fail } from './errors.js';
const forbidden = new Set([
  '.git',
  '.codex',
  '.ssh',
  '.aws',
  '.gnupg',
  '.azure',
  '.config',
  '.npmrc',
  '.netrc',
]);
export const ignored = new Set([
  'node_modules',
  'out',
  'dist',
  'coverage',
  'release-local',
  '.tools',
  'artifacts',
]);
export function privateName(name: string): boolean {
  const lower = name.toLowerCase();
  return forbidden.has(lower) || lower === '.env' || lower.startsWith('.env.');
}
/** Conservative path policy, not an OS sandbox. Symlinks/junctions and hardlinks are refused.
 * An adversarial local process can still race separate path checks; see SECURITY.md. */
export class RootPolicy {
  private constructor(readonly root: string) {}
  static async create(root: string): Promise<RootPolicy> {
    if (typeof root !== 'string' || !root || !path.isAbsolute(root))
      fail('INVALID_ROOT', 'Choose an explicit absolute trusted directory.');
    const real = await fs.realpath(root);
    const st = await fs.lstat(real);
    if (!st.isDirectory()) fail('INVALID_ROOT', 'Trusted root must be a directory.');
    return new RootPolicy(real);
  }
  inside(candidate: string): boolean {
    const rel = path.relative(this.root, candidate);
    return rel === '' || (!path.isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + path.sep));
  }
  lexical(input: string): string {
    if (typeof input !== 'string' || !input || input.length > 4096 || /[\x00-\x1f\x7f]/.test(input))
      fail('INVALID_PATH', 'Invalid path.');
    if (/^[/\\]{2}/.test(input) || /^[A-Za-z]:[^/\\]/.test(input))
      fail('INVALID_PATH', 'UNC/device/drive-relative paths are not supported.');
    const target = path.resolve(this.root, input);
    if (!this.inside(target)) fail('OUTSIDE_ROOT', 'Requested path is outside the trusted root.');
    const rel = path.relative(this.root, target);
    const parts = rel ? rel.split(path.sep) : [];
    for (const component of parts) {
      if (
        /[<>:"|?*\\]/.test(component) ||
        /[ .]$/.test(component) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(component)
      )
        fail('INVALID_PATH', 'Unsupported or ambiguous path component.');
      if (privateName(component))
        fail('PRIVATE_PATH', 'Credential and repository metadata paths are not exposed.');
    }
    return target;
  }
  async resolve(input: string, missingLeaf = false): Promise<string> {
    const target = this.lexical(input);
    const rel = path.relative(this.root, target);
    const parts = rel ? rel.split(path.sep) : [];
    let current = this.root;
    for (let i = 0; i < parts.length; i++) {
      current = path.join(current, parts[i]!);
      let st;
      try {
        st = await fs.lstat(current);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT' && missingLeaf && i === parts.length - 1)
          return target;
        throw error;
      }
      if (st.isSymbolicLink() || (st.isFile() && st.nlink > 1))
        fail('LINK_REJECTED', 'Symlinks, junctions and multiply-linked files are refused.');
      if (i < parts.length - 1 && !st.isDirectory()) fail('NOT_DIRECTORY', 'Parent is not a directory.');
      const real = await fs.realpath(current);
      if (!this.inside(real)) fail('OUTSIDE_ROOT', 'Canonical path escapes the trusted root.');
    }
    return target;
  }
  relative(full: string): string {
    return path.relative(this.root, full).split(path.sep).join('/') || '.';
  }
}
