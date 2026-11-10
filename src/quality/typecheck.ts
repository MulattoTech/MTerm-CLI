// SPDX-License-Identifier: MIT
// Module: MTerm-CLI Compiler TypeCheck Runner
import path from 'node:path';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';

const exec = promisify(execFile);
const requireModule = createRequire(import.meta.url);

export interface TypeCheckDiagnostic {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
}

export interface TypeCheckReport {
  clean: boolean;
  errorsCount: number;
  diagnostics: TypeCheckDiagnostic[];
  projectPath: string;
}

export class TypeChecker {
  /**
   * Discovers tsconfig.json in target directory hierarchy.
   */
  static async findTsConfig(startDir: string): Promise<string | null> {
    let current = path.resolve(startDir);
    while (true) {
      const candidate = path.join(current, 'tsconfig.json');
      try {
        await fs.access(candidate);
        return candidate;
      } catch {}
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
    return null;
  }

  /**
   * Runs TypeScript compiler typecheck and parses diagnostics into structured output.
   */
  static async checkProject(
    projectPath?: string,
    options: { allowExec?: boolean } = {},
  ): Promise<TypeCheckReport> {
    const configPath = projectPath || (await this.findTsConfig(process.cwd()));
    const unavailable = (code: string, message: string): TypeCheckReport => ({
      clean: false,
      errorsCount: 1,
      diagnostics: [{ file: configPath || 'unknown', line: 1, column: 1, code, message }],
      projectPath: configPath || 'none-detected',
    });
    if (!configPath) {
      return unavailable('NO_TSCONFIG', 'TypeScript config was not found; no typecheck was performed.');
    }

    if (!options.allowExec) {
      return unavailable(
        'EXEC_PERMISSION_REQUIRED',
        'Typechecking requires explicit process-execution permission.',
      );
    }

    let compiler: string;
    try {
      const moduleFile = requireModule.resolve('typescript');
      compiler = path.resolve(path.dirname(moduleFile), '../bin/tsc');
      if (!(await fs.stat(compiler)).isFile()) throw new Error('Missing compiler file');
    } catch {
      return unavailable(
        'TSC_UNAVAILABLE',
        'The verified local TypeScript compiler is unavailable; nothing was executed.',
      );
    }

    const diagnostics: TypeCheckDiagnostic[] = [];
    const projectDir = path.dirname(configPath);

    try {
      await exec(process.execPath, [compiler, '-p', configPath, '--noEmit'], {
        cwd: projectDir,
        windowsHide: true,
        timeout: 15000,
        maxBuffer: 1048576,
      });
      return {
        clean: true,
        errorsCount: 0,
        diagnostics: [],
        projectPath: configPath,
      };
    } catch (err: unknown) {
      const stdout = (err as { stdout?: string }).stdout || '';
      const stderr = (err as { stderr?: string }).stderr || '';
      const output = `${stdout}\n${stderr}`;

      // Parse standard tsc output: "src/sample.ts(12,5): error TS2322: Type 'string' is not assignable to type 'number'."
      const lines = output.split(/\r?\n/);
      const regex = /^([^(]+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/;

      for (const line of lines) {
        const match = line.match(regex);
        if (match) {
          diagnostics.push({
            file: match[1]!.trim(),
            line: parseInt(match[2]!, 10),
            column: parseInt(match[3]!, 10),
            code: match[4]!,
            message: match[5]!,
          });
        }
      }

      return {
        clean: false,
        errorsCount: Math.max(1, diagnostics.length),
        diagnostics: diagnostics.length
          ? diagnostics
          : [
              {
                file: configPath,
                line: 1,
                column: 1,
                code: 'TSC_FAILED',
                message: 'TypeScript compiler failed or timed out; no clean result is available.',
              },
            ],
        projectPath: configPath,
      };
    }
  }
}
