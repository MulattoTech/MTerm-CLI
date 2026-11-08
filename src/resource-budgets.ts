// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-08-aug012-resource-budgets (OpenAI / GPT-6 Astra Pro; self-reported)
import fs from 'node:fs/promises';
import { z } from 'zod';
import { fail } from './errors.js';
import { BYTE_ESTIMATE_PATTERN, type ProcessBudget } from './resource-budget-policy.js';
export { parseProcessBudget, type ProcessBudget } from './resource-budget-policy.js';

// Bounded before BigInt conversion; decimal strings avoid JSON precision loss.
export const byteEstimate = z.string().max(30).regex(new RegExp(BYTE_ESTIMATE_PATTERN));

/** Fixed owned-control lane; no unbounded bypass, persistent queue, or cross-host accounting. */
export class WorkAdmission {
  private normal = 0;
  private control = 0;
  enter(control: boolean): () => void {
    if (control ? this.control >= 2 : this.normal >= 4)
      fail(
        'BUSY',
        control
          ? 'Owned control capacity is busy (two operations).'
          : 'Normal work capacity is busy (four operations).',
      );
    if (control) this.control++;
    else this.normal++;
    let held = true;
    return () => {
      if (!held) return;
      held = false;
      if (control) this.control--;
      else this.normal--;
    };
  }
  status() {
    return {
      normalLimit: 4,
      controlLimit: 2,
      normalActive: this.normal,
      controlActive: this.control,
      maxQueued: 0,
    };
  }
}

export type DiskObservation = {
  path: string;
  total: bigint;
  available: bigint;
  observedAt: string;
};
/** statfs has no abort option. The caller retains its admission until this await actually settles. */
export async function observeDisk(target: string, check: () => void): Promise<DiskObservation> {
  check();
  let observation;
  try {
    observation = await fs.statfs(target, { bigint: true });
  } catch (error) {
    check();
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOSYS' || code === 'ENOTSUP' || code === 'ERR_METHOD_NOT_IMPLEMENTED')
      fail('DISK_UNSUPPORTED', 'Available disk measurement is unsupported; new job admission denied.');
    if (code === 'EACCES' || code === 'EPERM')
      fail('DISK_PERMISSION_DENIED', 'Available disk measurement was denied; new job admission denied.');
    fail('DISK_PROBE_FAILED', 'Available disk measurement failed; new job admission denied.');
  }
  check();
  const { bsize, blocks, bavail } = observation;
  if (
    typeof bsize !== 'bigint' ||
    typeof blocks !== 'bigint' ||
    typeof bavail !== 'bigint' ||
    bsize <= 0n ||
    blocks <= 0n ||
    bavail < 0n ||
    bavail > blocks
  )
    fail('DISK_INVALID_STATS', 'Invalid disk statistics; new job admission denied.');
  const total = bsize * blocks,
    available = bsize * bavail;
  if (total.toString().length > 30)
    fail('DISK_INVALID_STATS', 'Disk statistics exceed the supported accounting range.');
  return { path: target, total, available, observedAt: new Date().toISOString() };
}

/** All roots share one conservative pool: statfs type and path spelling are not volume identities. */
export function chooseDisk(
  observations: readonly DiskObservation[],
  policy: NonNullable<ProcessBudget['disk']>,
  requested: bigint,
  reserved: bigint,
) {
  const minimum = BigInt(policy.minFreeBytes);
  const candidates = observations
    .map((observation) => {
      // Ceiling division preserves the high-water floor even for non-integral percentages.
      const highWaterFloor = (observation.total * BigInt(100 - policy.highWaterPercent) + 99n) / 100n;
      const requiredFree = minimum > highWaterFloor ? minimum : highWaterFloor;
      return { ...observation, requiredFree, headroom: observation.available - requiredFree - reserved };
    })
    .filter((candidate) => candidate.headroom >= requested);
  candidates.sort((a, b) =>
    a.headroom === b.headroom
      ? a.path < b.path
        ? -1
        : a.path > b.path
          ? 1
          : 0
      : a.headroom > b.headroom
        ? -1
        : 1,
  );
  const selected = candidates[0];
  if (!selected)
    fail('DISK_HEADROOM', 'Observed available space cannot cover the disk floor and host reservations.');
  return selected;
}
