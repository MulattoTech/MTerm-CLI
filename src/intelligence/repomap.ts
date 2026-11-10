// SPDX-License-Identifier: MIT
// Module: MTerm-CLI Compact Repository Map & Symbol Indexer
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

export interface RepoSymbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'type';
  line: number;
  signature?: string;
}

export interface FileOutline {
  path: string;
  bytes: number;
  lines: number;
  symbols: RepoSymbol[];
}

export interface RepoMapReport {
  root: string;
  filesIndexed: number;
  totalSymbols: number;
  outlines: FileOutline[];
  markdownSummary: string;
  cacheHit: boolean;
  treeSha?: string;
}

export class RepoMapGenerator {
  private static readonly IGNORED_NAMES = new Set([
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    '.pnpm-store',
    'vendor',
    'coverage',
    '.mterm-journal',
    '.mterm-cache',
    '__pycache__',
  ]);

  private static readonly SECRET_EXTENSIONS = new Set([
    '.pem',
    '.key',
    '.pfx',
    '.p12',
    '.cert',
    '.crt',
    '.env',
    '.token',
  ]);

  /**
   * Generates a dense, token-efficient summary of repository symbols and structure.
   */
  static async generate(rootDir: string, options: { maxLines?: number; maxFiles?: number } = {}): Promise<RepoMapReport> {
    const maxLines = options.maxLines || 120;
    const maxFiles = options.maxFiles || 50;
    const root = path.resolve(rootDir);

    // Try reading git commit SHA for cache keying
    let treeSha: string | undefined;
    try {
      const { stdout } = await exec('git', ['rev-parse', 'HEAD'], { cwd: root, timeout: 2000, windowsHide: true });
      treeSha = stdout.trim();
    } catch {}

    const cacheDir = path.join(root, '.mterm-cache');
    const cacheFile = treeSha ? path.join(cacheDir, `repomap-${treeSha.slice(0, 12)}.json`) : undefined;

    if (cacheFile) {
      try {
        const cached = JSON.parse(await fs.readFile(cacheFile, 'utf8')) as RepoMapReport;
        cached.cacheHit = true;
        return cached;
      } catch {}
    }

    const outlines: FileOutline[] = [];
    await this.scanDirectory(root, root, outlines, maxFiles);

    let totalSymbols = 0;
    const summaryLines: string[] = [`# Repository Map: ${path.basename(root)}`, ''];

    for (const outline of outlines) {
      totalSymbols += outline.symbols.length;
      if (summaryLines.length >= maxLines) break;

      summaryLines.push(`## ${outline.path} (${outline.lines}L)`);
      for (const sym of outline.symbols.slice(0, 10)) {
        if (summaryLines.length >= maxLines) break;
        const sig = sym.signature ? `: ${sym.signature}` : '';
        summaryLines.push(`- **${sym.kind}** \`${sym.name}\`${sig} (L${sym.line})`);
      }
      summaryLines.push('');
    }

    const report: RepoMapReport = {
      root,
      filesIndexed: outlines.length,
      totalSymbols,
      outlines,
      markdownSummary: summaryLines.join('\n'),
      cacheHit: false,
      treeSha,
    };

    // Save cache asynchronously
    if (cacheFile) {
      try {
        await fs.mkdir(cacheDir, { recursive: true });
        await fs.writeFile(cacheFile, JSON.stringify(report, null, 2), 'utf8');
      } catch {}
    }

    return report;
  }

  private static async scanDirectory(
    rootDir: string,
    currentDir: string,
    outlines: FileOutline[],
    maxFiles: number
  ): Promise<void> {
    if (outlines.length >= maxFiles) return;

    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (outlines.length >= maxFiles) break;

        const name = entry.name;
        if (this.IGNORED_NAMES.has(name) || name.startsWith('.')) continue;

        const fullPath = path.join(currentDir, name);
        const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

        if (entry.isDirectory()) {
          await this.scanDirectory(rootDir, fullPath, outlines, maxFiles);
        } else if (entry.isFile()) {
          const ext = path.extname(name).toLowerCase();
          if (this.SECRET_EXTENSIONS.has(ext) || name.startsWith('.env')) continue;

          if (['.ts', '.js', '.mts', '.mjs', '.py', '.ps1', '.json'].includes(ext)) {
            try {
              const content = await fs.readFile(fullPath, 'utf8');
              const symbols = this.extractSymbols(content, ext);
              const lines = content.split(/\r?\n/).length;

              outlines.push({
                path: relPath,
                bytes: Buffer.byteLength(content, 'utf8'),
                lines,
                symbols,
              });
            } catch {}
          }
        }
      }
    } catch {}
  }

  /**
   * Fast AST-regex symbol extraction.
   */
  private static extractSymbols(content: string, ext: string): RepoSymbol[] {
    const symbols: RepoSymbol[] = [];
    const lines = content.split(/\r?\n/);

    if (['.ts', '.js', '.mts', '.mjs'].includes(ext)) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!.trim();

        // Exported functions
        const fnMatch = line.match(/^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)/);
        if (fnMatch) {
          symbols.push({ name: fnMatch[1]!, kind: 'function', line: i + 1, signature: `(${fnMatch[2]!})` });
          continue;
        }

        // Classes
        const classMatch = line.match(/^(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/);
        if (classMatch) {
          symbols.push({ name: classMatch[1]!, kind: 'class', line: i + 1 });
          continue;
        }

        // Interfaces / Type aliases
        const ifaceMatch = line.match(/^(?:export\s+)?interface\s+([a-zA-Z0-9_$]+)/);
        if (ifaceMatch) {
          symbols.push({ name: ifaceMatch[1]!, kind: 'interface', line: i + 1 });
          continue;
        }

        const typeMatch = line.match(/^(?:export\s+)?type\s+([a-zA-Z0-9_$]+)\s*=/);
        if (typeMatch) {
          symbols.push({ name: typeMatch[1]!, kind: 'type', line: i + 1 });
          continue;
        }
      }
    } else if (ext === '.py') {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        const fnMatch = line.match(/^\s*(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
        if (fnMatch) {
          symbols.push({ name: fnMatch[1]!, kind: 'function', line: i + 1, signature: `(${fnMatch[2]!})` });
          continue;
        }
        const classMatch = line.match(/^\s*class\s+([a-zA-Z0-9_]+)/);
        if (classMatch) {
          symbols.push({ name: classMatch[1]!, kind: 'class', line: i + 1 });
          continue;
        }
      }
    }

    return symbols;
  }
}
