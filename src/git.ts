// SPDX-License-Identifier: MIT
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
  private constructor(readonly policy: RootPolicy) {}
  static async create(root: string) {
    return new GitService(await RootPolicy.create(root));
  }
  private async run(cwd: string, args: string[], signal?: AbortSignal) {
    cancelled(signal);
    const git = await resolveExecutable('git');
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
  private async cwd(input: string, signal?: AbortSignal) {
    const cwd = await this.policy.resolve(input);
    if (!(await fs.stat(cwd)).isDirectory()) fail('NOT_DIRECTORY', 'Git path must be a directory.');
    const top = (await this.run(cwd, ['rev-parse', '--show-toplevel'], signal)).trim();
    if (!this.policy.inside(path.resolve(top)))
      fail('GIT_OUTSIDE_ROOT', 'The enclosing repository extends outside the trusted root.');
    const gitDir = (await this.run(cwd, ['rev-parse', '--absolute-git-dir'], signal)).trim();
    if (!this.policy.inside(path.resolve(gitDir)))
      fail('GIT_OUTSIDE_ROOT', 'Git metadata lies outside the trusted root.');
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
