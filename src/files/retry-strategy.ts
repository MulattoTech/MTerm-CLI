// SPDX-License-Identifier: MIT
// Module: MTerm-CLI Windows Filesystem Retry Strategy
export class WindowsRetryStrategy {
  readonly maxAttempts: number;
  private readonly baseBackoffMs: number;

  constructor(isWindows = process.platform === 'win32', maxAttempts = 5, baseBackoffMs = 25) {
    this.maxAttempts = isWindows ? maxAttempts : 1;
    this.baseBackoffMs = baseBackoffMs;
  }

  isTransientError(error: unknown): boolean {
    const code = (error as NodeJS.ErrnoException)?.code;
    return code === 'EPERM' || code === 'EBUSY';
  }

  async backoff(attempt: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return;
    const ms = this.baseBackoffMs * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
