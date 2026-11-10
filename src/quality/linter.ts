// SPDX-License-Identifier: MIT
// Module: MTerm-CLI Deterministic Linter Runner
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { SyntaxValidator } from '../editing/syntax-validator.js';

const exec = promisify(execFile);

export interface LintDiagnostic {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  ruleId?: string;
  message: string;
  fixable?: boolean;
}

export interface LintReport {
  file: string;
  clean: boolean;
  diagnostics: LintDiagnostic[];
  engine: string;
}

export class CodeLinter {
  /**
   * Runs linter on the specified file or content and returns structured diagnostics.
   */
  static async lintFile(
    filePath: string,
    content?: string,
    options: { root?: string } = {},
  ): Promise<LintReport> {
    const ext = path.extname(filePath).toLowerCase();
    const diagnostics: LintDiagnostic[] = [];
    let engine = 'builtin-linter';

    // 1. First run syntax pre-validation
    if (content !== undefined) {
      const syntax = SyntaxValidator.validate(content, filePath);
      if (!syntax.valid) {
        for (const d of syntax.diagnostics) {
          diagnostics.push({
            file: filePath,
            line: d.line,
            column: d.column,
            severity: d.severity,
            ruleId: 'syntax-error',
            message: d.message,
          });
        }
        return { file: filePath, clean: false, diagnostics, engine: 'syntax-validator' };
      }
    }

    // 2. Try language-specific external linters where available
    if (['.ts', '.js', '.mts', '.mjs'].includes(ext)) {
      try {
        const cwd = options.root || path.dirname(filePath);
        const { stdout } = await exec('npx', ['eslint', '--format', 'json', filePath], {
          cwd,
          windowsHide: true,
          shell: process.platform === 'win32',
          timeout: 5000,
        });

        if (stdout) {
          const parsed = JSON.parse(stdout);
          if (Array.isArray(parsed) && parsed[0]?.messages) {
            engine = 'eslint';
            for (const m of parsed[0].messages) {
              diagnostics.push({
                file: filePath,
                line: m.line || 1,
                column: m.column || 1,
                severity: m.severity === 2 ? 'error' : 'warning',
                ruleId: m.ruleId || 'eslint-rule',
                message: m.message,
                fixable: !!m.fix,
              });
            }
          }
        }
      } catch (err: unknown) {
        // ESLint returns non-zero when warnings/errors are found; parse stdout if available
        const out = (err as { stdout?: string }).stdout;
        if (out) {
          try {
            const parsed = JSON.parse(out);
            if (Array.isArray(parsed) && parsed[0]?.messages) {
              engine = 'eslint';
              for (const m of parsed[0].messages) {
                diagnostics.push({
                  file: filePath,
                  line: m.line || 1,
                  column: m.column || 1,
                  severity: m.severity === 2 ? 'error' : 'warning',
                  ruleId: m.ruleId || 'eslint-rule',
                  message: m.message,
                  fixable: !!m.fix,
                });
              }
            }
          } catch {}
        }
      }
    }

    // Python linter via Ruff if available
    if (ext === '.py') {
      try {
        const cwd = options.root || path.dirname(filePath);
        const { stdout } = await exec('ruff', ['check', '--output-format', 'json', filePath], {
          cwd,
          windowsHide: true,
          shell: process.platform === 'win32',
          timeout: 5000,
        });

        if (stdout) {
          const parsed = JSON.parse(stdout);
          if (Array.isArray(parsed)) {
            engine = 'ruff';
            for (const item of parsed) {
              diagnostics.push({
                file: item.filename || filePath,
                line: item.location?.row || 1,
                column: item.location?.column || 1,
                severity: 'error',
                ruleId: item.code || 'ruff-check',
                message: item.message,
                fixable: !!item.fix,
              });
            }
          }
        }
      } catch {}
    }

    // 3. Fallback built-in static heuristics if no external linter ran
    if (diagnostics.length === 0 && content !== undefined) {
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        // Line length warning (> 140 chars)
        if (line.length > 140 && !line.includes('http://') && !line.includes('https://')) {
          diagnostics.push({
            file: filePath,
            line: i + 1,
            column: 141,
            severity: 'warning',
            ruleId: 'max-line-length',
            message: `Line exceeds 140 characters (${line.length} chars). Consider breaking into multiple lines.`,
          });
        }
        // Trailing whitespace warning
        if (/[ \t]+$/.test(line)) {
          diagnostics.push({
            file: filePath,
            line: i + 1,
            column: line.trimEnd().length + 1,
            severity: 'warning',
            ruleId: 'no-trailing-whitespace',
            message: 'Trailing whitespace found at end of line.',
            fixable: true,
          });
        }
      }
    }

    return {
      file: filePath,
      clean: diagnostics.filter((d) => d.severity === 'error').length === 0,
      diagnostics,
      engine,
    };
  }
}
