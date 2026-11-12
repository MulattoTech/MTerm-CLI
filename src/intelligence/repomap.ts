// SPDX-License-Identifier: MIT
// Module: MTerm-CLI Compact Repository Map & Symbol Indexer
import path from 'node:path';
import { SourceReader, type SourceReaderOptions } from './source-reader.js';

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
  /**
   * Generates a dense, token-efficient summary of repository symbols and structure.
   */
  static async generate(
    rootDir: string,
    options: { maxLines?: number; maxFiles?: number } = {},
    access: SourceReaderOptions = {},
  ): Promise<RepoMapReport> {
    const maxLines = options.maxLines || 120;
    const maxFiles = options.maxFiles || 50;
    const root = path.resolve(rootDir);

    // A Git HEAD hash does not change for uncommitted or untracked edits. The
    // previous cache leaked writes from a read-only MCP tool into the checkout
    // and returned stale maps. Disable it until an actually safe key is designed.

    const outlines: FileOutline[] = [];
    const reader = await SourceReader.create(root, access);
    for await (const source of reader.scan(
      root,
      ['.ts', '.js', '.mts', '.mjs', '.py', '.ps1', '.json'],
      maxFiles,
    )) {
      const symbols = this.extractSymbols(source.text, path.extname(source.file).toLowerCase()).slice(0, 200);
      outlines.push({
        path: path.relative(root, source.file).replace(/\\/g, '/'),
        bytes: Buffer.byteLength(source.text, 'utf8'),
        lines: source.text.split(/\r?\n/).length,
        symbols,
      });
    }

    const totalSymbols = outlines.reduce((total, outline) => total + outline.symbols.length, 0);
    const summaryLines: string[] = [`# Repository Map: ${path.basename(root)}`, ''];

    for (const outline of outlines) {
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
    };
    return report;
  }

  /**
   * Heuristic text extraction; not an AST or language-server result.
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
