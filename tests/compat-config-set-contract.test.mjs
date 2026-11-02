// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-config-contract (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

// The response wording/JSON indentation is pinned to DesktopCommanderMCP
// c774c3b505de990219637ecdc9a830c8772fae9d, src/tools/config.ts.
// MTerm reports its accepted effective value; stricter validation and owner
// ceilings intentionally differ from the upstream's broad coercion/raw echo.
const entry = path.resolve('bin/mterm-cli.js');
const separator = '\n\nUpdated configuration:\n';
const keys = [
  'blockedCommands',
  'defaultShell',
  'allowedDirectories',
  'fileReadLineLimit',
  'fileWriteLineLimit',
  'telemetryEnabled',
];
const sentinel = 'MTERM_REJECTED_CONFIG_VALUE_SENTINEL';
const options = { timeout: 5000 };

async function waitForExit(pid) {
  const deadline = Date.now() + 5000;
  do {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error.code === 'ESRCH') return;
      throw error;
    }
    await delay(20);
  } while (Date.now() < deadline);
  throw new Error('Owned MCP child exit was not observed');
}

async function fixture(t, { configWrite = true } = {}) {
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-set-contract-')));
  const roots = [path.join(dir, 'root one'), path.join(dir, 'root two')];
  const file = path.join(dir, 'state', 'compat.json');
  const shells = ['fixture-owner-shell-a', 'fixture-owner-shell-b'];
  for (const root of roots) await fs.mkdir(root);
  const clients = [];
  t.after(async () => {
    const errors = [];
    let allExitsVerified = true;
    for (const connection of clients) {
      for (const close of [() => connection.client.close(), () => connection.transport.close()]) {
        try {
          await close();
        } catch (error) {
          errors.push(error);
        }
      }
      try {
        if (connection.pid !== null) await waitForExit(connection.pid);
        else assert.equal(connection.transport.pid, null, 'No uncaptured child may survive cleanup');
      } catch (error) {
        allExitsVerified = false;
        errors.push(error);
      }
      try {
        assert.equal(connection.stderr, '', 'The config handler must not log raw request values');
      } catch (error) {
        errors.push(error);
      }
    }
    // Preserve state for investigation if an owned child exit is unconfirmed.
    if (allExitsVerified)
      try {
        await fs.rm(dir, { recursive: true, force: true });
      } catch (error) {
        errors.push(error);
      }
    if (errors.length) throw new AggregateError(errors, 'Owned MCP fixture cleanup failed');
  });
  async function connect() {
    const env = { ...process.env };
    for (const key of Object.keys(env))
      if (/token|secret|password|api[_-]?key|authorization/i.test(key)) delete env[key];
    delete env.NODE_OPTIONS;
    env.CODEX_HOME = path.join(dir, 'synthetic-codex');
    env.MTERM_CONFIG_PATH = path.join(dir, 'native.json');
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [
        entry,
        'mcp',
        '--stdio',
        '--root',
        roots[0],
        '--root',
        roots[1],
        '--compat-desktop-commander',
        '--compat-config',
        file,
        ...shells.flatMap((shell) => ['--allow-shell', shell]),
        ...(configWrite ? ['--allow-config-write'] : []),
      ],
      env,
      stderr: 'pipe',
    });
    const client = new Client({ name: 'mterm-set-contract-fixture', version: '1.0.0' });
    const connection = { client, transport, pid: null, stderr: '' };
    clients.push(connection);
    transport.stderr?.on('data', (chunk) => {
      connection.stderr = (connection.stderr + chunk.toString('utf8')).slice(-65536);
    });
    const connected = client.connect(transport, options);
    connection.pid = transport.pid;
    await connected;
    assert.ok(Number.isInteger(connection.pid) && connection.pid > 0);
    connection.call = (name, args = {}) => client.callTool({ name, arguments: args }, options);
    return connection;
  }
  return { dir, roots, file, shells, connect };
}

function success(result, key, value, expectedConfig) {
  assert.equal(result.isError, false);
  assert.equal(result.structuredContent, undefined, 'Pinned set success is a text-only response');
  assert.equal(result.content.length, 1);
  assert.equal(result.content[0].type, 'text');
  const text = result.content[0].text;
  const boundary = text.indexOf(separator);
  assert.ok(boundary >= 0, 'The updated configuration section is present');
  const config = JSON.parse(text.slice(boundary + separator.length));
  assert.deepEqual(Object.keys(config).sort(), [...keys, 'schemaVersion'].sort());
  assert.equal(config.schemaVersion, 1);
  assert.deepEqual(config[key], value, 'The returned configuration contains the effective value');
  if (expectedConfig) assert.deepEqual(config, expectedConfig);
  assert.equal(
    text,
    `Successfully set ${key} to ${JSON.stringify(value, null, 2)}${separator}${JSON.stringify(config, null, 2)}`,
    'The success prefix and updated configuration must agree on the accepted value',
  );
  return config;
}

const get = async (connection) => {
  const result = await connection.call('get_config');
  assert.equal(result.isError, false);
  return result.structuredContent.config;
};
const preferences = (config) => ({
  ...Object.fromEntries(keys.map((key) => [key, config[key]])),
  schemaVersion: 1,
});

for (const key of keys) {
  test(`set_config_value reports the exact accepted ${key} value through MCP`, async (t) => {
    const f = await fixture(t);
    const connection = await f.connect();
    const before = await get(connection);
    const values = {
      blockedCommands: ['fixture-block'],
      defaultShell: f.shells[1],
      allowedDirectories: [f.roots[1]],
      fileReadLineLimit: 17,
      fileWriteLineLimit: 23,
      telemetryEnabled: true,
    };
    const input = values[key];
    const expected = key === 'blockedCommands' ? [...before.blockedCommands, 'fixture-block'] : input;
    const result = await connection.call('set_config_value', { key, value: input, origin: 'llm' });
    success(result, key, expected, { ...preferences(before), [key]: expected });
    assert.deepEqual(JSON.parse(await fs.readFile(f.file, 'utf8'))[key], input);
    assert.deepEqual((await get(connection))[key], expected);
    const capabilities = (await connection.call('mterm_capabilities')).structuredContent;
    assert.equal(capabilities.writeEnabled, false);
    assert.equal(capabilities.executionEnabled, false);
  });
}

test('set_config_value normalizes boolean strings without echoing their spelling', async (t) => {
  const f = await fixture(t);
  const connection = await f.connect();
  for (const [value, expected] of [
    [' \tTrUe\r\n', true],
    [' FALSE ', false],
    [true, true],
    [false, false],
  ]) {
    success(
      await connection.call('set_config_value', { key: 'telemetryEnabled', value, origin: 'ui' }),
      'telemetryEnabled',
      expected,
    );
    assert.equal(JSON.parse(await fs.readFile(f.file, 'utf8')).telemetryEnabled, expected);
    const config = await get(connection);
    assert.equal(config.mterm.telemetryTransport, 'none');
    assert.equal(config.mterm.effectiveTelemetryEnabled, false);
  }
});

test('set_config_value reports deduplicated roots and enforced command names, including empty arrays', async (t) => {
  const f = await fixture(t);
  const connection = await f.connect();
  const minimum = (await get(connection)).blockedCommands;
  const commands = ['  Fixture.EXE  ', '/fixture/bin/FIXTURE.exe', 'sudo'];
  success(
    await connection.call('set_config_value', {
      key: 'blockedCommands',
      value: '  ' + JSON.stringify(commands),
    }),
    'blockedCommands',
    [...minimum, 'fixture'],
  );
  assert.deepEqual(JSON.parse(await fs.readFile(f.file, 'utf8')).blockedCommands, commands);
  success(
    await connection.call('set_config_value', { key: 'blockedCommands', value: 'Single.EXE' }),
    'blockedCommands',
    [...minimum, 'single'],
  );
  success(
    await connection.call('set_config_value', { key: 'blockedCommands', value: [] }),
    'blockedCommands',
    minimum,
  );
  const duplicateRoots = [f.roots[1] + path.sep + '.', f.roots[1]];
  success(
    await connection.call('set_config_value', {
      key: 'allowedDirectories',
      value: '  ' + JSON.stringify(duplicateRoots),
    }),
    'allowedDirectories',
    [f.roots[1]],
  );
  assert.deepEqual(JSON.parse(await fs.readFile(f.file, 'utf8')).allowedDirectories, duplicateRoots);
  success(
    await connection.call('set_config_value', { key: 'allowedDirectories', value: f.roots[0] }),
    'allowedDirectories',
    [f.roots[0]],
  );
  success(
    await connection.call('set_config_value', { key: 'allowedDirectories', value: '[]' }),
    'allowedDirectories',
    [],
  );
  const denied = await connection.call('mterm_list_directory', { path: f.roots[0] });
  assert.equal(denied.structuredContent.error.code, 'OUTSIDE_ROOT');
});

test('set_config_value preserves accepted integer boundaries and no-op policy/backup bytes', async (t) => {
  const f = await fixture(t);
  const connection = await f.connect();
  for (const key of ['fileReadLineLimit', 'fileWriteLineLimit']) {
    for (const value of [1, 10000])
      success(await connection.call('set_config_value', { key, value }), key, value);
    const before = await fs.readFile(f.file);
    const backup = await fs.readFile(f.file + '.previous');
    success(await connection.call('set_config_value', { key, value: 10000 }), key, 10000);
    assert.deepEqual(await fs.readFile(f.file), before);
    assert.deepEqual(await fs.readFile(f.file + '.previous'), backup);
  }
});

test('set_config_value rejects unsafe keys, coercions and owner-scope escapes without altering bytes or echoing values', async (t) => {
  const f = await fixture(t);
  const connection = await f.connect();
  // Seed two real writes without asserting the new output format, so this negative
  // contract independently runs and passes in the pre-fix RED campaign.
  for (const [key, value] of [
    ['fileReadLineLimit', 3],
    ['fileWriteLineLimit', 4],
  ])
    assert.equal((await connection.call('set_config_value', { key, value })).isError, false);
  const before = await fs.readFile(f.file);
  const backup = await fs.readFile(f.file + '.previous');
  const beforeNames = await fs.readdir(path.dirname(f.file));
  const cases = [
    [sentinel, true, 'CONFIG_KEY'],
    ['__proto__', sentinel, 'CONFIG_KEY'],
    ['allowExec', true, 'CONFIG_KEY'],
    ['blockedCommands', null, 'INVALID_ARGUMENT'],
    ['blockedCommands', 7, 'INVALID_ARGUMENT'],
    ['blockedCommands', true, 'INVALID_ARGUMENT'],
    ['blockedCommands', '["' + sentinel + '"', 'CONFIG_INVALID'],
    ['blockedCommands', [sentinel + '\n'], 'INVALID_ARGUMENT'],
    ['defaultShell', sentinel, 'CONFIG_SCOPE'],
    ['defaultShell', null, 'INVALID_ARGUMENT'],
    ['allowedDirectories', [f.dir], 'OUTSIDE_ROOT'],
    ['allowedDirectories', sentinel, 'CONFIG_SCOPE'],
    ['allowedDirectories', null, 'INVALID_ARGUMENT'],
    ['allowedDirectories', 7, 'INVALID_ARGUMENT'],
    ['allowedDirectories', '["' + sentinel + '"', 'CONFIG_INVALID'],
    ['telemetryEnabled', sentinel, 'INVALID_ARGUMENT'],
    ['telemetryEnabled', 1, 'INVALID_ARGUMENT'],
    ['telemetryEnabled', null, 'INVALID_ARGUMENT'],
  ];
  for (const key of ['fileReadLineLimit', 'fileWriteLineLimit'])
    for (const value of [0, -1, 10001, 1.5, '2', true, null]) cases.push([key, value, 'INVALID_ARGUMENT']);
  for (const [key, value, code] of cases) {
    const result = await connection.call('set_config_value', { key, value });
    assert.equal(result.isError, true, key);
    assert.equal(result.structuredContent.error.code, code, key);
    assert.deepEqual(result.content, [{ type: 'text', text: JSON.stringify(result.structuredContent) }]);
    assert.ok(!JSON.stringify(result).includes(sentinel));
    assert.ok(!JSON.stringify(result).includes('Successfully set'));
    assert.deepEqual(await fs.readFile(f.file), before, key);
    assert.deepEqual(await fs.readFile(f.file + '.previous'), backup, key);
    assert.deepEqual(await fs.readdir(path.dirname(f.file)), beforeNames, key);
  }
});

test('concurrent set_config_value acknowledgements retain each committed request snapshot', async (t) => {
  const f = await fixture(t);
  const a = await f.connect();
  const b = await f.connect();
  for (const values of [
    [71, 72],
    [73, 74],
  ]) {
    const results = await Promise.all(
      [a, b].map((connection, i) =>
        connection.call('set_config_value', { key: 'fileReadLineLimit', value: values[i] }),
      ),
    );
    results.forEach((result, i) => success(result, 'fileReadLineLimit', values[i]));
    assert.ok(values.includes((await get(a)).fileReadLineLimit));
    assert.equal((await get(a)).fileReadLineLimit, (await get(b)).fileReadLineLimit);
  }
});

test('set_config_value remains unavailable without its independent owner capability', async (t) => {
  const f = await fixture(t, { configWrite: false });
  const connection = await f.connect();
  assert.ok(
    !(await connection.client.listTools(undefined, options)).tools.some(
      (tool) => tool.name === 'set_config_value',
    ),
  );
  assert.equal((await get(connection)).mterm.configWriteEnabled, false);
  await assert.rejects(fs.stat(path.dirname(f.file)), { code: 'ENOENT' });
});
