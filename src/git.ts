// SPDX-License-Identifier: MIT
// Modified: 2026-11-09-git-boundaries; confine common metadata and deny executable filters before read-only inspection.
// AI-Change: 2026-10-04-local-mcp (OpenAI / GPT-6 Astra Pro; self-reported)
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';
import { RootPolicy } from './policy.js';
import { resolveExecutable } from './executables.js';
import { childEnvironment } from './processes.js';
import { fail, cancelled } from './errors.js';
const exec = promisify(execFile);
export const gitSchemas = {
  status: z.strictObject({ path: z.string().min(1).max(4096).default('.') }),
  diff: z.strictObject({
    path: z.string().min(1).max(4096).default('.'),
    staged: z.boolean().default(false),
  }),
};
export class GitService {
  private executionGuard?: (command: string) => void;
  setExecutionGuard(guard: (command: string) => void) {
    this.executionGuard = guard;
  }
  private constructor(readonly policy: RootPolicy) {}
  static async create(root: string | readonly string[]) {
    return new GitService(await RootPolicy.create(root));
  }
  private async run(cwd: string, args: string[], signal?: AbortSignal) {
    cancelled(signal);
    const git = await resolveExecutable('git');
    this.executionGuard?.(git);
    try {
      const r = await exec(
        git,
        [
          '--no-pager',
          '--no-optional-locks',
          '-c',
          'core.fsmonitor=false',
          '-c',
          'core.hooksPath=/dev/null',
          '-C',
          cwd,
          ...args,
        ],
        {
          windowsHide: true,
          shell: false,
          timeout: 5000,
          maxBuffer: 262144,
          signal,
          env: {
            ...childEnvironment(),
            GIT_CONFIG_NOSYSTEM: '1',
            GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
            GIT_OPTIONAL_LOCKS: '0',
            GIT_TERMINAL_PROMPT: '0',
          },
        },
      );
      return r.stdout;
    } catch (e) {
      cancelled(signal);
      const code = (e as NodeJS.ErrnoException).code;
      if (code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER')
        fail('OUTPUT_LIMIT', 'Git output exceeds the bounded response size.');
      if ((e as { killed?: boolean }).killed) fail('TIMEOUT', 'Git inspection exceeded its timeout.');
      fail('GIT_FAILED', 'Git inspection failed; check that this is an accessible repository.');
    }
  }
  private async metadataDirectory(output: string, signal?: AbortSignal) {
    const reported = output.replace(/\r?\n$/, '');
    if (!reported || reported.length > 4096 || !path.isAbsolute(reported) || /[\x00-\x1f\x7f]/.test(reported))
      fail('GIT_FAILED', 'Git reported an invalid repository directory.');
    const selected = path.resolve(reported);
    if (!this.policy.inside(selected))
      fail('GIT_OUTSIDE_ROOT', 'Repository worktree or metadata lies outside the trusted scope.');
    cancelled(signal);
    const canonical = await fs.realpath(selected);
    cancelled(signal);
    if (!this.policy.inside(canonical))
      fail('GIT_OUTSIDE_ROOT', 'Repository worktree or metadata lies outside the trusted scope.');
    const info = await fs.stat(canonical);
    cancelled(signal);
    if (!info.isDirectory()) fail('GIT_FAILED', 'Git metadata must be a directory.');
  }
  private async safeConfiguration(cwd: string, signal?: AbortSignal) {
    // Values may contain credentials or command strings; admission needs only bounded key names.
    // Reject includes rather than recursively following configuration that could hide a filter.
    const output = await this.run(
      cwd,
      ['config', '--null', '--name-only', '--list', '--no-includes'],
      signal,
    );
    const keys = output ? output.split('\x00') : [];
    if (output && keys.pop() !== '')
      fail('GIT_UNSAFE_CONFIG', 'Git configuration inspection returned invalid framing.');
    if (keys.length > 4096 || keys.some((key) => !key || key.length > 4096))
      fail('GIT_UNSAFE_CONFIG', 'Git configuration exceeds the inspection limits.');
    for (const name of keys) {
      const key = name.toLowerCase();
      if (
        key === 'include.path' ||
        (key.startsWith('includeif.') && key.endsWith('.path')) ||
        (key.startsWith('filter.') &&
          ['.clean', '.smudge', '.process'].some((suffix) => key.endsWith(suffix)))
      )
        fail(
          'GIT_UNSAFE_CONFIG',
          'Read-only Git inspection does not support repository command filters or configuration includes.',
        );
    }
    cancelled(signal);
  }
  private async cwd(input: string, signal?: AbortSignal) {
    const cwd = await this.policy.resolve(input);
    if (!(await fs.stat(cwd)).isDirectory()) fail('NOT_DIRECTORY', 'Git path must be a directory.');
    await this.metadataDirectory(await this.run(cwd, ['rev-parse', '--show-toplevel'], signal), signal);
    await this.metadataDirectory(await this.run(cwd, ['rev-parse', '--absolute-git-dir'], signal), signal);
    // A private worktree git-dir can be inside the root while its shared object/config directory is not.
    await this.metadataDirectory(
      await this.run(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir'], signal),
      signal,
    );
    await this.safeConfiguration(cwd, signal);
    return cwd;
  }
  async status(input: unknown, signal?: AbortSignal) {
    const a = gitSchemas.status.parse(input);
    const cwd = await this.cwd(a.path, signal);
    return {
      path: this.policy.relative(cwd),
      stdout: await this.run(
        cwd,
        ['status', '--porcelain=v1', '--branch', '--ignore-submodules=all'],
        signal,
      ),
      truncated: false,
    };
  }
  async diff(input: unknown, signal?: AbortSignal) {
    const a = gitSchemas.diff.parse(input);
    const cwd = await this.cwd(a.path, signal);
    return {
      path: this.policy.relative(cwd),
      stdout: await this.run(
        cwd,
        [
          'diff',
          '--no-ext-diff',
          '--no-textconv',
          '--no-color',
          '--ignore-submodules=all',
          ...(a.staged ? ['--cached'] : []),
          '--',
        ],
        signal,
      ),
      truncated: false,
    };
  }
}
