// SPDX-License-Identifier: MIT
// Module: MTerm-CLI Semantic Editor & Unified Diff Engine
import os from 'node:os';

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

export interface ParsedDiff {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
}

export interface PatchResult {
  ok: boolean;
  patchedText: string;
  hunksApplied: number;
  hunksTotal: number;
  error?: string;
  failedHunkIndex?: number;
}

/**
 * Parses unified diff text into structured hunks.
 */
export function parseUnifiedDiff(diffText: string): ParsedDiff[] {
  const lines = diffText.split(/\r?\n/);
  const diffs: ParsedDiff[] = [];
  let currentDiff: ParsedDiff | null = null;
  let currentHunk: DiffHunk | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (line.startsWith('--- ')) {
      const oldPath = line
        .slice(4)
        .trim()
        .replace(/^[ab]\//, '');
      currentDiff = { oldPath, newPath: '', hunks: [] };
      diffs.push(currentDiff);
      currentHunk = null;
      continue;
    }

    if (line.startsWith('+++ ') && currentDiff) {
      currentDiff.newPath = line
        .slice(4)
        .trim()
        .replace(/^[ab]\//, '');
      continue;
    }

    const hunkHeader = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (hunkHeader) {
      if (!currentDiff) {
        currentDiff = { oldPath: '', newPath: '', hunks: [] };
        diffs.push(currentDiff);
      }
      currentHunk = {
        oldStart: parseInt(hunkHeader[1]!, 10),
        oldLines: hunkHeader[2] !== undefined ? parseInt(hunkHeader[2], 10) : 1,
        newStart: parseInt(hunkHeader[3]!, 10),
        newLines: hunkHeader[4] !== undefined ? parseInt(hunkHeader[4], 10) : 1,
        lines: [],
      };
      currentDiff.hunks.push(currentHunk);
      continue;
    }

    if (currentHunk) {
      if (line.startsWith('+') || line.startsWith('-') || line.startsWith(' ') || line === '') {
        currentHunk.lines.push(line);
      }
    }
  }

  return diffs;
}

/**
 * Normalizes line endings to match the original source file.
 */
export function detectLineEnding(text: string): '\r\n' | '\n' {
  const crlfCount = (text.match(/\r\n/g) || []).length;
  const lfCount = (text.match(/[^\r]\n/g) || []).length;
  return crlfCount > lfCount ? '\r\n' : '\n';
}

/**
 * Applies structured hunks to an existing file string with whitespace-tolerant fallback.
 */
export function applyHunks(originalText: string, hunks: DiffHunk[]): PatchResult {
  const lineEnding = detectLineEnding(originalText);
  const origLines = originalText.split(/\r?\n/);
  const resultLines = [...origLines];
  let lineOffset = 0;
  let hunksApplied = 0;

  for (let hIdx = 0; hIdx < hunks.length; hIdx++) {
    const hunk = hunks[hIdx]!;
    const expectedOldStart = hunk.oldStart - 1 + lineOffset;

    // Collect context and removal lines
    const oldSlice: string[] = [];
    const newSlice: string[] = [];

    for (const hLine of hunk.lines) {
      if (hLine.startsWith('-')) {
        oldSlice.push(hLine.slice(1));
      } else if (hLine.startsWith('+')) {
        newSlice.push(hLine.slice(1));
      } else if (hLine.startsWith(' ')) {
        oldSlice.push(hLine.slice(1));
        newSlice.push(hLine.slice(1));
      } else if (hLine === '') {
        oldSlice.push('');
        newSlice.push('');
      }
    }

    // Try exact position match first
    let matchIndex = -1;
    const canMatchAt = (targetIdx: number, fuzzy = false): boolean => {
      if (targetIdx < 0 || targetIdx + oldSlice.length > resultLines.length) return false;
      for (let j = 0; j < oldSlice.length; j++) {
        const expected = oldSlice[j]!;
        const actual = resultLines[targetIdx + j]!;
        if (fuzzy) {
          if (expected.trim() !== actual.trim()) return false;
        } else {
          if (expected !== actual) return false;
        }
      }
      return true;
    };

    if (canMatchAt(expectedOldStart, false)) {
      matchIndex = expectedOldStart;
    } else {
      // Search window around expected position (+- 30 lines)
      const windowRadius = 30;
      const startSearch = Math.max(0, expectedOldStart - windowRadius);
      const endSearch = Math.min(resultLines.length - oldSlice.length, expectedOldStart + windowRadius);

      // Search exact first
      for (let candidate = startSearch; candidate <= endSearch; candidate++) {
        if (canMatchAt(candidate, false)) {
          matchIndex = candidate;
          break;
        }
      }

      // If still not found, try fuzzy whitespace matching
      if (matchIndex === -1) {
        for (let candidate = startSearch; candidate <= endSearch; candidate++) {
          if (canMatchAt(candidate, true)) {
            matchIndex = candidate;
            break;
          }
        }
      }
    }

    if (matchIndex === -1) {
      return {
        ok: false,
        patchedText: originalText,
        hunksApplied,
        hunksTotal: hunks.length,
        error: `Hunk #${hIdx + 1} failed to match target lines (expected line ${hunk.oldStart})`,
        failedHunkIndex: hIdx,
      };
    }

    // Apply the hunk replacement
    resultLines.splice(matchIndex, oldSlice.length, ...newSlice);
    lineOffset += newSlice.length - oldSlice.length;
    hunksApplied++;
  }

  return {
    ok: true,
    patchedText: resultLines.join(lineEnding),
    hunksApplied,
    hunksTotal: hunks.length,
  };
}

/**
 * Computes a simple unified diff between two text versions for preview.
 */
export function createDiffPreview(filePath: string, oldText: string, newText: string): string {
  const lineEnding = detectLineEnding(oldText);
  const oldLines = oldText.split(/\r?\n/);
  const newLines = newText.split(/\r?\n/);
  const header = `--- a/${filePath}\n+++ b/${filePath}\n@@ -1,${oldLines.length} +1,${newLines.length} @@\n`;

  const diffLines: string[] = [];
  const maxLines = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLines; i++) {
    const o = oldLines[i];
    const n = newLines[i];
    if (o === n) {
      if (o !== undefined) diffLines.push(` ${o}`);
    } else {
      if (o !== undefined) diffLines.push(`-${o}`);
      if (n !== undefined) diffLines.push(`+${n}`);
    }
  }

  return header + diffLines.join('\n');
}
