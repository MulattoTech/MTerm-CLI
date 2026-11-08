// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-08-aug005-container-isolation (OpenAI / GPT-6 Astra Pro; self-reported)
// The local HTTP fixtures below simulate Engine responses; they do NOT certify container isolation.
// Real Linux containment and installed-byte qualification run separately in verify-isolation-live.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const entry = path.resolve(process.env.MTERM_VERIFY_BIN ?? 'bin/mterm-cli.js');
const moduleUrl = (name) => pathToFileURL(path.resolve(path.dirname(entry), '../dist', name)).href;
const missing = (e) => {
  if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
  return {};
};
const policyModule = await import(moduleUrl('isolation-policy.js')).catch(missing);
const engineModule = await import(moduleUrl('isolation-engine.js')).catch(missing);
const httpModule = await import(moduleUrl('isolation-http.js')).catch(missing);
const hostModule = await import(moduleUrl('isolation.js')).catch(missing);
const processModule = await import(moduleUrl('processes.js'));
const { parseHost } = await import(moduleUrl('cli.js'));
const exec = promisify(execFile);
const imageId = 'sha256:' + '1'.repeat(64);
const containerId = '2'.repeat(64);
const code = (expected) => (error) => error?.code === expected;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const value = (r) => r.structuredContent ?? JSON.parse(r.content.find((c) => c.type === 'text').text);
async function until(read, check, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const v = await read();
    if (check(v)) return v;
    await sleep(10);
  }
  assert.fail('Timed out waiting for the asserted fixture transition');
}
async function directory(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-isolation-test-')));
  const cleanup = [];
  t.after(async () => {
    for (const close of cleanup.reverse()) await close();
    await fs.rm(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  });
  return { root, cleanup };
}
function frame(stream, payload) {
  const bytes = Buffer.from(payload);
  const header = Buffer.alloc(8);
  header[0] = stream;
  header.writeUInt32BE(bytes.length, 4);
  return Buffer.concat([header, bytes]);
}
async function fakeEngine(t, hooks = {}) {
  const f = await directory(t);
  const socketPath =
    process.platform === 'win32'
      ? '\\\\.\\pipe\\mterm-iso-test-' + randomUUID()
      : path.join(f.root, 'engine.sock');
  const requests = [],
    sockets = new Set(),
    waits = [];
  const state = {
    created: false,
    running: false,
    removed: false,
    starts: 0,
    deletes: 0,
    body: null,
    name: null,
    attachment: null,
    rejectDelete: false,
    hold: false,
    exitCode: 0,
    info: {
      ID: 'fixture-engine-id',
      OSType: 'linux',
      Architecture: 'x86_64',
      KernelVersion: '6.8.0-fixture',
      OperatingSystem: 'Ubuntu 24.04 synthetic fixture',
      CgroupVersion: '2',
      CgroupDriver: 'systemd',
      MemoryLimit: true,
      SwapLimit: true,
      CpuCfsPeriod: true,
      CpuCfsQuota: true,
      PidsLimit: true,
      SecurityOptions: ['name=seccomp,profile=builtin', 'name=cgroupns'],
      Runtimes: { runc: { path: 'runc' } },
    },
    version: {
      Version: '29.9.3',
      ApiVersion: '1.56',
      MinAPIVersion: '1.40',
      Os: 'linux',
      Arch: 'amd64',
      KernelVersion: '6.8.0-fixture',
      GitCommit: 'synthetic-engine',
      Components: [
        { Name: 'containerd', Version: '2.4.2', Details: { GitCommit: 'synthetic-containerd' } },
        { Name: 'runc', Version: '1.5.2', Details: { GitCommit: 'synthetic-runc' } },
      ],
    },
    image: {
      Id: imageId,
      Os: 'linux',
      Architecture: 'amd64',
      Config: {
        Env: ['IMAGE_SECRET=do-not-inherit', 'NODE_OPTIONS=--require=/bad.js', 'PATH=/image'],
        Volumes: null,
        Entrypoint: ['/bad-entrypoint'],
        Healthcheck: { Test: ['CMD-SHELL', 'bad'] },
      },
    },
  };
  const json = (res, status, body) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(body === undefined ? undefined : JSON.stringify(body));
  };
  const inspect = () => ({
    Id: containerId,
    Name: '/' + state.name,
    Image: imageId,
    Config: { ...state.body },
    HostConfig: state.body.HostConfig,
    Mounts: [],
    State: {
      Status: state.running ? 'running' : state.starts ? 'exited' : 'created',
      Running: state.running,
      ExitCode: state.exitCode,
      OOMKilled: false,
    },
  });
  state.complete = (output = true) => {
    state.running = false;
    if (state.attachment && !state.attachment.destroyed && !state.attachment.writableEnded) {
      if (output) state.attachment.end(Buffer.concat([frame(1, 'IMMEDIATE\n'), frame(2, 'ERR\n')]));
      else state.attachment.end();
    }
    for (const res of waits.splice(0)) json(res, 200, { StatusCode: state.exitCode, Error: null });
  };
  const server = http.createServer(async (req, res) => {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined;
      const u = new URL(req.url, 'http://fixture');
      requests.push({ method: req.method, path: u.pathname, query: u.search, body, headers: req.headers });
      if (hooks.request && (await hooks.request({ req, res, body, u, state, json }))) return;
      if (u.pathname === '/v1.45/version') return json(res, 200, state.version);
      if (u.pathname === '/v1.45/info') return json(res, 200, state.info);
      if (u.pathname.startsWith('/v1.45/images/')) return json(res, 200, state.image);
      if (u.pathname === '/v1.45/containers/create' && req.method === 'POST') {
        assert.equal(state.created, false, 'Never duplicate an uncertain create');
        state.body = body;
        state.name = u.searchParams.get('name');
        state.created = true;
        if (hooks.create) return hooks.create({ req, res, body, state, json });
        return json(res, 201, { Id: containerId, Warnings: [] });
      }
      if (u.pathname.endsWith('/json')) {
        if (!state.created || state.removed) return json(res, 404, { message: 'not found' });
        const document = inspect();
        if (hooks.inspect) hooks.inspect(document, state);
        return json(res, 200, document);
      }
      if (u.pathname.endsWith('/start')) {
        state.starts++;
        state.running = true;
        if (hooks.start) return hooks.start({ req, res, state, json });
        json(res, 204);
        if (!state.hold) setTimeout(() => state.complete(), 15);
        return;
      }
      if (u.pathname.endsWith('/wait')) {
        if (state.running || (u.searchParams.get('condition') === 'next-exit' && !state.starts))
          waits.push(res);
        else json(res, 200, { StatusCode: state.exitCode, Error: null });
        return;
      }
      if (req.method === 'DELETE' && u.pathname.startsWith('/v1.45/containers/')) {
        state.deletes++;
        if (state.rejectDelete) return json(res, 403, { message: 'synthetic denied; do not echo secrets' });
        state.running = false;
        state.removed = true;
        state.complete(false);
        return json(res, 204);
      }
      json(res, 500, { message: 'Unexpected fixture route' });
    } catch (e) {
      json(res, 500, { message: String(e) });
    }
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  server.on('upgrade', (req, socket) => {
    requests.push({ method: req.method, path: req.url, headers: req.headers });
    state.attachment = socket;
    if (hooks.attach) return hooks.attach({ req, socket, state });
    socket.write(
      'HTTP/1.1 101 UPGRADED\r\nConnection: Upgrade\r\nUpgrade: tcp\r\nContent-Type: application/vnd.docker.multiplexed-stream\r\n\r\n',
    );
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(socketPath, resolve);
  });
  f.cleanup.push(async () => {
    for (const s of sockets) s.destroy();
    await new Promise((r) => server.close(r));
  });
  return { ...f, socketPath, requests, state };
}
async function runner(t, fixture, owner = {}, budgets = {}) {
  assert.equal(typeof engineModule.EngineIsolation, 'function', 'Engine isolation is not implemented');
  const jobs = await processModule.ProcessService.create(fixture.root, { allowExec: true, budgets });
  const service = new engineModule.EngineIsolation(
    policyModule.parseIsolationPolicy({ socketPath: fixture.socketPath, imageId, ...owner }),
    jobs,
  );
  fixture.cleanup.push(async () => {
    fixture.state.rejectDelete = false;
    await service.close().catch(() => {});
    const location = service.status().journalDirectory;
    if (location) {
      assert.match(path.basename(location), /^mterm-isolation-/);
      await fs.rm(location, { recursive: true, force: true });
    }
    await jobs.close();
  });
  return { service, jobs };
}

test('isolation owner policy is strict, immutable, local-only and cannot grant arbitrary Docker fields', () => {
  assert.equal(typeof policyModule.parseIsolationPolicy, 'function');
  const input = { socketPath: '/var/run/docker.sock', imageId, maxJobs: 1 };
  const parsed = policyModule.parseIsolationPolicy(input);
  input.maxJobs = 2;
  assert.ok(Object.isFrozen(parsed));
  assert.equal(parsed.maxJobs, 1);
  for (const extra of [
    { socketPath: 'tcp://localhost:2375' },
    { socketPath: '//remote/docker.sock' },
    { socketPath: 'relative.sock' },
    { socketPath: '/tmp/../docker.sock' },
    { imageId: 'node:latest' },
    { imageId: 'sha256:' + 'F'.repeat(64) },
    { privileged: true },
    { binds: ['/'] },
    { env: {} },
    { maxJobs: 3 },
    { cpuMillis: 1001 },
    { memoryMiB: 257 },
    { pidsLimit: 65 },
    { tmpfsMiB: 65 },
    { maxRuntimeMs: 30001 },
    { maxOutputBytes: 131073 },
  ])
    assert.throws(() => policyModule.parseIsolationPolicy({ ...input, ...extra }));
});
test('isolation startup requires its independent grant and managed setup cannot silently drop it', async (t) => {
  const f = await directory(t),
    selected = JSON.stringify({ socketPath: '/var/run/docker.sock', imageId });
  const opts = parseHost([
    '--stdio',
    '--root',
    f.root,
    '--allow-isolated-exec',
    '--isolation-policy',
    selected,
  ]);
  assert.equal(opts.allowExec, false);
  assert.equal(opts.allowIsolatedExec, true);
  assert.equal(opts.isolationPolicy.imageId, imageId);
  assert.throws(() => parseHost(['--stdio', '--root', f.root, '--allow-isolated-exec']));
  for (const bad of ['null', '[]', '{bad', ' '.repeat(2049)])
    assert.throws(() => parseHost(['--stdio', '--root', f.root, '--isolation-policy', bad]));
  const home = path.join(f.root, 'synthetic-home');
  await fs.mkdir(home);
  const args = ['--root', f.root, '--allow-isolated-exec', '--isolation-policy', selected];
  const report = JSON.parse((await exec(process.execPath, [entry, 'tools', ...args])).stdout);
  assert.equal(report.executionEnabled, false);
  assert.equal(report.isolation.enabled, true);
  await assert.rejects(
    exec(process.execPath, [entry, 'setup', 'codex', ...args, '--apply'], {
      env: { ...process.env, CODEX_HOME: home },
    }),
    (e) => /USAGE/.test(e.stderr),
  );
  assert.deepEqual(await fs.readdir(home), []);
});
test('native isolation host qualification denies Windows, macOS, WSL and non-x64 without backend contact', () => {
  assert.equal(typeof hostModule.assertNativeIsolationHost, 'function');
  for (const host of [
    { platform: 'win32', arch: 'x64', release: '10.0' },
    { platform: 'darwin', arch: 'arm64', release: '25.0' },
    { platform: 'linux', arch: 'x64', release: '6.18-microsoft-standard-WSL2' },
    { platform: 'linux', arch: 'arm64', release: '6.8' },
  ])
    assert.throws(() => hostModule.assertNativeIsolationHost(host), code('ISOLATION_UNSUPPORTED'));
  hostModule.assertNativeIsolationHost({ platform: 'linux', arch: 'x64', release: '6.8.0' });
});
test('synthetic Engine success captures immediate stdout/stderr and removes the exact owned container', async (t) => {
  const f = await fakeEngine(t),
    { service, jobs } = await runner(t, f);
  const result = await service.run({ code: 'console.log("not executed by fixture")' });
  assert.equal(result.stdout, 'IMMEDIATE\n');
  assert.equal(result.stderr, 'ERR\n');
  assert.equal(result.exitCode, 0);
  assert.equal(result.cleanup, 'removed');
  assert.equal(f.state.starts, 1);
  assert.equal(f.state.deletes, 1);
  assert.equal(jobs.resourceStatus().usage.activeJobs, 0);
  const paths = f.requests.map((x) => x.path);
  assert.ok(paths.findIndex((p) => p.includes('/attach')) < paths.findIndex((p) => p.endsWith('/start')));
  assert.ok(f.requests.every((x) => !x.headers['x-registry-auth'] && !x.path.includes('/images/create')));
});
test('synthetic Engine creation has no host mounts, inherited env, logs, shell interpolation or privilege expansion', async (t) => {
  const f = await fakeEngine(t),
    { service } = await runner(t, f);
  await service.run({ code: '"$(touch /sentinel)"' });
  const b = f.state.body,
    h = b.HostConfig;
  assert.deepEqual(b.Entrypoint, ['/usr/local/bin/node']);
  assert.deepEqual(b.Cmd, ['--input-type=module', '-e', '"$(touch /sentinel)"']);
  assert.equal(b.User, '65534:65534');
  assert.equal(b.WorkingDir, '/work');
  assert.equal(b.Tty, false);
  assert.deepEqual(b.Healthcheck, { Test: ['NONE'] });
  assert.ok(b.Env.includes('IMAGE_SECRET'));
  assert.ok(b.Env.includes('NODE_OPTIONS'));
  assert.ok(b.Env.every((e) => !e.includes('do-not-inherit') && !e.includes('/bad.js')));
  assert.equal(h.NetworkMode, 'none');
  assert.equal(h.ReadonlyRootfs, true);
  assert.equal(h.Privileged, false);
  assert.deepEqual(h.CapDrop, ['ALL']);
  assert.ok(h.SecurityOpt.includes('no-new-privileges:true'));
  assert.equal(h.LogConfig.Type, 'none');
  assert.equal(h.RestartPolicy.Name, 'no');
  assert.equal(h.PidsLimit, 32);
  assert.equal(h.Memory, h.MemorySwap);
  assert.equal(h.CgroupnsMode, 'private');
  assert.equal(h.IpcMode, 'none');
  assert.equal(h.CpuPeriod, 100000);
  assert.equal(h.CpuQuota, 50000);
  assert.equal(h.Runtime, 'runc');
  assert.deepEqual(h.Binds ?? [], []);
  assert.deepEqual(h.Devices ?? [], []);
  assert.deepEqual(h.Mounts ?? [], []);
  assert.match(h.Tmpfs['/work'], /noexec/);
  assert.match(h.Tmpfs['/work'], /nosuid/);
  assert.match(h.Tmpfs['/work'], /nodev/);
});
test('synthetic Engine request cannot select image, endpoint, mounts, environment or exceed owner ceilings', async (t) => {
  const f = await fakeEngine(t),
    { service } = await runner(t, f, { maxRuntimeMs: 500, maxOutputBytes: 2048 });
  for (const extra of [
    { imageId },
    { socketPath: '/other' },
    { args: [] },
    { env: {} },
    { mounts: [] },
    { timeoutMs: 501 },
    { maxOutputBytes: 2049 },
  ])
    await assert.rejects(service.run({ code: '0', ...extra }));
  await assert.rejects(service.run({ code: '🧪'.repeat(16385) }));
  assert.equal(f.state.created, false);
});
test('synthetic Engine rejects image volumes and stale/unqualified backends before create', async (t) => {
  for (const mutate of [
    (s) => {
      s.image.Config.Volumes = { '/data': {} };
    },
    (s) => {
      s.image.Id = 'sha256:' + '3'.repeat(64);
    },
    (s) => {
      s.info.MemoryLimit = false;
    },
    (s) => {
      s.info.SwapLimit = false;
    },
    (s) => {
      s.info.CpuCfsQuota = false;
    },
    (s) => {
      s.info.PidsLimit = false;
    },
    (s) => {
      s.info.SecurityOptions = [];
    },
    (s) => {
      s.info.CgroupVersion = '1';
    },
    (s) => {
      s.version.Version = '29.9.2';
    },
    (s) => {
      s.info.OperatingSystem = 'Docker Desktop';
    },
    (s) => {
      s.info.KernelVersion = '6.18-microsoft-standard-WSL2';
    },
  ]) {
    const f = await fakeEngine(t);
    mutate(f.state);
    const { service } = await runner(t, f);
    await assert.rejects(service.run({ code: '0' }));
    assert.equal(f.state.created, false);
  }
});
test('synthetic Engine permission and malformed/oversized JSON failures remain sanitized', async (t) => {
  for (const kind of ['permission', 'invalid', 'large']) {
    const f = await fakeEngine(t, {
      request: ({ res, u }) => {
        if (u.pathname !== '/v1.45/info') return false;
        if (kind === 'permission') {
          res.writeHead(403);
          res.end('private-daemon-secret');
        } else {
          res.writeHead(200);
          res.end(kind === 'invalid' ? '{private-daemon-secret' : 'x'.repeat(1048577));
        }
        return true;
      },
    });
    const { service } = await runner(t, f);
    await assert.rejects(service.run({ code: '0' }), (e) => !String(e).includes('private-daemon-secret'));
    assert.equal(f.state.created, false);
  }
});
test('synthetic Engine verifies effective profile and create warnings before any start', async (t) => {
  for (const mutate of [
    (d) => {
      d.HostConfig.ReadonlyRootfs = false;
    },
    (d) => {
      d.Config.User = '0';
    },
    (d) => {
      d.HostConfig.NetworkMode = 'host';
    },
    (d) => {
      d.HostConfig.CapAdd = ['SYS_ADMIN'];
    },
    (d) => {
      d.HostConfig.Memory = 0;
    },
    (d) => {
      d.HostConfig.Runtime = 'custom';
    },
    (d) => {
      d.HostConfig.Ulimits = [{ Name: 'nofile', Soft: 9999, Hard: 9999 }];
    },
    (d) => {
      d.Mounts = [{ Type: 'bind', Source: '/', Destination: '/host' }];
    },
    (d) => {
      d.Config.Env.push('UNEXPECTED=secret');
    },
  ]) {
    const f = await fakeEngine(t, {
        inspect: (d, s) => {
          if (!s.starts) mutate(d);
        },
      }),
      { service } = await runner(t, f);
    await assert.rejects(service.run({ code: '0' }));
    assert.equal(f.state.starts, 0);
    assert.equal(f.state.removed, true);
  }
  const f = await fakeEngine(t, {
      create: ({ res, json }) => json(res, 201, { Id: containerId, Warnings: ['Memory limit ignored'] }),
    }),
    { service } = await runner(t, f);
  await assert.rejects(service.run({ code: '0' }));
  assert.equal(f.state.starts, 0);
  assert.equal(f.state.removed, true);
});
test('synthetic Engine split multiplex frames and upgrade-head bytes preserve UTF-8 output', async (t) => {
  const combined = Buffer.concat([frame(1, '😀A'), frame(2, 'ßB')]);
  const f = await fakeEngine(t, {
    attach: ({ socket }) => {
      socket.write(
        Buffer.concat([
          Buffer.from(
            'HTTP/1.1 101 UPGRADED\r\nConnection: Upgrade\r\nUpgrade: tcp\r\nContent-Type: application/vnd.docker.multiplexed-stream\r\n\r\n',
          ),
          combined.subarray(0, 5),
        ]),
      );
    },
    start: ({ state, res, json }) => {
      json(res, 204);
      let at = 5;
      const pump = () => {
        if (at >= combined.length) {
          state.complete(false);
          return;
        }
        state.attachment.write(combined.subarray(at, at + 1));
        at++;
        setTimeout(pump, 1);
      };
      pump();
    },
  });
  const { service } = await runner(t, f),
    result = await service.run({ code: '0' });
  assert.equal(result.stdout, '😀A');
  assert.equal(result.stderr, 'ßB');
});
test('synthetic Engine clean pre-start EOF is a denial and never starts a container', async (t) => {
  let eofObserved = false;
  const attach = httpModule.EngineApi.prototype.attach;
  t.mock.method(httpModule.EngineApi.prototype, 'attach', async function (...args) {
    const capture = await attach.apply(this, args);
    await capture.done; // Actual IPC/decoder EOF; control only the consumer scheduling interleaving.
    eofObserved = true;
    return capture;
  });
  const f = await fakeEngine(t, {
    attach: ({ socket }) =>
      socket.end(
        'HTTP/1.1 101 UPGRADED\r\nConnection: Upgrade\r\nUpgrade: tcp\r\nContent-Type: application/vnd.docker.multiplexed-stream\r\n\r\n',
      ),
  });
  const { service } = await runner(t, f);
  await assert.rejects(service.run({ code: '0' }), code('ISOLATION_STREAM_LOST'));
  assert.equal(eofObserved, true);
  assert.equal(f.state.starts, 0);
  assert.equal(f.state.removed, true);
});
test('synthetic Engine invalid upgrade-head frame is latched before container start', async (t) => {
  const f = await fakeEngine(t, {
    attach: ({ socket }) =>
      socket.write(
        Buffer.concat([
          Buffer.from(
            'HTTP/1.1 101 UPGRADED\r\nConnection: Upgrade\r\nUpgrade: tcp\r\nContent-Type: application/vnd.docker.multiplexed-stream\r\n\r\n',
          ),
          Buffer.from([9, 0, 0, 0, 0, 0, 0, 1, 65]),
        ]),
      ),
  });
  const { service } = await runner(t, f);
  await assert.rejects(service.run({ code: '0' }));
  assert.equal(f.state.starts, 0);
  assert.equal(f.state.removed, true);
});
test('synthetic Engine malformed frame, truncation and output flood fail closed and remove ownership', async (t) => {
  for (const bytes of [
    Buffer.from([9, 0, 0, 0, 0, 0, 0, 1, 65]),
    Buffer.from([1, 0, 0, 0, 255, 255, 255, 255]),
    Buffer.from([1, 0, 0]),
    frame(1, 'x'.repeat(2049)),
  ]) {
    const f = await fakeEngine(t, {
      start: ({ state, res, json }) => {
        json(res, 204);
        setTimeout(() => {
          state.attachment.end(bytes);
          state.running = false;
          for (const request of []) void request;
        }, 10);
      },
    });
    const { service, jobs } = await runner(t, f, { maxOutputBytes: 2048, maxRuntimeMs: 500 });
    await assert.rejects(service.run({ code: '0' }));
    assert.equal(f.state.removed, true);
    assert.equal(jobs.resourceStatus().usage.activeJobs, 0);
  }
});
test('synthetic Engine pre-abort and cancellation after create never start denied work', async (t) => {
  const controller = new AbortController();
  controller.abort();
  const f = await fakeEngine(t),
    { service } = await runner(t, f);
  await assert.rejects(service.run({ code: '0' }, controller.signal), code('CANCELLED'));
  assert.equal(f.requests.length, 0);
  const abort = new AbortController();
  const g = await fakeEngine(t, {
      create: ({ state, res, json }) => {
        json(res, 201, { Id: containerId, Warnings: [] });
        abort.abort();
      },
    }),
    r = await runner(t, g);
  await assert.rejects(r.service.run({ code: '0' }, abort.signal));
  assert.equal(g.state.starts, 0);
  assert.equal(g.state.removed, true);
});
test('synthetic Engine timeout and cancellation run independent confirmed cleanup', async (t) => {
  for (const cancel of [false, true]) {
    const f = await fakeEngine(t);
    f.state.hold = true;
    const { service, jobs } = await runner(t, f, { maxRuntimeMs: 500 });
    const controller = new AbortController(),
      run = service.run({ code: '0', timeoutMs: cancel ? 500 : 100 }, controller.signal);
    const rejected = assert.rejects(run, code(cancel ? 'CANCELLED' : 'ISOLATION_TIMEOUT'));
    await until(() => f.state.running, Boolean);
    if (cancel) controller.abort();
    await rejected;
    assert.equal(f.state.removed, true);
    assert.equal(jobs.resourceStatus().usage.activeJobs, 0);
  }
});
test('synthetic Engine writes bounded ownership before create without code or output', async (t) => {
  let service;
  const f = await fakeEngine(t, {
    create: async ({ state, res, json }) => {
      const status = service.status(),
        names = await fs.readdir(status.journalDirectory);
      assert.equal(names.length, 1);
      const bytes = await fs.readFile(path.join(status.journalDirectory, names[0]), 'utf8');
      assert.ok(bytes.length < 4096);
      assert.ok(!bytes.includes('PRIVATE_CODE'));
      const record = JSON.parse(bytes.trim());
      assert.equal(record.name, state.name);
      assert.equal(record.imageId, imageId);
      assert.equal(record.backendId, state.info.ID);
      assert.equal(record.nonce, state.body.Labels['io.mterm.nonce']);
      json(res, 201, { Id: containerId, Warnings: [] });
    },
  });
  ({ service } = await runner(t, f));
  await service.run({ code: '"PRIVATE_CODE"' });
  assert.deepEqual(await fs.readdir(service.status().journalDirectory), []);
});
test('ownership journal completes a real partial filesystem write before create', async (t) => {
  let service,
    short = false;
  const originalOpen = fs.open.bind(fs);
  t.mock.method(fs, 'open', async (...args) => {
    const handle = await originalOpen(...args);
    if (String(args[0]).endsWith('.jsonl')) {
      const write = handle.write.bind(handle);
      t.mock.method(handle, 'write', async (...parameters) => {
        if (short) return write(...parameters);
        short = true;
        const data = parameters[0];
        return typeof data === 'string' ? write(data.slice(0, 7)) : write(data, parameters[1] ?? 0, 7, null);
      });
    }
    return handle;
  });
  const f = await fakeEngine(t, {
    create: async ({ state, res, json }) => {
      const folder = service.status().journalDirectory,
        files = await fs.readdir(folder);
      const record = JSON.parse((await fs.readFile(path.join(folder, files[0]), 'utf8')).trim());
      assert.equal(record.name, state.name);
      json(res, 201, { Id: containerId, Warnings: [] });
    },
  });
  ({ service } = await runner(t, f));
  const result = await service.run({ code: '0' });
  assert.equal(short, true);
  assert.equal(result.cleanup, 'removed');
});
test('ownership journal refuses zero-progress writes before any container creation', async (t) => {
  const originalOpen = fs.open.bind(fs);
  t.mock.method(fs, 'open', async (...args) => {
    const handle = await originalOpen(...args);
    if (String(args[0]).endsWith('.jsonl')) t.mock.method(handle, 'write', async () => ({ bytesWritten: 0 }));
    return handle;
  });
  const f = await fakeEngine(t),
    { service, jobs } = await runner(t, f);
  await assert.rejects(service.run({ code: '0' }), code('ISOLATION_JOURNAL'));
  assert.equal(f.state.created, false);
  assert.equal(jobs.resourceStatus().usage.activeJobs, 0);
});
test('synthetic Engine lost create response is reconciled by the original name without duplicate work', async (t) => {
  const f = await fakeEngine(t, { create: ({ req }) => req.socket.destroy() }),
    { service, jobs } = await runner(t, f);
  await assert.rejects(service.run({ code: '0' }));
  assert.equal(f.state.starts, 0);
  assert.equal(f.state.removed, true);
  assert.equal(f.requests.filter((r) => r.path === '/v1.45/containers/create').length, 1);
  assert.equal(jobs.resourceStatus().usage.activeJobs, 0);
});
test('synthetic Engine ambiguous create plus immediate 404 retains quarantine and its shared lease', async (t) => {
  const f = await fakeEngine(t, {
      create: ({ req, state }) => {
        state.created = false;
        req.socket.destroy();
      },
    }),
    { service, jobs } = await runner(t, f, { maxJobs: 1 });
  await assert.rejects(service.run({ code: '0' }), code('ISOLATION_CLEANUP_UNCONFIRMED'));
  assert.equal(service.status().jobs.at(-1).state, 'quarantined');
  assert.equal(jobs.resourceStatus().usage.activeJobs, 1);
  await assert.rejects(service.run({ code: '0' }), code('ISOLATION_LIMIT'));
  assert.equal(f.requests.filter((r) => r.path === '/v1.45/containers/create').length, 1);
  f.state.created = true;
  await service.stop({ jobId: service.status().jobs.at(-1).jobId });
  assert.equal(f.state.removed, true);
  assert.equal(jobs.resourceStatus().usage.activeJobs, 0);
});
test('synthetic Engine lost start response removes only confirmed owned identity', async (t) => {
  const f = await fakeEngine(t, { start: ({ req }) => req.socket.destroy() }),
    { service, jobs } = await runner(t, f);
  await assert.rejects(service.run({ code: '0' }));
  assert.equal(f.state.starts, 1);
  assert.equal(f.state.removed, true);
  assert.equal(jobs.resourceStatus().usage.activeJobs, 0);
});
test('synthetic Engine cleanup denial quarantines accounting and recovery is explicit and owned', async (t) => {
  const f = await fakeEngine(t);
  f.state.rejectDelete = true;
  const { service, jobs } = await runner(t, f);
  await assert.rejects(service.run({ code: '0' }), code('ISOLATION_CLEANUP_UNCONFIRMED'));
  const job = service.status().jobs.at(-1);
  assert.equal(job.state, 'quarantined');
  assert.equal(jobs.resourceStatus().usage.activeJobs, 1);
  const entries = await fs.readdir(service.status().journalDirectory);
  assert.equal(entries.length, 1);
  await assert.rejects(service.stop({ jobId: containerId }));
  f.state.rejectDelete = false;
  await service.stop({ jobId: job.jobId });
  assert.equal(jobs.resourceStatus().usage.activeJobs, 0);
});
test('synthetic Engine daemon or owner-label mismatch never deletes an unrelated container', async (t) => {
  for (const mismatch of ['label', 'daemon']) {
    const f = await fakeEngine(t, {
      inspect: (d) => {
        if (mismatch === 'label') d.Config.Labels = { 'io.mterm.nonce': 'different-owner' };
      },
      start: ({ state, res, json }) => {
        if (mismatch === 'daemon') state.info.ID = 'replaced-daemon';
        json(res, 204);
        setTimeout(() => state.complete(), 10);
      },
    });
    const { service, jobs } = await runner(t, f);
    await assert.rejects(service.run({ code: '0' }), code('ISOLATION_CLEANUP_UNCONFIRMED'));
    assert.equal(f.state.deletes, 0);
    assert.equal(jobs.resourceStatus().usage.activeJobs, 1);
    // Restore the simulated identities solely to release this test's fixtures.
    f.state.info.ID = 'fixture-engine-id';
    f.state.body.Labels = { ...f.state.body.Labels };
  }
});
test('synthetic Engine replacement during cleanup absence cannot release original ownership', async (t) => {
  const f = await fakeEngine(t, {
    request: ({ u, state, res, json }) => {
      if (u.pathname === '/v1.45/info' && state.starts) state.cleanupSeen = true;
      if (u.pathname.endsWith('/json') && state.cleanupSeen) {
        state.info.ID = 'replacement-engine';
        json(res, 404, { message: 'not found on replacement' });
        return true;
      }
      return false;
    },
  });
  const { service, jobs } = await runner(t, f);
  await assert.rejects(service.run({ code: '0' }), code('ISOLATION_CLEANUP_UNCONFIRMED'));
  assert.equal(f.state.removed, false);
  assert.equal(jobs.resourceStatus().usage.activeJobs, 1);
  assert.equal(service.status().jobs.at(-1).state, 'quarantined');
});
test('isolated leases and actual native children share the owner active-job ceiling', async (t) => {
  const f = await fakeEngine(t);
  f.state.hold = true;
  const { service, jobs } = await runner(t, f, {}, { maxSessions: 1 });
  const run = service.run({ code: '0' });
  const rejected = assert.rejects(run, code('CANCELLED'));
  await until(() => f.state.running, Boolean);
  await assert.rejects(jobs.start({ command: process.execPath, args: ['-e', '0'] }), code('SESSION_LIMIT'));
  await service.stop({ jobId: service.status().jobs.at(-1).jobId });
  await rejected;
  const native = await jobs.start({ command: process.execPath, args: ['-e', 'setInterval(()=>{},1000)'] });
  await assert.rejects(service.run({ code: '0' }), code('SESSION_LIMIT'));
  await jobs.stop({ sessionId: native.sessionId });
  assert.equal(jobs.resourceStatus().usage.activeJobs, 0);
});
test('isolation status is local and bounded while active jobs retain output/runtime owner ceilings', async (t) => {
  const f = await fakeEngine(t);
  f.state.hold = true;
  const { service } = await runner(t, f, {}, { maxRuntimeMs: 1000, maxOutputBytes: 2048 });
  await assert.rejects(service.run({ code: '0', timeoutMs: 1001 }), code('BUDGET_EXCEEDED'));
  await assert.rejects(service.run({ code: '0', maxOutputBytes: 2049 }), code('BUDGET_EXCEEDED'));
  const before = f.requests.length;
  const status = service.status();
  assert.equal(f.requests.length, before);
  assert.equal(status.nativeProcessesAreSandboxed, false);
  assert.equal(status.maxQueuedJobs, 0);
  assert.equal(status.limits.maxRuntimeMs, 1000);
  assert.equal(status.limits.maxOutputBytes, 2048);
});
test('actual SDK defaults expose neither isolated nor native execution without their grants', async (t) => {
  const f = await directory(t),
    transport = new StdioClientTransport({
      command: process.execPath,
      args: [entry, 'mcp', '--stdio', '--root', f.root],
      stderr: 'pipe',
    });
  transport.stderr?.resume();
  const client = new Client({ name: 'isolation-default-fixture', version: '1' });
  f.cleanup.push(async () => {
    await client.close();
    await transport.close().catch(() => {});
  });
  await client.connect(transport);
  const names = (await client.listTools()).tools.map((x) => x.name);
  assert.ok(!names.includes('mterm_run_isolated') && !names.includes('mterm_start_process'));
  const capabilities = value(await client.callTool({ name: 'mterm_capabilities', arguments: {} }));
  assert.equal(capabilities.isolation.enabled, false);
  assert.equal(capabilities.executionMode, 'unsandboxed-os-user');
});
test('actual SDK isolated-only grant is independent and unsupported client platforms fail before daemon contact', async (t) => {
  const f = await fakeEngine(t),
    selected = JSON.stringify({ socketPath: f.socketPath, imageId });
  const flags = ['mcp', '--stdio', '--root', f.root, '--allow-isolated-exec', '--isolation-policy', selected];
  const native =
    process.platform === 'linux' && process.arch === 'x64' && !/microsoft|wsl/i.test(os.release());
  if (!native) {
    await assert.rejects(exec(process.execPath, [entry, ...flags]), (e) =>
      /ISOLATION_UNSUPPORTED/.test(e.stderr),
    );
    assert.equal(f.requests.length, 0);
    return;
  }
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [entry, ...flags],
    stderr: 'pipe',
  });
  transport.stderr?.resume();
  const client = new Client({ name: 'isolation-grant-fixture', version: '1' });
  f.cleanup.push(async () => {
    await client.close();
    await transport.close().catch(() => {});
  });
  await client.connect(transport);
  const names = (await client.listTools()).tools.map((x) => x.name);
  assert.ok(
    names.includes('mterm_run_isolated') &&
      names.includes('mterm_stop_isolated') &&
      names.includes('mterm_isolation_status'),
  );
  assert.ok(!names.includes('mterm_start_process') && !names.includes('mterm_process_input'));
  const run = value(await client.callTool({ name: 'mterm_run_isolated', arguments: { code: '0' } }));
  assert.equal(run.cleanup, 'removed');
  const limits = value(await client.callTool({ name: 'mterm_capabilities', arguments: {} }));
  assert.equal(limits.executionEnabled, false);
  assert.equal(limits.isolation.enabled, true);
});
