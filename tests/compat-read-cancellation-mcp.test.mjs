// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-20-compat-preflight-cancellation (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import {
  entry,
  moduleUrl,
  fixture,
  dispose,
  manifest,
  bindings,
  sampleText,
  argumentsFor,
  bounded,
  waitFile,
  publish,
} from './compat-read-cancellation-fixture.mjs';

const { childEnvironment } = await import(moduleUrl('processes.js'));
const value = (response) => response.structuredContent ?? JSON.parse(response.content[0].text);
const call = (client, name, args = {}) => client.callTool({ name, arguments: args }, { timeout: 10000 });
const cases = [
  ['metadata', 'get_file_info', 'get_file_info'],
  ['omitted-mode', 'write_file', 'write_file without mode'],
  ['edit', 'edit_block', 'edit_block'],
];
for (const [name, tool, title] of cases)
  test('actual SDK compatibility preflight cancellation: ' + title, async (t) => {
    const f = await fixture();
    let child,
      closed,
      closeResult,
      primary,
      stderrBytes = 0;
    t.after(async () => {
      if (child && !closeResult) {
        t.diagnostic(
          JSON.stringify({ retainedFixture: f.parent, reason: 'Owned child closure unconfirmed' }),
        );
        throw new Error('Retained owned fixture because child closure is unconfirmed');
      }
      await dispose(f);
    });
    const host = path.join(f.control, 'host.mjs');
    await fs.writeFile(
      host,
      'import { runObservedHost } from ' +
        JSON.stringify(new URL('./compat-read-cancellation-fixture.mjs', import.meta.url).href) +
        ';\n' +
        'await runObservedHost(JSON.parse(process.argv[2]), process.argv[3]);\n',
    );
    const before = await manifest(f);
    const client = new Client({ name: 'mterm-compat-preflight-fixture', version: '1.0.0' });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [host, JSON.stringify(f), name],
      cwd: f.cwd,
      env: {
        ...childEnvironment(),
        MTERM_VERIFY_BIN: entry,
        HOME: f.home,
        USERPROFILE: f.home,
        APPDATA: f.home,
        LOCALAPPDATA: f.home,
        XDG_CONFIG_HOME: f.config,
        XDG_CACHE_HOME: f.home,
      },
      stderr: 'pipe',
      maxBufferSize: 1048576,
    });
    const kills = [],
      processErrors = [],
      cleanupErrors = [];
    const evidence = {
      title: t.name,
      tool,
      request: argumentsFor(name, f.target),
      bindings: await bindings(),
    };
    transport.stderr.on('data', (chunk) => {
      stderrBytes += chunk.length;
    });
    const start = transport.start.bind(transport);
    transport.start = async () => {
      const started = start();
      child = transport._process; // Exact pinned SDK child, observed independently of client rejection.
      if (!child || typeof child.once !== 'function') throw new Error('Pinned SDK child unavailable');
      closed = new Promise((resolve) =>
        child.once('close', (code, signal) => {
          closeResult = { code, signal };
          resolve(closeResult);
        }),
      );
      child.on('error', (error) => processErrors.push(error.code ?? error.name));
      const kill = child.kill.bind(child);
      child.kill = (...args) => {
        kills.push(args[0] ?? 'SIGTERM');
        return kill(...args);
      };
      await started;
    };
    try {
      await bounded(client.connect(transport), 'SDK connect');
      const controller = new AbortController();
      const pending = client
        .callTool(
          { name: tool, arguments: evidence.request },
          {
            signal: controller.signal,
            timeout: 20000,
          },
        )
        .then(
          (response) => ({ status: 'fulfilled', response }),
          (error) => ({ status: 'rejected', name: error.name, code: error.code ?? null }),
        );
      evidence.reached = await waitFile(path.join(f.control, 'reached'), true);
      controller.abort();
      evidence.clientOutcome = await bounded(pending, 'Client cancellation');
      // The actual server callback's signal listener must publish this before release.
      evidence.serverAbort = await waitFile(path.join(f.control, 'aborted'), true);
      await publish(path.join(f.control, 'release'), { observedServerAbort: evidence.serverAbort });
      evidence.report = await waitFile(path.join(f.control, 'report'), true);
      const until = performance.now() + 10000;
      do {
        const audit = value(await call(client, 'mterm_audit_list'));
        evidence.audit = audit.events.find((event) => event.tool === tool);
        if (evidence.audit) break;
        await new Promise((resolve) => setTimeout(resolve, 10));
      } while (performance.now() < until);
      evidence.health = value(await call(client, 'mterm_capabilities'));
      evidence.subsequentRead = value(await call(client, 'mterm_read_file', { path: f.target }));
    } catch (error) {
      primary = error;
    }
    // Capture real child closure before feature assertions and retain all escalation attempts.
    try {
      await publish(path.join(f.control, 'release'), { cleanupRelease: true });
      if (!child || !closed) throw new Error('No observable owned child');
      child.stdin.end();
      await bounded(closed, 'Natural SDK child close');
    } catch (error) {
      cleanupErrors.push(String(error));
    } finally {
      try {
        await bounded(client.close(), 'Client cleanup', 6000);
        await bounded(transport.close(), 'Transport cleanup', 6000);
      } catch (error) {
        cleanupErrors.push(String(error));
      } finally {
        if (child && !closeResult) {
          try {
            child.kill('SIGKILL');
            await bounded(closed, 'Owned child fallback close', 5000);
          } catch (error) {
            cleanupErrors.push(String(error));
          }
        }
      }
    }
    const after = await manifest(f);
    Object.assign(evidence, {
      manifest: { before, after, unchanged: JSON.stringify(before) === JSON.stringify(after) },
      close: closeResult ?? null,
      ownedChildPid: child?.pid ?? null,
      killAttempts: kills,
      processErrors,
      stderrBytes,
      primaryError: primary ? String(primary) : null,
      cleanupErrors,
    });
    t.diagnostic(JSON.stringify(evidence));
    if (primary || cleanupErrors.length)
      throw new AggregateError(
        [...(primary ? [primary] : []), ...cleanupErrors],
        'Owned SDK observation failed',
      );
    assert.deepEqual(evidence.close, { code: 0, signal: null });
    assert.deepEqual(kills, []);
    assert.deepEqual(processErrors, []);
    assert.equal(stderrBytes, 0);
    assert.equal(evidence.manifest.unchanged, true);
    assert.equal(evidence.reached.realStat, true);
    assert.equal(evidence.serverAbort.actualServerSignalAborted, true);
    assert.equal(evidence.report.actualServerSignalAborted, true);
    assert.equal(evidence.clientOutcome.status, 'rejected');
    assert.deepEqual(evidence.report.bindings, evidence.bindings);
    assert.equal(evidence.report.modePropertyPresent, false);
    assert.equal(Object.hasOwn(evidence.request, 'mode'), false);
    const observed = evidence.report.observed;
    assert.equal(observed.successfulStats, 1);
    assert.equal(observed.opens, 1);
    assert.equal(observed.closes, 1);
    assert.deepEqual(observed.descriptors, [{ fd: -1, probe: { ok: false, code: 'EBADF' } }]);
    assert.ok(observed.events.indexOf('real-stat') < observed.events.indexOf('abort'));
    assert.ok(observed.events.indexOf('closed') < observed.events.indexOf('settled'));
    assert.deepEqual(observed.mutationAttempts, []);
    assert.equal(evidence.health.resources.work.normalActive, 1);
    assert.equal(evidence.subsequentRead.text, sampleText);
    assert.equal(observed.readsAfterAbort, 0, 'Server cancellation must prevent further body reads');
    assert.equal(observed.bytesAfterAbort, 0);
    assert.equal(observed.writeCalls, 0);
    assert.deepEqual(evidence.report.service, { ok: false, code: 'CANCELLED' });
    assert.equal(evidence.audit?.outcome, 'CANCELLED');
  });
