// SPDX-License-Identifier: MIT
// Modified: 2026-11-02-foundation-portability; bind explicitly selected aliases to immutable canonical roots.
// Modified: 2026-10-06-config-parity; multiple immutable roots and per-request scope guard.
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
  private accessGuard?: (target: string) => void;
  readonly root: string;
  private constructor(
    readonly roots: readonly string[],
    private readonly aliases: readonly Readonly<{ selected: string; canonical: string }>[],
  ) {
    this.root = roots[0]!;
  }
  static async create(input: string | readonly string[]): Promise<RootPolicy> {
    const requested = typeof input === 'string' ? [input] : input;
    if (!Array.isArray(requested) || requested.length < 1 || requested.length > 16)
      fail('INVALID_ROOT', 'Choose between one and sixteen explicit trusted directories.');
    const roots: string[] = [];
    const aliases: Readonly<{ selected: string; canonical: string }>[] = [];
    for (const root of requested) {
      if (typeof root !== 'string' || !root || !path.isAbsolute(root))
        fail('INVALID_ROOT', 'Choose explicit absolute trusted directories.');
      const real = await fs.realpath(root);
      if (!(await fs.lstat(real)).isDirectory()) fail('INVALID_ROOT', 'Trusted root must be a directory.');
      if (!roots.some((r) => path.relative(r, real) === '')) roots.push(real);
      aliases.push(Object.freeze({ selected: path.resolve(root), canonical: real }));
    }
    return new RootPolicy(
      Object.freeze(roots),
      Object.freeze(aliases.sort((a, b) => a.selected.length - b.selected.length)),
    );
  }
  setAccessGuard(guard: (target: string) => void): void {
    this.accessGuard = guard;
  }
  private contains(root: string, candidate: string): boolean {
    const rel = path.relative(root, candidate);
    return rel === '' || (!path.isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + path.sep));
  }
  /** Use the outermost containing owner root so nested grants cannot hide private path components. */
  anchor(candidate: string): string {
    const roots = this.roots.filter((r) => this.contains(r, candidate)).sort((a, b) => a.length - b.length);
    if (!roots.length) fail('OUTSIDE_ROOT', 'Requested path is outside the owner-selected roots.');
    return roots[0]!;
  }
  inside(candidate: string): boolean {
    if (!this.roots.some((r) => this.contains(r, candidate))) return false;
    try {
      this.accessGuard?.(candidate);
      return true;
    } catch {
      return false;
    }
  }
  lexical(input: string): string {
    if (typeof input !== 'string' || !input || input.length > 4096 || /[\x00-\x1f\x7f]/.test(input))
      fail('INVALID_PATH', 'Invalid path.');
    if (/^[/\\]{2}/.test(input) || /^[A-Za-z]:[^/\\]/.test(input))
      fail('INVALID_PATH', 'UNC/device/drive-relative paths are not supported.');
    let target = path.resolve(this.root, input);
    if (!this.roots.some((root) => this.contains(root, target))) {
      // Only startup-selected aliases may be translated, never arbitrary realpaths.
      // Prefer the outermost selected alias so nested links/private names still undergo
      // the same component checks. A path already in a canonical root is not remapped.
      const alias = this.aliases.find((item) => this.contains(item.selected, target));
      if (alias) target = path.resolve(alias.canonical, path.relative(alias.selected, target));
    }
    if (!this.inside(target)) fail('OUTSIDE_ROOT', 'Requested path is outside the trusted root.');
    const rel = path.relative(this.anchor(target), target);
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
    const rel = path.relative(this.anchor(target), target);
    const parts = rel ? rel.split(path.sep) : [];
    let current = this.anchor(target);
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
      if (!this.roots.some((r) => this.contains(r, real)))
        fail('OUTSIDE_ROOT', 'Canonical path escapes the owner roots.');
    }
    return target;
  }
  relative(full: string): string {
    return this.contains(this.root, full)
      ? path.relative(this.root, full).split(path.sep).join('/') || '.'
      : full;
  }
}
