// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-08-aug012-resource-budgets (OpenAI / GPT-6 Astra Pro; self-reported)
// Lightweight startup parsing: importing the CLI must not eagerly load the optional MCP/Zod stack.
import { fail } from './errors.js';
export const BYTE_ESTIMATE_PATTERN = '^(?:0|[1-9][0-9]{0,29})$';
const decimal = new RegExp(BYTE_ESTIMATE_PATTERN);
export type DiskPolicy = Readonly<{
  minFreeBytes: string;
  highWaterPercent: number;
  maxJobScratchBytes: string;
}>;
export type ProcessBudget = Readonly<{
  maxSessions: number;
  maxPendingStarts: number;
  maxOutputBytes: number;
  maxRuntimeMs: number;
  admissionTimeoutMs: number;
  disk?: DiskPolicy;
}>;
function object(input: unknown, keys: string[]): Record<string, unknown> {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(input)) ||
    Object.keys(input).some((key) => !keys.includes(key))
  )
    fail('INVALID_ARGUMENT', 'Invalid process budget or unsupported quota.');
  return input as Record<string, unknown>;
}
function integer(data: Record<string, unknown>, key: string, fallback: number, min: number, max: number) {
  const value = data[key] === undefined ? fallback : data[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max)
    fail('INVALID_ARGUMENT', 'Invalid process budget limit.');
  return value;
}
function bytes(data: Record<string, unknown>, key: string, fallback: string) {
  const value = data[key] === undefined ? fallback : data[key];
  if (typeof value !== 'string' || value.length > 30 || !decimal.test(value))
    fail('INVALID_ARGUMENT', 'Byte estimates require canonical unsigned decimals of at most 30 digits.');
  return value;
}
export function parseProcessBudget(input: unknown = {}): ProcessBudget {
  const data = object(input, [
    'maxSessions',
    'maxPendingStarts',
    'maxOutputBytes',
    'maxRuntimeMs',
    'admissionTimeoutMs',
    'disk',
  ]);
  let disk: DiskPolicy | undefined;
  if (data.disk !== undefined) {
    const selected = object(data.disk, ['minFreeBytes', 'highWaterPercent', 'maxJobScratchBytes']);
    disk = Object.freeze({
      minFreeBytes: bytes(selected, 'minFreeBytes', '0'),
      highWaterPercent: integer(selected, 'highWaterPercent', 95, 1, 100),
      maxJobScratchBytes: bytes(selected, 'maxJobScratchBytes', '1073741824'),
    });
  }
  return Object.freeze({
    maxSessions: integer(data, 'maxSessions', 8, 1, 8),
    maxPendingStarts: integer(data, 'maxPendingStarts', 4, 1, 8),
    maxOutputBytes: integer(data, 'maxOutputBytes', 262144, 1024, 1048576),
    maxRuntimeMs: integer(data, 'maxRuntimeMs', 3600000, 100, 3600000),
    admissionTimeoutMs: integer(data, 'admissionTimeoutMs', 3000, 100, 30000),
    ...(disk ? { disk } : {}),
  });
}
