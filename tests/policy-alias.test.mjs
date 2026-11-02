// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-foundation-portability (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { RootPolicy, privateName } from '../dist/policy.js';

const code = (expected) => (error) => error?.code === expected;
const linkType = process.platform === 'win32' ? 'junction' : 'dir';
async function fixture(t) {
  const home = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-root-alias-')));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const real = path.join(home, 'canonical');
  const alias = path.join(home, 'selected-alias');
  await fs.mkdir(real);
  await fs.writeFile(path.join(real, 'fixture.txt'), 'authorized fixture');
  await fs.symlink(real, alias, linkType);
  return { home, real, alias };
}

test('an explicitly selected root alias resolves existing files and missing leaves canonically', async (t) => {
  const f = await fixture(t);
  const policy = await RootPolicy.create(f.alias);
  assert.equal(policy.root, f.real);
  assert.equal(await policy.resolve(path.join(f.alias, 'fixture.txt')), path.join(f.real, 'fixture.txt'));
  assert.equal(
    policy.lexical(path.join(f.alias, 'nested', 'new.txt')),
    path.join(f.real, 'nested', 'new.txt'),
  );
  assert.equal(await policy.resolve(path.join(f.alias, 'new.txt'), true), path.join(f.real, 'new.txt'));
  assert.equal(await policy.resolve('fixture.txt'), path.join(f.real, 'fixture.txt'));
});

test('each supplied alias retains its mapping even when canonical roots are deduplicated', async (t) => {
  const f = await fixture(t);
  const another = path.join(f.home, 'another-alias');
  const second = path.join(f.home, 'second-root');
  const secondAlias = path.join(f.home, 'second-alias');
  await fs.symlink(f.real, another, linkType);
  await fs.mkdir(second);
  await fs.symlink(second, secondAlias, linkType);
  const policy = await RootPolicy.create([f.alias, f.real, another, secondAlias]);
  assert.deepEqual(policy.roots, [f.real, second]);
  for (const supplied of [f.alias, another, f.real]) {
    assert.equal(await policy.resolve(path.join(supplied, 'fixture.txt')), path.join(f.real, 'fixture.txt'));
  }
  assert.equal(await policy.resolve(path.join(secondAlias, 'new.txt'), true), path.join(second, 'new.txt'));
});

test('root aliases do not authorize prefix siblings, traversal, or unselected aliases', async (t) => {
  const f = await fixture(t);
  const policy = await RootPolicy.create(f.alias);
  const unselected = path.join(f.home, 'not-selected');
  await fs.symlink(f.real, unselected, linkType);
  for (const input of [
    f.alias + '-sibling/file.txt',
    path.join(f.alias, '..', 'outside.txt'),
    path.join(unselected, 'fixture.txt'),
  ]) {
    await assert.rejects(policy.resolve(input, true), code('OUTSIDE_ROOT'));
  }
});

test('nested links remain rejected through both selected aliases and canonical paths', async (t) => {
  const f = await fixture(t);
  const nested = path.join(f.real, 'nested-link');
  await fs.symlink(f.real, nested, linkType);
  const policy = await RootPolicy.create(f.alias);
  for (const root of [f.alias, f.real]) {
    await assert.rejects(
      policy.resolve(path.join(root, 'nested-link', 'fixture.txt')),
      code('LINK_REJECTED'),
    );
  }
});

test('an overlapping selected alias cannot bypass a link below another selected root', async (t) => {
  const f = await fixture(t);
  const other = path.join(f.home, 'other-root');
  const nested = path.join(f.real, 'nested-link');
  await fs.mkdir(other);
  await fs.writeFile(path.join(other, 'fixture.txt'), 'other authorized root');
  await fs.symlink(other, nested, linkType);
  const policy = await RootPolicy.create([path.join(f.alias, 'nested-link'), f.alias]);
  for (const input of [path.join(f.alias, 'nested-link', 'fixture.txt'), path.join(nested, 'fixture.txt')]) {
    await assert.rejects(policy.resolve(input), code('LINK_REJECTED'));
  }
  assert.equal(await policy.resolve(path.join(other, 'fixture.txt')), path.join(other, 'fixture.txt'));
});

test('alias mapping cannot conceal a private component beneath an outer owner root', async (t) => {
  const f = await fixture(t);
  const hidden = path.join(f.real, '.ssh');
  const hiddenAlias = path.join(f.home, 'hidden-alias');
  await fs.mkdir(hidden);
  await fs.writeFile(path.join(hidden, 'key'), 'fixture secret');
  await fs.symlink(hidden, hiddenAlias, linkType);
  const policy = await RootPolicy.create([hiddenAlias, f.alias]);
  for (const input of [path.join(hiddenAlias, 'key'), path.join(f.alias, '.ssh', 'key')]) {
    await assert.rejects(policy.resolve(input), code('PRIVATE_PATH'));
  }
});

test('runtime narrowing evaluates canonical paths after alias mapping and fails closed without admission', async (t) => {
  const f = await fixture(t);
  const policy = await RootPolicy.create(f.alias);
  let admitted = false;
  const seen = [];
  policy.setAccessGuard((target) => {
    seen.push(target);
    if (!admitted) throw new Error('not admitted');
  });
  await assert.rejects(policy.resolve(path.join(f.alias, 'fixture.txt')), code('OUTSIDE_ROOT'));
  admitted = true;
  assert.equal(await policy.resolve(path.join(f.alias, 'fixture.txt')), path.join(f.real, 'fixture.txt'));
  assert.ok(seen.length >= 2);
  assert.ok(seen.every((p) => p === path.join(f.real, 'fixture.txt')));
});

test('retargeting a startup alias never redirects immutable canonical authority', async (t) => {
  const f = await fixture(t);
  const policy = await RootPolicy.create(f.alias);
  const other = path.join(f.home, 'other');
  await fs.mkdir(other);
  await fs.writeFile(path.join(other, 'fixture.txt'), 'untrusted fixture');
  await fs.unlink(f.alias);
  await fs.symlink(other, f.alias, linkType);
  const resolved = await policy.resolve(path.join(f.alias, 'fixture.txt'));
  assert.equal(resolved, path.join(f.real, 'fixture.txt'));
  assert.equal(await fs.readFile(resolved, 'utf8'), 'authorized fixture');
});

test('runtime narrowing checks the final target without rejecting its broader owner-root parents', async (t) => {
  const f = await fixture(t);
  const parent = path.join(f.real, 'parent');
  const allowed = path.join(parent, 'allowed-child');
  await fs.mkdir(allowed, { recursive: true });
  const existing = path.join(allowed, 'fixture.txt');
  const missing = path.join(allowed, 'new.txt');
  await fs.writeFile(existing, 'allowed fixture');
  const policy = await RootPolicy.create(f.alias);
  const seen = [];
  policy.setAccessGuard((target) => {
    seen.push(target);
    const relative = path.relative(allowed, target);
    if (path.isAbsolute(relative) || relative === '..' || relative.startsWith('..' + path.sep))
      throw new Error('Outside narrowed directory');
  });
  assert.equal(await policy.resolve(existing), existing);
  assert.equal(await policy.resolve(missing, true), missing);
  assert.ok(seen.every((target) => target === existing || target === missing));
});

function shortLeaf(t, file) {
  const result = spawnSync('cmd.exe', ['/d', '/c', 'for %F in ("' + file + '") do @echo %~sF'], {
    encoding: 'utf8',
    windowsHide: true,
    windowsVerbatimArguments: true,
  });
  assert.equal(result.status, 0, result.stderr);
  const basename = path.basename(result.stdout.trim().replace(/^"(.*)"$/, '$1'));
  if (basename.toLowerCase() === path.basename(file).toLowerCase()) {
    t.skip('The test filesystem does not create Windows 8.3 aliases for this name.');
    return;
  }
  // Keep every ancestor canonical so this specifically exercises a leaf alias,
  // rather than being rejected early for an unselected alias of an outer root.
  return path.join(path.dirname(file), basename);
}

test(
  'Windows short file aliases return canonical identities and cannot evade the request guard',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const f = await fixture(t);
    const file = path.join(f.real, 'owner-compatibility-settings.json');
    await fs.writeFile(file, 'protected fixture');
    const alias = shortLeaf(t, file);
    if (!alias) return;
    const canonical = await fs.realpath(file);
    assert.equal(await fs.realpath(alias), canonical);
    const policy = await RootPolicy.create(f.real);
    assert.equal(await policy.resolve(alias), canonical);
    policy.setAccessGuard((target) => {
      if (target.toLowerCase() === canonical.toLowerCase()) throw new Error('Protected canonical file');
    });
    await assert.rejects(policy.resolve(alias), code('OUTSIDE_ROOT'));
  },
);

test(
  'Windows short file aliases cannot conceal a private canonical filename',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const f = await fixture(t);
    const file = path.join(f.real, '.env.private-credential-fixture');
    await fs.writeFile(file, 'fixture secret');
    const alias = shortLeaf(t, file);
    if (!alias) return;
    assert.equal(
      privateName(path.basename(alias)),
      false,
      'The fixture must conceal its private name lexically',
    );
    assert.equal(await fs.realpath(alias), await fs.realpath(file));
    const policy = await RootPolicy.create(f.real);
    await assert.rejects(policy.resolve(alias), code('PRIVATE_PATH'));
  },
);

test(
  'Windows missing leaves retain their canonical parent and final request guard',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const f = await fixture(t);
    const parent = path.join(f.real, 'configuration-parent-with-long-name');
    await fs.mkdir(parent);
    const alias = shortLeaf(t, parent);
    if (!alias) return;
    const missing = path.join(await fs.realpath(parent), 'new.txt');
    const requested = path.join(alias, 'new.txt');
    const policy = await RootPolicy.create(f.real);
    assert.equal(await policy.resolve(requested, true), missing);
    policy.setAccessGuard((target) => {
      if (target.toLowerCase() === missing.toLowerCase()) throw new Error('Protected canonical target');
    });
    await assert.rejects(policy.resolve(requested, true), code('OUTSIDE_ROOT'));
  },
);

test(
  'Windows missing leaves cannot be created below an aliased private directory',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const f = await fixture(t);
    const parent = path.join(f.real, '.config');
    await fs.mkdir(parent);
    const alias = shortLeaf(t, parent);
    if (!alias) return;
    assert.equal(
      privateName(path.basename(alias)),
      false,
      'The fixture must conceal its private name lexically',
    );
    const policy = await RootPolicy.create(f.real);
    await assert.rejects(policy.resolve(path.join(alias, 'new.json'), true), code('PRIVATE_PATH'));
  },
);
