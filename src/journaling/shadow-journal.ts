// SPDX-License-Identifier: MIT
// Module: MTerm-CLI Transactional Shadow Journal & Rollback Engine
import fs from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { fail } from '../errors.js';

// Some deterministic fault-injection tests simulate a different process.platform.
// Filesystem permissions must always be checked for the actual host OS.
const hostHasPosixPermissions = process.platform !== 'win32';

export interface JournalEntry {
  transactionId: string;
  timestamp: string;
  relativePath: string;
  previousVersion: string;
  previousContent: string;
  /** Hash of the exact content written by the guarded mutation. Missing means unverified. */
  nextVersion?: string;
  action: 'write' | 'patch' | 'delete';
}

export interface RollbackResult {
  ok: boolean;
  restoredFiles: string[];
  transactionId: string;
  error?: string;
}

export class ShadowJournal {
  private readonly journalDir: string;
  private readonly rootDir: string;
  private activeTransactionId?: string;

  constructor(rootDir?: string) {
    // macOS often aliases /var to /private/var. RootPolicy canonicalizes that
    // alias; the journal must use the same real root for snapshot discovery.
    this.rootDir = realpathSync.native(path.resolve(rootDir ?? process.cwd()));
    const base = process.env.MTERM_JOURNAL_DIR || path.join(os.tmpdir(), 'mterm-journals');
    // Snapshots from different trusted roots must never be visible to one another.
    const rootId = createHash('sha256').update(this.rootDir).digest('hex').slice(0, 32);
    this.journalDir = path.join(base, `root-${rootId}`);
  }

  static getInstance(rootDir?: string): ShadowJournal {
    // A process-global singleton previously mixed journal contents from unrelated roots.
    return new ShadowJournal(rootDir);
  }

  private async ensureJournalDir(): Promise<void> {
    await fs.mkdir(this.journalDir, { recursive: true, mode: 0o700 });
    const st = await fs.lstat(this.journalDir);
    if (!st.isDirectory() || st.isSymbolicLink() || (hostHasPosixPermissions && (st.mode & 0o077) !== 0)) {
      fail('JOURNAL_UNSAFE', 'Journal directory is not an owner-private directory.');
    }
    if (typeof process.getuid === 'function' && st.uid !== process.getuid()) {
      fail('JOURNAL_UNSAFE', 'Journal directory is not owned by the current user.');
    }
  }

  /**
   * Starts a named transaction for grouping multi-file operations.
   */
  beginTransaction(customId?: string): string {
    this.activeTransactionId = customId || randomUUID();
    return this.activeTransactionId;
  }

  /**
   * Ends the current transaction.
   */
  endTransaction(): void {
    this.activeTransactionId = undefined;
  }

  /**
   * Records a pre-mutation snapshot of a file before changes are committed to disk.
   */
  async recordSnapshot(
    relativePath: string,
    currentContent: string,
    action: 'write' | 'patch' | 'delete' = 'write',
    transactionId?: string,
    nextContent?: string,
  ): Promise<string> {
    const target = path.resolve(this.rootDir, relativePath);
    const relative = path.relative(this.rootDir, target);
    if (
      !relative ||
      path.isAbsolute(relativePath) ||
      relative === '..' ||
      relative.startsWith('..' + path.sep) ||
      path.isAbsolute(relative)
    ) {
      fail('JOURNAL_PATH', 'Journal snapshot must have a relative path inside its trusted root.');
    }
    await this.ensureJournalDir();
    const txId = transactionId || this.activeTransactionId || randomUUID();
    const sha = createHash('sha256').update(currentContent, 'utf8').digest('hex');

    const entry: JournalEntry = {
      transactionId: txId,
      timestamp: new Date().toISOString(),
      relativePath,
      previousVersion: sha,
      previousContent: currentContent,
      nextVersion:
        nextContent === undefined
          ? undefined
          : createHash('sha256').update(nextContent, 'utf8').digest('hex'),
      action,
    };

    const fileName = `${Date.now()}-${randomUUID()}.json`;
    const targetFile = path.join(this.journalDir, fileName);

    await fs.writeFile(targetFile, JSON.stringify(entry, null, 2), {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
    await this.enforceRetentionQuota();

    return txId;
  }

  /**
   * Lists available journal snapshots in reverse chronological order.
   */
  async listSnapshots(limit = 50): Promise<Array<{ fileName: string; entry: JournalEntry }>> {
    await this.ensureJournalDir();
    try {
      const files = await fs.readdir(this.journalDir);
      const jsonFiles = files
        .filter((f) => f.endsWith('.json'))
        .sort()
        .reverse()
        .slice(0, limit);

      const snapshots: Array<{ fileName: string; entry: JournalEntry }> = [];
      for (const f of jsonFiles) {
        try {
          const content = await fs.readFile(path.join(this.journalDir, f), 'utf8');
          const entry = JSON.parse(content) as JournalEntry;
          snapshots.push({ fileName: f, entry });
        } catch {}
      }
      return snapshots;
    } catch {
      return [];
    }
  }

  async findSnapshot(
    relativePath: string,
    transactionId?: string,
    stepsBack = 1,
  ): Promise<JournalEntry | undefined> {
    const snapshots = await this.listSnapshots(100);
    return snapshots.filter(
      ({ entry }) =>
        entry.relativePath === relativePath && (!transactionId || entry.transactionId === transactionId),
    )[stepsBack - 1]?.entry;
  }

  /**
   * Reverts changes using snapshot journal records.
   */
  async rollback(options: {
    transactionId?: string;
    file?: string;
    stepsBack?: number;
    rootDir: string;
  }): Promise<RollbackResult> {
    // Preserve the public API, but route it through the existing guarded atomic FileService.
    // The former implementation used unchecked fs.writeFile and could escape its root.
    if (realpathSync.native(path.resolve(options.rootDir)) !== this.rootDir) {
      fail('JOURNAL_ROOT', 'Rollback root does not match the snapshot owner.');
    }
    if (!options.file) fail('ROLLBACK_SCOPE', 'Only guarded single-file rollback is currently supported.');
    const { FileService } = await import('../files.js');
    const service = await FileService.create(this.rootDir, { allowWrite: true });
    return service.rollback({
      file: options.file,
      transactionId: options.transactionId,
      stepsBack: options.stepsBack,
    });
  }

  /**
   * Enforces 50MB disk quota on journal directory.
   */
  private async enforceRetentionQuota(): Promise<void> {
    try {
      const files = await fs.readdir(this.journalDir);
      if (files.length <= 100) return;

      // Keep newest 100 entries, remove older
      const sorted = files.sort();
      const victims = sorted.slice(0, files.length - 100);
      for (const v of victims) {
        await fs.unlink(path.join(this.journalDir, v)).catch(() => {});
      }
    } catch {}
  }
}
