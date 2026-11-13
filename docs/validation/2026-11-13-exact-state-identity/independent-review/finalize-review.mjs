import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = path.dirname(fileURLToPath(import.meta.url));
const hash = (b) => createHash('sha256').update(b).digest('hex');
const local = JSON.parse(await fs.readFile(path.join(root,'managed-parent-receipt.json'),'utf8'));
assert.equal(local.exit,0);
assert.deepEqual(local.tests,{tests:12,pass:12,fail:0,cancelled:0,skipped:0,todo:0});
assert.equal(local.sourceUnchanged,true);
assert.equal((await fs.readdir(root)).filter(n=>n.startsWith('managed-fixture-')).length,0);
const names=['REVIEW.md','source-captures.json','managed-parent-review.test.mjs','run-managed-parent-review.mjs','managed-parent-review.tap','managed-parent-review.stderr.log','managed-parent-observations.json','managed-parent-receipt.json','hashes-before.json','hashes-after.json','producer-green-receipt.json','producer-green.tap','finalize-review.mjs'];
const artifacts=[];
for(const name of names) {
 const bytes=await fs.readFile(path.join(root,name));
 artifacts.push({path:name,bytes:bytes.length,sha256:hash(bytes)});
}
const receipt={
 schemaVersion:1,kind:'independent-source-and-local-qualification-review',
 signedAt:new Date().toISOString(),signedAs:'/root/delivery_evidence',model:'GPT-6 Astra Pro',
 signatureKind:'Self-attribution only; SHA256 evidence integrity is not a cryptographic reviewer signature.',
 baseSha:'15dd5de8387507774f6471e4b34d108a492393dc',
 verdict:'APPROVED_FROZEN_SOURCE_TESTS_AND_VERIFIER_WITH_BOUNDED_LOCAL_QUALIFICATION',
 blockingFindings:[],sourceHashes:local.sourceBefore,sourceUnchangedDuringIndependentExecution:true,
 independentTests:local.tests,independentExecution:{startedAt:local.startedAt,finishedAt:local.finishedAt,node:local.node,platform:local.platform,logSha256:local.stdoutSha256},
 producerEvidence:{observer:'/root',greenReceiptSha256:local.producerReceiptSha256,greenLog:local.producerLog,independentlyRerun:false},
 fixtureCleanupVerified:true,productRepositoryWrites:0,githubWrites:0,productionChanges:0,modelCalls:0,
 sourceDiagnosis:'Number-valued filesystem identity comparisons can alias distinct large IDs in both failed lock cleanup paths and bound-directory admission. Exact BigInt capture/rechecks eliminate that representation collision.',
 hostedFailureAttribution:'The reported Windows ENOENT is consistent with the proven collision class. Exact raw IDs from that hosted failure were not recovered by this reviewer.',
 remainingQualification:'Exact candidate/main hosted gates for the correction remain independent; original failed PR263 main is not retroactively qualified.',
 safetyLimit:'Pathname lstat/realpath followed by unlink is not atomic; residual TOCTOU and crash-durability guarantees remain outside this correction.',
 artifacts
};
const bytes=Buffer.from(JSON.stringify(receipt,null,2)+'\n');
await fs.writeFile(path.join(root,'receipt.json'),bytes);
console.log(JSON.stringify({receiptPath:path.join(root,'receipt.json'),receiptSha256:hash(bytes),receiptBytes:bytes.length,reviewSha256:artifacts.find(a=>a.path==='REVIEW.md').sha256,localQualificationReceiptSha256:artifacts.find(a=>a.path==='managed-parent-receipt.json').sha256,independentTests:local.tests,fixtureCleanupVerified:true},null,2));
