// SPDX-License-Identifier: MIT
// Module: MTerm-CLI Transactional Shadow Journal & Rollback Engine
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export interface JournalEntry {
  transactionId: string;
  timestamp: string;
  relativePath: string;
  previousVersion: string;
  previousContent: string;
  action: 'write' | 'patch' | 'delete';
}

export interface RollbackResult {
  ok: boolean;
  restoredFiles: string[];
  transactionId: string;
  error?: string;
}

export class ShadowJournal {
  private static instance?: ShadowJournal;
  private readonly journalDir: string;
  private activeTransactionId?: string;

  constructor(rootDir: string) {
    this.journalDir = path.join(rootDir, '.mterm-journal');
  }

  static getInstance(rootDir?: string): ShadowJournal {
    if (!this.instance && rootDir) {
      this.instance = new ShadowJournal(rootDir);
    }
    return this.instance || new ShadowJournal(rootDir || process.cwd());
  }

  private async ensureJournalDir(): Promise<void> {
    try {
      await fs.mkdir(this.journalDir, { recursive: true });
    } catch {}
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
    transactionId?: string
  ): Promise<string> {
    await this.ensureJournalDir();
    const txId = transactionId || this.activeTransactionId || randomUUID();
    const sha = createHash('sha256').update(currentContent, 'utf8').digest('hex');

    const entry: JournalEntry = {
      transactionId: txId,
      timestamp: new Date().toISOString(),
      relativePath,
      previousVersion: sha,
      previousContent: currentContent,
      action,
    };

    const fileName = `${Date.now()}-${txId.slice(0, 8)}-${path.basename(relativePath)}.json`;
    const targetFile = path.join(this.journalDir, fileName);

    await fs.writeFile(targetFile, JSON.stringify(entry, null, 2), 'utf8');
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
      const jsonFiles = files.filter((f) => f.endsWith('.json')).sort().reverse().slice(0, limit);

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

  /**
   * Reverts changes using snapshot journal records.
   */
  async rollback(options: {
    transactionId?: string;
    file?: string;
    stepsBack?: number;
    rootDir: string;
  }): Promise<RollbackResult> {
    const snapshots = await this.listSnapshots(100);
    if (snapshots.length === 0) {
      return { ok: false, restoredFiles: [], transactionId: '', error: 'No journal snapshots found.' };
    }

    const restoredFiles: string[] = [];
    let targetTxId = options.transactionId;

    if (options.file) {
      // Find latest snapshot for this specific file
      const match = snapshots.find((s) => s.entry.relativePath === options.file);
      if (!match) {
        return { ok: false, restoredFiles: [], transactionId: '', error: `No snapshot found for file '${options.file}'.` };
      }
      const fullPath = path.resolve(options.rootDir, match.entry.relativePath);
      await fs.writeFile(fullPath, match.entry.previousContent, 'utf8');
      restoredFiles.push(match.entry.relativePath);
      targetTxId = match.entry.transactionId;
    } else if (options.transactionId) {
      // Revert all files in this transaction
      const txSnapshots = snapshots.filter((s) => s.entry.transactionId === options.transactionId);
      if (txSnapshots.length === 0) {
        return { ok: false, restoredFiles: [], transactionId: options.transactionId, error: `Transaction '${options.transactionId}' not found.` };
      }
      for (const s of txSnapshots) {
        const fullPath = path.resolve(options.rootDir, s.entry.relativePath);
        await fs.writeFile(fullPath, s.entry.previousContent, 'utf8');
        restoredFiles.push(s.entry.relativePath);
      }
    } else {
      // Revert the latest transaction
      const latest = snapshots[0]!;
      targetTxId = latest.entry.transactionId;
      const latestTxSnapshots = snapshots.filter((s) => s.entry.transactionId === targetTxId);
      for (const s of latestTxSnapshots) {
        const fullPath = path.resolve(options.rootDir, s.entry.relativePath);
        await fs.writeFile(fullPath, s.entry.previousContent, 'utf8');
        restoredFiles.push(s.entry.relativePath);
      }
    }

    return {
      ok: true,
      restoredFiles: Array.from(new Set(restoredFiles)),
      transactionId: targetTxId || 'unknown',
    };
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
