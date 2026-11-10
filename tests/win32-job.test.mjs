// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Win32JobSupervisor } from '../dist/native/win32-job.js';

test('Windows supervisor helper is bundled beside the compiled entry', async () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const helper = path.resolve(here, '../dist/native/job-supervisor.ps1');
  assert.equal((await fs.stat(helper)).isFile(), true);
});

test('Win32JobSupervisor initializes and cleanly terminates assigned process', async () => {
  if (process.platform !== 'win32') return;

  const supervisor = Win32JobSupervisor.getInstance();

  // Spawn a background child process that sleeps
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    windowsHide: true,
  });

  try {
    assert.ok(child.pid);

    const assigned = await supervisor.assign('test-session-1', child.pid);
    assert.equal(assigned, true);

    const terminated = await supervisor.terminate('test-session-1');
    assert.equal(terminated, true);

    // Observe an actual process close, not ChildProcess.killed (which only
    // means a signal request was sent and does not prove termination).
    const close = new Promise((resolve) => child.once('close', resolve));
    const outcome = await Promise.race([
      close.then(() => 'closed'),
      new Promise((resolve) => setTimeout(() => resolve('timeout'), 4000)),
    ]);
    assert.equal(outcome, 'closed');
  } finally {
    try {
      child.kill('SIGKILL');
    } catch {}
    await supervisor.shutdown();
  }
});

test('shutdown reaps an owned supervisor child even before its READY handshake', async () => {
  const supervisor = Win32JobSupervisor.getInstance();
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'pipe' });
  const closed = new Promise((resolve) => child.once('close', resolve));
  try {
    assert.ok(child.pid);
    supervisor.child = child;
    supervisor.ready = false;
    await supervisor.shutdown();
    const outcome = await Promise.race([
      closed.then(() => 'closed'),
      new Promise((resolve) => setTimeout(() => resolve('timeout'), 2000)),
    ]);
    assert.equal(outcome, 'closed', 'shutdown left an unready supervisor process running');
  } finally {
    child.kill('SIGKILL');
    supervisor.child = undefined;
  }
});
