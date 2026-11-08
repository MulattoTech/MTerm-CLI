// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-08-aug005-container-isolation (OpenAI / GPT-6 Astra Pro; self-reported)
// CLI startup parsing stays independent of the optional MCP/Zod/Engine stack.
import { fail } from './errors.js';
export type IsolationPolicy = Readonly<{
  socketPath: string;
  imageId: string;
  maxJobs: number;
  cpuMillis: number;
  memoryMiB: number;
  pidsLimit: number;
  tmpfsMiB: number;
  maxRuntimeMs: number;
  maxOutputBytes: number;
}>;
export function parseIsolationPolicy(input: unknown): IsolationPolicy {
  const keys = [
    'socketPath',
    'imageId',
    'maxJobs',
    'cpuMillis',
    'memoryMiB',
    'pidsLimit',
    'tmpfsMiB',
    'maxRuntimeMs',
    'maxOutputBytes',
  ];
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(input)) ||
    Object.keys(input).some((k) => !keys.includes(k))
  )
    fail(
      'INVALID_ARGUMENT',
      'Isolation requires a strict owner policy; arbitrary backend fields are forbidden.',
    );
  const a = input as Record<string, unknown>;
  const socketPath = a.socketPath;
  // Named-pipe transport is used by synthetic protocol tests only. The production factory
  // independently admits only a native Linux x64 host and a local Unix socket.
  const localPipe =
    typeof socketPath === 'string' && /^\\\\\.\\pipe\\[A-Za-z0-9_.-]{1,100}$/.test(socketPath);
  const localUnix =
    typeof socketPath === 'string' &&
    socketPath.startsWith('/') &&
    !socketPath.startsWith('//') &&
    !socketPath.includes('\\') &&
    !socketPath.split('/').some((p, i) => i > 0 && (!p || p === '.' || p === '..')) &&
    Buffer.byteLength(socketPath) <= 103;
  if (typeof socketPath !== 'string' || socketPath.includes('\0') || (!localPipe && !localUnix))
    fail(
      'INVALID_ARGUMENT',
      'Choose one absolute local Unix socket; TCP, SSH and remote paths are unsupported.',
    );
  if (typeof a.imageId !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(a.imageId))
    fail('INVALID_ARGUMENT', 'Isolation requires an immutable local Engine image ID.');
  const integer = (key: string, fallback: number, min: number, max: number) => {
    const v = a[key] === undefined ? fallback : a[key];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max)
      fail('INVALID_ARGUMENT', 'Invalid isolation owner limit.');
    return v;
  };
  const memoryMiB = integer('memoryMiB', 128, 64, 256);
  const tmpfsMiB = integer('tmpfsMiB', 16, 1, 64);
  if (tmpfsMiB > memoryMiB / 2)
    fail('INVALID_ARGUMENT', 'Workspace tmpfs must be at most half the memory ceiling.');
  return Object.freeze({
    socketPath,
    imageId: a.imageId,
    maxJobs: integer('maxJobs', 2, 1, 2),
    cpuMillis: integer('cpuMillis', 500, 50, 1000),
    memoryMiB,
    pidsLimit: integer('pidsLimit', 32, 8, 64),
    tmpfsMiB,
    maxRuntimeMs: integer('maxRuntimeMs', 30000, 100, 30000),
    maxOutputBytes: integer('maxOutputBytes', 65536, 1024, 131072),
  });
}
