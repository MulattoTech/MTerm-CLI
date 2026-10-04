// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-04-local-mcp (OpenAI / GPT-6 Astra Pro; self-reported)
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { resolveExecutable } from './executables.js';
import { settings } from './config.js';
import { fail, ToolError } from './errors.js';
export interface CodexCommand {
  command: string;
  prefix: string[];
  mode: string;
  version?: string;
}
export async function resolveCodex(): Promise<CodexCommand> {
  const explicit = process.env.MTERM_CODEX_EXECUTABLE ?? (await settings()).settings.codexExecutable;
  if (explicit)
    return {
      command: await resolveExecutable('codex', explicit),
      prefix: [],
      mode: 'explicit-existing-executable',
    };
  try {
    return { command: await resolveExecutable('codex'), prefix: [], mode: 'existing-native-codex' };
  } catch {}
  const envPath = Object.entries(process.env).find(([k]) => k.toLowerCase() === 'path')?.[1] ?? '';
  const candidates = new Set<string>();
  if (process.platform === 'win32' && process.env.APPDATA)
    candidates.add(path.join(process.env.APPDATA, 'npm', 'node_modules', '@openai', 'codex'));
  for (const dir of envPath.split(path.delimiter).filter((p) => path.isAbsolute(p))) {
    candidates.add(path.join(dir, 'node_modules', '@openai', 'codex'));
    candidates.add(path.join(dir, '..', 'lib', 'node_modules', '@openai', 'codex'));
  }
  for (const root of candidates)
    try {
      const manifest = path.join(root, 'package.json');
      if ((await fs.stat(manifest)).size > 65536) continue;
      const pkg = JSON.parse(await fs.readFile(manifest, 'utf8'));
      if (pkg.name !== '@openai/codex' || pkg.bin?.codex !== 'bin/codex.js') continue;
      const script = path.join(root, 'bin', 'codex.js');
      if (!(await fs.stat(script)).isFile()) continue;
      return {
        command: process.execPath,
        prefix: [script],
        mode: 'existing-official-npm-wrapper',
        version: typeof pkg.version === 'string' ? pkg.version : undefined,
      };
    } catch {}
  fail(
    'DEPENDENCY_MISSING',
    'Install an official Codex distribution or explicitly configure its native executable. MTerm never installs it silently.',
  );
}
export async function launchCodex(args: string[]): Promise<number> {
  const resolved = await resolveCodex();
  return new Promise<number>((resolve, reject) => {
    // Preserve the upstream environment/config/auth and TTY. Add no model, sandbox or approval flags.
    const child = spawn(resolved.command, [...resolved.prefix, ...args], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
      shell: false,
    });
    const forward = (signal: NodeJS.Signals) => () => {
      if (child.exitCode === null) child.kill(signal);
    };
    const interrupt = forward('SIGINT'),
      terminate = forward('SIGTERM');
    process.on('SIGINT', interrupt);
    process.on('SIGTERM', terminate);
    const clean = () => {
      process.off('SIGINT', interrupt);
      process.off('SIGTERM', terminate);
    };
    child.once('error', () => {
      clean();
      reject(
        new ToolError(
          'CODEX_START_FAILED',
          'Codex could not be launched; the existing installation was not changed.',
        ),
      );
    });
    child.once('exit', (code, signal) => {
      clean();
      resolve(code ?? (signal ? 128 + (os.constants.signals[signal] ?? 1) : 1));
    });
  });
}
