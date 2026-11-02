// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-05-codex-parity-foundation
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const mod = await import('../dist/codex-registration.js').catch(() => ({}));
async function fixture(t) {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-registration-'));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const root = path.join(home, 'workspace space');
  await fs.mkdir(root);
  return { home, root, config: path.join(home, 'config.toml') };
}
const table = async (plan) =>
  `[mcp_servers.${plan.name}]\ncommand = ${JSON.stringify(plan.command)}\nargs = ${JSON.stringify(plan.args)}\n`;
async function plan(root) {
  assert.equal(typeof mod.planCodexRegistration, 'function', 'registration implementation required');
  return mod.planCodexRegistration({ root, allowWrite: true, allowExec: true });
}
test('Codex setup applies once and removal preserves unrelated exact bytes', async (t) => {
  const f = await fixture(t);
  const original = '# existing comment\r\nmodel = "fixture"\r\n[mcp_servers.other]\r\ncommand = "other"\r\n';
  await fs.writeFile(f.config, original);
  const p = await plan(f.root);
  const first = await mod.applyCodexRegistration(p, { home: f.home, generateTable: table });
  assert.equal(first.applied, true);
  assert.equal(first.changed, true);
  const once = await fs.readFile(f.config, 'utf8');
  assert.ok(once.startsWith(original));
  const second = await mod.applyCodexRegistration(p, { home: f.home, generateTable: table });
  assert.equal(second.changed, false);
  assert.equal(await fs.readFile(f.config, 'utf8'), once);
  const extra = '\n[mcp_servers.added_later]\ncommand = "later"\n';
  await fs.appendFile(f.config, extra);
  const removed = await mod.removeCodexRegistration({ home: f.home, apply: true });
  assert.equal(removed.removed, true);
  assert.equal(await fs.readFile(f.config, 'utf8'), original + extra);
  assert.equal((await mod.removeCodexRegistration({ home: f.home, apply: true })).changed, false);
});
test('unowned quoted or bare MCP entries are never overwritten', async (t) => {
  const f = await fixture(t);
  const p = await plan(f.root);
  for (const header of [
    '[mcp_servers.mterm-local]',
    '[mcp_servers."mterm-local"]',
    "[mcp_servers.'mterm-local']",
    'mcp_servers = { mterm-local = { command = "user" } }',
  ]) {
    const text = header + '\n# owned by user\n';
    await fs.writeFile(f.config, text);
    await assert.rejects(
      mod.applyCodexRegistration(p, { home: f.home, generateTable: table }),
      /existing|unowned|conflict/i,
    );
    assert.equal(await fs.readFile(f.config, 'utf8'), text);
  }
});
test('modified owned block refuses removal and preserves the changed document', async (t) => {
  const f = await fixture(t);
  const p = await plan(f.root);
  await mod.applyCodexRegistration(p, { home: f.home, generateTable: table });
  const changed = (await fs.readFile(f.config, 'utf8')).replace('"mcp"', '"changed"');
  await fs.writeFile(f.config, changed);
  await assert.rejects(mod.removeCodexRegistration({ home: f.home, apply: true }), /changed|conflict/i);
  assert.equal(await fs.readFile(f.config, 'utf8'), changed);
});
test('remove preview does not write; staged generation failures leave configuration intact', async (t) => {
  const f = await fixture(t);
  const p = await plan(f.root);
  const original = 'model="fixture"\n';
  await fs.writeFile(f.config, original);
  assert.equal((await mod.removeCodexRegistration({ home: f.home, apply: false })).applied, false);
  await assert.rejects(
    mod.applyCodexRegistration(p, {
      home: f.home,
      generateTable: async () => {
        throw Error('fixture generation failure');
      },
    }),
  );
  assert.equal(await fs.readFile(f.config, 'utf8'), original);
});
test('changed privileges require deliberate removal instead of silent scope widening', async (t) => {
  const f = await fixture(t);
  const p = await plan(f.root);
  await mod.applyCodexRegistration(p, { home: f.home, generateTable: table });
  const reduced = await mod.planCodexRegistration({ root: f.root });
  await assert.rejects(
    mod.applyCodexRegistration(reduced, { home: f.home, generateTable: table }),
    /changed|conflict|remove/i,
  );
});
test('concurrent setup is serialized or fails BUSY without duplicate blocks', async (t) => {
  const f = await fixture(t);
  const p = await plan(f.root);
  const results = await Promise.allSettled([
    mod.applyCodexRegistration(p, { home: f.home, generateTable: table }),
    mod.applyCodexRegistration(p, { home: f.home, generateTable: table }),
  ]);
  assert.ok(results.some((x) => x.status === 'fulfilled'));
  const text = await fs.readFile(f.config, 'utf8');
  assert.equal((text.match(/\[mcp_servers.mterm-local\]/g) || []).length, 1);
});
test('configuration links and invalid registration names fail closed', async (t) => {
  const f = await fixture(t);
  const p = await plan(f.root);
  const target = path.join(f.home, 'other.toml');
  await fs.writeFile(target, 'sentinel');
  await fs.link(target, f.config);
  await assert.rejects(mod.applyCodexRegistration(p, { home: f.home, generateTable: table }), /link|unsafe/i);
  assert.equal(await fs.readFile(target, 'utf8'), 'sentinel');
  await assert.rejects(mod.planCodexRegistration({ root: f.root, name: 'bad.name' }));
});

// Each test awaits this scope and the file runs sequentially. Restore both globals
// before fixture cleanup; independent test files have separate Node processes.
async function withRenameFault(platform, fault, operation) {
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
  const original = fs.rename;
  Object.defineProperty(process, 'platform', { ...descriptor, value: platform });
  fs.rename = (source, target) => fault(source, target, original);
  try {
    return await operation();
  } finally {
    fs.rename = original;
    Object.defineProperty(process, 'platform', descriptor);
  }
}
async function assertNoStages(home) {
  for (const directory of [home, path.join(home, '.mterm-registration')]) {
    const names = await fs.readdir(directory);
    assert.ok(!names.some(name => name.startsWith('.mterm-stage-')), 'owned staged files are cleaned');
  }
}
test('Windows transient EPERM and EBUSY during journal replacement recover without deleting the destination', { concurrency: false }, async (t) => {
  const f = await fixture(t), p = await plan(f.root);
  const original = 'model = "preserved"\n';
  await fs.writeFile(f.config, original);
  const journal = path.join(f.home, '.mterm-registration', p.name + '.json');
  let attempts = 0;
  await withRenameFault('win32', async (source, target, rename) => {
    if (target === journal) {
      attempts++;
      const before = JSON.parse(await fs.readFile(journal, 'utf8'));
      assert.equal(before.phase, 'installing');
      if (attempts <= 2) throw Object.assign(new Error('synthetic transient lock'), { code: attempts === 1 ? 'EPERM' : 'EBUSY' });
    }
    return rename(source, target);
  }, async () => {
    assert.equal((await mod.applyCodexRegistration(p, { home: f.home, generateTable: table })).changed, true);
  });
  assert.equal(attempts, 3);
  assert.equal(JSON.parse(await fs.readFile(journal, 'utf8')).phase, 'installed');
  assert.ok((await fs.readFile(f.config, 'utf8')).startsWith(original));
  await assertNoStages(f.home);
});
test('Windows rename retry rechecks the expected snapshot and preserves an intervening external edit', { concurrency: false }, async (t) => {
  const f = await fixture(t), p = await plan(f.root);
  const original = 'model = "before"\n', external = 'model = "external owner edit"\n';
  await fs.writeFile(f.config, original);
  let attempts = 0;
  await withRenameFault('win32', async (source, target, rename) => {
    if (target === f.config) {
      attempts++;
      await fs.writeFile(f.config, external);
      throw Object.assign(new Error('synthetic transient lock'), { code: 'EPERM' });
    }
    return rename(source, target);
  }, async () => {
    await assert.rejects(mod.applyCodexRegistration(p, { home: f.home, generateTable: table }), e => e.code === 'CONFIG_CONFLICT');
  });
  assert.equal(attempts, 1, 'changed bytes prevent a second rename attempt');
  assert.equal(await fs.readFile(f.config, 'utf8'), external);
  const backups = path.join(f.home, '.mterm-registration', 'backups');
  assert.equal(await fs.readFile(path.join(backups, (await fs.readdir(backups))[0]), 'utf8'), original);
  await assertNoStages(f.home);
});
test('Windows rename retry is bounded and leaves existing bytes and backup intact after exhaustion', { concurrency: false }, async (t) => {
  const f = await fixture(t), p = await plan(f.root);
  const original = 'model = "before"\n';
  await fs.writeFile(f.config, original);
  let attempts = 0;
  await withRenameFault('win32', async (source, target, rename) => {
    if (target === f.config) {
      attempts++;
      throw Object.assign(new Error('synthetic persistent lock'), { code: 'EBUSY' });
    }
    return rename(source, target);
  }, async () => {
    await assert.rejects(mod.applyCodexRegistration(p, { home: f.home, generateTable: table }), e => e.code === 'EBUSY');
  });
  assert.equal(attempts, 5);
  assert.equal(await fs.readFile(f.config, 'utf8'), original);
  await assertNoStages(f.home);
});
test('non-Windows permission failures are not retried', { concurrency: false }, async (t) => {
  const f = await fixture(t), p = await plan(f.root);
  const original = 'model = "before"\n';
  await fs.writeFile(f.config, original);
  let attempts = 0;
  await withRenameFault('linux', async (source, target, rename) => {
    if (target === f.config) {
      attempts++;
      throw Object.assign(new Error('synthetic permission failure'), { code: 'EPERM' });
    }
    return rename(source, target);
  }, async () => {
    await assert.rejects(mod.applyCodexRegistration(p, { home: f.home, generateTable: table }), e => e.code === 'EPERM');
  });
  assert.equal(attempts, 1);
  assert.equal(await fs.readFile(f.config, 'utf8'), original);
  await assertNoStages(f.home);
});
