// SPDX-License-Identifier: MIT
// Module: MTerm-CLI Language Server Protocol & Semantic Navigation Engine
import fs from 'node:fs/promises';
import path from 'node:path';

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
   * Finds definition of a symbol at the specified file line and column.
   */
  static async findDefinition(
    filePath: string,
    targetSymbol: string,
    rootDir: string,
  ): Promise<SymbolLocation | null> {
    const root = path.resolve(rootDir);

    // Search file itself first
    const local = await this.searchFileForDeclaration(filePath, targetSymbol);
    if (local) return local;

    // Search other workspace files in directory
    const entries = await fs.readdir(path.dirname(filePath), { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.js') || e.name.endsWith('.py'))) {
        const otherPath = path.join(path.dirname(filePath), e.name);
        if (otherPath === filePath) continue;
        const match = await this.searchFileForDeclaration(otherPath, targetSymbol);
        if (match) return match;
      }
    }

    return null;
  }

  /**
   * Finds all references to a symbol across the workspace.
   */
  static async findReferences(symbol: string, rootDir: string, limit = 50): Promise<SymbolLocation[]> {
    const locations: SymbolLocation[] = [];
    const root = path.resolve(rootDir);

    const scan = async (dir: string): Promise<void> => {
      if (locations.length >= limit) return;
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const e of entries) {
          if (locations.length >= limit) break;
          if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;

          const fullPath = path.join(dir, e.name);
          if (e.isDirectory()) {
            await scan(fullPath);
          } else if (
            e.isFile() &&
            (e.name.endsWith('.ts') || e.name.endsWith('.js') || e.name.endsWith('.py'))
          ) {
            try {
              const content = await fs.readFile(fullPath, 'utf8');
              const lines = content.split(/\r?\n/);
              for (let i = 0; i < lines.length; i++) {
                if (locations.length >= limit) break;
                const lineText = lines[i]!;
                const col = lineText.indexOf(symbol);
                if (col >= 0) {
                  // Ensure it's a word boundary match
                  const boundaryRegex = new RegExp(`\\b${symbol}\\b`);
                  if (boundaryRegex.test(lineText)) {
                    locations.push({
                      file: path.relative(root, fullPath).replace(/\\/g, '/'),
                      line: i + 1,
                      column: col + 1,
                      contextText: lineText.trim(),
                    });
                  }
                }
              }
            } catch {}
          }
        }
      } catch {}
    };

    await scan(root);
    return locations;
  }

  /**
   * Extracts hierarchical document symbols from a file.
   */
  static async getDocumentSymbols(filePath: string): Promise<DocumentSymbolItem[]> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split(/\r?\n/);
      const symbols: DocumentSymbolItem[] = [];

      for (let i = 0; i < lines.length; i++) {
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
    } catch {
      return [];
    }
  }

  private static async searchFileForDeclaration(
    filePath: string,
    symbol: string,
  ): Promise<SymbolLocation | null> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split(/\r?\n/);
      const declPatterns = [
        new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${symbol}\\b`),
        new RegExp(`(?:export\\s+)?class\\s+${symbol}\\b`),
        new RegExp(`(?:export\\s+)?interface\\s+${symbol}\\b`),
        new RegExp(`(?:export\\s+)?type\\s+${symbol}\\b`),
        new RegExp(`(?:export\\s+)?const\\s+${symbol}\\b`),
        new RegExp(`(?:export\\s+)?let\\s+${symbol}\\b`),
        new RegExp(`def\\s+${symbol}\\b`),
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
              contextText: line.trim(),
            };
          }
        }
      }
    } catch {}

    return null;
  }
}
