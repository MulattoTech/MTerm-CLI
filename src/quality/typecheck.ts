// SPDX-License-Identifier: MIT
// Module: MTerm-CLI Compiler TypeCheck Runner
import path from 'node:path';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

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
  static async checkProject(projectPath?: string): Promise<TypeCheckReport> {
    const configPath = projectPath || (await this.findTsConfig(process.cwd()));
    if (!configPath) {
      return {
        clean: true,
        errorsCount: 0,
        diagnostics: [],
        projectPath: 'none-detected',
      };
    }

    const diagnostics: TypeCheckDiagnostic[] = [];
    const projectDir = path.dirname(configPath);

    try {
      await exec('npx', ['tsc', '-p', configPath, '--noEmit'], {
        cwd: projectDir,
        windowsHide: true,
        shell: process.platform === 'win32',
        timeout: 15000,
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
        clean: diagnostics.length === 0,
        errorsCount: diagnostics.length,
        diagnostics,
        projectPath: configPath,
      };
    }
  }
}
