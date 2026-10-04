// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-04-local-mcp (OpenAI / GPT-6 Astra Pro; self-reported)
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn, execFile, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import { z } from 'zod';
import { RootPolicy } from './policy.js';
import { fail, ToolError } from './errors.js';
const execFileAsync = promisify(execFile);
export const processSchemas = {
  start: z.strictObject({
    command: z.string().min(1).max(4096),
    args: z.array(z.string().max(8192)).max(128).default([]),
    cwd: z.string().min(1).max(4096).default('.'),
    timeoutMs: z.number().int().min(100).max(3600000).default(300000),
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
  events: OutputEvent[];
  bytes: number;
  seq: number;
  dropped: number;
  done: Promise<void>;
  finish: () => void;
  timer?: NodeJS.Timeout;
  stopping?: Promise<void>;
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
/** Owned captured processes, not a PTY and not an OS security sandbox.
 * Windows taskkill /T is best-effort tree cleanup while its owned parent is alive;
 * race-free detached descendant containment needs a future native Job Object helper. */
export class ProcessService {
  readonly sessions = new Map<string, Session>();
  private closed = false;
  private starting = 0;
  private constructor(
    readonly policy: RootPolicy,
    readonly allowExec: boolean,
    readonly maxSessions: number,
    readonly maxOutputBytes: number,
  ) {}
  static async create(
    root: string,
    options: { allowExec?: boolean; maxSessions?: number; maxOutputBytes?: number } = {},
  ) {
    const count = options.maxSessions ?? 8,
      bytes = options.maxOutputBytes ?? 262144;
    if (
      !Number.isInteger(count) ||
      count < 1 ||
      count > 8 ||
      !Number.isInteger(bytes) ||
      bytes < 1024 ||
      bytes > 1048576
    )
      fail('INVALID_ARGUMENT', 'Invalid process limits.');
    return new ProcessService(await RootPolicy.create(root), options.allowExec === true, count, bytes);
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
    if (b.length > this.maxOutputBytes) {
      let cut = b.length - this.maxOutputBytes;
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
      while (s.bytes > this.maxOutputBytes || s.events.length > 512) {
        const e = s.events.shift()!;
        s.bytes -= Buffer.byteLength(e.text);
        s.dropped = e.seq;
      }
    }
  }
  async start(input: unknown) {
    if (this.closed) fail('HOST_CLOSED', 'Host is shutting down.');
    if (!this.allowExec) fail('EXEC_DISABLED', 'Execution requires explicit --allow-exec.');
    const a = processSchemas.start.parse(input);
    if (!path.isAbsolute(a.command) || /\x00/.test(a.command) || /\.(cmd|bat|ps1)$/i.test(a.command))
      fail(
        'INVALID_COMMAND',
        'Choose an absolute executable; scripts require an explicitly selected interpreter and argument array.',
      );
    const cwd = await this.policy.resolve(a.cwd);
    if (!(await fs.stat(cwd)).isDirectory())
      fail('NOT_DIRECTORY', 'Process cwd must be a trusted directory.');
    const command = await fs.realpath(a.command);
    if (!(await fs.stat(command)).isFile()) fail('INVALID_COMMAND', 'Executable must be a file.');
    if (this.closed) fail('HOST_CLOSED', 'Host is shutting down.');
    if ([...this.sessions.values()].filter((s) => this.active(s)).length >= this.maxSessions)
      fail('SESSION_LIMIT', 'Active process limit reached.');
    while (this.sessions.size >= 32) {
      const victim = [...this.sessions.values()].find((s) => !this.active(s));
      if (!victim) fail('SESSION_LIMIT', 'Session retention limit reached.');
      this.sessions.delete(victim.id);
    }
    const child = spawn(command, a.args, {
      cwd,
      env: childEnvironment(),
      shell: false,
      windowsHide: true,
      detached: process.platform !== 'win32',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
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
      events: [],
      bytes: 0,
      seq: 1,
      dropped: 0,
      done,
      finish,
      treeCleanup: 'not-requested',
    };
    this.sessions.set(s.id, s);
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
      finish();
    });
    child.on('error', () => {
      s.state = 'failed';
      clearTimeout(s.timer);
      finish();
    });
    await new Promise<void>((resolve, reject) => {
      child.once('spawn', () => {
        s.state = 'running';
        resolve();
      });
      child.once('error', () =>
        reject(new ToolError('SPAWN_FAILED', 'The selected executable could not be started.')),
      );
    });
    s.timer = setTimeout(() => {
      s.timedOut = true;
      void this.stop({ sessionId: s.id }).catch(() => {});
    }, a.timeoutMs);
    s.timer.unref();
    return { sessionId: s.id, pid: child.pid, command: s.command, cwd: s.cwd, state: s.state };
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
        const executable = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe');
        await execFileAsync(executable, ['/PID', String(pid), '/T', '/F'], {
          windowsHide: true,
          timeout: 4000,
          maxBuffer: 65536,
        });
        s.treeCleanup = 'requested-owned-live-tree';
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
      })),
    };
  }
  async close() {
    this.closed = true;
    const results = await Promise.allSettled(
      [...this.sessions.values()].filter((s) => this.active(s)).map((s) => this.stop({ sessionId: s.id })),
    );
    if (results.some((r) => r.status === 'rejected'))
      fail('CLEANUP_UNCONFIRMED', 'Some owned process termination could not be confirmed.');
  }
}
