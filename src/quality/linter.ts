// SPDX-License-Identifier: MIT
// Module: MTerm-CLI safe deterministic syntax/style diagnostics
import { SyntaxValidator } from '../editing/syntax-validator.js';

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
   * Performs bounded syntax and whitespace checks without launching npm, Ruff,
   * project-configured plugins, or any external executable. This is a heuristic
   * checker, not ESLint/PSScriptAnalyzer/Ruff parity.
   */
  static async lintFile(
    filePath: string,
    content?: string,
    _options: { root?: string } = {},
  ): Promise<LintReport> {
    if (content === undefined) {
      return {
        file: filePath,
        clean: false,
        diagnostics: [
          {
            file: filePath,
            line: 1,
            column: 1,
            severity: 'error',
            ruleId: 'content-required',
            message: 'Bounded file content is required for the safe in-process linter.',
          },
        ],
        engine: 'builtin-syntax-style',
      };
    }
    const diagnostics: LintDiagnostic[] = [];
    const syntax = SyntaxValidator.validate(content, filePath);
    for (const diagnostic of syntax.diagnostics) {
      diagnostics.push({
        file: filePath,
        line: diagnostic.line,
        column: diagnostic.column,
        severity: diagnostic.severity,
        ruleId: 'syntax-error',
        message: diagnostic.message,
      });
    }

    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (line.length > 140 && !line.includes('http://') && !line.includes('https://')) {
        diagnostics.push({
          file: filePath,
          line: i + 1,
          column: 141,
          severity: 'warning',
          ruleId: 'max-line-length',
          message: `Line exceeds 140 characters (${line.length} chars). Consider breaking it up.`,
        });
      }
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
    return {
      file: filePath,
      clean: diagnostics.every((diagnostic) => diagnostic.severity !== 'error'),
      diagnostics,
      engine: 'builtin-syntax-style',
    };
  }
}
