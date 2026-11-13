// Independent review fixture; no product source changes.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const reviewRoot = process.env.MTERM_IDENTITY_REVIEW_ROOT;
const packageRoot = process.env.MTERM_IDENTITY_REVIEW_PACKAGE;
assert.ok(reviewRoot && packageRoot, 'Explicit review and package roots required');
const { admitRemoteStateDirectory, assertRemoteStateAdmission } = await import(
  pathToFileURL(path.join(packageRoot, 'dist/remote/profiles.js')).href
);
const A = 2n ** 60n, B = A + 1n;
assert.notEqual(A, B);
assert.equal(Number(A), Number(B));
const observations = [];
const key = (s) => s.dev.toString() + ':' + s.ino.toString();
const names = ['namespace', 'collection', 'profile'];
for (const level of names) {
  for (const field of ['ino', 'dev']) {
    for (const replacement of [true, false]) {
      test(level + ' ' + field + (replacement ? ' replacement is refused despite Number collision' : ' unchanged large identity remains admitted'), { concurrency: false }, async (t) => {
        const fixture = await fs.realpath(await fs.mkdtemp(path.join(reviewRoot, 'managed-fixture-')));
        const previous = { LOCALAPPDATA: process.env.LOCALAPPDATA, XDG_STATE_HOME: process.env.XDG_STATE_HOME };
        t.after(async () => {
          t.mock.restoreAll();
          for (const [name, value] of Object.entries(previous))
            if (value === undefined) delete process.env[name]; else process.env[name] = value;
          await fs.rm(fixture, { recursive: true, force: true, maxRetries: 3 });
        });
        const stateHome = path.join(fixture, 'state-home');
        process.env.LOCALAPPDATA = stateHome;
        process.env.XDG_STATE_HOME = stateHome;
        const namespace = path.join(stateHome, 'MTerm-CLI-DEV');
        const collection = path.join(namespace, 'remote-profiles');
        const profile = path.join(collection, 'alpha');
        const sibling = path.join(collection, 'beta');
        const selected = { namespace, collection, profile }[level];
        await fs.mkdir(profile, { recursive: true, mode: 0o700 });
        await fs.mkdir(sibling, { mode: 0o700 });
        const bytes = Buffer.from('owned profile sentinel; no credentials');
        await fs.writeFile(path.join(profile, 'sentinel'), bytes, { flag: 'wx', mode: 0o600 });
        await fs.writeFile(path.join(sibling, 'sentinel'), bytes, { flag: 'wx', mode: 0o600 });
        const realLstat = fs.lstat.bind(fs);
        const original = await realLstat(selected, { bigint: true });
        const idMap = new Map([[key(original), A]]);
        let mappedCalls = 0;
        const requestedTypes = new Set();
        t.mock.method(fs, 'lstat', async (...args) => {
          const stat = await realLstat(...args);
          const exact = typeof stat.ino === 'bigint' ? stat : await realLstat(args[0], { bigint: true });
          const mapped = idMap.get(key(exact));
          if (mapped === undefined) return stat;
          mappedCalls++;
          requestedTypes.add(typeof stat[field]);
          // Map by true object identity, never by pathname, phase or rounded ID.
          const output = { [field]: typeof stat[field] === 'bigint' ? mapped : Number(mapped) };
          if (field === 'dev') output.ino = typeof stat.ino === 'bigint' ? A : Number(A);
          return Object.assign(Object.create(stat), output);
        });
        const admission = await admitRemoteStateDirectory(profile, 'development', false);
        assert.equal(admission.requiresBoundScope, true);
        assert.deepEqual(admission.directories.map((d) => d.path), [namespace, collection, profile]);
        const realBefore = new Map();
        for (const entry of admission.directories)
          realBefore.set(entry.path, key(await realLstat(entry.path, { bigint: true })));
        await assertRemoteStateAdmission(admission);
        let newIdentity;
        if (replacement) {
          const old = path.join(fixture, 'old-' + level);
          await fs.rename(selected, old);
          await fs.mkdir(selected, { mode: 0o700 });
          for (const entry of await fs.readdir(old)) await fs.rename(path.join(old, entry), path.join(selected, entry));
          const next = await realLstat(selected, { bigint: true });
          assert.notEqual(key(next), key(original), 'Original retained object and replacement must be distinct');
          assert.equal(next.mode, original.mode, 'Mode must not mask identity comparison');
          assert.equal(next.uid, original.uid, 'Owner must not mask identity comparison');
          assert.equal(await fs.realpath(selected), selected, 'Canonical pathname stays unchanged');
          idMap.set(key(next), B);
          newIdentity = { real: key(next), mapped: B.toString() };
          for (const entry of admission.directories)
            if (entry.path !== selected)
              assert.equal(key(await realLstat(entry.path, { bigint: true })), realBefore.get(entry.path), 'Other admitted identities remain unchanged');
          await assert.rejects(assertRemoteStateAdmission(admission), (error) => error.code === 'REMOTE_STATE');
          // The old pathname still names the same original object and receives A.
          const oldObserved = await fs.lstat(old, { bigint: true });
          assert.equal(oldObserved[field], A);
        } else {
          await assertRemoteStateAdmission(admission);
        }
        assert.deepEqual(await fs.readFile(path.join(profile, 'sentinel')), bytes);
        assert.deepEqual(await fs.readFile(path.join(sibling, 'sentinel')), bytes);
        assert.ok(mappedCalls >= 3);
        assert.deepEqual([...requestedTypes], ['bigint'], 'Reviewed capture and recheck must request exact IDs');
        observations.push({
          level, field, replacement, outcome: replacement ? 'REMOTE_STATE' : 'admitted',
          realOriginal: key(original), mappedOriginal: A.toString(), replacementIdentity: newIdentity ?? null,
          ordinaryNumberCollision: Number(A) === Number(B), mappedCalls,
          allRelevantStatsExact: true, sentinelsPreserved: true,
          devCaseUsesSyntheticDeviceIdsAndEqualInode: field === 'dev',
          otherAdmittedObjectsUnchanged: true,
        });
      });
    }
  }
}
after(async () => {
  await fs.writeFile(path.join(reviewRoot, 'managed-parent-observations.json'), JSON.stringify(observations, null, 2) + '\n');
});
