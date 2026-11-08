// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-08-aug005-container-isolation (OpenAI / GPT-6 Astra Pro; self-reported)
import os from 'node:os';
import fs from 'node:fs/promises';
import { fail } from './errors.js';
import { parseIsolationPolicy } from './isolation-policy.js';
import { EngineIsolation } from './isolation-engine.js';
import type { ProcessService } from './processes.js';
export { isolationSchemas } from './isolation-engine.js';
export function assertNativeIsolationHost(
  host = { platform: process.platform as string, arch: process.arch as string, release: os.release() },
) {
  if (host.platform !== 'linux' || host.arch !== 'x64' || /microsoft|wsl|linuxkit/i.test(host.release))
    fail(
      'ISOLATION_UNSUPPORTED',
      'This isolation mode requires native Linux x64; Windows, macOS, WSL and Docker Desktop are unsupported.',
    );
}
export async function createNativeIsolation(input: unknown, jobs: ProcessService) {
  assertNativeIsolationHost();
  const policy = parseIsolationPolicy(input);
  if (!policy.socketPath.startsWith('/'))
    fail('ISOLATION_UNSUPPORTED', 'Native Linux isolation requires a local Unix socket.');
  let socketPath: string;
  try {
    socketPath = await fs.realpath(policy.socketPath);
    if (!(await fs.stat(socketPath)).isSocket())
      fail('ISOLATION_UNAVAILABLE', 'The selected local endpoint is not a socket.');
  } catch {
    fail('ISOLATION_UNAVAILABLE', 'The explicitly selected local Engine socket is unavailable.');
  }
  return new EngineIsolation(parseIsolationPolicy({ ...policy, socketPath }), jobs);
}
