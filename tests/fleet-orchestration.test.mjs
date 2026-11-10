// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { FleetSupervisor } from '../dist/orchestration/fleet-manager.js';

test('FleetSupervisor coordinates 35 concurrent agent sessions with fair queueing and admission limits', async () => {
  const fleet = FleetSupervisor.getInstance();
  fleet.resumeFleet(); // Ensure clean state

  const SESSION_COUNT = 35;
  const sessions = [];

  // Register 35 simulated sessions
  for (let i = 1; i <= SESSION_COUNT; i++) {
    const s = fleet.registerSession(`session-${i}`, `ChatGPT-Web-Pro-${i}`);
    sessions.push(s);
  }

  assert.equal(sessions.length, 35);

  // Submit 70 tasks across all 35 sessions (2 tasks per session)
  const taskIds = [];
  for (let i = 1; i <= SESSION_COUNT; i++) {
    const t1 = fleet.submitTask({
      sessionId: `session-${i}`,
      clientLabel: `ChatGPT-Web-Pro-${i}`,
      name: `analyze-module-${i}`,
    });
    const t2 = fleet.submitTask({
      sessionId: `session-${i}`,
      clientLabel: `ChatGPT-Web-Pro-${i}`,
      name: `refactor-module-${i}`,
    });
    taskIds.push(t1.id, t2.id);
  }

  assert.equal(taskIds.length, 70);

  const status1 = fleet.getStatus();
  assert.equal(status1.totalSessions, 35);
  // Max running tasks is 64; remaining 6 must be queued
  assert.equal(status1.runningTasks, 64);
  assert.equal(status1.queuedTasks, 6);

  // Test idempotency: re-submitting an existing task returns the existing task record without adding to queue
  const duplicate = fleet.submitTask({
    taskId: taskIds[0],
    sessionId: 'session-1',
    clientLabel: 'ChatGPT-Web-Pro-1',
    name: 'analyze-module-1',
  });
  assert.equal(duplicate.id, taskIds[0]);
  assert.equal(fleet.getStatus().queuedTasks, 6);

  // Test Checkpointing
  const checkpointOk = fleet.saveCheckpoint(taskIds[0], { step: 3, partialDiff: '+ test' });
  assert.equal(checkpointOk, true);

  // Complete 10 running tasks
  for (let i = 0; i < 10; i++) {
    fleet.completeTask(taskIds[i]);
  }

  const status2 = fleet.getStatus();
  assert.equal(status2.completedTasks, 10);
  // Queued tasks should have been admitted
  assert.equal(status2.queuedTasks, 0);

  // Test Emergency Halt
  const haltRes = fleet.emergencyHalt();
  assert.equal(haltRes.halted, true);
  assert.ok(haltRes.affectedTasks > 0);

  const status3 = fleet.getStatus();
  assert.equal(status3.halted, true);
  assert.equal(status3.runningTasks, 0);
  assert.equal(status3.queuedTasks, 0);

  // Clean up
  fleet.resumeFleet();
});
