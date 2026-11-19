import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const reviewRoot = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:\/)/, '$1'));
const taskRoot = path.dirname(reviewRoot);
const repo = path.join(taskRoot, 'run-lock-repair');
const validation = path.join(repo, 'docs/validation/2026-11-13-exact-state-identity');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const startedAt = new Date().toISOString();
assert.equal(process.version, 'v24.21.0');
const expected = {
  'src/remote/state.ts':'6943b20fc1a0502dbafa46d2ecca8e7e007ccf94e33f3a794bf0a9caea98510e',
  'src/remote/profiles.ts':'da5ea619c58e7990bf35d935dd31c9603a9a8528174bae3d26b0a87aff7e9320',
  'scripts/verify-package.mjs':'08804a80f90e5d6437e258e280ba3c10e7ebf2b695ed2e9fdd1019c09dc61713',
  'tests/remote-state-identity.test.mjs':'ec7ab421d5ecc19d74c0f22d485e4a439d6d80d8c9e83daf58b13fdb12ba3bc1',
  'tests/remote-run-lock.test.mjs':'638b2bda6585f252bbba4b931e9357f573a281648fd33652762a8d99694a44c0',
  'tests/remote-state-lock.test.mjs':'0c9eed702980069ba6de40601fe4fde592e499feb348c179e3bc0da2e9b56ce4',
};
const files = [...Object.keys(expected), 'dist/remote/state.js', 'dist/remote/profiles.js', 'dist/config.js', 'dist/errors.js'];
async function snapshot() {
  return Object.fromEntries(await Promise.all(files.map(async (file) => [file, sha(await fs.readFile(path.join(repo, file)))])));
}
const before = await snapshot();
await fs.writeFile(path.join(reviewRoot,'hashes-before.json'), JSON.stringify(before,null,2)+'\n');
for (const [file,value] of Object.entries(expected)) assert.equal(before[file],value,'Frozen source changed: '+file);
const producerBytes = await fs.readFile(path.join(validation,'green-receipt.json'));
const producer = JSON.parse(producerBytes);
await fs.writeFile(path.join(reviewRoot,'producer-green-receipt.json'),producerBytes);
let producerLog = null;
for (const filename of await fs.readdir(validation)) {
  if (!/^green.*\.(tap|log)$/.test(filename)) continue;
  const bytes = await fs.readFile(path.join(validation,filename));
  if (sha(bytes) === producer.logSha256) {
    await fs.writeFile(path.join(reviewRoot,'producer-green.tap'),bytes);
    producerLog={sourceFilename:filename,sha256:sha(bytes),bytes:bytes.length};
    break;
  }
}
const fixture = path.join(reviewRoot,'managed-parent-review.test.mjs');
const fixtureHash = sha(await fs.readFile(fixture));
const result = spawnSync(process.execPath,['--test','--test-reporter=tap','--test-concurrency=1',fixture], {
  cwd:reviewRoot, env:{...process.env,MTERM_IDENTITY_REVIEW_ROOT:reviewRoot,MTERM_IDENTITY_REVIEW_PACKAGE:repo},
  timeout:60000,maxBuffer:4*1024*1024,windowsHide:true,
});
const stdout=result.stdout??Buffer.alloc(0), stderr=result.stderr??Buffer.alloc(0);
await fs.writeFile(path.join(reviewRoot,'managed-parent-review.tap'),stdout);
await fs.writeFile(path.join(reviewRoot,'managed-parent-review.stderr.log'),stderr);
const after = await snapshot();
await fs.writeFile(path.join(reviewRoot,'hashes-after.json'),JSON.stringify(after,null,2)+'\n');
const counts = Object.fromEntries(['tests','pass','fail','cancelled','skipped','todo'].map(name => {
  const match = stdout.toString().match(new RegExp('^# '+name+' (\\d+)$','m'));
  return [name,match?Number(match[1]):null];
}));
const unchanged=JSON.stringify(before)===JSON.stringify(after);
const receipt={
 schemaVersion:1,observer:'/root/delivery_evidence',model:'GPT-6 Astra Pro',startedAt,finishedAt:new Date().toISOString(),
 node:process.version,platform:process.platform,exit:result.status,signal:result.signal,error:result.error?.message??null,
 tests:counts,sourceUnchanged:unchanged,expectedSourceHashesMatched:true,sourceBefore:before,sourceAfter:after,
 fixtureSha256:fixtureHash,stdoutSha256:sha(stdout),stdoutBytes:stdout.length,stderrSha256:sha(stderr),stderrBytes:stderr.length,
 producerReceiptSha256:sha(producerBytes),producerLog,
 scope:'Independent managed namespace/collection/profile ancestry with real owned filesystem replacements and precise-object-keyed ID mapping; six collisions and six unchanged controls.',
 syntheticDeviceIdCases:true,realCrossVolumeMoves:false,modelCalls:0,productWrites:0,
 qualificationLimits:['No deployment or full acceptance claim.','Exact identity precision does not eliminate pathname TOCTOU between verification and unlink.','This matrix tests managed-directory admission; root producer suites separately exercise both lock cleanup paths.']
};
await fs.writeFile(path.join(reviewRoot,'managed-parent-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
assert.equal(result.status,0,'Independent managed-parent matrix failed; inspect retained TAP');
assert.deepEqual(counts,{tests:12,pass:12,fail:0,cancelled:0,skipped:0,todo:0});
assert.equal(unchanged,true,'Frozen source/runtime/test bytes changed');
assert.equal(sha(await fs.readFile(fixture)),fixtureHash,'Fixture changed');
assert.ok(producerLog,'Producer full green log was not preserved');
