// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-07-aug001-pack-boundary (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const exec = promisify(execFile);
const entry = path.resolve(process.env.MTERM_VERIFY_BIN ?? 'bin/mterm-cli.js');
const moduleUrl = (name) => pathToFileURL(path.resolve(path.dirname(entry), '../dist', name)).href;
const hash = (text) => createHash('sha256').update(text).digest('hex');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const object = (properties, required = Object.keys(properties)) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});
const worker = `import fs from 'node:fs';
import readline from 'node:readline';
const lines = readline.createInterface({input: process.stdin});
lines.once('line', line => {
  const request = JSON.parse(line);
  fs.writeFileSync('pid.txt', String(process.pid));
  if (request.arguments.text === 'hang') { setInterval(() => {}, 1000); return; }
  if (request.arguments.text === 'overflow') {
    process.stdout.write('x'.repeat(100000), () => process.exit(0));
    return;
  }
  if (request.arguments.text === 'badjson') {
    process.stdout.write('bad\\n', () => process.exit(0));
    return;
  }
  if (request.arguments.text === 'nonzero') {
    process.stderr.write('private-backend-diagnostic\\n', () => process.exit(3));
    return;
  }
  const response = {protocol:'mterm-pack-stdio/1', id:request.id, pack:request.pack,
    version:request.version, result:{text:request.arguments.text}};
  if (request.arguments.text === 'badid') response.id = 'wrong';
  if (request.arguments.text === 'badversion') response.version = '2.0.0';
  if (request.arguments.text === 'badschema') response.result.text = 42;
  process.stdout.write(JSON.stringify(response)+'\\n', () => process.exit(0));
});
`;
async function fixture(t, mutate = () => {}) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-pack-test-')));
  const cleanup = [];
  t.after(async () => {
    for (const close of cleanup) await close();
    await fs.rm(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  });
  const manifest = {
    manifestVersion: 1,
    abiVersion: 1,
    id: 'fixture',
    version: '1.0.0',
    source: {
      url: 'https://github.com/MulattoTech/MTerm-CLI',
      commit: 'd5fcc2f665b2b4f7d033ffd32b7c22ca9d7a4015',
      license: 'MIT',
    },
    runtime: { kind: 'node-stdio-once', nodeMajor: 24, entry: 'worker.mjs' },
    platforms: ['win32-x64', 'linux-x64', 'darwin-arm64', 'darwin-x64'],
    dependencies: [],
    files: [{ path: 'worker.mjs', sha256: hash(worker) }],
    permissions: ['execute-unsandboxed'],
    tools: [
      {
        name: 'echo',
        description: 'Synthetic local echo fixture.',
        inputSchema: object({ text: { type: 'string', maxLength: 100 } }),
        outputSchema: object({ text: { type: 'string', maxLength: 100 } }),
        timeoutMs: 5000,
      },
    ],
  };
  mutate(manifest);
  const file = path.join(root, 'pack.json');
  const registry = path.join(root, 'registry.json');
  const text = JSON.stringify(manifest);
  await fs.writeFile(file, text);
  await fs.writeFile(path.join(root, 'worker.mjs'), worker);
  return { root, file, registry, manifest, pin: hash(text), cleanup };
}
async function cli(args) {
  try {
    const result = await exec(process.execPath, [entry, ...args], { timeout: 15000, maxBuffer: 1048576 });
    return { ...result, code: 0 };
  } catch (error) {
    return { code: error.code, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
  }
}
const installArgs = (f) => [
  'packs',
  'install',
  '--manifest',
  f.file,
  '--sha256',
  f.pin,
  '--registry',
  f.registry,
];
async function install(f) {
  const result = await cli([...installArgs(f), '--apply']);
  assert.equal(result.code, 0, result.stderr);
  return JSON.parse(result.stdout);
}
const value = (result) =>
  result.structuredContent ?? JSON.parse(result.content.find((c) => c.type === 'text').text);
async function connect(t, f, flags = []) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [entry, 'mcp', '--stdio', '--root', f.root, '--pack-registry', f.registry, ...flags],
    stderr: 'pipe',
  });
  transport.stderr?.resume();
  const client = new Client({ name: 'mterm-pack-acceptance-fixture', version: '1.0.0' });
  f.cleanup.push(async () => {
    await client.close();
    await transport.close().catch(() => {});
  });
  await client.connect(transport);
  return { client, transport };
}
const allowed = ['--allow-exec', '--allow-pack', 'fixture'];

test('pack install previews, pins and persists; uninstall is reversible and leaves payload intact', async (t) => {
  const f = await fixture(t);
  const preview = await cli(installArgs(f));
  assert.equal(preview.code, 0, preview.stderr);
  assert.equal(JSON.parse(preview.stdout).applied, false);
  assert.equal(await fs.stat(f.registry).catch(() => null), null);
  assert.equal((await install(f)).changed, true);
  assert.equal((await install(f)).changed, false);
  const list = await cli(['packs', 'list', '--registry', f.registry]);
  assert.equal(list.code, 0, list.stderr);
  assert.equal(JSON.parse(list.stdout).packs[0].manifestSha256, f.pin);
  assert.equal(await fs.stat(path.join(f.root, 'pid.txt')).catch(() => null), null);
  const args = ['packs', 'uninstall', '--id', 'fixture', '--registry', f.registry];
  assert.equal(JSON.parse((await cli(args)).stdout).applied, false);
  assert.equal(JSON.parse((await cli([...args, '--apply'])).stdout).changed, true);
  assert.equal(JSON.parse((await cli([...args, '--apply'])).stdout).changed, false);
  assert.equal(await fs.readFile(path.join(f.root, 'worker.mjs'), 'utf8'), worker);
});

test('manifest pin and payload hashes reject changes before registration', async (t) => {
  const f = await fixture(t);
  const wrong = await cli(installArgs({ ...f, pin: '0'.repeat(64) }));
  assert.match(wrong.stderr, /PACK_PIN/);
  await fs.appendFile(path.join(f.root, 'worker.mjs'), '\n// changed');
  const altered = await cli(installArgs(f));
  assert.match(altered.stderr, /PACK_INTEGRITY/);
  assert.equal(await fs.stat(f.registry).catch(() => null), null);
});

test('unsupported ABI, runtime, platform, permissions, dependencies and schemas fail closed', async (t) => {
  const cases = [
    [
      (m) => {
        m.abiVersion = 2;
      },
      'PACK_ABI',
    ],
    [
      (m) => {
        m.runtime.nodeMajor = 999;
      },
      'PACK_RUNTIME',
    ],
    [
      (m) => {
        m.platforms = ['freebsd-x64'];
      },
      'PACK_PLATFORM',
    ],
    [
      (m) => {
        m.permissions.push('network');
      },
      'PACK_PERMISSION',
    ],
    [
      (m) => {
        m.dependencies = [{ name: 'some-package', version: '1.0.0', license: 'MIT' }];
      },
      'PACK_DEPENDENCY',
    ],
    [
      (m) => {
        m.tools[0].inputSchema.properties.text.pattern = '.*';
      },
      'PACK_SCHEMA',
    ],
    [
      (m) => {
        m.tools[0].inputSchema.properties.text.$ref = 'https://example.invalid/schema';
      },
      'PACK_SCHEMA',
    ],
    [
      (m) => {
        m.files[0].path = '../worker.mjs';
      },
      'PACK_MANIFEST',
    ],
    [
      (m) => {
        m.tools.push({ ...m.tools[0] });
      },
      'PACK_MANIFEST',
    ],
    [
      (m) => {
        m.source.license = '';
      },
      'PACK_MANIFEST',
    ],
  ];
  for (const [mutate, code] of cases) {
    const f = await fixture(t, mutate);
    const result = await cli(installArgs(f));
    assert.match(result.stderr, new RegExp(code), result.stderr);
    assert.equal(await fs.stat(f.registry).catch(() => null), null);
  }
});

test('corrupt registry, same-ID replacement and exclusive registration lock preserve previous bytes', async (t) => {
  const f = await fixture(t);
  await install(f);
  const original = await fs.readFile(f.registry, 'utf8');
  await fs.writeFile(f.registry + '.lock', 'another owner');
  assert.match(
    (await cli(['packs', 'uninstall', '--id', 'fixture', '--registry', f.registry, '--apply'])).stderr,
    /PACK_REGISTRY_BUSY/,
  );
  assert.equal(await fs.readFile(f.registry, 'utf8'), original);
  await fs.unlink(f.registry + '.lock');
  f.manifest.version = '1.0.1';
  const next = JSON.stringify(f.manifest);
  await fs.writeFile(f.file, next);
  assert.match((await cli([...installArgs({ ...f, pin: hash(next) }), '--apply'])).stderr, /PACK_CONFLICT/);
  assert.equal(await fs.readFile(f.registry, 'utf8'), original);
  await fs.writeFile(f.registry, '{broken');
  assert.match((await cli(installArgs({ ...f, pin: hash(next) }))).stderr, /PACK_REGISTRY/);
  assert.equal(await fs.readFile(f.registry, 'utf8'), '{broken');
});

test('payload hardlinks and nested directory links are refused', async (t) => {
  const f = await fixture(t);
  await fs.link(path.join(f.root, 'worker.mjs'), path.join(f.root, 'other.mjs'));
  assert.match((await cli(installArgs(f))).stderr, /LINK_REJECTED/);
  await fs.unlink(path.join(f.root, 'other.mjs'));
  await fs.mkdir(path.join(f.root, 'actual'));
  await fs.rename(path.join(f.root, 'worker.mjs'), path.join(f.root, 'actual', 'worker.mjs'));
  await fs.symlink(
    path.join(f.root, 'actual'),
    path.join(f.root, 'linked'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  f.manifest.runtime.entry = f.manifest.files[0].path = 'linked/worker.mjs';
  const text = JSON.stringify(f.manifest);
  await fs.writeFile(f.file, text);
  assert.match((await cli(installArgs({ ...f, pin: hash(text) }))).stderr, /LINK_REJECTED/);
});

test('missing packs leave core help, status and real MCP discovery usable', async (t) => {
  const f = await fixture(t);
  assert.equal((await cli(['--help'])).code, 0);
  assert.equal((await cli(['status', '--json'])).code, 4);
  const { client } = await connect(t, f, allowed);
  const tools = (await client.listTools()).tools;
  assert.ok(tools.some((tool) => tool.name === 'mterm_read_file'));
  assert.ok(!tools.some((tool) => tool.name.startsWith('mterm_pack_')));
});

test('pack discovery requires execution and exact owner allowlist; discovery does not start payload', async (t) => {
  const f = await fixture(t);
  await install(f);
  for (const flags of [[], ['--allow-exec'], ['--allow-pack', 'fixture']]) {
    const { client } = await connect(t, f, flags);
    assert.ok(!(await client.listTools()).tools.some((tool) => tool.name.startsWith('mterm_pack_')));
  }
  const { client } = await connect(t, f, allowed);
  const tool = (await client.listTools()).tools.find((tool) => tool.name === 'mterm_pack_fixture__echo');
  assert.ok(tool);
  assert.equal(tool.annotations.readOnlyHint, false);
  assert.equal(tool.annotations.openWorldHint, true);
  assert.equal(await fs.stat(path.join(f.root, 'pid.txt')).catch(() => null), null);
  const caps = value(await client.callTool({ name: 'mterm_capabilities', arguments: {} }));
  assert.equal(caps.optionalPacks.osSandbox, false);
});

test('official MCP client invokes negotiated one-shot pack and rejects malformed inputs/outputs', async (t) => {
  const f = await fixture(t);
  await install(f);
  const { client } = await connect(t, f, allowed);
  const call = (text) => client.callTool({ name: 'mterm_pack_fixture__echo', arguments: { text } });
  const denied = await call(42);
  assert.equal(denied.isError, true);
  assert.equal(await fs.stat(path.join(f.root, 'pid.txt')).catch(() => null), null);
  const ok = await call('hello');
  assert.equal(ok.isError, false);
  assert.deepEqual(value(ok), { text: 'hello' });
  for (const [text, code] of [
    ['badjson', 'PACK_PROTOCOL'],
    ['badid', 'PACK_PROTOCOL'],
    ['badversion', 'PACK_PROTOCOL'],
    ['badschema', 'PACK_OUTPUT_SCHEMA'],
    ['nonzero', 'PACK_EXIT'],
    ['overflow', 'PACK_OUTPUT_LIMIT'],
  ]) {
    const result = await call(text);
    assert.equal(result.isError, true, text);
    assert.equal(value(result).error.code, code, text);
    assert.ok(!JSON.stringify(result).includes('private-backend-diagnostic'));
  }
});

test('pack timeout stops its owned child and reports failure', async (t) => {
  const f = await fixture(t, (m) => {
    m.tools[0].timeoutMs = 2000;
  });
  await install(f);
  const { client } = await connect(t, f, allowed);
  const result = await client.callTool({ name: 'mterm_pack_fixture__echo', arguments: { text: 'hang' } });
  assert.equal(result.isError, true);
  assert.equal(value(result).error.code, 'PACK_TIMEOUT');
  const pid = Number(await fs.readFile(path.join(f.root, 'pid.txt'), 'utf8'));
  assert.throws(() => process.kill(pid, 0));
});

test('payload tampering and unregistration deny previously discovered tool calls', async (t) => {
  const f = await fixture(t);
  await install(f);
  const { client } = await connect(t, f, allowed);
  await fs.appendFile(path.join(f.root, 'worker.mjs'), '\n// altered');
  const invoke = () => client.callTool({ name: 'mterm_pack_fixture__echo', arguments: { text: 'hello' } });
  assert.equal(value(await invoke()).error.code, 'PACK_INTEGRITY');
  await fs.writeFile(path.join(f.root, 'worker.mjs'), worker);
  await cli(['packs', 'uninstall', '--id', 'fixture', '--registry', f.registry, '--apply']);
  assert.equal(value(await invoke()).error.code, 'PACK_UNREGISTERED');
  assert.equal(await fs.stat(path.join(f.root, 'pid.txt')).catch(() => null), null);
});

test('pack call cancellation and host close clean up a real owned sidecar', async (t) => {
  const f = await fixture(t, (m) => {
    m.tools[0].timeoutMs = 10000;
  });
  await install(f);
  const { PackCatalog } = await import(moduleUrl('tool-packs.js'));
  const { ProcessService } = await import(moduleUrl('processes.js'));
  const jobs = await ProcessService.create(f.root, { allowExec: true });
  f.cleanup.push(() => jobs.close());
  const catalog = await PackCatalog.create({ registry: f.registry, allowPacks: ['fixture'], jobs });
  const controller = new AbortController();
  const result = catalog.tools[0].invoke({ text: 'hang' }, controller.signal);
  const rejected = assert.rejects(result, (error) => error.code === 'CANCELLED');
  let pid;
  for (let i = 0; i < 200; i++) {
    pid = Number(await fs.readFile(path.join(f.root, 'pid.txt'), 'utf8').catch(() => '0'));
    if (pid) break;
    await sleep(20);
  }
  assert.ok(pid, 'sidecar must start before cancellation');
  controller.abort();
  await rejected;
  assert.throws(() => process.kill(pid, 0));
  await fs.unlink(path.join(f.root, 'pid.txt'));
  const { client } = await connect(t, f, allowed);
  const pending = client
    .callTool({ name: 'mterm_pack_fixture__echo', arguments: { text: 'hang' } })
    .catch(() => null);
  for (let i = 0; i < 200; i++) {
    pid = Number(await fs.readFile(path.join(f.root, 'pid.txt'), 'utf8').catch(() => '0'));
    if (pid) break;
    await sleep(20);
  }
  assert.ok(pid);
  await client.close();
  await pending;
  for (let i = 0; i < 200; i++) {
    try {
      process.kill(pid, 0);
    } catch {
      return;
    }
    await sleep(20);
  }
  assert.fail('host close left its owned pack process alive');
});

test('managed setup refuses pack flags until registration can preserve them', async (t) => {
  const f = await fixture(t);
  const result = await cli(['setup', 'codex', '--root', f.root, '--pack-registry', f.registry]);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /USAGE/);
});

test('invalid catalog entries and oversized registry cannot disable native MCP tools', async (t) => {
  const f = await fixture(t);
  for (const bytes of ['{broken', 'x'.repeat(65537)]) {
    await fs.writeFile(f.registry, bytes);
    const { client } = await connect(t, f, allowed);
    assert.ok((await client.listTools()).tools.some((tool) => tool.name === 'mterm_read_file'));
    const caps = value(await client.callTool({ name: 'mterm_capabilities', arguments: {} }));
    assert.equal(caps.optionalPacks.admitted.length, 0);
    assert.equal(caps.optionalPacks.diagnostics.length, 1);
  }
  await fs.unlink(f.registry);
  await install(f);
  await fs.appendFile(f.file, ' ');
  const { client } = await connect(t, f, allowed);
  assert.ok(!(await client.listTools()).tools.some((tool) => tool.name.startsWith('mterm_pack_')));
  assert.equal(
    value(await client.callTool({ name: 'mterm_capabilities', arguments: {} })).optionalPacks.diagnostics[0]
      .error.code,
    'PACK_PIN',
  );
});

test('host owner roots constrain both registry and payload admission', async (t) => {
  const f = await fixture(t);
  const outside = await fixture(t);
  await install(outside);
  await fs.copyFile(outside.registry, f.registry);
  const { client } = await connect(t, f, allowed);
  assert.ok(!(await client.listTools()).tools.some((tool) => tool.name.startsWith('mterm_pack_')));
  assert.equal(
    value(await client.callTool({ name: 'mterm_capabilities', arguments: {} })).optionalPacks.diagnostics[0]
      .error.code,
    'OUTSIDE_ROOT',
  );
  const other = await connect(t, { ...f, registry: outside.registry }, allowed);
  assert.equal(
    value(await other.client.callTool({ name: 'mterm_capabilities', arguments: {} })).optionalPacks
      .diagnostics[0].error.code,
    'OUTSIDE_ROOT',
  );
});

test('MCP request cancellation terminates its owned pack without disconnecting the client', async (t) => {
  const f = await fixture(t, (m) => {
    m.tools[0].timeoutMs = 10000;
  });
  await install(f);
  const { client } = await connect(t, f, allowed);
  const abort = new AbortController();
  const request = client.callTool(
    { name: 'mterm_pack_fixture__echo', arguments: { text: 'hang' } },
    { signal: abort.signal },
  );
  const rejected = assert.rejects(request, /abort|cancel/i);
  let pid;
  for (let i = 0; i < 200; i++) {
    pid = Number(await fs.readFile(path.join(f.root, 'pid.txt'), 'utf8').catch(() => '0'));
    if (pid) break;
    await sleep(20);
  }
  assert.ok(pid, 'MCP cancellation must follow actual sidecar startup');
  abort.abort();
  await rejected;
  let alive = true;
  for (let i = 0; i < 200; i++) {
    try {
      process.kill(pid, 0);
    } catch {
      alive = false;
      break;
    }
    await sleep(20);
  }
  assert.equal(alive, false, 'cancelled MCP request left an owned sidecar running');
  await client.ping();
  const next = await client.callTool({
    name: 'mterm_pack_fixture__echo',
    arguments: { text: 'still-connected' },
  });
  assert.equal(next.isError, false);
  assert.deepEqual(value(next), { text: 'still-connected' });
});

test('production schema dependency rejects oversized invalid collections before per-element issue accumulation', async () => {
  const require = createRequire(pathToFileURL(entry));
  const { z } = require('zod');
  const schema = z.array(z.number()).max(8);
  const result = schema.safeParse(Array(64).fill('invalid'));
  assert.equal(result.success, false);
  assert.equal(
    result.error.issues.length,
    1,
    'GHSA-mrhx-c7xc-m3w5: reject size before accumulating element failures',
  );
  assert.equal(result.error.issues[0].code, 'too_big');
});
