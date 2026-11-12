// SPDX-License-Identifier: MIT
// Module: MTerm-CLI single-pass patch, syntax and heuristic refinement
import { SyntaxValidator } from '../editing/syntax-validator.js';
import { parseUnifiedDiff, applyHunks, createDiffPreview } from '../editing/semantic-editor.js';
import { CodeFormatter } from './formatter.js';
import { CodeLinter, type LintDiagnostic } from './linter.js';
import { TypeChecker, type TypeCheckDiagnostic } from './typecheck.js';

export interface RefinePipelineOptions {
  path: string;
  originalText: string;
  proposedPatch?: string;
  proposedContent?: string;
  autoFormat?: boolean;
  runLinter?: boolean;
  runTypeCheck?: boolean;
  autoFix?: boolean;
  maxAttempts?: number;
}

export interface RefinePipelineReport {
  ok: boolean;
  path: string;
  stagesPassed: string[];
  finalContent: string;
  changed: boolean;
  syntaxValid: boolean;
  lintClean: boolean;
  typeCheckClean: boolean;
  lintDiagnostics: LintDiagnostic[];
  typeCheckDiagnostics: TypeCheckDiagnostic[];
  diffPreview?: string;
  attemptsUsed: number;
  failureReason?: string;
}

export class RefineEngine {
  /**
   * Runs one deterministic check/normalization pass on proposed file changes.
   * No autonomous repair loop or project compiler is admitted by this interface.
   */
  static async run(options: RefinePipelineOptions): Promise<RefinePipelineReport> {
    const stagesPassed: string[] = [];
    const maxAttempts = options.maxAttempts || 3;
    let attemptsUsed = 0;
    let workingContent = options.proposedContent ?? options.originalText;

    // PASS 1: Patch Application (if a diff was provided)
    if (options.proposedPatch) {
      const parsedDiffs = parseUnifiedDiff(options.proposedPatch);
      if (parsedDiffs.length === 0 || !parsedDiffs[0] || parsedDiffs[0].hunks.length === 0) {
        return this.failureReport(
          options,
          stagesPassed,
          workingContent,
          'Failed to parse unified diff hunks.',
        );
      }

      const patchResult = applyHunks(options.originalText, parsedDiffs[0].hunks);
      if (!patchResult.ok) {
        return this.failureReport(
          options,
          stagesPassed,
          workingContent,
          patchResult.error || 'Diff hunk conflict.',
        );
      }

      workingContent = patchResult.patchedText;
      stagesPassed.push('pass-1:patch-applied');
    } else {
      stagesPassed.push('pass-1:direct-content-accepted');
    }

    // PASS 2: Syntactic AST Pre-Validation
    const syntaxResult = SyntaxValidator.validate(workingContent, options.path);
    if (!syntaxResult.valid) {
      const first = syntaxResult.diagnostics[0];
      const detail = first ? ` at line ${first.line}, col ${first.column}: ${first.message}` : '';
      return this.failureReport(options, stagesPassed, workingContent, `Syntax validation failed${detail}`);
    }
    stagesPassed.push('pass-2:syntax-valid');

    // PASS 3: Automated Formatting
    if (options.autoFormat !== false) {
      const formatResult = await CodeFormatter.formatText(workingContent, options.path);
      workingContent = formatResult.formattedText;
      stagesPassed.push(`pass-3:formatted-via-${formatResult.engine}`);
    }

    // PASS 4: Linting & Static Analysis
    let lintDiagnostics: LintDiagnostic[] = [];
    let lintClean = true;
    if (options.runLinter !== false) {
      const lintReport = await CodeLinter.lintFile(options.path, workingContent);
      lintDiagnostics = lintReport.diagnostics;
      lintClean = lintReport.clean;
      if (lintClean) {
        stagesPassed.push('pass-4:lint-clean');
      } else {
        stagesPassed.push(`pass-4:lint-diagnostics-${lintDiagnostics.length}`);
      }
    }

    // PASS 5: TypeScript TypeCheck
    let typeCheckDiagnostics: TypeCheckDiagnostic[] = [];
    let typeCheckClean = true;
    if (options.runTypeCheck && options.path.endsWith('.ts')) {
      const typeReport = await TypeChecker.checkProject();
      typeCheckDiagnostics = typeReport.diagnostics.filter(
        (d) => d.file.endsWith(options.path) || options.path.endsWith(d.file),
      );
      typeCheckClean = typeReport.clean && typeCheckDiagnostics.length === 0;
      if (typeCheckClean) {
        stagesPassed.push('pass-5:typecheck-clean');
      } else {
        stagesPassed.push(`pass-5:typecheck-errors-${typeCheckDiagnostics.length}`);
      }
    }

    attemptsUsed = 1;
    const changed = workingContent !== options.originalText;
    const diffPreview = changed
      ? createDiffPreview(options.path, options.originalText, workingContent)
      : undefined;

    return {
      ok: lintClean && typeCheckClean,
      path: options.path,
      stagesPassed,
      finalContent: workingContent,
      changed,
      syntaxValid: true,
      lintClean,
      typeCheckClean,
      lintDiagnostics,
      typeCheckDiagnostics,
      diffPreview,
      attemptsUsed,
    };
  }

  private static failureReport(
    options: RefinePipelineOptions,
    stagesPassed: string[],
    content: string,
    reason: string,
  ): RefinePipelineReport {
    return {
      ok: false,
      path: options.path,
      stagesPassed,
      finalContent: content,
      changed: false,
      syntaxValid: false,
      lintClean: false,
      typeCheckClean: false,
      lintDiagnostics: [],
      typeCheckDiagnostics: [],
      attemptsUsed: 1,
      failureReason: reason,
    };
  }
}
