// SPDX-License-Identifier: MIT
// Module: MTerm-CLI Automated Project Formatter
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

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

  /**
   * Formats file content using detected formatters or built-in deterministic normalization.
   */
  static async formatText(content: string, filePath: string): Promise<{ formattedText: string; engine: string }> {
    const ext = path.extname(filePath).toLowerCase();

    // JS/TS/JSON/Markdown formatting
    if (['.ts', '.js', '.mts', '.mjs', '.cts', '.cjs', '.json', '.md'].includes(ext)) {
      try {
        const formatted = await this.spawnProcess('npx', ['prettier', '--stdin-filepath', filePath], content);
        if (formatted) {
          return { formattedText: formatted, engine: 'prettier' };
        }
      } catch {}
    }

    // Python formatting via Ruff if available
    if (ext === '.py') {
      try {
        const formatted = await this.spawnProcess('ruff', ['format', '--stdin-filename', filePath, '-'], content);
        if (formatted) {
          return { formattedText: formatted, engine: 'ruff' };
        }
      } catch {}
    }

    // Built-in deterministic normalization:
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

  private static spawnProcess(command: string, args: string[], input: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        windowsHide: true,
        shell: process.platform === 'win32',
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => {
        stdout += d.toString();
      });
      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0 && stdout) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `Process exited with code ${code}`));
        }
      });

      child.stdin.write(input);
      child.stdin.end();

      // Enforce timeout
      setTimeout(() => {
        child.kill();
        reject(new Error('Formatter timed out'));
      }, 5000);
    });
  }
}
