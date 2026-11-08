// SPDX-License-Identifier: MIT
// Modified: 2026-11-08-aug005-lifecycle-observation; preserve exact owned lifecycle and bounded daemon diagnostics.
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

// Test-only API observation: original values and errors must survive without retry or replacement.
test('owned lifecycle evidence preserves the first raw terminal fields and later cleanup separately', async () => {
  const { observeOwnedRequests } = await import('./isolation-live-evidence.mjs');
  const owner = '11111111-1111-4111-8111-111111111111',
    id = 'a'.repeat(64);
  let reply;
  const calls = [];
  const api = {
    async request(...args) {
      calls.push(args);
      return reply;
    },
  };
  const original = api.request;
  const observed = observeOwnedRequests(api, owner);
  const input = { Labels: { 'io.mterm.owner': owner }, Cmd: ['DO_NOT_RETAIN_CODE'] };
  reply = { status: 201, body: { Id: id } };
  assert.equal(await api.request('POST', '/containers/create?name=owned', input), reply);
  reply = { status: 200, body: { StatusCode: 137 } };
  assert.equal(await api.request('POST', '/containers/' + id + '/wait?condition=not-running'), reply);
  reply = {
    status: 200,
    body: {
      Id: id,
      Config: { Labels: input.Labels, Env: ['DO_NOT_RETAIN_ENV'] },
      State: {
        Status: 'exited',
        Running: false,
        ExitCode: 137,
        OOMKilled: false,
        StartedAt: 'start',
        FinishedAt: 'finish',
      },
    },
  };
  await api.request('GET', '/containers/' + id + '/json');
  reply.body.State.OOMKilled = true;
  await api.request('GET', '/containers/' + id + '/json');
  const snapshots = observed.record.requests.filter((row) => row.kind === 'inspect');
  assert.deepEqual(
    snapshots.map((row) => row.state.OOMKilled),
    [
      { present: true, type: 'boolean', value: false },
      { present: true, type: 'boolean', value: true },
    ],
  );
  assert.deepEqual(observed.record.requests[1].wait.StatusCode, {
    present: true,
    type: 'number',
    value: 137,
  });
  assert.equal(observed.record.containerId, id);
  assert.equal(calls[0][2], input);
  assert.doesNotMatch(JSON.stringify(observed.record), /DO_NOT_RETAIN/);
  assert.ok(observed.record.requests.every((row) => row.startedAt && row.finishedAt));
  observed.restore();
  assert.equal(api.request, original);
});
test('raw OOM evidence distinguishes missing, null and malformed values without unbounded retention', async () => {
  const { observeOwnedRequests } = await import('./isolation-live-evidence.mjs');
  const owner = '11111111-1111-4111-8111-111111111111',
    id = 'b'.repeat(64);
  let reply = { status: 201, body: { Id: id } };
  const api = {
    async request() {
      return reply;
    },
  };
  const observed = observeOwnedRequests(api, owner);
  await api.request('POST', '/containers/create?name=owned', { Labels: { 'io.mterm.owner': owner } });
  for (const state of [
    {},
    { OOMKilled: null },
    { OOMKilled: 'false' },
    { OOMKilled: { private: 'SECRET'.repeat(100000) } },
  ]) {
    reply = { status: 200, body: { Id: id, Config: { Labels: { 'io.mterm.owner': owner } }, State: state } };
    await api.request('GET', '/containers/' + id + '/json');
  }
  const values = observed.record.requests
    .filter((row) => row.kind === 'inspect')
    .map((row) => row.state.OOMKilled);
  assert.deepEqual(values[0], { present: false, type: 'undefined', value: null });
  assert.deepEqual(values[1], { present: true, type: 'null', value: null });
  assert.deepEqual(values[2], { present: true, type: 'string', value: 'false' });
  assert.deepEqual(values[3], { present: true, type: 'object', value: null, omitted: true });
  assert.ok(JSON.stringify(observed.record).length < 12000);
  assert.doesNotMatch(JSON.stringify(observed.record), /SECRET/);
  observed.restore();
});
test('observer excludes other ownership, bounds requests and preserves the exact rejection', async () => {
  const { observeOwnedRequests } = await import('./isolation-live-evidence.mjs');
  const owner = '11111111-1111-4111-8111-111111111111',
    id = 'c'.repeat(64);
  const failure = Object.assign(new Error('original'), { code: 'OWNED_FAILURE' });
  let reject = false;
  const prototype = {
    async request() {
      if (reject) throw failure;
      return { status: 201, body: { Id: id } };
    },
  };
  const api = Object.create(prototype),
    observed = observeOwnedRequests(api, owner);
  await api.request('POST', '/containers/create?name=other', { Labels: { 'io.mterm.owner': 'other' } });
  await api.request('GET', '/containers/' + id + '/json');
  assert.equal(observed.record.requests.length, 0);
  await api.request('POST', '/containers/create?name=owned', { Labels: { 'io.mterm.owner': owner } });
  reject = true;
  await assert.rejects(
    api.request('POST', '/containers/' + id + '/wait?condition=not-running'),
    (error) => error === failure,
  );
  assert.equal(observed.record.requests[1].failure.code, 'OWNED_FAILURE');
  reject = false;
  for (let i = 0; i < 80; i++) await api.request('GET', '/containers/' + id + '/json');
  assert.equal(observed.record.requests.length, 64);
  assert.equal(observed.record.dropped, 18);
  observed.restore();
  assert.equal(Object.hasOwn(api, 'request'), false);
});
test('owned event history uses exact identity and bounded operation window without attributes', async () => {
  const { readOwnedEvents } = await import('./isolation-live-evidence.mjs');
  const id = 'd'.repeat(64),
    since = '2026-11-08T00:00:00.000Z',
    until = '2026-11-08T00:00:01.000Z';
  let invocation;
  const result = await readOwnedEvents(
    async (...args) => {
      invocation = args;
      return {
        stdout:
          JSON.stringify({
            id,
            action: 'oom',
            time: 1794096000,
            timeNano: '1794096000123456789',
            private: 'SECRET',
          }) + '\n',
        stderr: '',
      };
    },
    { dockerConfig: '/owned/config', socketPath: '/var/run/docker.sock', containerId: id, since, until },
  );
  assert.equal(result.status, 'available');
  assert.equal(result.historyComplete, false);
  assert.equal(result.events[0].timeNano, '1794096000123456789');
  assert.equal(invocation[0], '/usr/bin/docker');
  assert.ok(invocation[1].includes('container=' + id));
  assert.ok(invocation[1].includes(since) && invocation[1].includes(until));
  assert.equal(invocation[2].timeout, 3000);
  assert.equal(invocation[2].maxBuffer, 65536);
  assert.doesNotMatch(JSON.stringify(result), /SECRET/);
});
test('unrelated, malformed, oversized and unavailable event history remain unknown', async () => {
  const { readOwnedEvents } = await import('./isolation-live-evidence.mjs');
  const options = {
    dockerConfig: '/owned/config',
    socketPath: '/var/run/docker.sock',
    containerId: 'e'.repeat(64),
    since: '2026-11-08T00:00:00.000Z',
    until: '2026-11-08T00:00:01.000Z',
  };
  for (const stdout of [
    'not-json',
    JSON.stringify({ id: 'f'.repeat(64), action: 'oom', time: 1, timeNano: '1' }),
    'x'.repeat(65537),
  ]) {
    const result = await readOwnedEvents(async () => ({ stdout, stderr: '' }), options);
    assert.equal(result.status, 'unavailable');
    assert.equal(result.historyComplete, false);
    assert.deepEqual(result.events, []);
  }
  const failed = await readOwnedEvents(async () => {
    throw Object.assign(new Error('PRIVATE_BACKEND_DATA'), { code: 'EACCES' });
  }, options);
  assert.equal(failed.status, 'unavailable');
  assert.equal(failed.failure.code, 'EACCES');
  assert.doesNotMatch(JSON.stringify(failed), /PRIVATE_BACKEND_DATA/);
});
test('failure journal evidence retains only exact owned identifiers and bounded diagnostic categories', async () => {
  const { readOwnedFailureJournal } = await import('./isolation-live-evidence.mjs');
  const id = 'f'.repeat(64);
  const result = await readOwnedFailureJournal(
    async (file, args, options) => {
      assert.equal(file, '/usr/bin/journalctl');
      assert.ok(args.includes('--no-pager') && args.includes('--output=json'));
      assert.equal(options.timeout, 3000);
      assert.equal(options.maxBuffer, 65536);
      return {
        stdout: [
          JSON.stringify({
            MESSAGE: 'Out of memory: cgroup /docker/' + id + '/ killed process 123 (node)',
            __REALTIME_TIMESTAMP: '123',
          }),
          JSON.stringify({ MESSAGE: 'unrelated SECRET', __REALTIME_TIMESTAMP: '124' }),
        ].join('\n'),
        stderr: '',
      };
    },
    { containerId: id, since: '2026-11-08T00:00:00.000Z', until: '2026-11-08T00:00:01.000Z' },
  );
  assert.equal(result.status, 'available');
  assert.equal(result.historyComplete, false);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].ownedContainerId, id);
  assert.match(result.records[0].message, /Out of memory/);
  assert.doesNotMatch(JSON.stringify(result), /SECRET/);
});

test('probe diagnostics cannot replace an original lifecycle rejection', async () => {
  const { recordProbe } = await import('./isolation-live-evidence.mjs');
  const primary = Object.assign(new Error('original lifecycle failure'), { code: 'ORIGINAL_FAILURE' });
  const diagnostic = Object.assign(new Error('diagnostic failed'), { code: 'SECONDARY_FAILURE' });
  const probe = {};
  await assert.rejects(
    recordProbe(
      probe,
      async () => {
        throw primary;
      },
      async () => {
        throw diagnostic;
      },
    ),
    (error) => error === primary,
  );
  assert.equal(probe.runFailure.code, 'ORIGINAL_FAILURE');
  assert.equal(probe.diagnosticFailure.code, 'SECONDARY_FAILURE');
});
test('failed diagnostics cannot mask a false OOM result or make it pass', async () => {
  const { recordProbe, readOwnedEvents, readOwnedFailureJournal } =
    await import('./isolation-live-evidence.mjs');
  const result = { exitCode: 137, oomKilled: false },
    probe = {};
  assert.equal(
    await recordProbe(
      probe,
      async () => result,
      async () => {
        throw Object.assign(new Error('restore failed'), { code: 'RESTORE_FAILED' });
      },
    ),
    result,
  );
  assert.throws(() => assert.equal(result.oomKilled, true), { code: 'ERR_ASSERTION' });
  assert.equal(probe.runFailure, null);
  assert.equal(probe.diagnosticFailure.code, 'RESTORE_FAILED');
  for (const read of [readOwnedEvents, readOwnedFailureJournal]) {
    const diagnostic = await read(async () => assert.fail('invalid window must not execute'), {
      containerId: 'a'.repeat(64),
      since: '2026-11-08T00:00:02.000Z',
      until: '2026-11-08T00:00:01.000Z',
    });
    assert.equal(diagnostic.status, 'unavailable');
    assert.equal(diagnostic.failure.code, 'INVALID_DIAGNOSTIC_WINDOW');
  }
});

test('journal collector filters the exact owned ID and projected fields before its byte budget', async () => {
  const { readOwnedFailureJournal } = await import('./isolation-live-evidence.mjs');
  const id = 'a'.repeat(64);
  let calls = 0;
  const result = await readOwnedFailureJournal(
    async (file, args, options) => {
      calls++;
      assert.equal(file, '/usr/bin/journalctl');
      assert.equal(options.timeout, 3000);
      assert.equal(options.maxBuffer, 65536);
      if (
        args[args.indexOf('--grep') + 1] !== id ||
        !args.includes('--output-fields=MESSAGE,__REALTIME_TIMESTAMP')
      )
        throw Object.assign(new Error('Broad journal output exceeds the observed subprocess byte ceiling'), {
          code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',
        });
      return {
        stdout:
          JSON.stringify({
            MESSAGE: 'Memory cgroup out of memory: /docker/' + id,
            __REALTIME_TIMESTAMP: '1794112504000000',
          }) + '\n',
        stderr: '',
      };
    },
    { containerId: id, since: '2026-11-08T04:35:03.802Z', until: '2026-11-08T04:35:04.115Z' },
  );
  assert.equal(result.status, 'available');
  assert.equal(result.records.length, 1);
  assert.equal(result.historyComplete, false);
  assert.equal(calls, 1);
});
