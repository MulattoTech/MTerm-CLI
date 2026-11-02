// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-06-config-parity
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const mod = await import('../dist/compat-config.js').catch(() => ({}));
const policyMod = await import('../dist/policy.js');
async function fixture(t, extra = {}) {
  assert.equal(typeof mod.CompatibilityConfig?.create, 'function', 'configuration implementation is required');
  const home = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-config-')));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const roots = [path.join(home, 'one'), path.join(home, 'two')];
  for (const p of roots) await fs.mkdir(p);
  const file = path.join(home, 'settings', 'compat.json');
  const config = await mod.CompatibilityConfig.create({ roots, file, allowConfigWrite: true, ...extra });
  return { home, roots, file, config };
}
test('effective defaults never grant whole-machine access or emit telemetry', async (t) => {
  const f = await fixture(t);
  const c = await f.config.read();
  assert.deepEqual(c.allowedDirectories, f.roots);
  assert.equal(c.fileReadLineLimit, 1000); assert.equal(c.fileWriteLineLimit, 50);
  assert.equal(c.telemetryEnabled, false);
  assert.equal(await fs.stat(f.file).then(() => true, () => false), false, 'reading defaults must not write');
  await f.config.set('allowedDirectories', []);
  assert.deepEqual((await f.config.read()).allowedDirectories, []);
});
test('settings persist, fresh instances reload, and independent concurrent writes survive', async (t) => {
  const f = await fixture(t);
  const second = await mod.CompatibilityConfig.create({ roots: f.roots, file: f.file, allowConfigWrite: true });
  await Promise.all([f.config.set('fileReadLineLimit', 17), second.set('fileWriteLineLimit', 9)]);
  const c = await second.read(); assert.equal(c.fileReadLineLimit, 17); assert.equal(c.fileWriteLineLimit, 9);
  await f.config.set('telemetryEnabled', ' false '); assert.equal((await second.read()).telemetryEnabled, false);
  assert.ok((await fs.readdir(path.dirname(f.file))).length <= 2, 'backups and staging stay bounded');
});
test('invalid mutations and scope escalation preserve exact previous bytes', async (t) => {
  const f = await fixture(t); await f.config.set('fileReadLineLimit', 11);
  const before = await fs.readFile(f.file);
  for (const [key, value] of [['__proto__','x'],['allowExec',true],['fileReadLineLimit',0],['fileReadLineLimit',1.5],['fileWriteLineLimit',1e9],['allowedDirectories',[f.home]],['defaultShell','malicious-shell'],['telemetryEnabled','perhaps']]) {
    await assert.rejects(f.config.set(key,value)); assert.deepEqual(await fs.readFile(f.file),before);
  }
  const readonly = await mod.CompatibilityConfig.create({ roots:f.roots,file:f.file });
  await assert.rejects(readonly.set('fileReadLineLimit',20), /configuration|config|permission/i);
});
test('corrupt or linked persisted config fails closed and never repairs itself', async (t) => {
  const f = await fixture(t); await f.config.set('fileReadLineLimit',11);
  await fs.writeFile(f.file,'{broken');
  await assert.rejects(f.config.read()); await assert.rejects(f.config.set('fileReadLineLimit',12));
  assert.equal(await fs.readFile(f.file,'utf8'),'{broken');
  await fs.unlink(f.file); const outside=path.join(f.home,'outside.json'); await fs.writeFile(outside,'{}');
  await fs.link(outside,f.file); await assert.rejects(f.config.read()); assert.equal(await fs.readFile(outside,'utf8'),'{}');
});
test('multi-root paths round trip without escaping or exposing private components', async (t) => {
  const f = await fixture(t); const policy=await policyMod.RootPolicy.create(f.roots);
  const second=path.join(f.roots[1],'ok.txt'); await fs.writeFile(second,'second');
  assert.equal(await policy.resolve(second),second);
  assert.equal(await policy.resolve(policy.relative(second)),second);
  await assert.rejects(policy.resolve(path.join(f.home,'outside')));
  await assert.rejects(policy.resolve(path.join(f.roots[1],'.ssh','key'),true));
  const escape=path.join(f.roots[0],'escape'); await fs.symlink(f.home,escape,process.platform==='win32'?'junction':'dir');
  await assert.rejects(policy.resolve(path.join(escape,'outside')));
});
test('request snapshots narrow native policy without cross-request authority leakage', async (t) => {
  const f=await fixture(t); const p=await policyMod.RootPolicy.create(f.roots); f.config.bindPolicy(p);
  await f.config.set('allowedDirectories',[f.roots[1]]);
  await f.config.run(async()=> {assert.equal(await p.resolve(f.roots[1]),f.roots[1]); await assert.rejects(p.resolve(f.roots[0]));});
  await f.config.set('allowedDirectories',[]);
  await f.config.run(async()=> {await assert.rejects(p.resolve(f.roots[0])); await assert.rejects(p.resolve(f.roots[1]));});
});
test('blocked executables are normalized and immutable minimum blocks cannot be removed', async(t)=> {
  const f=await fixture(t); await f.config.set('blockedCommands',[]);
  await f.config.run(async()=> {assert.throws(()=>f.config.checkExecutable('C:\\Windows\\System32\\SHUTDOWN.EXE'), /blocked/i);});
  await f.config.set('blockedCommands',['node']);
  await f.config.run(async()=> {assert.throws(()=>f.config.checkExecutable(process.execPath),/blocked/i);});
});

test('overlapping admitted operations retain independent immutable policy snapshots', async(t)=>{
  const f=await fixture(t);const p=await policyMod.RootPolicy.create(f.roots);f.config.bindPolicy(p);
  let resume,admitted;const wait=new Promise(r=>resume=r),entered=new Promise(r=>admitted=r);
  const old=f.config.run(async()=>{admitted();await wait;assert.equal(await p.resolve(f.roots[0]),f.roots[0]);assert.equal(f.config.current().fileReadLineLimit,1000);});
  await entered;await f.config.set('allowedDirectories',[f.roots[1]]);await f.config.set('fileReadLineLimit',3);
  await f.config.run(async()=>{await assert.rejects(p.resolve(f.roots[0]));assert.equal(f.config.current().fileReadLineLimit,3);});
  resume();await old;
});
test('nested selected roots create directories without traversing mutable policy prefixes',async(t)=>{
  const f=await fixture(t);const nested=path.join(f.roots[0],'parent','child');await fs.mkdir(nested,{recursive:true});
  const {FileService}=await import('../dist/files.js');const files=await FileService.create(f.roots,{allowWrite:true});f.config.bindPolicy(files.policy);
  await f.config.set('allowedDirectories',[nested]);
  await f.config.run(async()=>{await files.mkdirTree({path:path.join(nested,'a','b')});});
  assert.equal((await fs.stat(path.join(nested,'a','b'))).isDirectory(),true);
});
test('nested owner roots do not hide private directory components',async(t)=>{
  const f=await fixture(t);const hidden=path.join(f.roots[0],'.ssh');await fs.mkdir(hidden);await fs.writeFile(path.join(hidden,'key'),'fixture');
  const p=await policyMod.RootPolicy.create([hidden,f.roots[0]]);
  await assert.rejects(p.resolve(path.join(hidden,'key')),/private|metadata|credential/i);
});
test('an occupied configuration lock is not stolen and preserves the last valid file',async(t)=>{
  const f=await fixture(t);await f.config.set('fileReadLineLimit',7);const before=await fs.readFile(f.file);
  await fs.writeFile(f.file+'.lock','not-this-task');await assert.rejects(f.config.set('fileReadLineLimit',8),/lock|busy/i);
  assert.deepEqual(await fs.readFile(f.file),before);assert.equal(await fs.readFile(f.file+'.lock','utf8'),'not-this-task');
});
test('linked configuration parent and oversized JSON are rejected without target changes',async(t)=>{
  const f=await fixture(t);const target=path.join(f.home,'external');await fs.mkdir(target);const parent=path.dirname(f.file);
  await fs.symlink(target,parent,process.platform==='win32'?'junction':'dir');
  await assert.rejects(f.config.read());await assert.rejects(f.config.set('fileReadLineLimit',1));assert.deepEqual(await fs.readdir(target),[]);
  await fs.unlink(parent);await fs.mkdir(parent);await fs.writeFile(f.file,' '.repeat(65537));await assert.rejects(f.config.read());
});

test('bound policy cannot be used without a reviewed request snapshot',async(t)=>{
  const f=await fixture(t);const p=await policyMod.RootPolicy.create(f.roots);f.config.bindPolicy(p);
  await f.config.set('allowedDirectories',[]);await assert.rejects(p.resolve(f.roots[0]));
});

test('cancelled config mutations never commit or silently consume a pending lock',async(t)=>{
  const f=await fixture(t);await f.config.set('fileReadLineLimit',7);const before=await fs.readFile(f.file);
  await assert.rejects(f.config.set('fileReadLineLimit',8,AbortSignal.abort()),/cancel/i);
  assert.deepEqual(await fs.readFile(f.file),before);
  await fs.writeFile(f.file+'.lock','other-writer');const controller=new AbortController();
  const pending=f.config.set('fileReadLineLimit',9,controller.signal);setTimeout(()=>controller.abort(),20);
  await assert.rejects(pending,/cancel/i);assert.equal(await fs.readFile(f.file+'.lock','utf8'),'other-writer');
  assert.deepEqual(await fs.readFile(f.file),before);
});
test('command block preferences trim spelling and expose the normalized effective token',async(t)=>{
  const f=await fixture(t);await f.config.set('blockedCommands',[' NODE.EXE ']);
  await f.config.run(async()=>assert.throws(()=>f.config.checkExecutable(process.execPath),/blocked/i));
});
