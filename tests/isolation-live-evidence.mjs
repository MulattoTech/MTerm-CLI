// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-08-aug005-failure-evidence (OpenAI / GPT-6 Astra Pro; self-reported)
// Test-only evidence accounting. A failed scenario can confirm cleanup without becoming a pass.
const details = (error) => ({
  name: String(error?.name ?? 'Error').slice(0, 128),
  code: typeof error?.code === 'string' ? error.code.slice(0, 128) : null,
  message: String(error?.message ?? error).slice(0, 4096),
});
export async function recordScenario(record, body, cleanup) {
  record.passed = false;
  record.cleanupVerified = false;
  record.failure = null;
  record.cleanupFailure = null;
  let failed = false,
    firstFailure;
  try {
    const observation = await body((value) => {
      record.observation = value;
    });
    if (observation !== undefined) record.observation = observation;
  } catch (error) {
    failed = true;
    firstFailure = error;
    record.failure = details(error);
  }
  try {
    await cleanup();
    record.cleanupVerified = true;
  } catch (error) {
    record.cleanupFailure = details(error);
    if (!failed) {
      firstFailure = error;
      failed = true;
    }
  }
  record.passed = !failed && record.cleanupVerified;
  if (failed) throw firstFailure;
}

export async function cleanupScenario(record, steps) {
  record.cleanupSteps = [];
  let failed = false,
    firstFailure;
  for (const [name, cleanup] of steps) {
    const step = { name, status: 'failed', failure: null };
    record.cleanupSteps.push(step);
    try {
      await cleanup();
      step.status = 'passed';
    } catch (error) {
      step.failure = details(error);
      if (!failed) {
        failed = true;
        firstFailure = error;
      }
    }
  }
  if (failed) throw firstFailure;
}
