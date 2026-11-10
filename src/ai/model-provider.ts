// SPDX-License-Identifier: MIT
// Module: MTerm-CLI Provider-Independent Cloud AI Abstraction Layer

export interface ModelRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface ModelResponse {
  text: string;
  tokensUsed: { prompt: number; completion: number; total: number };
  model: string;
  provider: string;
}

export interface ReviewIssue {
  severity: 'critical' | 'warning' | 'suggestion';
  file?: string;
  line?: number;
  message: string;
  suggestedFix?: string;
}

export interface DiffReviewReport {
  ok: boolean;
  provider: string;
  model: string;
  summary: string;
  issues: ReviewIssue[];
  tokensUsed: number;
}

export interface ModelProvider {
  readonly name: string;
  isConfigured(): boolean;
  generateText(prompt: string, options?: ModelRequestOptions): Promise<ModelResponse>;
  reviewDiff(diffText: string, options?: ModelRequestOptions & { focus?: string }): Promise<DiffReviewReport>;
}

/**
 * Fallback provider when no cloud API keys are configured.
 * Performs deterministic heuristic review without making external network calls.
 */
export class DeterministicReviewProvider implements ModelProvider {
  readonly name = 'deterministic-local-reviewer';

  isConfigured(): boolean {
    return true;
  }

  async generateText(prompt: string): Promise<ModelResponse> {
    return {
      text: `Deterministic local response for prompt of ${prompt.length} chars. No cloud AI provider configured.`,
      tokensUsed: {
        prompt: Math.ceil(prompt.length / 4),
        completion: 20,
        total: Math.ceil(prompt.length / 4) + 20,
      },
      model: 'deterministic-heuristic',
      provider: this.name,
    };
  }

  async reviewDiff(diffText: string, options?: { focus?: string }): Promise<DiffReviewReport> {
    const issues: ReviewIssue[] = [];
    const lines = diffText.split(/\r?\n/);
    let currentFile = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      if (line.startsWith('+++ b/')) {
        currentFile = line.slice(6).trim();
      }

      // Check for hardcoded credentials / tokens
      if (line.startsWith('+')) {
        const added = line.slice(1);
        if (/api[_-]?key\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/i.test(added)) {
          issues.push({
            severity: 'critical',
            file: currentFile,
            line: i + 1,
            message: 'Possible hardcoded API key or secret detected in patch.',
            suggestedFix: 'Use environment variables or configuration files rather than hardcoding secrets.',
          });
        }

        // Check for debugger or console statements
        if (/\bdebugger\b/.test(added)) {
          issues.push({
            severity: 'warning',
            file: currentFile,
            line: i + 1,
            message: 'Forbidden `debugger` statement introduced in patch.',
          });
        }
      }
    }

    return {
      ok: true,
      provider: this.name,
      model: 'deterministic-rule-engine',
      summary: `Deterministic diff review completed (${lines.length} lines analyzed). ${issues.length} potential issue(s) detected.`,
      issues,
      tokensUsed: 0,
    };
  }
}
