// SPDX-License-Identifier: MIT
// Modified: 2026-11-08-aug012-resource-budgets; bounded admission, declared disk reservations and per-job limits.
// Modified: 2026-11-08-aug003-pack-catalog; internal final spawn guard for revocable pack calls.
// AI-Change: 2026-10-04-local-mcp (OpenAI / GPT-6 Astra Pro; self-reported)
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn, execFile, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import { z } from 'zod';
import { RootPolicy } from './policy.js';
import { fail, ToolError, cancelled } from './errors.js';
import {
  byteEstimate,
  parseProcessBudget,
  observeDisk,
  chooseDisk,
  type ProcessBudget,
  type DiskObservation,
} from './resource-budgets.js';
import { Win32JobSupervisor } from './native/win32-job.js';
const execFileAsync = promisify(execFile);
export const processSchemas = {
  start: z.strictObject({
    command: z.string().min(1).max(4096),
    args: z.array(z.string().max(8192)).max(128).default([]),
    cwd: z.string().min(1).max(4096).optional(),
    timeoutMs: z.number().int().min(100).max(3600000).optional(),
    maxOutputBytes: z.number().int().min(1024).max(1048576).optional(),
    scratchBytes: byteEstimate.optional(),
    placement: z.strictObject({ candidates: z.array(z.string().min(1).max(4096)).min(1).max(16) }).optional(),
  }),
  output: z.strictObject({
    sessionId: z.string().min(1).max(100),
    afterSeq: z.number().int().min(0).default(0),
    maxBytes: z.number().int().min(1024).max(131072).default(65536),
  }),
  input: z.strictObject({ sessionId: z.string().min(1).max(100), text: z.string().max(65536) }),
  session: z.strictObject({ sessionId: z.string().min(1).max(100) }),
};
type OutputEvent = { seq: number; stream: 'stdout' | 'stderr'; text: string };
type Session = {
  id: string;
  child: ChildProcessWithoutNullStreams;
  command: string;
  cwd: string;
  state: 'starting' | 'running' | 'exited' | 'failed';
  startedAt: string;
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  spawned: boolean;
  maxOutputBytes: number;
  timeoutMs: number;
  scratchBytes: string;
  events: OutputEvent[];
  bytes: number;
  seq: number;
  dropped: number;
  done: Promise<void>;
  finish: () => void;
  timer?: NodeJS.Timeout;
  stopping?: Promise<void>;
  jobAssignment?: Promise<boolean>;
  treeCleanup: string;
};
export function childEnvironment(): NodeJS.ProcessEnv {
  const keys = new Set([
    'systemroot',
    'windir',
    'comspec',
    'path',
    'pathext',
    'temp',
    'tmp',
    'tmpdir',
    'home',
    'userprofile',
    'appdata',
    'localappdata',
    'lang',
    'lc_all',
    'term',
  ]);
  return Object.fromEntries(
    Object.entries(process.env).filter(([key, v]) => v !== undefined && keys.has(key.toLowerCase())),
  ) as NodeJS.ProcessEnv;
}
/** Owned captured processes, not a PTY or an OS security sandbox.
 * The optional Win32 job helper attempts tree containment; if unavailable,
 * taskkill /T is best-effort and must run while the parent still exists. */
export class ProcessService {
  readonly sessions = new Map<string, Session>();
  private isolatedActive = 0;
  /** Internal shared lease: a container retains this charge until confirmed removal. */
  reserveIsolated(): () => void {
    if (this.closed) fail('HOST_CLOSED', 'Host is shutting down.');
    if (
      this.isolatedActive + [...this.sessions.values()].filter((s) => this.active(s)).length >=
      this.maxSessions
    )
      fail('SESSION_LIMIT', 'Active process limit reached.');
    this.isolatedActive++;
    let held = true;
    return () => {
      if (held) {
        held = false;
        this.isolatedActive--;
      }
    };
  }
  private executionGuard?: (command: string) => void;
  setExecutionGuard(guard: (command: string) => void) {
    this.executionGuard = guard;
  }
  private closed = false;
  private starting = 0;
  private reservedScratch = 0n;
  private diskReleaseEpoch = 0n;
  private readonly instanceId = randomUUID();
  private constructor(
    readonly policy: RootPolicy,
    readonly allowExec: boolean,
    readonly budgets: ProcessBudget,
  ) {}
  get maxSessions() {
    return this.budgets.maxSessions;
  }
  get maxOutputBytes() {
    return this.budgets.maxOutputBytes;
  }
  static async create(
    root: string | readonly string[],
    options: { allowExec?: boolean; maxSessions?: number; maxOutputBytes?: number; budgets?: unknown } = {},
  ) {
    const owner = parseProcessBudget(options.budgets);
    const legacy = parseProcessBudget({
      ...(options.maxSessions === undefined ? {} : { maxSessions: options.maxSessions }),
      ...(options.maxOutputBytes === undefined ? {} : { maxOutputBytes: options.maxOutputBytes }),
    });
    const budgets = parseProcessBudget({
      ...owner,
      maxSessions:
        options.maxSessions === undefined
          ? owner.maxSessions
          : Math.min(owner.maxSessions, legacy.maxSessions),
      maxOutputBytes:
        options.maxOutputBytes === undefined
          ? owner.maxOutputBytes
          : Math.min(owner.maxOutputBytes, legacy.maxOutputBytes),
    });
    return new ProcessService(await RootPolicy.create(root), options.allowExec === true, budgets);
  }
  private active(s: Session) {
    return s.state === 'starting' || s.state === 'running';
  }
  private get(id: string) {
    const s = this.sessions.get(id);
    if (!s) fail('SESSION_NOT_FOUND', 'No owned session matches this identifier.');
    return s;
  }
  private append(s: Session, stream: 'stdout' | 'stderr', text: string) {
    if (!text) return;
    let b = Buffer.from(text);
    if (b.length > s.maxOutputBytes) {
      let cut = b.length - s.maxOutputBytes;
      while (cut < b.length && (b[cut]! & 0xc0) === 0x80) cut++;
      b = b.subarray(cut);
      s.dropped = s.seq++;
    }
    // Events never exceed the smallest polling budget. A cursor advances only past whole events.
    let offset = 0;
    while (offset < b.length) {
      let end = Math.min(b.length, offset + 1024);
      while (end < b.length && end > offset && (b[end]! & 0xc0) === 0x80) end--;
      const part = b.subarray(offset, end);
      s.events.push({ seq: s.seq++, stream, text: part.toString('utf8') });
      s.bytes += part.length;
      offset = end;
      while (s.bytes > s.maxOutputBytes || s.events.length > 512) {
        const e = s.events.shift()!;
        s.bytes -= Buffer.byteLength(e.text);
        s.dropped = e.seq;
      }
    }
  }
  async start(input: unknown, beforeSpawn?: () => void, signal?: AbortSignal) {
    if (this.closed) fail('HOST_CLOSED', 'Host is shutting down.');
    if (!this.allowExec) fail('EXEC_DISABLED', 'Execution requires explicit --allow-exec.');
    const a = processSchemas.start.parse(input);
    if (!path.isAbsolute(a.command) || /\x00/.test(a.command) || /\.(cmd|bat|ps1)$/i.test(a.command))
      fail(
        'INVALID_COMMAND',
        'Choose an absolute executable; scripts require an explicitly selected interpreter and argument array.',
      );
    if (a.placement && a.cwd !== undefined)
      fail('INVALID_ARGUMENT', 'Choose either an explicit cwd or explicit placement candidates.');
    const disk = this.budgets.disk;
    if (!disk && (a.scratchBytes !== undefined || a.placement))
      fail('DISK_BUDGET_DISABLED', 'Scratch estimates and placement require an owner disk policy.');
    const timeoutMs = a.timeoutMs ?? Math.min(300000, this.budgets.maxRuntimeMs);
    const maxOutputBytes = a.maxOutputBytes ?? this.maxOutputBytes;
    const scratch = BigInt(a.scratchBytes ?? disk?.maxJobScratchBytes ?? '0');
    if (
      timeoutMs > this.budgets.maxRuntimeMs ||
      maxOutputBytes > this.maxOutputBytes ||
      (disk && scratch > BigInt(disk.maxJobScratchBytes))
    )
      fail('BUDGET_EXCEEDED', 'A per-job request exceeds the immutable owner ceiling.');
    const deadline = performance.now() + this.budgets.admissionTimeoutMs;
    const check = () => {
      cancelled(signal);
      if (this.closed) fail('HOST_CLOSED', 'Host is shutting down.');
      if (performance.now() >= deadline)
        fail('ADMISSION_TIMEOUT', 'Job admission exceeded its cooperative deadline.');
    };
    check();
    if (this.starting >= this.budgets.maxPendingStarts)
      fail('START_LIMIT', 'Pending start admission is full; jobs are not queued.');
    this.starting++;
    try {
      this.executionGuard?.(a.command);
      const candidates: string[] = [];
      for (const input of a.placement?.candidates ?? [a.cwd ?? '.']) {
        const candidate = await this.policy.resolve(input);
        check();
        const stat = await fs.stat(candidate);
        check();
        if (!stat.isDirectory()) fail('NOT_DIRECTORY', 'Process cwd must be a trusted directory.');
        if (!candidates.some((prior) => path.relative(prior, candidate) === '')) candidates.push(candidate);
      }
      const command = await fs.realpath(a.command);
      check();
      const executable = await fs.stat(command);
      check();
      if (!executable.isFile()) fail('INVALID_COMMAND', 'Executable must be a file.');
      const observations: DiskObservation[] = [];
      const diskEpoch = this.diskReleaseEpoch;
      if (disk) for (const candidate of candidates) observations.push(await observeDisk(candidate, check));
      let selected = disk ? chooseDisk(observations, disk, scratch, this.reservedScratch) : undefined;
      let cwd = selected?.path ?? candidates[0]!;
      // Revalidate current request scope and canonical directory after the asynchronous probe.
      cwd = await this.policy.resolve(cwd);
      check();
      if (!(await fs.stat(cwd)).isDirectory())
        fail('NOT_DIRECTORY', 'Process cwd must be a trusted directory.');
      check();
      this.executionGuard?.(command);
      this.policy.lexical(cwd);
      if (
        this.isolatedActive + [...this.sessions.values()].filter((s) => this.active(s)).length >=
        this.maxSessions
      )
        fail('SESSION_LIMIT', 'Active process limit reached.');
      if (disk) {
        selected = chooseDisk(observations, disk, scratch, this.reservedScratch);
        // Only this already revalidated directory may be used; no asynchronous re-placement.
        if (path.relative(selected.path, cwd) !== '')
          fail('DISK_HEADROOM', 'Placement changed during admission.');
      }
      while (this.sessions.size >= 32) {
        const victim = [...this.sessions.values()].find((s) => !this.active(s));
        if (!victim) fail('SESSION_LIMIT', 'Session retention limit reached.');
        this.sessions.delete(victim.id);
      }
      // No await between the final budget/pack/compatibility guards, debit, and spawn.
      beforeSpawn?.();
      check();
      if (disk && diskEpoch !== this.diskReleaseEpoch)
        fail(
          'DISK_OBSERVATION_STALE',
          'An owned job completed after disk observation; retry with a fresh admission.',
        );
      this.reservedScratch += scratch;
      let reserved = true;
      const release = () => {
        if (!reserved) return;
        reserved = false;
        this.reservedScratch -= scratch;
        // Completed jobs may leave written files behind even when their reservation is now zero.
        if (disk) this.diskReleaseEpoch++;
      };
      let child: ChildProcessWithoutNullStreams;
      try {
        child = spawn(command, a.args, {
          cwd,
          env: childEnvironment(),
          shell: false,
          windowsHide: true,
          detached: process.platform !== 'win32',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch {
        release();
        fail('SPAWN_FAILED', 'The selected executable could not be started.');
      }
      let finish!: () => void;
      const done = new Promise<void>((r) => {
        finish = r;
      });
      const s: Session = {
        id: randomUUID(),
        child,
        command: path.basename(command),
        cwd: this.policy.relative(cwd),
        state: 'starting',
        startedAt: new Date().toISOString(),
        exitCode: null,
        signal: null,
        timedOut: false,
        spawned: false,
        maxOutputBytes,
        timeoutMs,
        scratchBytes: scratch.toString(),
        events: [],
        bytes: 0,
        seq: 1,
        dropped: 0,
        done,
        finish,
        treeCleanup: 'not-requested',
      };
      this.sessions.set(s.id, s);
      if (child.pid && process.platform === 'win32') {
        // Track assignment so a racing stop never closes the parent before
        // the supervisor can contain its descendants.
        s.jobAssignment = Win32JobSupervisor.getInstance()
          .assign(s.id, child.pid)
          .catch(() => false);
      }
      const out = new StringDecoder('utf8'),
        err = new StringDecoder('utf8');
      child.stdout.on('data', (b: Buffer) => this.append(s, 'stdout', out.write(b)));
      child.stderr.on('data', (b: Buffer) => this.append(s, 'stderr', err.write(b)));
      child.stdin.on('error', () => {});
      child.on('close', (code, signal) => {
        this.append(s, 'stdout', out.end());
        this.append(s, 'stderr', err.end());
        if (s.state !== 'failed') s.state = 'exited';
        s.exitCode = code;
        s.signal = signal;
        clearTimeout(s.timer);
        release();
        finish();
      });
      child.on('error', () => {
        // A failed kill/message after spawn is not evidence that the owned child has closed.
        if (s.spawned) return;
        s.state = 'failed';
        clearTimeout(s.timer);
        release();
        finish();
      });
      await new Promise<void>((resolve, reject) => {
        const failed = () =>
          reject(new ToolError('SPAWN_FAILED', 'The selected executable could not be started.'));
        child.once('error', failed);
        child.once('spawn', () => {
          s.spawned = true;
          s.state = 'running';
          child.removeListener('error', failed);
          resolve();
        });
      });
      try {
        check();
      } catch (error) {
        await this.stop({ sessionId: s.id });
        throw error;
      }
      s.timer = setTimeout(() => {
        s.timedOut = true;
        void this.stop({ sessionId: s.id }).catch(() => {});
      }, timeoutMs);
      s.timer.unref();
      return {
        sessionId: s.id,
        pid: child.pid,
        command: s.command,
        cwd: s.cwd,
        state: s.state,
        budget: {
          timeoutMs,
          maxOutputBytes,
          scratchBytes: scratch.toString(),
          disk: selected
            ? {
                backend: 'node:fs.statfs',
                availableToUser: true,
                observedAt: selected.observedAt,
                totalBytes: selected.total.toString(),
                availableBytes: selected.available.toString(),
                requiredFreeBytes: selected.requiredFree.toString(),
                candidatesObserved: observations.length,
                reservationScope: 'host-instance-conservative-all-candidates',
              }
            : null,
        },
      };
    } finally {
      this.starting--;
    }
  }
  output(input: unknown) {
    const a = processSchemas.output.parse(input);
    const s = this.get(a.sessionId);
    const events: OutputEvent[] = [];
    let bytes = 0;
    for (const e of s.events) {
      if (e.seq <= a.afterSeq) continue;
      const size = Buffer.byteLength(e.text);
      if (bytes + size > a.maxBytes && events.length) break;
      if (size > a.maxBytes) {
        const b = Buffer.from(e.text);
        let end = a.maxBytes;
        while (end > 0 && (b[end]! & 0xc0) === 0x80) end--;
        events.push({ ...e, text: b.subarray(0, end).toString('utf8') });
        bytes += end;
        break;
      }
      events.push(e);
      bytes += size;
      if (events.length >= 128) break;
    }
    return {
      sessionId: s.id,
      running: this.active(s),
      state: s.state,
      exitCode: s.exitCode,
      signal: s.signal,
      timedOut: s.timedOut,
      retainedBytes: s.bytes,
      droppedThroughSeq: s.dropped,
      lostOutput: a.afterSeq < s.dropped,
      nextSeq: events.at(-1)?.seq ?? Math.max(a.afterSeq, s.dropped),
      events,
      treeCleanup: s.treeCleanup,
    };
  }
  async input(input: unknown) {
    const a = processSchemas.input.parse(input);
    const s = this.get(a.sessionId);
    if (!this.active(s) || s.child.stdin.destroyed) fail('SESSION_CLOSED', 'Process input is closed.');
    const bytes = Buffer.byteLength(a.text);
    if (bytes > 65536 || s.child.stdin.writableLength + bytes > 65536)
      fail('INPUT_LIMIT', 'Input buffer limit reached.');
    const writable = s.child.stdin.write(a.text);
    return {
      sessionId: s.id,
      acceptedBytes: bytes,
      queuedToStdin: true,
      processConsumed: false,
      backpressure: !writable,
    };
  }
  async stop(input: unknown) {
    const a = processSchemas.session.parse(input);
    const s = this.get(a.sessionId);
    if (this.active(s) && !s.stopping) s.stopping = this.terminate(s);
    if (s.stopping) await s.stopping;
    return { sessionId: s.id, running: this.active(s), state: s.state, treeCleanup: s.treeCleanup };
  }
  private async terminate(s: Session) {
    const pid = s.child.pid;
    if (!pid) return;
    try {
      if (s.child.exitCode !== null || s.child.signalCode !== null) {
        s.treeCleanup = 'unverified-parent-already-exited';
      } else if (process.platform === 'win32') {
        const assigned = (await s.jobAssignment) ?? false;
        const jobTerminated =
          assigned &&
          (await Win32JobSupervisor.getInstance()
            .terminate(s.id)
            .catch(() => false));
        if (jobTerminated) {
          s.treeCleanup = 'requested-owned-win32-job';
        } else {
          const executable = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe');
          try {
            await execFileAsync(executable, ['/PID', String(pid), '/T', '/F'], {
              windowsHide: true,
              timeout: 4000,
              maxBuffer: 65536,
            });
            s.treeCleanup = 'requested-owned-live-tree';
          } catch {
            s.treeCleanup = 'unverified-owned-live-tree';
          }
        }
      } else {
        process.kill(-pid, 'SIGTERM');
        s.treeCleanup = 'requested-owned-process-group';
      }
    } catch {
      s.treeCleanup = 'fallback-direct-child';
      s.child.kill('SIGTERM');
    }
    let timer: NodeJS.Timeout | undefined;
    await Promise.race([
      s.done,
      new Promise<void>((r) => {
        timer = setTimeout(r, 1000);
      }),
    ]);
    clearTimeout(timer);
    if (this.active(s)) {
      if (process.platform !== 'win32')
        try {
          process.kill(-pid, 'SIGKILL');
        } catch {}
      else s.child.kill();
      await Promise.race([
        s.done,
        new Promise<void>((r) => {
          timer = setTimeout(r, 1000);
        }),
      ]);
      clearTimeout(timer);
    }
    if (this.active(s))
      fail('STOP_UNCONFIRMED', 'Termination requested but process closure was not confirmed.');
  }
  list() {
    return {
      resources: this.resourceStatus(),
      sessions: [...this.sessions.values()].map((s) => ({
        sessionId: s.id,
        pid: s.child.pid,
        command: s.command,
        cwd: s.cwd,
        startedAt: s.startedAt,
        state: s.state,
        running: this.active(s),
        exitCode: s.exitCode,
        signal: s.signal,
        timedOut: s.timedOut,
        budget: { timeoutMs: s.timeoutMs, maxOutputBytes: s.maxOutputBytes, scratchBytes: s.scratchBytes },
      })),
    };
  }
  resourceStatus() {
    const sessions = [...this.sessions.values()];
    return {
      schemaVersion: 1,
      instanceId: this.instanceId,
      scope: 'host-instance',
      backend: { node: process.version, platform: process.platform, arch: process.arch },
      limits: this.budgets,
      maxQueuedJobs: 0,
      retainedSessionLimit: 32,
      outputEventLimit: 512,
      defaults: {
        timeoutMs: Math.min(300000, this.budgets.maxRuntimeMs),
        maxOutputBytes: this.maxOutputBytes,
        scratchBytes: this.budgets.disk?.maxJobScratchBytes ?? '0',
      },
      usage: {
        pendingStarts: this.starting,
        activeJobs: this.isolatedActive + sessions.filter((s) => this.active(s)).length,
        retainedSessions: sessions.length,
        retainedOutputBytes: sessions.reduce((n, s) => n + s.bytes, 0),
        reservedScratchBytes: this.reservedScratch.toString(),
      },
      disk: {
        enabled: !!this.budgets.disk,
        reservationScope: 'host-instance-conservative-all-candidates',
        estimateOnly: true,
        freshProbeOnStatus: false,
      },
      hardEnforcement: { cpu: false, gpu: false, ram: false, diskWrites: false, crossHost: false },
    };
  }
  async close() {
    this.closed = true;
    const results = await Promise.allSettled(
      [...this.sessions.values()].filter((s) => this.active(s)).map((s) => this.stop({ sessionId: s.id })),
    );
    if (process.platform === 'win32') {
      await Win32JobSupervisor.getInstance().shutdown();
    }
    if (results.some((r) => r.status === 'rejected'))
      fail('CLEANUP_UNCONFIRMED', 'Some owned process termination could not be confirmed.');
  }
}
