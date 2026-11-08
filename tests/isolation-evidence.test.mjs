// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-08-aug005-failure-evidence (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';

async function recordScenario(...args) {
  const module = await import('./isolation-live-evidence.mjs');
  return module.recordScenario(...args);
}
const record = () => ({ passed: false, cleanupVerified: false, observation: null });

test('failed real-result assertion retains the result and independently confirmed cleanup', async () => {
  const result = { exitCode: 134, oomKilled: false, stdout: '', stderr: 'bounded diagnostic' };
  const row = record();
  let cleanupCalls = 0;
  await assert.rejects(
    recordScenario(
      row,
      async (observe) => {
        observe(result);
        assert.equal(result.oomKilled, true);
      },
      async () => {
        cleanupCalls++;
      },
    ),
    { code: 'ERR_ASSERTION' },
  );
  assert.deepEqual(row.observation, result);
  assert.equal(row.passed, false);
  assert.equal(row.cleanupVerified, true);
  assert.equal(row.failure.code, 'ERR_ASSERTION');
  assert.equal(row.cleanupFailure, null);
  assert.equal(cleanupCalls, 1);
});

test('body and cleanup failures remain separately recorded without replacing the first error', async () => {
  const row = record();
  const bodyError = Object.assign(new Error('guest result failed'), { code: 'BODY_FAILURE' });
  const cleanupError = Object.assign(new Error('owned removal unconfirmed'), { code: 'CLEANUP_FAILURE' });
  await assert.rejects(
    recordScenario(
      row,
      async (observe) => {
        observe({ exitCode: 137, oomKilled: false });
        throw bodyError;
      },
      async () => {
        throw cleanupError;
      },
    ),
    (error) => error === bodyError,
  );
  assert.equal(row.failure.code, 'BODY_FAILURE');
  assert.equal(row.cleanupFailure.code, 'CLEANUP_FAILURE');
  assert.equal(row.observation.exitCode, 137);
  assert.equal(row.passed, false);
  assert.equal(row.cleanupVerified, false);
});

test('successful body cannot pass when independent cleanup verification fails', async () => {
  const row = record();
  const cleanupError = new Error('owner label remains');
  await assert.rejects(
    recordScenario(
      row,
      async () => ({ completed: true }),
      async () => {
        throw cleanupError;
      },
    ),
    (error) => error === cleanupError,
  );
  assert.deepEqual(row.observation, { completed: true });
  assert.equal(row.failure, null);
  assert.equal(row.cleanupFailure.message, 'owner label remains');
  assert.equal(row.passed, false);
  assert.equal(row.cleanupVerified, false);
});

test('successful body and observed cleanup pass once while preserving its observation', async () => {
  const row = record();
  let cleanupCalls = 0;
  await recordScenario(
    row,
    async () => ({ exitCode: 0 }),
    async () => {
      cleanupCalls++;
    },
  );
  assert.deepEqual(row.observation, { exitCode: 0 });
  assert.equal(row.passed, true);
  assert.equal(row.cleanupVerified, true);
  assert.equal(row.failure, null);
  assert.equal(row.cleanupFailure, null);
  assert.equal(cleanupCalls, 1);
});

test('all cleanup steps retain their failures without hiding the body error or each other', async () => {
  const { cleanupScenario } = await import('./isolation-live-evidence.mjs');
  const row = record(),
    attempted = [];
  const bodyError = new Error('body failed');
  const first = Object.assign(new Error('close failed'), { code: 'CLOSE_FAILED' });
  const last = Object.assign(new Error('fixture removal failed'), { code: 'REMOVE_FAILED' });
  await assert.rejects(
    recordScenario(
      row,
      async () => {
        throw bodyError;
      },
      async () =>
        cleanupScenario(row, [
          [
            'close',
            async () => {
              attempted.push('close');
              throw first;
            },
          ],
          [
            'independent-absence',
            async () => {
              attempted.push('independent-absence');
            },
          ],
          [
            'remove-fixture',
            async () => {
              attempted.push('remove-fixture');
              throw last;
            },
          ],
        ]),
    ),
    (error) => error === bodyError,
  );
  assert.deepEqual(attempted, ['close', 'independent-absence', 'remove-fixture']);
  assert.deepEqual(
    row.cleanupSteps.map((step) => [step.name, step.status, step.failure?.code ?? null]),
    [
      ['close', 'failed', 'CLOSE_FAILED'],
      ['independent-absence', 'passed', null],
      ['remove-fixture', 'failed', 'REMOVE_FAILED'],
    ],
  );
  assert.equal(row.cleanupFailure.code, 'CLOSE_FAILED');
  assert.equal(row.passed, false);
  assert.equal(row.cleanupVerified, false);
});
