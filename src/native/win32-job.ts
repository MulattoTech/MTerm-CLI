// SPDX-License-Identifier: MIT
// Module: MTerm-CLI Native Windows Job Object Supervisor Client
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcess } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Win32JobSupervisor {
  private static instance?: Win32JobSupervisor;
  private child?: ChildProcess;
  private ready = false;
  private initPromise?: Promise<void>;
  private pending = new Map<string, (response: string) => void>();
  private readonly enabled: boolean;

  private constructor() {
    this.enabled = process.platform === 'win32';
  }

  static getInstance(): Win32JobSupervisor {
    if (!this.instance) {
      this.instance = new Win32JobSupervisor();
    }
    return this.instance;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.enabled || this.ready) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      try {
        let scriptPath = path.resolve(__dirname, 'job-supervisor.ps1');
        if (!fs.existsSync(scriptPath)) {
          const srcPath = path.resolve(__dirname, '../../src/native/job-supervisor.ps1');
          if (fs.existsSync(srcPath)) {
            try {
              fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
              fs.copyFileSync(srcPath, scriptPath);
            } catch {
              scriptPath = srcPath;
            }
          }
        }

        this.child = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
          windowsHide: true,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let lineBuffer = '';

        this.child.stdout?.on('data', (data: Buffer) => {
          lineBuffer += data.toString();
          const lines = lineBuffer.split(/\r?\n/);
          lineBuffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed === 'READY') {
              this.ready = true;
              resolve();
              continue;
            }

            const parts = trimmed.split(' ');
            // Response format is "OK <ACTION> <JOB_ID>" or "ERR <ACTION> <JOB_ID>"
            const key = parts.length >= 3 ? parts[2] : parts[1];
            if (key && this.pending.has(key)) {
              const callback = this.pending.get(key)!;
              this.pending.delete(key);
              callback(trimmed);
            }
          }
        });

        this.child.on('error', (err) => {
          this.ready = false;
          reject(err);
        });

        this.child.on('exit', () => {
          this.ready = false;
        });

        // Fail-safe timeout for supervisor initialization
        setTimeout(() => {
          if (!this.ready) {
            this.ready = false;
            resolve(); // Fallback to graceful non-job supervision
          }
        }, 8000);
      } catch (err) {
        this.ready = false;
        resolve();
      }
    });

    return this.initPromise;
  }

  private sendCommand(id: string, command: string): Promise<string> {
    return new Promise((resolve) => {
      if (!this.ready || !this.child?.stdin) {
        resolve('ERR_NOT_READY');
        return;
      }

      this.pending.set(id, resolve);
      this.child.stdin.write(`${command}\n`);

      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          resolve('ERR_TIMEOUT');
        }
      }, 4000);
    });
  }

  /**
   * Assigns an active process to a dedicated Win32 Job Object.
   */
  async assign(jobId: string, pid: number): Promise<boolean> {
    if (!this.enabled) return false;
    await this.ensureInitialized();
    if (!this.ready) return false;

    const res = await this.sendCommand(jobId, `ASSIGN ${jobId} ${pid}`);
    return res.startsWith('OK ASSIGN');
  }

  /**
   * Atomically terminates all processes in the job object using kernel-level termination.
   */
  async terminate(jobId: string): Promise<boolean> {
    if (!this.enabled) return false;
    await this.ensureInitialized();
    if (!this.ready) return false;

    const res = await this.sendCommand(jobId, `TERMINATE ${jobId}`);
    return res.startsWith('OK');
  }

  /**
   * Closes the supervisor and all held job handles.
   */
  async shutdown(): Promise<void> {
    if (this.child && this.ready) {
      this.child.stdin?.write('EXIT\n');
      this.ready = false;
      this.child.kill();
    }
  }
}
