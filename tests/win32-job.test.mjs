// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { Win32JobSupervisor } from '../dist/native/win32-job.js';

test('Win32JobSupervisor initializes and cleanly terminates assigned process', async () => {
  if (process.platform !== 'win32') return;

  const supervisor = Win32JobSupervisor.getInstance();

  // Spawn a background child process that sleeps
  const child = spawn('node', ['-e', 'setInterval(() => {}, 1000)'], {
    windowsHide: true,
  });

  assert.ok(child.pid);

  const assigned = await supervisor.assign('test-session-1', child.pid);
  assert.equal(assigned, true);

  const terminated = await supervisor.terminate('test-session-1');
  assert.equal(terminated, true);

  // Verify process exit
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(child.killed || child.exitCode !== null, true);

  await supervisor.shutdown();
});
