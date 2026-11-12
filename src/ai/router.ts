// SPDX-License-Identifier: MIT
// Module: MTerm-CLI provider registry and in-memory usage counter prototype
import { type ModelProvider, type DiffReviewReport, DeterministicReviewProvider } from './model-provider.js';

export interface RouterConfig {
  dailyTokenLimit?: number;
  costBudgetUsd?: number;
  defaultProvider?: string;
}

export class ModelRouter {
  private static instance?: ModelRouter;
  private readonly providers = new Map<string, ModelProvider>();
  private dailyTokensUsed = 0;
  private lastResetDate = new Date().toDateString();
  private dailyTokenLimit = 1000000; // 1M tokens default daily ceiling

  constructor(config: RouterConfig = {}) {
    if (config.dailyTokenLimit) this.dailyTokenLimit = config.dailyTokenLimit;
    // Register default deterministic fallback
    this.registerProvider(new DeterministicReviewProvider());
  }

  static getInstance(): ModelRouter {
    if (!this.instance) {
      this.instance = new ModelRouter();
    }
    return this.instance;
  }

  registerProvider(provider: ModelProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  getProvider(name?: string): ModelProvider {
    this.checkDailyReset();

    if (name) {
      const p = this.providers.get(name.toLowerCase());
      if (!p || !p.isConfigured()) {
        throw new Error(
          `Requested AI provider '${name}' is not configured. No automatic provider substitution was made.`,
        );
      }
      return p;
    }

    // No actual cloud provider is bundled. The default is explicitly labeled as
    // a deterministic heuristic; it cannot claim model inference or code review.
    return this.providers.get('deterministic-local-reviewer')!;
  }

  /**
   * Uses an explicitly registered provider and checks its reported usage.
   * The bundled provider is a deterministic heuristic, not cloud inference.
   */
  async reviewDiff(
    diffText: string,
    options: { provider?: string; focus?: string } = {},
  ): Promise<DiffReviewReport> {
    this.checkDailyReset();

    if (this.dailyTokensUsed >= this.dailyTokenLimit) {
      throw new Error(
        `Daily AI token budget limit reached (${this.dailyTokensUsed}/${this.dailyTokenLimit}).`,
      );
    }

    const provider = this.getProvider(options.provider);
    const report = await provider.reviewDiff(diffText, { focus: options.focus });

    if (
      !Number.isSafeInteger(report.tokensUsed) ||
      report.tokensUsed < 0 ||
      this.dailyTokensUsed + report.tokensUsed > this.dailyTokenLimit
    ) {
      throw new Error('AI provider token usage was invalid or exceeded the configured daily budget.');
    }

    this.dailyTokensUsed += report.tokensUsed;
    return report;
  }

  getBudgetStatus(): { dailyTokensUsed: number; dailyTokenLimit: number; date: string } {
    this.checkDailyReset();
    return {
      dailyTokensUsed: this.dailyTokensUsed,
      dailyTokenLimit: this.dailyTokenLimit,
      date: this.lastResetDate,
    };
  }

  private checkDailyReset(): void {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyTokensUsed = 0;
      this.lastResetDate = today;
    }
  }
}
