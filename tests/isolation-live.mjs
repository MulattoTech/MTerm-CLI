// SPDX-License-Identifier: MIT
// Modified: 2026-11-08-aug005-lifecycle-observation; observe first terminal state and exact owned event history without replacing results.
// AI-Change: 2026-11-08-aug005-container-isolation (OpenAI / GPT-6 Astra Pro; self-reported)
// Mandatory real native-Linux qualification. This file is explicitly invoked, never auto-skipped.
import test, { after } from 'node:test';
import {
  recordScenario,
  cleanupScenario,
  observeOwnedRequests,
  readOwnedEvents,
  readOwnedFailureJournal,
  recordProbe,
} from './isolation-live-evidence.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { createHash } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
const exec = promisify(execFile);
const entry = path.resolve(process.env.MTERM_VERIFY_BIN ?? 'bin/mterm-cli.js');
const moduleUrl = (name) => pathToFileURL(path.resolve(path.dirname(entry), '../dist', name)).href;
const { createNativeIsolation } = await import(moduleUrl('isolation.js'));
const { ProcessService } = await import(moduleUrl('processes.js'));
assert.equal(
  process.env.MTERM_ISOLATION_REQUIRE_LIVE,
  '1',
  'Explicit mandatory live qualification is required',
);
assert.equal(process.platform, 'linux');
assert.equal(process.arch, 'x64');
assert.notEqual(process.getuid(), 0, 'Live product tests must run as the ordinary runner');
assert.doesNotMatch(os.release(), /microsoft|wsl|linuxkit/i);
const socketPath = '/var/run/docker.sock';
const imageId = process.env.MTERM_ISOLATION_IMAGE_ID;
assert.ok(
  [
    'sha256:280af3207172947339cc2e8c9d2efac585716fd906af49f57d6fdf0dbb829a73',
    'sha256:c0a93797ee78814ae6d32fcca2561fdbbe423149c3f5389aad32d86e9fd85bd4',
  ].includes(imageId),
  'Only the bootstrap-verified immutable image identity is permitted',
);
const dockerConfig = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../artifacts/aug005/ci-private/docker-config',
);
assert.equal(process.env.MTERM_ISOLATION_DOCKER_CONFIG, dockerConfig);
assert.deepEqual(JSON.parse(await fs.readFile(path.join(dockerConfig, 'config.json'), 'utf8')), {});
const policy = { socketPath, imageId, maxRuntimeMs: 8000 };
const destination = path.resolve(
  process.env.MTERM_ISOLATION_RECEIPT ?? 'artifacts/aug005/ci-evidence/source-live.json',
);
const receipt = {
  schemaVersion: 1,
  startedAt: new Date().toISOString(),
  finishedAt: null,
  sourceCommit: process.env.MTERM_TESTED_COMMIT ?? null,
  entry,
  fixtureSha256: createHash('sha256')
    .update(await fs.readFile(new URL(import.meta.url)))
    .digest('hex'),
  evidenceHelperSha256: createHash('sha256')
    .update(await fs.readFile(new URL('./isolation-live-evidence.mjs', import.meta.url)))
    .digest('hex'),
  node: process.version,
  kernel: os.release(),
  platform: process.platform,
  arch: process.arch,
  imageId,
  guestNode: 'v24.22.2',
  syntheticOnly: false,
  modelCalls: 0,
  fullImageRedistributionEligible: false,
  acceptedCapability: false,
  scenarios: [],
};
const value = (r) => r.structuredContent ?? JSON.parse(r.content.find((c) => c.type === 'text').text);
const call = async (client, name, args = {}) => value(await client.callTool({ name, arguments: args }));
const code = (expected) => (e) => e?.code === expected;
async function until(read, check, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const v = await read();
    if (check(v)) return v;
    await new Promise((r) => setTimeout(r, 25));
  }
  assert.fail('The expected real backend transition was not observed before its deadline');
}
async function ownedAbsent(instanceId) {
  assert.match(instanceId, /^[a-f0-9-]{36}$/);
  const result = await exec(
    '/usr/bin/docker',
    [
      '--config',
      dockerConfig,
      '--host',
      'unix://' + socketPath,
      'container',
      'ls',
      '--all',
      '--filter',
      'label=io.mterm.owner=' + instanceId,
      '--format',
      '{{.ID}}',
    ],
    { timeout: 10000, maxBuffer: 65536 },
  );
  assert.equal(result.stdout.trim(), '', 'An owned container remains after qualification');
}
function scenario(id, title, body) {
  // Eight diagnostic jobs retain their individual 8s deadline and 10s cleanup ceiling.
  const timeout = id === 'ISO-LIVE-07' ? 180000 : 60000;
  test(id + ' ' + title, { timeout }, async () => {
    const record = {
      id,
      title,
      passed: false,
      cleanupVerified: false,
      backend: null,
      observation: null,
      cleanup: { activeJobs: null, sharedActiveJobs: null, ownedAbsent: false },
    };
    receipt.scenarios.push(record);
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-live-isolation-'));
    const jobs = await ProcessService.create(root, { allowExec: false });
    let service, instanceId;
    await recordScenario(
      record,
      async (observe) => {
        service = await createNativeIsolation(policy, jobs);
        instanceId = service.status().instanceId;
        return body({ root, jobs, service, observe });
      },
      async () =>
        cleanupScenario(record, [
          [
            'capture-backend',
            async () => {
              record.backend = service?.status().backend ?? null;
            },
          ],
          [
            'close-isolation',
            async () => {
              await service?.close();
            },
          ],
          [
            'observe-capacity',
            async () => {
              if (service) {
                record.cleanup.activeJobs = service.status().activeJobs;
                record.cleanup.sharedActiveJobs = jobs.resourceStatus().usage.activeJobs;
                assert.equal(record.cleanup.activeJobs, 0);
                assert.equal(record.cleanup.sharedActiveJobs, 0);
              }
            },
          ],
          [
            'observe-owned-absence',
            async () => {
              if (service) {
                await ownedAbsent(instanceId);
                record.cleanup.ownedAbsent = true;
              }
            },
          ],
          [
            'close-process-service',
            async () => {
              await jobs.close();
            },
          ],
          [
            'remove-fixture-root',
            async () => {
              await fs.rm(root, { recursive: true, force: true });
            },
          ],
        ]),
    );
  });
}
after(async () => {
  receipt.finishedAt = new Date().toISOString();
  receipt.passed =
    receipt.scenarios.length === 12 && receipt.scenarios.every((s) => s.passed && s.cleanupVerified);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, JSON.stringify(receipt, null, 2) + '\n');
  assert.equal(
    receipt.passed,
    true,
    'Every required live scenario must run and pass; skips are not acceptance',
  );
});

scenario('ISO-LIVE-01', 'real immediate capture and fixed guest identity', async ({ service }) => {
  const r = await service.run({
    code: 'console.error("IMMEDIATE_ERR");console.log(JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,uid:process.getuid(),gid:process.getgid(),cwd:process.cwd(),env:process.env}))',
  });
  assert.equal(r.exitCode, 0);
  assert.equal(r.stderr, 'IMMEDIATE_ERR\n');
  const v = JSON.parse(r.stdout);
  assert.equal(v.node, 'v24.22.2');
  assert.equal(v.platform, 'linux');
  assert.equal(v.arch, 'x64');
  assert.equal(v.uid, 65534);
  assert.equal(v.gid, 65534);
  assert.equal(v.cwd, '/work');
  assert.ok(Object.keys(v.env).every((key) => ['PATH', 'HOME', 'TMPDIR', 'HOSTNAME'].includes(key)));
  assert.equal(v.env.PATH, '/usr/local/bin:/usr/bin:/bin');
  assert.equal(v.env.HOME, '/work');
  assert.equal(v.env.TMPDIR, '/work');
  return v;
});
scenario(
  'ISO-LIVE-02',
  'host sentinel, private paths, symlinks and read-only root remain inaccessible',
  async ({ root, service }) => {
    const sentinel = path.join(root, 'host-sentinel');
    await fs.writeFile(sentinel, 'OWNED_HOST_SENTINEL');
    const payload = `import fs from 'node:fs';const p=${JSON.stringify(sentinel)};const read=(p)=>{try{return {read:true,value:fs.readFileSync(p,'utf8')}}catch(e){return {read:false,code:e.code}}};fs.symlinkSync(p,'/work/host-link');let rootWrite;try{fs.writeFileSync('/mterm-hostile-write','bad');rootWrite=true}catch(e){rootWrite=e.code}console.log(JSON.stringify({host:read(p),link:read('/work/host-link'),proc:read('/proc/1/root'+p),socket:fs.existsSync('/var/run/docker.sock'),rootWrite}));`;
    const r = await service.run({ code: payload });
    assert.equal(r.exitCode, 0);
    const v = JSON.parse(r.stdout);
    for (const k of ['host', 'link', 'proc']) assert.equal(v[k].read, false);
    assert.equal(v.socket, false);
    assert.ok(['EROFS', 'EACCES', 'EPERM'].includes(v.rootWrite));
    assert.equal(await fs.readFile(sentinel, 'utf8'), 'OWNED_HOST_SENTINEL');
    return v;
  },
);
scenario(
  'ISO-LIVE-03',
  'shells and detached descendants stay inside the owned container',
  async ({ root, service }) => {
    const sentinel = path.join(root, 'child-sentinel');
    await fs.writeFile(sentinel, 'UNCHANGED');
    const payload = `import {spawn,spawnSync} from 'node:child_process';const child=spawnSync('/bin/sh',['-c','id -u; touch /forbidden-child-write'],{encoding:'utf8'});const detached=spawn('/bin/sleep',['20'],{detached:true,stdio:'ignore'});detached.unref();console.log(JSON.stringify({uid:child.stdout.trim(),exit:child.status,detachedPid:detached.pid}));`;
    const r = await service.run({ code: payload });
    assert.equal(r.exitCode, 0);
    const v = JSON.parse(r.stdout);
    assert.equal(v.uid, '65534');
    assert.notEqual(v.exit, 0);
    assert.ok(v.detachedPid > 0);
    assert.equal(await fs.readFile(sentinel, 'utf8'), 'UNCHANGED');
    await ownedAbsent(service.status().instanceId);
    return { ...v, containerRemovedWithDescendants: true };
  },
);
scenario('ISO-LIVE-04', 'network namespace denies host TCP, external TCP and DNS', async ({ service }) => {
  let connections = 0;
  const server = net.createServer((s) => {
    connections++;
    s.destroy();
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const port = server.address().port;
    const payload = `import net from 'node:net';import fs from 'node:fs';import {Resolver} from 'node:dns/promises';const connect=(host)=>new Promise(resolve=>{const s=net.connect({host,port:${port}});const done=v=>{s.destroy();resolve(v)};s.setTimeout(750,()=>done('TIMEOUT'));s.once('connect',()=>done('CONNECTED'));s.once('error',e=>done(e.code))});const dns=new Resolver({timeout:500,tries:1});dns.setServers(['192.0.2.1']);let lookup;try{await dns.resolve4('example.invalid');lookup='RESOLVED'}catch(e){lookup=e.code}console.log(JSON.stringify({interfaces:fs.readdirSync('/sys/class/net'),host:await connect('127.0.0.1'),external:await connect('198.51.100.1'),lookup}));`;
    const r = await service.run({ code: payload });
    assert.equal(r.exitCode, 0);
    const v = JSON.parse(r.stdout);
    assert.deepEqual(v.interfaces, ['lo']);
    assert.notEqual(v.host, 'CONNECTED');
    assert.notEqual(v.external, 'CONNECTED');
    assert.notEqual(v.lookup, 'RESOLVED');
    assert.equal(connections, 0);
    return v;
  } finally {
    await new Promise((r) => server.close(r));
  }
});
scenario(
  'ISO-LIVE-05',
  'kernel cgroups, seccomp, capabilities and privilege flags match the fixed profile',
  async ({ service }) => {
    const r = await service.run({
      code: String.raw`import fs from 'node:fs';const read=p=>fs.readFileSync(p,'utf8').trim();console.log(JSON.stringify({status:read('/proc/self/status').split('\n').filter(x=>/^(CapEff|NoNewPrivs|Seccomp):/.test(x)),memory:read('/sys/fs/cgroup/memory.max'),swap:read('/sys/fs/cgroup/memory.swap.max'),cpu:read('/sys/fs/cgroup/cpu.max'),pids:read('/sys/fs/cgroup/pids.max'),workspace:fs.statfsSync('/work',{bigint:true}).blocks.toString(),mounts:read('/proc/self/mountinfo').split('\n').filter(x=>x.includes(' /work '))}));`,
    });
    assert.equal(r.exitCode, 0);
    const v = JSON.parse(r.stdout);
    assert.ok(v.status.some((x) => /^CapEff:\s+0+$/.test(x)));
    assert.ok(v.status.some((x) => /^NoNewPrivs:\s+1$/.test(x)));
    assert.ok(v.status.some((x) => /^Seccomp:\s+2$/.test(x)));
    assert.equal(v.memory, '134217728');
    assert.equal(v.swap, '0');
    assert.equal(v.cpu, '50000 100000');
    assert.equal(v.pids, '32');
    assert.ok(
      v.mounts.length === 1 &&
        /noexec/.test(v.mounts[0]) &&
        /nosuid/.test(v.mounts[0]) &&
        /nodev/.test(v.mounts[0]),
    );
    return v;
  },
);
scenario('ISO-LIVE-06', 'actual tmpfs exhaustion is bounded and contained', async ({ service }) => {
  const r = await service.run({
    code: `import fs from 'node:fs';let bytes=0,error=null;const fd=fs.openSync('/work/fill','w');try{for(let i=0;i<64;i++){bytes+=fs.writeSync(fd,Buffer.alloc(1048576,1));}}catch(e){error=e.code}finally{fs.closeSync(fd)}console.log(JSON.stringify({bytes,error}));`,
  });
  assert.equal(r.exitCode, 0);
  const v = JSON.parse(r.stdout);
  assert.equal(v.error, 'ENOSPC');
  assert.ok(v.bytes <= 16777216 && v.bytes >= 1048576);
  return v;
});
scenario(
  'ISO-LIVE-07',
  'actual memory exhaustion is killed by the container limit',
  async ({ service, observe }) => {
    const observation = { plannedProbes: 8, probes: [] };
    observe(observation);
    // Bounded sequential diagnostic probes: any failure fails the scenario; no retry-to-pass.
    for (let index = 0; index < observation.plannedProbes; index++) {
      const observer = observeOwnedRequests(service.api, service.status().instanceId);
      const since = new Date().toISOString();
      const probe = {
        probe: index + 1,
        lifecycle: observer.record,
        eventHistory: null,
        failureJournal: null,
      };
      observation.probes.push(probe);
      const r = await recordProbe(
        probe,
        async () => {
          const value = await service.run({
            code: 'const retained=[];for(;;)retained.push(Buffer.alloc(4*1024*1024,127));',
          });
          Object.assign(probe, {
            exitCode: value.exitCode,
            oomKilled: value.oomKilled,
            stdout: value.stdout,
            stderr: value.stderr,
            outputBytes: value.outputBytes,
            cleanup: value.cleanup,
            backend: value.backend,
          });
          return value;
        },
        async (value) => {
          observer.restore();
          // Collection follows the original result and confirmed product cleanup. It cannot replace them.
          const until = new Date().toISOString(),
            containerId = observer.record.containerId;
          if (containerId) {
            const window = { containerId, since, until };
            probe.eventHistory = await readOwnedEvents(exec, { ...window, dockerConfig, socketPath });
            if (value?.oomKilled !== true) probe.failureJournal = await readOwnedFailureJournal(exec, window);
          }
        },
      );
      assert.notEqual(r.exitCode, 0);
      assert.equal(r.oomKilled, true);
      assert.equal(
        probe.diagnosticFailure,
        null,
        'Diagnostic collection failed; original outcome remains above',
      );
      assert.match(observer.record.containerId, /^[a-f0-9]{64}$/);
      assert.equal(observer.record.dropped, 0);
      const terminal = observer.record.requests.filter(
        (row) => row.kind === 'inspect' && row.state?.Status?.value === 'exited',
      );
      assert.ok(terminal.length >= 2, 'Retain both original terminal and cleanup inspections');
      assert.deepEqual(terminal[0].state.OOMKilled, { present: true, type: 'boolean', value: true });
      assert.equal(probe.eventHistory.status, 'available', 'Owned event history must be retained');
    }
    return observation;
  },
);
scenario(
  'ISO-LIVE-08',
  'actual child-process ceiling refuses additional descendants',
  async ({ service }) => {
    const r = await service.run({
      code: `import {spawn} from 'node:child_process';const children=[];let error=null;for(let i=0;i<64;i++){const child=spawn('/bin/sleep',['20'],{stdio:'ignore'});const result=await new Promise(resolve=>{child.once('spawn',()=>resolve('spawned'));child.once('error',e=>resolve(e.code))});if(result!=='spawned'){error=result;break}children.push(child)}for(const c of children)c.kill('SIGKILL');console.log(JSON.stringify({count:children.length,error}));`,
    });
    assert.equal(r.exitCode, 0);
    const v = JSON.parse(r.stdout);
    assert.equal(v.error, 'EAGAIN');
    assert.ok(v.count > 0 && v.count < 32);
    return v;
  },
);
scenario('ISO-LIVE-09', 'actual CPU quota throttles a bounded busy loop', async ({ service }) => {
  const r = await service.run({
    code: String.raw`import fs from 'node:fs';const stats=()=>Object.fromEntries(fs.readFileSync('/sys/fs/cgroup/cpu.stat','utf8').trim().split('\n').map(x=>x.split(' ')).map(([k,v])=>[k,Number(v)]));const before=stats(),began=performance.now(),cpu=process.cpuUsage();while(performance.now()-began<1800){}const used=process.cpuUsage(cpu),wallMs=performance.now()-began,after=stats();console.log(JSON.stringify({wallMs,cpuMs:(used.user+used.system)/1000,throttled:after.nr_throttled-before.nr_throttled}));`,
  });
  assert.equal(r.exitCode, 0);
  const v = JSON.parse(r.stdout);
  assert.ok(v.throttled > 0);
  assert.ok(v.cpuMs <= v.wallMs * 0.85 + 100);
  return v;
});
scenario(
  'ISO-LIVE-10',
  'real timeout, output overflow and owned stop confirm removal',
  async ({ service }) => {
    const timed = service.run({ code: 'setInterval(()=>{},1000)', timeoutMs: 3000 });
    const timeoutResult = assert.rejects(timed, code('ISOLATION_TIMEOUT'));
    await until(
      () => service.status(),
      (s) => s.jobs.some((j) => j.state === 'running'),
      2500,
    );
    await timeoutResult;
    await assert.rejects(
      service.run({ code: 'process.stdout.write("x".repeat(100000))', maxOutputBytes: 2048 }),
      code('ISOLATION_OUTPUT_LIMIT'),
    );
    const pending = service.run({ code: 'setInterval(()=>{},1000)' });
    const rejected = assert.rejects(pending, code('CANCELLED'));
    const running = await until(
      () => service.status(),
      (s) => s.jobs.some((j) => j.state === 'running'),
    );
    await service.stop({ jobId: running.jobs.find((j) => j.state === 'running').jobId });
    await rejected;
    await ownedAbsent(service.status().instanceId);
    return { timeout: true, outputLimit: true, stop: true };
  },
);
scenario(
  'ISO-LIVE-11',
  'real local IPC permissions deny access without a container',
  async ({ root, jobs }) => {
    const selected = path.join(root, 'denied.sock'),
      server = net.createServer();
    let connections = 0;
    server.on('connection', (s) => {
      connections++;
      s.destroy();
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(selected, resolve);
    });
    let denied;
    try {
      await fs.chmod(selected, 0o000);
      denied = await createNativeIsolation({ ...policy, socketPath: selected }, jobs);
      await assert.rejects(denied.run({ code: '0' }), code('ISOLATION_PERMISSION_DENIED'));
      assert.equal(connections, 0);
      return { permissionDenied: true, connections };
    } finally {
      await denied?.close();
      await fs.chmod(selected, 0o600);
      await new Promise((r) => server.close(r));
    }
  },
);
scenario(
  'ISO-LIVE-12',
  'actual SDK isolated-only grant and cancellation preserve native denial and cleanup controls',
  async ({ root }) => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [
        entry,
        'mcp',
        '--stdio',
        '--root',
        root,
        '--allow-isolated-exec',
        '--isolation-policy',
        JSON.stringify(policy),
      ],
      stderr: 'pipe',
    });
    transport.stderr?.resume();
    const client = new Client({ name: 'mterm-live-isolation-fixture', version: '1' });
    let instance;
    try {
      await client.connect(transport);
      const names = (await client.listTools()).tools.map((t) => t.name);
      assert.ok(names.includes('mterm_run_isolated') && names.includes('mterm_stop_isolated'));
      assert.ok(!names.includes('mterm_start_process') && !names.includes('mterm_process_input'));
      const first = await call(client, 'mterm_run_isolated', { code: 'console.log("SDK_CONTAINED")' });
      assert.equal(first.stdout, 'SDK_CONTAINED\n');
      assert.equal(first.cleanup, 'removed');
      const abort = new AbortController();
      const pending = client.callTool(
        { name: 'mterm_run_isolated', arguments: { code: 'setInterval(()=>{},1000)' } },
        { signal: abort.signal },
      );
      const rejected = assert.rejects(pending, /abort|cancel/i);
      await until(
        () => call(client, 'mterm_isolation_status'),
        (s) => s.jobs.some((j) => j.state === 'running'),
      );
      abort.abort();
      await rejected;
      const closed = await until(
        () => call(client, 'mterm_isolation_status'),
        (s) => s.activeJobs === 0,
      );
      instance = closed.instanceId;
      await ownedAbsent(instance);
      return {
        actualSdkRoundTrip: true,
        nativeExecutionDenied: true,
        cancellation: true,
        cleanupVerified: true,
        backend: closed.backend,
      };
    } finally {
      await client.close();
      await transport.close().catch(() => {});
      if (instance) await ownedAbsent(instance);
    }
  },
);
