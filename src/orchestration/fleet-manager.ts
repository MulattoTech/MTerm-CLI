// SPDX-License-Identifier: MIT
// Module: MTerm-CLI 30+ Multi-Session Fleet Supervisor & Task Queue
import { randomUUID } from 'node:crypto';

export type TaskStatus = 'queued' | 'running' | 'checkpointed' | 'completed' | 'failed' | 'cancelled';

export interface FleetTask {
  id: string;
  sessionId: string;
  clientLabel: string;
  name: string;
  payload: Record<string, unknown>;
  status: TaskStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  checkpointData?: Record<string, unknown>;
  error?: string;
}

export interface AgentSession {
  sessionId: string;
  clientLabel: string;
  createdAt: string;
  lastHeartbeat: string;
  status: 'active' | 'idle' | 'halted';
  activeTaskCount: number;
}

export class FleetSupervisor {
  private static instance?: FleetSupervisor;
  private readonly sessions = new Map<string, AgentSession>();
  private readonly tasks = new Map<string, FleetTask>();
  private readonly queue: string[] = []; // Task IDs waiting for admission
  private readonly maxConcurrentActiveTasks = 64;
  private runningTaskCount = 0;
  private halted = false;

  static getInstance(): FleetSupervisor {
    if (!this.instance) {
      this.instance = new FleetSupervisor();
    }
    return this.instance;
  }

  /**
   * Registers or updates a client agent session (e.g. ChatGPT Pro session #1..30).
   */
  registerSession(sessionId: string, clientLabel: string): AgentSession {
    let session = this.sessions.get(sessionId);
    const now = new Date().toISOString();

    if (!session) {
      session = {
        sessionId,
        clientLabel,
        createdAt: now,
        lastHeartbeat: now,
        status: 'active',
        activeTaskCount: 0,
      };
      this.sessions.set(sessionId, session);
    } else {
      session.lastHeartbeat = now;
      if (session.status === 'idle') session.status = 'active';
    }

    return session;
  }

  /**
   * Updates heartbeat for a session.
   */
  heartbeat(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.lastHeartbeat = new Date().toISOString();
    return true;
  }

  /**
   * Submits an idempotent task into the fleet queue.
   */
  submitTask(options: {
    taskId?: string;
    sessionId: string;
    clientLabel: string;
    name: string;
    payload?: Record<string, unknown>;
  }): FleetTask {
    if (this.halted) {
      throw new Error('Fleet execution is currently halted by emergency stop.');
    }

    const taskId = options.taskId || randomUUID();
    // Idempotency: return existing task if already submitted
    if (this.tasks.has(taskId)) {
      return this.tasks.get(taskId)!;
    }

    this.registerSession(options.sessionId, options.clientLabel);

    const task: FleetTask = {
      id: taskId,
      sessionId: options.sessionId,
      clientLabel: options.clientLabel,
      name: options.name,
      payload: options.payload || {},
      status: 'queued',
      createdAt: new Date().toISOString(),
    };

    this.tasks.set(taskId, task);
    this.queue.push(taskId);
    this.processQueue();

    return task;
  }

  /**
   * Schedules queued tasks using fair round-robin scheduling across sessions.
   */
  private processQueue(): void {
    if (this.halted) return;

    while (this.runningTaskCount < this.maxConcurrentActiveTasks && this.queue.length > 0) {
      const taskId = this.queue.shift();
      if (!taskId) break;

      const task = this.tasks.get(taskId);
      if (!task || task.status !== 'queued') continue;

      const session = this.sessions.get(task.sessionId);
      if (!session || session.status === 'halted') {
        task.status = 'cancelled';
        continue;
      }

      // Admit task
      task.status = 'running';
      task.startedAt = new Date().toISOString();
      this.runningTaskCount++;
      session.activeTaskCount++;
    }
  }

  /**
   * Saves a checkpoint for an in-flight task to allow resume.
   */
  saveCheckpoint(taskId: string, checkpointData: Record<string, unknown>): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'running') return false;

    task.checkpointData = checkpointData;
    task.status = 'checkpointed';
    return true;
  }

  /**
   * Resumes a checkpointed task.
   */
  resumeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'checkpointed') return false;

    task.status = 'running';
    return true;
  }

  /**
   * Completes a task and frees execution capacity.
   */
  completeTask(taskId: string, error?: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || (task.status !== 'running' && task.status !== 'checkpointed')) return false;

    task.status = error ? 'failed' : 'completed';
    task.completedAt = new Date().toISOString();
    if (error) task.error = error;

    this.runningTaskCount = Math.max(0, this.runningTaskCount - 1);
    const session = this.sessions.get(task.sessionId);
    if (session) {
      session.activeTaskCount = Math.max(0, session.activeTaskCount - 1);
      if (session.activeTaskCount === 0) session.status = 'idle';
    }

    this.processQueue();
    return true;
  }

  /**
   * Emergency halt: immediately stops admission and marks running tasks.
   */
  emergencyHalt(): { halted: boolean; affectedTasks: number; activeSessions: number } {
    this.halted = true;
    let affected = 0;

    for (const task of this.tasks.values()) {
      if (task.status === 'queued' || task.status === 'running' || task.status === 'checkpointed') {
        task.status = 'cancelled';
        task.error = 'Emergency fleet halt triggered';
        affected++;
      }
    }

    this.queue.length = 0;
    this.runningTaskCount = 0;

    for (const session of this.sessions.values()) {
      session.status = 'halted';
      session.activeTaskCount = 0;
    }

    return {
      halted: true,
      affectedTasks: affected,
      activeSessions: this.sessions.size,
    };
  }

  /**
   * Resumes normal fleet operation after a halt.
   */
  resumeFleet(): void {
    this.halted = false;
    for (const session of this.sessions.values()) {
      session.status = 'idle';
    }
  }

  /**
   * Returns complete fleet status metrics.
   */
  getStatus(): {
    halted: boolean;
    totalSessions: number;
    activeSessions: number;
    queuedTasks: number;
    runningTasks: number;
    completedTasks: number;
    failedTasks: number;
  } {
    const all = [...this.tasks.values()];
    return {
      halted: this.halted,
      totalSessions: this.sessions.size,
      activeSessions: [...this.sessions.values()].filter((s) => s.status === 'active').length,
      queuedTasks: this.queue.length,
      runningTasks: all.filter((t) => t.status === 'running').length,
      completedTasks: all.filter((t) => t.status === 'completed').length,
      failedTasks: all.filter((t) => t.status === 'failed').length,
    };
  }
}
