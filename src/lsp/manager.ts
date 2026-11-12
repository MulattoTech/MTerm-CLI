// SPDX-License-Identifier: MIT
// Module: MTerm-CLI bounded textual symbol navigation (not an LSP client)
import path from 'node:path';
import { SourceReader, type SourceReaderOptions } from '../intelligence/source-reader.js';

const escaped = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface SymbolLocation {
  file: string;
  line: number;
  column: number;
  contextText?: string;
}

export interface DocumentSymbolItem {
  name: string;
  kind: string;
  line: number;
  signature?: string;
}

export class LspManager {
  /**
   * Finds a textual declaration in the file or bounded authorized siblings.
   */
  static async findDefinition(
    filePath: string,
    targetSymbol: string,
    rootDir: string,
    access: SourceReaderOptions = {},
  ): Promise<SymbolLocation | null> {
    const reader = await SourceReader.create(rootDir, access);
    const full = await reader.policy.resolve(filePath);
    const local = this.searchTextForDeclaration(await reader.read(full), full, targetSymbol);
    if (local) return local;
    for await (const source of reader.scan(path.dirname(full), ['.ts', '.js', '.py'], 200, 0)) {
      if (source.file === full) continue;
      const match = this.searchTextForDeclaration(source.text, source.file, targetSymbol);
      if (match) return match;
    }

    return null;
  }

  /**
   * Finds bounded textual occurrences; this is not semantic reference analysis.
   */
  static async findReferences(
    symbol: string,
    rootDir: string,
    limit = 50,
    access: SourceReaderOptions = {},
  ): Promise<SymbolLocation[]> {
    const locations: SymbolLocation[] = [];
    const reader = await SourceReader.create(rootDir, access);
    const root = await reader.policy.resolve(rootDir);
    const boundaryRegex = new RegExp(`\\b${escaped(symbol)}\\b`);
    for await (const source of reader.scan(root, ['.ts', '.js', '.py'])) {
      const lines = source.text.split(/\r?\n/);
      for (let i = 0; i < lines.length && locations.length < limit; i++) {
        const match = boundaryRegex.exec(lines[i]!);
        if (match)
          locations.push({
            file: path.relative(root, source.file).replace(/\\/g, '/'),
            line: i + 1,
            column: match.index + 1,
            contextText: lines[i]!.trim().slice(0, 512),
          });
      }
      if (locations.length >= limit) break;
    }
    return locations;
  }

  /**
   * Extracts a flat list of declaration patterns from one authorized file.
   */
  static async getDocumentSymbols(
    filePath: string,
    access: SourceReaderOptions = {},
  ): Promise<DocumentSymbolItem[]> {
    const reader = await SourceReader.create(path.dirname(filePath), access);
    const content = await reader.read(filePath);
    const lines = content.split(/\r?\n/);
    const symbols: DocumentSymbolItem[] = [];

    for (let i = 0; i < lines.length && symbols.length < 200; i++) {
      const line = lines[i]!.trim();

      // Functions
      const fn = line.match(/^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)/);
      if (fn) {
        symbols.push({ name: fn[1]!, kind: 'function', line: i + 1, signature: `(${fn[2]!})` });
        continue;
      }

      // Classes
      const cls = line.match(/^(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/);
      if (cls) {
        symbols.push({ name: cls[1]!, kind: 'class', line: i + 1 });
        continue;
      }

      // Interfaces / Types
      const iface = line.match(/^(?:export\s+)?interface\s+([a-zA-Z0-9_$]+)/);
      if (iface) {
        symbols.push({ name: iface[1]!, kind: 'interface', line: i + 1 });
        continue;
      }

      const typ = line.match(/^(?:export\s+)?type\s+([a-zA-Z0-9_$]+)\s*=/);
      if (typ) {
        symbols.push({ name: typ[1]!, kind: 'type', line: i + 1 });
        continue;
      }
    }

    return symbols;
  }

  private static searchTextForDeclaration(
    content: string,
    filePath: string,
    symbol: string,
  ): SymbolLocation | null {
    const lines = content.split(/\r?\n/);
    const declPatterns = [
      new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${escaped(symbol)}\\b`),
      new RegExp(`(?:export\\s+)?class\\s+${escaped(symbol)}\\b`),
      new RegExp(`(?:export\\s+)?interface\\s+${escaped(symbol)}\\b`),
      new RegExp(`(?:export\\s+)?type\\s+${escaped(symbol)}\\b`),
      new RegExp(`(?:export\\s+)?const\\s+${escaped(symbol)}\\b`),
      new RegExp(`(?:export\\s+)?let\\s+${escaped(symbol)}\\b`),
      new RegExp(`def\\s+${escaped(symbol)}\\b`),
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      for (const pattern of declPatterns) {
        if (pattern.test(line)) {
          const col = line.indexOf(symbol);
          return {
            file: filePath,
            line: i + 1,
            column: col >= 0 ? col + 1 : 1,
            contextText: line.trim().slice(0, 512),
          };
        }
      }
    }
    return null;
  }
}
