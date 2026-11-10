// SPDX-License-Identifier: MIT
// Module: MTerm-CLI Pre-Save Syntactic AST Validator
import path from 'node:path';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

export interface SyntaxDiagnostic {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  language: string;
  diagnostics: SyntaxDiagnostic[];
}

export class SyntaxValidator {
  /**
   * Infers language from file extension.
   */
  static inferLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.ts':
      case '.mts':
      case '.cts':
        return 'typescript';
      case '.tsx':
        return 'typescriptreact';
      case '.js':
      case '.mjs':
      case '.cjs':
        return 'javascript';
      case '.jsx':
        return 'javascriptreact';
      case '.json':
        return 'json';
      case '.jsonc':
        return 'jsonc';
      case '.py':
        return 'python';
      case '.ps1':
      case '.psm1':
      case '.psd1':
        return 'powershell';
      case '.md':
      case '.markdown':
        return 'markdown';
      case '.yml':
      case '.yaml':
        return 'yaml';
      default:
        return 'text';
    }
  }

  /**
   * Validates syntax for supported languages before changes reach disk.
   */
  static validate(content: string, filePath: string, explicitLanguage?: string): ValidationResult {
    const language = explicitLanguage || this.inferLanguage(filePath);
    const diagnostics: SyntaxDiagnostic[] = [];

    // The delimiter heuristic is only diagnostic help, never proof of language
    // syntax. Real JS/TS/JSON parsers handle strings, regexes, comments and templates.
    if (['python', 'powershell'].includes(language)) {
      const balanceError = this.checkBalancedDelimiters(content);
      if (balanceError) {
        diagnostics.push(balanceError);
        return { valid: false, language, diagnostics };
      }
    }

    switch (language) {
      case 'typescript':
      case 'typescriptreact':
      case 'javascriptreact':
      case 'javascript': {
        try {
          // Node >=24 ships a TypeScript grammar parser. It does not execute
          // the supplied source or download an external compiler.
          if (language === 'typescriptreact' || language === 'javascriptreact') {
            throw new Error('TSX/JSX syntax validation is not supported by the built-in parser.');
          }
          const transformed = stripTypeScriptTypes(content, { mode: 'strip' });
          if (language === 'javascript' && transformed !== content) {
            throw new Error('TypeScript-only syntax is not valid JavaScript.');
          }
          if (
            language === 'javascript' &&
            path.extname(filePath).toLowerCase() !== '.mjs' &&
            !/(^|\n)\s*(?:import|export)\b/m.test(content)
          ) {
            // CommonJS has an additional normal JS parse check; ESM is parsed
            // by the built-in TypeScript grammar above.
            new vm.Script(transformed, { filename: path.basename(filePath) });
          }
        } catch (err: unknown) {
          diagnostics.push({
            line: 1,
            column: 1,
            message: err instanceof Error ? err.message : 'Language syntax was not verified.',
            severity: 'error',
          });
        }
        break;
      }

      case 'json': {
        try {
          JSON.parse(content);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          const lineMatch = message.match(/line (\d+) column (\d+)/i);
          let line = 1;
          let column = 1;
          if (lineMatch && lineMatch[1] && lineMatch[2]) {
            line = parseInt(lineMatch[1], 10);
            column = parseInt(lineMatch[2], 10);
          }
          diagnostics.push({
            line,
            column,
            message,
            severity: 'error',
          });
        }
        break;
      }

      case 'python':
      case 'jsonc':
      case 'powershell': {
        diagnostics.push({
          line: 1,
          column: 1,
          message: `${language} syntax parsing is not available in this process; no AST validation was performed.`,
          severity: 'error',
        });
        break;
      }

      default:
        break;
    }

    return {
      valid: diagnostics.length === 0,
      language,
      diagnostics,
    };
  }

  /**
   * Fast delimiter balance check for braces, parentheses, and brackets.
   */
  private static checkBalancedDelimiters(content: string): SyntaxDiagnostic | null {
    const stack: Array<{ char: string; line: number; column: number }> = [];
    const pairs: Record<string, string> = { '}': '{', ')': '(', ']': '[' };
    const lines = content.split(/\r?\n/);

    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBacktick = false;

    for (let lIdx = 0; lIdx < lines.length; lIdx++) {
      const line = lines[lIdx]!;
      const trimmed = line.trim();

      // Skip full-line comments in JS/TS or Python/PowerShell
      if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
        continue;
      }

      for (let cIdx = 0; cIdx < line.length; cIdx++) {
        const ch = line[cIdx]!;
        const prev = cIdx > 0 ? line[cIdx - 1] : '';

        // Handle escape sequences
        if (prev === '\\') continue;

        // Handle string quotes
        if (ch === "'" && !inDoubleQuote && !inBacktick) {
          inSingleQuote = !inSingleQuote;
          continue;
        }
        if (ch === '"' && !inSingleQuote && !inBacktick) {
          inDoubleQuote = !inDoubleQuote;
          continue;
        }
        if (ch === '`' && !inSingleQuote && !inDoubleQuote) {
          inBacktick = !inBacktick;
          continue;
        }

        if (inSingleQuote || inDoubleQuote || inBacktick) continue;

        // Skip line comments starting mid-line
        if (ch === '/' && line[cIdx + 1] === '/') {
          break;
        }

        if (ch === '{' || ch === '(' || ch === '[') {
          stack.push({ char: ch, line: lIdx + 1, column: cIdx + 1 });
        } else if (ch === '}' || ch === ')' || ch === ']') {
          const expected = pairs[ch];
          if (stack.length === 0) {
            return {
              line: lIdx + 1,
              column: cIdx + 1,
              message: `Unexpected closing delimiter '${ch}' without opening delimiter.`,
              severity: 'error',
            };
          }
          const top = stack.pop()!;
          if (top.char !== expected) {
            return {
              line: lIdx + 1,
              column: cIdx + 1,
              message: `Mismatched delimiter: expected '${top.char}' to match '${expected}', found '${ch}'.`,
              severity: 'error',
            };
          }
        }
      }
    }

    if (stack.length > 0) {
      const unclosed = stack.pop()!;
      return {
        line: unclosed.line,
        column: unclosed.column,
        message: `Unclosed delimiter '${unclosed.char}'.`,
        severity: 'error',
      };
    }

    return null;
  }
}
