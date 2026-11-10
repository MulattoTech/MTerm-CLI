// SPDX-License-Identifier: MIT
// Module: MTerm-CLI Automated Project Formatter
import fs from 'node:fs/promises';
import path from 'node:path';

export interface FormatResult {
  path: string;
  formatted: boolean;
  changed: boolean;
  originalBytes: number;
  formattedBytes: number;
  engine: string;
}

export class CodeFormatter {
  /**
   * Attempts to discover project formatting configuration in directory hierarchy.
   */
  static async discoverConfig(dirPath: string): Promise<{ prettierConfig?: string; ruffConfig?: string }> {
    let current = path.resolve(dirPath);
    let prettierConfig: string | undefined;
    let ruffConfig: string | undefined;

    while (true) {
      if (!prettierConfig) {
        for (const candidate of ['.prettierrc', '.prettierrc.json', '.prettierrc.js', 'prettier.config.js']) {
          try {
            const p = path.join(current, candidate);
            await fs.access(p);
            prettierConfig = p;
            break;
          } catch {}
        }
      }

      if (!ruffConfig) {
        for (const candidate of ['ruff.toml', '.ruff.toml', 'pyproject.toml']) {
          try {
            const p = path.join(current, candidate);
            await fs.access(p);
            ruffConfig = p;
            break;
          } catch {}
        }
      }

      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }

    return { prettierConfig, ruffConfig };
  }

  /** Format without spawning a shell, downloading tools or executing project code. */
  static async formatText(
    content: string,
    _filePath: string,
  ): Promise<{ formattedText: string; engine: string }> {
    // Built-in deterministic normalization only. An external Prettier/Ruff
    // integration must require separate, verified process-execution permission.
    // 1. Consistent line endings matching source
    // 2. Trailing newline at EOF
    // 3. Trim trailing whitespace from each line
    const crlf = (content.match(/\r\n/g) || []).length > (content.match(/[^\r]\n/g) || []).length;
    const eol = crlf ? '\r\n' : '\n';
    const lines = content.split(/\r?\n/);
    const cleaned = lines.map((l) => l.trimEnd()).join(eol);
    const finalContent = cleaned.endsWith(eol) ? cleaned : cleaned + eol;

    return { formattedText: finalContent, engine: 'builtin-normalizer' };
  }
}
