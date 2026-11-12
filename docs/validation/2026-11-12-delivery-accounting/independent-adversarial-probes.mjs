import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadCapabilityRegister,validateCapabilityRegister,renderCapabilityReport} from 'file:///workspace/scratch/a92a3aacdca1/MTerm-CLI-Accounting/scripts/capability-register.mjs';
const root = "/workspace/scratch/a92a3aacdca1/MTerm-CLI-Accounting";
const base = await loadCapabilityRegister(root);
const digest = text => createHash('sha256').update(text.replace(/\r\n/g,'\n')).digest('hex');
function fixture() {
  const {register,context} = structuredClone(base);
  const item = register.deliveryObservations.find(x => x.repository === 'MulattoTech/MTechLabs-Access' && x.pullRequest === 25);
  const receipt = JSON.parse(context.evidenceTexts[item.evidencePath]);
  return {register,context,item,receipt};
}
function saveReceipt(f) {
  const text = JSON.stringify(f.receipt);
  f.context.evidenceTexts[f.item.evidencePath] = text;
  f.register.inputEvidenceHashes[f.item.evidencePath] = digest(text);
}
function patchRaw(f, mutate) {
  const original = f.receipt.originalEvidence.find(x => x.role === 'github-api-identity');
  let raw = JSON.parse(f.context.evidenceTexts[original.repositoryPath]);
  raw = mutate(raw) ?? raw;
  const text = JSON.stringify(raw);
  f.context.evidenceTexts[original.repositoryPath] = text;
  f.register.inputEvidenceHashes[original.repositoryPath] = digest(text);
  original.lfNormalizedSha256 = digest(text);
  original.sha256 = digest(text);
  saveReceipt(f);
}
const outcomes = [];
function probe(name,mutate,detail) {
  const f = fixture();
  mutate(f);
  try {
    const metrics = validateCapabilityRegister(f.register,f.context);
    outcomes.push({name,accepted:true,...(detail ? {detail:detail(f,metrics)} : {})});
  } catch(error) { outcomes.push({name,accepted:false,error:error.message}); }
}
probe('duplicate qualified component reference in one row',f => {
  const row=f.register.requirements.find(x=>x.deliveryObservationRefs.includes(f.item.id));
  row.deliveryObservationRefs.push(f.item.id);
},(f,m)=>{
  const row=f.register.requirements.find(x=>x.deliveryObservationRefs.filter(r=>r===f.item.id).length===2);
  return {id:row.id,reportLine:renderCapabilityReport(f.register,m).split('\n').find(line=>line.startsWith(`| **${row.id}**`)),qualifiedComponentDeliveries:m.qualifiedComponentDeliveries};
});
probe('missing workflow ID in both normalized and captured run',f => {
  delete f.receipt.main.runs[0].workflowId;
  patchRaw(f,raw=>{ delete raw.main.runs[0].response.workflow_id; });
});
probe('missing candidate branch in both PR and captured run',f => {
  patchRaw(f,raw=>{
    delete raw.pullRequest.response.head;
    for(const entry of raw.candidate.runs) delete entry.response.head_branch;
  });
});
probe('same physical run and job IDs describe contradictory candidate and main sources in both representations',f => {
  const candidateRun=f.receipt.candidate.runs[0];
  const mainRun=f.receipt.main.runs[0];
  const priorRun=candidateRun.id;
  const remap=new Map();
  candidateRun.id=mainRun.id;
  candidateRun.url=mainRun.url;
  for(const job of f.receipt.candidate.checks) {
    const main=f.receipt.main.checks.find(x=>x.name===job.name);
    remap.set(job.id,main.id);
    job.id=main.id;job.runId=mainRun.id;job.url=main.url;
  }
  patchRaw(f,raw=>{
    const run=raw.candidate.runs[0];
    run.requestUrl=run.requestUrl.replace(String(priorRun),String(mainRun.id));
    run.response.id=mainRun.id;run.response.html_url=mainRun.url;
    const list=raw.candidate.jobLists[0];
    list.requestUrl=list.requestUrl.replace(String(priorRun),String(mainRun.id));
    for(const job of list.response.jobs) {
      job.id=remap.get(job.id);job.run_id=mainRun.id;
      job.html_url=`https://github.com/${f.item.repository}/actions/runs/${mainRun.id}/job/${job.id}`;
    }
  });
});
probe('qualification observation predates actual source merge and green main',f=>{f.item.observedAt='2026-11-12T00:00:00Z';});
probe('authentic but unrelated complete GitHub original substituted with correct hashes',f=>{
  const other=f.register.deliveryObservations.find(x=>x.repository===f.item.repository&&x.pullRequest===27);
  const otherReceipt=JSON.parse(f.context.evidenceTexts[other.evidencePath]);
  const otherOriginal=otherReceipt.originalEvidence.find(x=>x.role==='github-api-identity');
  const otherRaw=JSON.parse(f.context.evidenceTexts[otherOriginal.repositoryPath]);
  patchRaw(f,()=>otherRaw);
});
probe('merged pending supersession changes candidate identity',f=>{
  const pending=f.register.deliveryObservations.find(x=>x.kind==='MERGED_PENDING_MAIN_QUALIFICATION');
  pending.candidateSha='d'.repeat(40);
});
probe('qualified observation superseded by later candidate',f=>{
  const candidate={...f.item,id:'late-candidate',kind:'PARTIAL_CANDIDATE',observedAt:'2026-11-13T00:00:00Z'};
  f.item.supersededBy=candidate.id;
  f.register.deliveryObservations.push(candidate);
});
probe('receipt claims runtime deployment while item does not',f=>{f.receipt.productionRuntimeDeployment=true;saveReceipt(f);});
probe('raw main job list truncated relative to total_count',f=>{patchRaw(f,raw=>{raw.main.jobLists[0].response.jobs.pop();});});
probe('missing pull request object fails closed',f=>{patchRaw(f,raw=>{delete raw.pullRequest;});});
probe('missing candidate phase fails closed',f=>{patchRaw(f,raw=>{delete raw.candidate;});});
probe('missing source snapshot does not gain whole credit',f=>{
  const row=f.register.requirements.find(x=>x.deliveryObservationRefs.includes(f.item.id));
  row.implementation.codeComplete=true;
});
probe('repeat saved package counted as a separate release',f=>{f.register.savedPluginReleaseObservations.push({...f.register.savedPluginReleaseObservations[0],id:'same-saved-package-again'});});
await fs.writeFile(new URL('./adversarial-results.json',import.meta.url),JSON.stringify(outcomes,null,2)+'\n');
console.log(JSON.stringify(outcomes,null,2));
