// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-08-aug005-container-isolation (OpenAI / GPT-6 Astra Pro; self-reported)
// Modified: 2026-11-08-aug005-lifecycle-observation; fail closed on unqualified cgroup-driver attribution.
// Internal Engine transport/lifecycle. Product callers use createNativeIsolation's host gate.
// Synthetic local-socket tests exercise this layer without representing a real container backend.
import fs from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { fail, ToolError, cancelled } from './errors.js';
import { parseIsolationPolicy, type IsolationPolicy } from './isolation-policy.js';
import { EngineApi, ENGINE_API, expect, reason, type AttachedOutput } from './isolation-http.js';
import type { ProcessService } from './processes.js';
export const isolationSchemas = {
  run: z.strictObject({
    code: z.string().min(1).max(65536),
    timeoutMs: z.number().int().min(100).max(30000).optional(),
    maxOutputBytes: z.number().int().min(1024).max(131072).optional(),
  }),
  job: z.strictObject({ jobId: z.string().uuid() }),
};
type Json = Record<string, any>;
type Phase = 'preparing' | 'created' | 'running' | 'removing' | 'removed' | 'failed' | 'quarantined';
type Job = {
  jobId: string;
  name: string;
  nonce: string;
  state: Phase;
  at: string;
  controller: AbortController;
  release: () => void;
  done: Promise<void>;
  finish: () => void;
  createSent: boolean;
  acknowledged: boolean;
  containerId?: string;
  backendId?: string;
  journal?: FileHandle;
  journalPath?: string;
  journalBytes: number;
  cleaning?: Promise<void>;
  failure?: string;
  journalIdentity?: { ino: number; dev: number };
};
const fixedEnv = ['PATH=/usr/local/bin:/usr/bin:/bin', 'HOME=/work', 'TMPDIR=/work'];
const array = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const empty = (v: unknown) =>
  v === undefined || v === null || (typeof v === 'object' && Object.keys(v).length === 0);
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function atLeast(value: unknown, floor: number[], major?: number) {
  if (typeof value !== 'string' || !/^v?\d+\.\d+\.\d+$/.test(value)) return false;
  const n = value.replace(/^v/, '').split('.').map(Number);
  if (major !== undefined && n[0] !== major) return false;
  for (let i = 0; i < 3; i++) {
    if (n[i]! > floor[i]!) return true;
    if (n[i]! < floor[i]!) return false;
  }
  return true;
}
function apiNumber(v: unknown) {
  return typeof v === 'string' && /^1\.[0-9]{2,3}$/.test(v) ? Number(v.slice(2)) : -1;
}
function profile(
  policy: IsolationPolicy,
  script: string,
  environment: string[],
  labels: Record<string, string>,
) {
  const memory = policy.memoryMiB * 1048576;
  return {
    Image: policy.imageId,
    Entrypoint: ['/usr/local/bin/node'],
    Cmd: ['--input-type=module', '-e', script],
    User: '65534:65534',
    WorkingDir: '/work',
    Env: environment,
    Labels: labels,
    AttachStdin: false,
    AttachStdout: true,
    AttachStderr: true,
    OpenStdin: false,
    StdinOnce: false,
    Tty: false,
    Healthcheck: { Test: ['NONE'] },
    StopSignal: 'SIGKILL',
    NetworkDisabled: true,
    HostConfig: {
      Runtime: 'runc',
      ReadonlyRootfs: true,
      Privileged: false,
      NetworkMode: 'none',
      PidMode: '',
      IpcMode: 'none',
      CgroupnsMode: 'private',
      UTSMode: '',
      Binds: [],
      Mounts: [],
      VolumesFrom: [],
      Devices: [],
      DeviceRequests: [],
      CapAdd: [],
      CapDrop: ['ALL'],
      GroupAdd: [],
      Links: [],
      ExtraHosts: [],
      PortBindings: {},
      PublishAllPorts: false,
      SecurityOpt: ['no-new-privileges:true'],
      Memory: memory,
      MemorySwap: memory,
      OomKillDisable: false,
      CpuPeriod: 100000,
      CpuQuota: policy.cpuMillis * 100,
      PidsLimit: policy.pidsLimit,
      Tmpfs: {
        '/work':
          'rw,noexec,nosuid,nodev,size=' + policy.tmpfsMiB * 1048576 + ',mode=0700,uid=65534,gid=65534',
      },
      ShmSize: 1048576,
      Init: true,
      LogConfig: { Type: 'none', Config: {} },
      RestartPolicy: { Name: 'no', MaximumRetryCount: 0 },
      AutoRemove: false,
      Ulimits: [{ Name: 'nofile', Soft: 128, Hard: 128 }],
    },
  };
}
export class EngineIsolation {
  private readonly api: EngineApi;
  readonly limits: IsolationPolicy;
  private readonly ownerId = randomUUID();
  private readonly jobs = new Map<string, Job>();
  private closed = false;
  private directory?: string;
  private directoryPending?: Promise<string>;
  private backend?: Json;
  constructor(
    policy: IsolationPolicy,
    private native: ProcessService,
  ) {
    this.limits = parseIsolationPolicy({
      ...policy,
      maxJobs: Math.min(policy.maxJobs, native.maxSessions),
      maxRuntimeMs: Math.min(policy.maxRuntimeMs, native.budgets.maxRuntimeMs),
      maxOutputBytes: Math.min(policy.maxOutputBytes, native.maxOutputBytes),
    });
    this.api = new EngineApi(this.limits.socketPath);
  }
  private active(job: Job) {
    return !['removed', 'failed'].includes(job.state);
  }
  status() {
    return {
      configured: true,
      enabled: true,
      mode: 'native-linux-docker-javascript',
      requiredCgroupDriver: 'cgroupfs',
      requiredCgroupVersion: '2',
      scope: 'host-instance',
      instanceId: this.ownerId,
      imageId: this.limits.imageId,
      limits: {
        maxJobs: this.limits.maxJobs,
        cpuMillis: this.limits.cpuMillis,
        memoryMiB: this.limits.memoryMiB,
        pidsLimit: this.limits.pidsLimit,
        tmpfsMiB: this.limits.tmpfsMiB,
        maxRuntimeMs: this.limits.maxRuntimeMs,
        maxOutputBytes: this.limits.maxOutputBytes,
      },
      activeJobs: [...this.jobs.values()].filter((j) => this.active(j)).length,
      maxQueuedJobs: 0,
      retainedJobLimit: 16,
      backend: this.backend ?? null,
      journalDirectory: this.directory ?? null,
      nativeProcessesAreSandboxed: false,
      hardWallClockAcrossHostFailure: false,
      crossHostQuota: false,
      jobs: [...this.jobs.values()].map((j) => ({
        jobId: j.jobId,
        state: j.state,
        at: j.at,
        failure: j.failure ?? null,
      })),
    };
  }
  private async preflight(signal: AbortSignal) {
    const version = expect(await this.api.request('GET', '/version', undefined, signal));
    const info = expect(await this.api.request('GET', '/info', undefined, signal));
    const components = array(version.Components) as Json[];
    const containerd = components.find((c) => c?.Name === 'containerd'),
      runc = components.find((c) => c?.Name === 'runc');
    if (
      !atLeast(version.Version, [29, 9, 3], 29) ||
      apiNumber(version.ApiVersion) < 45 ||
      apiNumber(version.MinAPIVersion) < 0 ||
      apiNumber(version.MinAPIVersion) > 45 ||
      version.Os !== 'linux' ||
      version.Arch !== 'amd64' ||
      info.OSType !== 'linux' ||
      !['x86_64', 'amd64'].includes(info.Architecture) ||
      typeof info.KernelVersion !== 'string' ||
      !info.KernelVersion ||
      /microsoft|wsl|linuxkit/i.test(info.KernelVersion) ||
      typeof info.OperatingSystem !== 'string' ||
      /docker desktop/i.test(info.OperatingSystem) ||
      info.CgroupVersion !== '2' ||
      !['MemoryLimit', 'SwapLimit', 'CpuCfsPeriod', 'CpuCfsQuota', 'PidsLimit'].every(
        (k) => info[k] === true,
      ) ||
      !array(info.SecurityOptions).includes('name=seccomp,profile=builtin') ||
      !info.Runtimes?.runc ||
      !atLeast(containerd?.Version, [2, 4, 2], 2) ||
      !atLeast(runc?.Version, [1, 5, 2], 1) ||
      typeof info.ID !== 'string' ||
      !info.ID ||
      info.ID.length > 128
    )
      fail(
        'ISOLATION_UNSUPPORTED',
        'The local Engine does not meet the native Linux isolation backend requirements.',
      );
    if (info.CgroupDriver !== 'cgroupfs')
      fail(
        'ISOLATION_UNSUPPORTED',
        'This isolation profile requires the cgroupfs driver on cgroup v2 for qualified memory-limit reporting.',
      );
    const image = expect(
      await this.api.request('GET', '/images/' + this.limits.imageId + '/json', undefined, signal),
    );
    if (
      image.Id !== this.limits.imageId ||
      image.Os !== 'linux' ||
      image.Architecture !== 'amd64' ||
      !image.Config ||
      !empty(image.Config.Volumes)
    )
      fail('ISOLATION_IMAGE_POLICY', 'The pinned local image must be Linux amd64 with no declared volumes.');
    const env = image.Config.Env ?? [];
    if (!Array.isArray(env) || env.length > 64 || Buffer.byteLength(JSON.stringify(env)) > 65536)
      fail('ISOLATION_IMAGE_POLICY', 'The image environment exceeds the inspected policy boundary.');
    const keys: string[] = [];
    for (const v of env) {
      if (typeof v !== 'string' || v.length > 8192 || v.includes('\0'))
        fail('ISOLATION_IMAGE_POLICY', 'Invalid image environment metadata.');
      const key = v.split('=', 1)[0]!;
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || keys.includes(key))
        fail('ISOLATION_IMAGE_POLICY', 'Invalid image environment key.');
      keys.push(key);
    }
    const environment = [...keys.filter((k) => !['PATH', 'HOME', 'TMPDIR'].includes(k)), ...fixedEnv];
    const bound = (v: unknown) => (typeof v === 'string' ? v.slice(0, 128) : 'unknown');
    this.backend = {
      observedAt: new Date().toISOString(),
      apiVersion: ENGINE_API,
      engineVersion: version.Version,
      engineCommit: bound(version.GitCommit),
      kernel: bound(info.KernelVersion),
      operatingSystem: bound(info.OperatingSystem),
      architecture: info.Architecture,
      cgroupVersion: info.CgroupVersion,
      cgroupDriver: info.CgroupDriver,
      seccomp: 'builtin',
      containerd: { version: containerd!.Version, commit: bound(containerd!.Details?.GitCommit) },
      runc: { version: runc!.Version, commit: bound(runc!.Details?.GitCommit) },
      imageId: image.Id,
    };
    return { backendId: info.ID as string, environment };
  }
  private labels(job: Job) {
    return { 'io.mterm.owner': this.ownerId, 'io.mterm.job': job.jobId, 'io.mterm.nonce': job.nonce };
  }
  private owned(job: Job, observed: Json) {
    const labels = observed.Config?.Labels;
    if (
      !/^[a-f0-9]{64}$/.test(observed.Id ?? '') ||
      (job.containerId && observed.Id !== job.containerId) ||
      observed.Name !== '/' + job.name ||
      observed.Image !== this.limits.imageId ||
      observed.Config?.Image !== this.limits.imageId ||
      !Object.entries(this.labels(job)).every(([key, value]) => labels?.[key] === value)
    )
      fail('ISOLATION_OWNERSHIP', "The container identity does not match this host's owned job.");
  }
  private verifyProfile(job: Job, observed: Json, selected: ReturnType<typeof profile>) {
    this.owned(job, observed);
    const c = observed.Config,
      h = observed.HostConfig,
      e = selected.HostConfig;
    if (
      !c ||
      !h ||
      observed.State?.Running !== false ||
      observed.State?.Status !== 'created' ||
      !['User', 'WorkingDir', 'Tty', 'OpenStdin', 'NetworkDisabled', 'StopSignal'].every((k) =>
        eq(c[k], (selected as Json)[k]),
      ) ||
      !eq(c.Entrypoint, selected.Entrypoint) ||
      !eq(c.Cmd, selected.Cmd) ||
      !eq(c.Healthcheck?.Test, ['NONE']) ||
      !empty(c.Volumes) ||
      // Engine inspection retains bare removal directives; the process environment applies them.
      !Array.isArray(c.Env) ||
      !eq([...c.Env].sort(), [...selected.Env].sort()) ||
      ![
        'Runtime',
        'ReadonlyRootfs',
        'Privileged',
        'NetworkMode',
        'PidMode',
        'IpcMode',
        'CgroupnsMode',
        'UTSMode',
        'Memory',
        'MemorySwap',
        'CpuPeriod',
        'CpuQuota',
        'PidsLimit',
        'ShmSize',
        'Init',
        'AutoRemove',
        'PublishAllPorts',
      ].every((k) => eq(h[k], (e as Json)[k])) ||
      !eq(h.CapDrop, ['ALL']) ||
      !eq(h.SecurityOpt, ['no-new-privileges:true']) ||
      !eq(h.Tmpfs, e.Tmpfs) ||
      h.LogConfig?.Type !== 'none' ||
      h.RestartPolicy?.Name !== 'no' ||
      h.OomKillDisable === true ||
      ![
        'Binds',
        'Mounts',
        'VolumesFrom',
        'Devices',
        'DeviceRequests',
        'CapAdd',
        'GroupAdd',
        'Links',
        'ExtraHosts',
        'PortBindings',
      ].every((k) => empty(h[k])) ||
      !Array.isArray(h.Ulimits) ||
      h.Ulimits.filter((u: any) => u?.Name === 'nofile').length !== 1 ||
      !h.Ulimits.some((u: any) => u?.Name === 'nofile' && u.Soft === 128 && u.Hard === 128) ||
      !Array.isArray(observed.Mounts) ||
      !observed.Mounts.every((m: any) => m?.Type === 'tmpfs' && m?.Destination === '/work')
    )
      fail(
        'ISOLATION_PROFILE',
        'The effective created container does not match the fixed isolation profile.',
      );
  }
  private async journal(job: Job) {
    this.directoryPending ??= fs.mkdtemp(path.join(os.tmpdir(), 'mterm-isolation-')).then(async (folder) => {
      await fs.chmod(folder, 0o700);
      this.directory = folder;
      return folder;
    });
    const directory = await this.directoryPending;
    job.journalPath = path.join(directory, job.jobId + '.jsonl');
    job.journal = await fs.open(job.journalPath, 'wx', 0o600);
    const held = await job.journal.stat();
    job.journalIdentity = { ino: held.ino, dev: held.dev };
    await this.appendJournal(job, {
      schemaVersion: 1,
      ownerId: this.ownerId,
      jobId: job.jobId,
      nonce: job.nonce,
      name: job.name,
      backendId: job.backendId,
      socketPath: this.limits.socketPath,
      imageId: this.limits.imageId,
      at: job.at,
      state: 'before-create',
    });
    if (process.platform === 'linux') {
      const parent = await fs.open(directory, 'r');
      try {
        await parent.sync();
      } finally {
        await parent.close();
      }
    }
  }
  private async appendJournal(job: Job, value: unknown) {
    const bytes = Buffer.from(JSON.stringify(value) + '\n');
    if (!job.journal || job.journalBytes + bytes.length > 8192)
      fail('ISOLATION_JOURNAL', 'The bounded owned journal could not be updated.');
    let offset = 0;
    while (offset < bytes.length) {
      if (job.controller.signal.aborted) throw reason(job.controller.signal);
      const { bytesWritten } = await job.journal.write(bytes, offset, bytes.length - offset, null);
      if (!Number.isInteger(bytesWritten) || bytesWritten <= 0 || bytesWritten > bytes.length - offset)
        fail('ISOLATION_JOURNAL', 'Owned journal write made no valid progress.');
      offset += bytesWritten;
      job.journalBytes += bytesWritten;
    }
    await job.journal.sync();
  }
  private async discardJournal(job: Job) {
    if (!job.journalPath) return;
    const held = job.journalIdentity,
      current = await fs.lstat(job.journalPath);
    if (!held) fail('ISOLATION_JOURNAL', 'Owned journal identity is unavailable.');
    if (!current.isFile() || current.isSymbolicLink() || current.ino !== held.ino || current.dev !== held.dev)
      fail('ISOLATION_JOURNAL', 'Owned journal identity changed.');
    await job.journal?.close();
    job.journal = undefined;
    await fs.unlink(job.journalPath!);
    job.journalPath = undefined;
  }
  private async clean(job: Job) {
    if (job.cleaning) return job.cleaning;
    job.cleaning = (async () => {
      if (!this.active(job)) return;
      const controller = new AbortController(),
        timer = setTimeout(
          () =>
            controller.abort(
              new ToolError(
                'ISOLATION_CLEANUP_UNCONFIRMED',
                'Owned cleanup exceeded its independent deadline.',
              ),
            ),
          10000,
        );
      try {
        if (job.createSent) {
          job.state = 'removing';
          const identity = expect(await this.api.request('GET', '/info', undefined, controller.signal));
          if (identity.ID !== job.backendId)
            fail('ISOLATION_OWNERSHIP', 'The Engine identity changed during owned cleanup.');
          const found = await this.api.request(
            'GET',
            '/containers/' + (job.containerId ?? job.name) + '/json',
            undefined,
            controller.signal,
          );
          if (found.status === 404) {
            if (!job.acknowledged || !job.containerId)
              fail(
                'ISOLATION_CLEANUP_UNCONFIRMED',
                'An unacknowledged create may still complete; ownership remains quarantined.',
              );
          } else {
            const observed = expect(found);
            this.owned(job, observed);
            job.containerId = observed.Id;
            expect(
              await this.api.request(
                'DELETE',
                '/containers/' + job.containerId + '?force=1',
                undefined,
                controller.signal,
              ),
              [204, 404],
            );
            const absent = await this.api.request(
              'GET',
              '/containers/' + job.containerId + '/json',
              undefined,
              controller.signal,
            );
            if (absent.status !== 404)
              fail('ISOLATION_CLEANUP_UNCONFIRMED', 'Owned container removal was not confirmed.');
          }
        }
        if (job.createSent) {
          const confirmed = expect(await this.api.request('GET', '/info', undefined, controller.signal));
          if (confirmed.ID !== job.backendId)
            fail('ISOLATION_OWNERSHIP', 'The Engine identity changed before removal confirmation.');
        }
        await this.discardJournal(job);
        job.state = job.createSent ? 'removed' : 'failed';
        job.release();
      } catch {
        job.state = 'quarantined';
        job.failure = 'ISOLATION_CLEANUP_UNCONFIRMED';
        fail(
          'ISOLATION_CLEANUP_UNCONFIRMED',
          'Container cleanup is unconfirmed. Its owned journal and shared capacity charge are retained; inspect isolation status and retry owned stop.',
        );
      } finally {
        clearTimeout(timer);
      }
    })().finally(() => {
      job.cleaning = undefined;
    });
    return job.cleaning;
  }
  async run(input: unknown, signal?: AbortSignal) {
    if (this.closed) fail('HOST_CLOSED', 'Host is shutting down.');
    const a = isolationSchemas.run.parse(input);
    cancelled(signal);
    if (Buffer.byteLength(a.code) > 65536 || a.code.includes('\0'))
      fail('INVALID_ARGUMENT', 'JavaScript must be bounded UTF-8 without NUL.');
    const timeoutMs = a.timeoutMs ?? this.limits.maxRuntimeMs,
      maxOutputBytes = a.maxOutputBytes ?? this.limits.maxOutputBytes;
    if (timeoutMs > this.limits.maxRuntimeMs || maxOutputBytes > this.limits.maxOutputBytes)
      fail('BUDGET_EXCEEDED', 'An isolated job exceeds its immutable owner ceiling.');
    if ([...this.jobs.values()].filter((j) => this.active(j)).length >= this.limits.maxJobs)
      fail('ISOLATION_LIMIT', 'Isolated admission is full; jobs are not queued.');
    const release = this.native.reserveIsolated();
    while (this.jobs.size >= 16) {
      const victim = [...this.jobs.values()].find((j) => !this.active(j));
      if (!victim) {
        release();
        fail('ISOLATION_LIMIT', 'Isolated retention is full.');
      }
      this.jobs.delete(victim.jobId);
    }
    let finish!: () => void;
    const done = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const job: Job = {
      jobId: randomUUID(),
      name: 'mterm-iso-' + randomUUID(),
      nonce: randomUUID(),
      state: 'preparing',
      at: new Date().toISOString(),
      controller: new AbortController(),
      release,
      done,
      finish,
      createSent: false,
      acknowledged: false,
      journalBytes: 0,
    };
    this.jobs.set(job.jobId, job);
    const abort = () => job.controller.abort(new ToolError('CANCELLED', 'Isolated execution was cancelled.'));
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    const timer = setTimeout(
      () =>
        job.controller.abort(
          new ToolError('ISOLATION_TIMEOUT', 'Isolated execution reached its host-supervised deadline.'),
        ),
      timeoutMs,
    );
    const check = () => {
      if (job.controller.signal.aborted) throw reason(job.controller.signal);
      if (this.closed) fail('HOST_CLOSED', 'Host is shutting down.');
    };
    let capture: AttachedOutput | undefined,
      result: Json | undefined,
      failure: unknown,
      startRequested = false;
    try {
      const { backendId, environment } = await this.preflight(job.controller.signal);
      check();
      job.backendId = backendId;
      await this.journal(job);
      check();
      const selected = profile(this.limits, a.code, environment, this.labels(job));
      job.createSent = true;
      const created = expect(
        await this.api.request(
          'POST',
          '/containers/create?name=' + job.name,
          selected,
          job.controller.signal,
        ),
        [201],
      );
      if (typeof created.Id !== 'string' || !/^[a-f0-9]{64}$/.test(created.Id))
        fail('ISOLATION_PROTOCOL', 'Engine did not return a complete container identity.');
      job.containerId = created.Id;
      job.acknowledged = true;
      job.state = 'created';
      await this.appendJournal(job, { state: 'created', containerId: job.containerId });
      check();
      if (!Array.isArray(created.Warnings) || created.Warnings.length)
        fail('ISOLATION_PROFILE', 'The Engine reported a create warning; execution was refused.');
      this.verifyProfile(
        job,
        expect(
          await this.api.request(
            'GET',
            '/containers/' + job.containerId + '/json',
            undefined,
            job.controller.signal,
          ),
        ),
        selected,
      );
      check();
      capture = await this.api.attach(job.containerId, job.controller.signal, maxOutputBytes);
      check();
      // The captured failure independently aborts wait/start, then cleanup uses its own controller.
      void capture.done.then(
        () => {
          if (!startRequested)
            job.controller.abort(
              new ToolError('ISOLATION_STREAM_LOST', 'Owned output ended before container start.'),
            );
        },
        (error) => job.controller.abort(error),
      );
      // A second created-state observation lets already-delivered attachment termination settle,
      // and refreshes ownership/profile immediately before the synchronous terminal/start guard.
      this.verifyProfile(
        job,
        expect(
          await this.api.request(
            'GET',
            '/containers/' + job.containerId + '/json',
            undefined,
            job.controller.signal,
          ),
        ),
        selected,
      );
      check();
      capture.assertOpen();
      startRequested = true;
      expect(
        await this.api.request(
          'POST',
          '/containers/' + job.containerId + '/start',
          undefined,
          job.controller.signal,
        ),
        [204],
      );
      job.state = 'running';
      await this.appendJournal(job, { state: 'running' });
      check();
      // Waiting after acknowledged start with not-running also covers an already exited fast job.
      const [exit] = await Promise.all([
        this.api.request(
          'POST',
          '/containers/' + job.containerId + '/wait?condition=not-running',
          undefined,
          job.controller.signal,
          timeoutMs + 3000,
        ),
        capture.done,
      ]);
      const status = expect(exit);
      check();
      const observed = expect(
        await this.api.request(
          'GET',
          '/containers/' + job.containerId + '/json',
          undefined,
          job.controller.signal,
        ),
      );
      this.owned(job, observed);
      if (
        !Number.isInteger(status.StatusCode) ||
        observed.State?.Running !== false ||
        observed.State?.Status !== 'exited' ||
        observed.State?.ExitCode !== status.StatusCode ||
        status.Error?.Message
      )
        fail('ISOLATION_PROTOCOL', 'Engine did not confirm the owned job exit.');
      result = {
        ok: true,
        jobId: job.jobId,
        mode: 'native-linux-docker-javascript',
        exitCode: status.StatusCode,
        oomKilled: observed.State.OOMKilled === true,
        stdout: capture.stdout,
        stderr: capture.stderr,
        outputBytes: capture.bytes,
        cleanup: 'removed',
        backend: this.backend,
      };
    } catch (e) {
      failure = e;
      job.failure = e instanceof ToolError ? e.code : 'ISOLATION_FAILED';
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      capture?.dispose();
      try {
        await this.clean(job);
      } catch (e) {
        failure = e;
      }
      job.finish();
    }
    if (failure) throw failure;
    return result!;
  }
  async stop(input: unknown) {
    const { jobId } = isolationSchemas.job.parse(input),
      job = this.jobs.get(jobId);
    if (!job) fail('SESSION_NOT_FOUND', 'No isolated job belongs to this host under that identifier.');
    if (this.active(job) && job.state !== 'quarantined')
      job.controller.abort(new ToolError('CANCELLED', 'Owned isolated stop was requested.'));
    await job.done;
    if (job.state === 'quarantined') await this.clean(job);
    return { jobId, state: job.state, cleanup: job.createSent ? 'removed' : 'not-created' };
  }
  async close() {
    this.closed = true;
    const results = await Promise.allSettled(
      [...this.jobs.values()].filter((j) => this.active(j)).map((j) => this.stop({ jobId: j.jobId })),
    );
    if (results.some((r) => r.status === 'rejected'))
      fail(
        'ISOLATION_CLEANUP_UNCONFIRMED',
        'Some owned containers remain unconfirmed; their journals are retained.',
      );
    if (this.directory) await fs.rmdir(this.directory).catch(() => {});
  }
}
