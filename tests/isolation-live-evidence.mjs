// SPDX-License-Identifier: MIT
// Modified: 2026-11-08-aug005-lifecycle-observation; retain original owned API observations and bounded history.
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

// These observers are test-only. They never issue a replacement lifecycle request or change its result.
const field = (object, key) => {
  const present = object != null && Object.hasOwn(object, key);
  const value = present ? object[key] : undefined;
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (type === 'undefined' || type === 'null') return { present, type, value: null };
  if (type === 'boolean' || (type === 'number' && Number.isFinite(value))) return { present, type, value };
  if (type === 'string')
    return { present, type, value: value.slice(0, 128), ...(value.length > 128 ? { truncated: true } : {}) };
  return { present, type, value: null, omitted: true };
};
const diagnosticFailure = (error) => ({
  code: typeof error?.code === 'string' ? error.code.slice(0, 64) : 'DIAGNOSTIC_UNAVAILABLE',
});
const diagnosticError = (code) => Object.assign(new Error(code), { code });
const containerIdentity = /^[a-f0-9]{64}$/;
export function observeOwnedRequests(api, ownerId) {
  if (!api || typeof api.request !== 'function' || !/^[a-f0-9-]{36}$/.test(ownerId))
    throw diagnosticError('INVALID_DIAGNOSTIC_SUBJECT');
  const descriptor = Object.getOwnPropertyDescriptor(api, 'request');
  const original = api.request;
  const record = { ownerId, containerId: null, requests: [], dropped: 0 };
  const wrapped = async function (method, resource, input, ...rest) {
    const create =
      method === 'POST' &&
      resource.startsWith('/containers/create?') &&
      input?.Labels?.['io.mterm.owner'] === ownerId;
    const match =
      /^\/containers\/([a-f0-9]{64})(\/json|\/start|\/wait\?condition=not-running|\?force=1)$/.exec(resource);
    const owned = match && record.containerId === match[1];
    if (!create && !owned) return original.call(this, method, resource, input, ...rest);
    const kind = create
      ? 'create'
      : match[2] === '/json'
        ? 'inspect'
        : match[2].startsWith('/wait')
          ? 'wait'
          : match[2] === '/start'
            ? 'start'
            : 'remove';
    let row;
    if (record.requests.length < 64) {
      row = {
        ordinal: record.requests.length + 1,
        kind,
        method,
        startedAt: new Date().toISOString(),
        finishedAt: null,
        elapsedMs: null,
        status: null,
        failure: null,
      };
      record.requests.push(row);
    } else record.dropped++;
    const started = performance.now();
    try {
      const reply = await original.call(this, method, resource, input, ...rest);
      if (create && reply?.status === 201 && containerIdentity.test(reply.body?.Id ?? ''))
        record.containerId = reply.body.Id;
      if (row) {
        row.status = field(reply, 'status');
        if (kind === 'create') row.containerId = record.containerId;
        if (kind === 'wait')
          row.wait = {
            StatusCode: field(reply?.body, 'StatusCode'),
            ErrorMessage: field(reply?.body?.Error, 'Message'),
          };
        if (kind === 'inspect') {
          row.owned =
            reply?.body?.Id === record.containerId &&
            reply?.body?.Config?.Labels?.['io.mterm.owner'] === ownerId;
          if (row.owned)
            row.state = Object.fromEntries(
              ['OOMKilled', 'Status', 'Running', 'ExitCode', 'StartedAt', 'FinishedAt', 'Pid'].map((key) => [
                key,
                field(reply.body.State, key),
              ]),
            );
        }
      }
      return reply;
    } catch (error) {
      if (row) row.failure = diagnosticFailure(error);
      throw error;
    } finally {
      if (row) {
        row.finishedAt = new Date().toISOString();
        row.elapsedMs = Math.round((performance.now() - started) * 1000) / 1000;
      }
    }
  };
  api.request = wrapped;
  return {
    record,
    restore() {
      if (api.request !== wrapped) throw diagnosticError('DIAGNOSTIC_OBSERVER_CHANGED');
      if (descriptor) Object.defineProperty(api, 'request', descriptor);
      else delete api.request;
    },
  };
}
const history = ({ containerId, since, until }) => {
  if (
    !containerIdentity.test(containerId ?? '') ||
    !Number.isFinite(Date.parse(since)) ||
    !Number.isFinite(Date.parse(until)) ||
    Date.parse(since) > Date.parse(until)
  )
    throw diagnosticError('INVALID_DIAGNOSTIC_WINDOW');
  return { containerId, since, until, status: 'unavailable', historyComplete: false, failure: null };
};
const lines = (stdout) => {
  if (typeof stdout !== 'string' || Buffer.byteLength(stdout) > 65536)
    throw diagnosticError('DIAGNOSTIC_BYTE_LIMIT');
  const rows = stdout.split(/\r?\n/).filter(Boolean);
  if (rows.length > 200) throw diagnosticError('DIAGNOSTIC_ROW_LIMIT');
  return rows.map((row) => JSON.parse(row));
};
export async function readOwnedEvents(exec, options) {
  const result = {
    source: 'bounded-docker-event-history',
    status: 'unavailable',
    historyComplete: false,
    failure: null,
    events: [],
  };
  try {
    Object.assign(result, history(options));
    if (!options.dockerConfig?.startsWith('/') || !options.socketPath?.startsWith('/'))
      throw diagnosticError('INVALID_DIAGNOSTIC_ENDPOINT');
    const actions = ['create', 'start', 'oom', 'kill', 'die', 'destroy'];
    // String formatting preserves nanosecond timestamps without unsafe JSON integer coercion.
    const format =
      '{"id":{{json .Actor.ID}},"action":{{json .Action}},"time":{{.Time}},"timeNano":"{{.TimeNano}}"}';
    const output = await exec(
      '/usr/bin/docker',
      [
        '--config',
        options.dockerConfig,
        '--host',
        'unix://' + options.socketPath,
        'events',
        '--since',
        options.since,
        '--until',
        options.until,
        '--filter',
        'type=container',
        '--filter',
        'container=' + options.containerId,
        ...actions.flatMap((action) => ['--filter', 'event=' + action]),
        '--format',
        format,
      ],
      { timeout: 3000, maxBuffer: 65536, windowsHide: true },
    );
    const events = lines(output.stdout).map((row) => {
      if (
        row.id !== options.containerId ||
        !actions.includes(row.action) ||
        !Number.isSafeInteger(row.time) ||
        typeof row.timeNano !== 'string' ||
        !/^\d{1,24}$/.test(row.timeNano)
      )
        throw diagnosticError('DIAGNOSTIC_EVENT_SCOPE');
      const nanoseconds = BigInt(row.timeNano);
      if (
        nanoseconds / 1000000000n !== BigInt(row.time) ||
        nanoseconds < BigInt(Date.parse(options.since)) * 1000000n ||
        nanoseconds > BigInt(Date.parse(options.until)) * 1000000n
      )
        throw diagnosticError('DIAGNOSTIC_EVENT_WINDOW');
      return { id: row.id, action: row.action, time: row.time, timeNano: row.timeNano };
    });
    result.events = events;
    result.status = 'available';
    result.stderrPresent = Boolean(output.stderr);
  } catch (error) {
    result.failure = diagnosticFailure(error);
  }
  return result;
}
export async function readOwnedFailureJournal(exec, options) {
  const result = {
    source: 'bounded-owned-runtime-and-kernel-journal',
    status: 'unavailable',
    historyComplete: false,
    failure: null,
    records: [],
    unattributedDiagnosticRows: 0,
  };
  try {
    Object.assign(result, history(options));
    const output = await exec(
      '/usr/bin/journalctl',
      [
        '--no-pager',
        '--output=json',
        '--since',
        options.since,
        '--until',
        options.until,
        '--lines=200',
        '_SYSTEMD_UNIT=docker.service',
        '+',
        '_SYSTEMD_UNIT=containerd.service',
        '+',
        '_TRANSPORT=kernel',
      ],
      { timeout: 3000, maxBuffer: 65536, windowsHide: true },
    );
    const owned = new RegExp('(^|[^a-f0-9])' + options.containerId + '([^a-f0-9]|$)');
    const records = [];
    for (const row of lines(output.stdout)) {
      if (
        typeof row.MESSAGE !== 'string' ||
        !/oom|out of memory|memory\.events|watch|event|shim|task.?exit|kill/i.test(row.MESSAGE)
      )
        continue;
      if (!owned.test(row.MESSAGE)) {
        result.unattributedDiagnosticRows++;
        continue;
      }
      records.push({
        ownedContainerId: options.containerId,
        timestamp: field(row, '__REALTIME_TIMESTAMP'),
        message: row.MESSAGE.slice(0, 2048),
        truncated: row.MESSAGE.length > 2048,
      });
    }
    result.records = records;
    result.status = 'available';
    result.stderrPresent = Boolean(output.stderr);
  } catch (error) {
    result.failure = diagnosticFailure(error);
  }
  return result;
}

// Diagnostic collection is secondary evidence and must never replace the real operation's outcome.
export async function recordProbe(record, operation, collect) {
  record.runFailure = null;
  record.diagnosticFailure = null;
  let value,
    failed = false,
    primary;
  try {
    value = await operation();
  } catch (error) {
    failed = true;
    primary = error;
    record.runFailure = details(error);
  }
  try {
    await collect(value);
  } catch (error) {
    record.diagnosticFailure = diagnosticFailure(error);
  }
  if (failed) throw primary;
  return value;
}
