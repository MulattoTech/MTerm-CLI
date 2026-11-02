// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-foundation-portability (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { RootPolicy } from '../dist/policy.js';

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
