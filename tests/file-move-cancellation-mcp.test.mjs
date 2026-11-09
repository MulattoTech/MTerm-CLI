// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-file-cancellation (OpenAI / GPT-6 Astra Pro; self-reported)
// Modified: 2026-11-09-move-cancellation; actual native and compatible SDK moves stop before mutation.
// Instrumented real SDK stdio with owned configuration and a real destination-resolution gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const entry = path.resolve(process.env.MTERM_VERIFY_BIN ?? 'bin/mterm-cli.js');
const moduleUrl = (name) => pathToFileURL(path.resolve(path.dirname(entry), '../dist', name)).href;
const { childEnvironment } = await import(moduleUrl('processes.js'));
const value = (response) =>
  response.structuredContent ?? JSON.parse(response.content.find((part) => part.type === 'text').text);
async function waitForFile(file, json = false) {
  const end = performance.now() + 10000;
  while (performance.now() < end) {
    try {
      const contents = await fs.readFile(file, 'utf8');
      return json ? JSON.parse(contents) : contents;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Owned fixture gate timed out: ' + path.basename(file));
}

for (const [tool, compat] of [
  ['mterm_move', false],
  ['move_file', true],
]) {
  const method = 'move';
  test('actual SDK move cancellation prevents mutation through ' + tool, async (t) => {
    const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-move-cancel-sdk-')));
    const root = path.join(parent, 'root');
    const sample = path.join(root, 'sample.txt');
    const destination = path.join(root, 'moved.txt');
    const compatConfig = path.join(parent, 'compat-config.json');
    const reached = path.join(parent, 'reached');
    const release = path.join(parent, 'release');
    const report = path.join(parent, 'report.json');
    const host = path.join(parent, 'instrumented-host.mjs');
    let client, transport;
    t.after(async () => {
      await fs.writeFile(release, 'release owned fixture').catch(() => {});
      try {
        await client?.close();
      } finally {
        try {
          await transport?.close();
        } finally {
          await fs.rm(parent, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
        }
      }
    });
    await fs.mkdir(root);
    await fs.writeFile(sample, 'owned SDK cancellation fixture\n');
    // The report is atomically published after the real operation settles. Controls stay outside the tool root.
    await fs.writeFile(
      host,
      `
import fs from 'node:fs/promises';
import path from 'node:path';
import { runMcp } from ${JSON.stringify(moduleUrl('mcp.js'))};
import { FileService } from ${JSON.stringify(moduleUrl('files.js'))};
const target = ${JSON.stringify(destination)};
const reached = ${JSON.stringify(reached)}, release = ${JSON.stringify(release)}, report = ${JSON.stringify(report)};
const source = ${JSON.stringify(sample)};
const counts = { link: 0, unlink: 0 };
let armed = false, gated = false;
for (const name of Object.keys(counts)) {
  const original = fs[name].bind(fs);
  fs[name] = async (file, ...args) => {
    if (armed && path.resolve(String(file)) === source) counts[name]++;
    return original(file, ...args);
  };
}
const create = FileService.create.bind(FileService);
FileService.create = async (...args) => {
  const files = await create(...args);
  const resolve = files.policy.resolve.bind(files.policy);
  const invoke = files[${JSON.stringify(method)}].bind(files);
  files.policy.resolve = async (...values) => {
    const full = await resolve(...values);
    if (!gated && full === target) {
      gated = true;
      await fs.writeFile(reached, 'real resolution complete');
      const end = performance.now() + 15000;
      for (;;) {
        try { await fs.stat(release); break; }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
        if (performance.now() >= end) throw new Error('Owned fixture release timed out');
        await new Promise((done) => setTimeout(done, 10));
      }
      armed = true;
    }
    return full;
  };
  files[${JSON.stringify(method)}] = async (...values) => {
    try { return await invoke(...values); }
    finally {
      if (gated) {
        await fs.writeFile(report + '.tmp', JSON.stringify({ counts, signalAborted: values[1]?.aborted === true }));
        await fs.rename(report + '.tmp', report);
      }
    }
  };
  return files;
};
await runMcp({ root: ${JSON.stringify(root)}, allowWrite: true, compatDesktopCommander: ${JSON.stringify(compat)}, compatConfig: ${JSON.stringify(compatConfig)} });
`,
    );
    transport = new StdioClientTransport({
      command: process.execPath,
      args: [host],
      cwd: parent,
      env: childEnvironment(),
      stderr: 'pipe',
    });
    transport.stderr?.on('data', () => {});
    client = new Client({ name: 'mterm-move-cancellation-fixture', version: '1.0.0' });
    await client.connect(transport);
    const controller = new AbortController();
    const pending = client.callTool(
      {
        name: tool,
        arguments: {
          source: compat ? sample : 'sample.txt',
          destination: compat ? destination : 'moved.txt',
        },
      },
      { signal: controller.signal, timeout: 10000 },
    );
    // Attach before aborting so a local client rejection cannot become an unhandled promise.
    const rejected = assert.rejects(pending, /abort|cancel/i);
    await waitForFile(reached);
    controller.abort();
    await rejected;
    // The pinned stdio server processes messages in FIFO order. Ping is a causal cancellation barrier.
    await client.ping({ timeout: 5000 });
    await fs.writeFile(release, 'cancel notification processed');
    const observed = await waitForFile(report, true);
    assert.equal(
      observed.signalAborted,
      true,
      'Native service must receive the actual aborted request signal',
    );
    assert.deepEqual(observed.counts, { link: 0, unlink: 0 });
    assert.equal(await fs.readFile(sample, 'utf8'), 'owned SDK cancellation fixture\n');
    await assert.rejects(fs.lstat(destination), (error) => error.code === 'ENOENT');
    // Report publication precedes the enclosing MCP callback's audit/finally continuation.
    const auditDeadline = performance.now() + 5000;
    let completed;
    do {
      const audit = value(
        await client.callTool({ name: 'mterm_audit_list', arguments: {} }, { timeout: 5000 }),
      );
      completed = audit.events.find((event) => event.tool === tool);
      if (completed) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    } while (performance.now() < auditDeadline);
    assert.equal(completed?.outcome, 'CANCELLED');
    const status = value(await client.callTool({ name: 'mterm_capabilities', arguments: {} }));
    // Only this capabilities probe may remain in normal admission after the move settles.
    assert.equal(status.resources.work.normalActive, 1);
  });
}
