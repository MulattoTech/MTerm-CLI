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
