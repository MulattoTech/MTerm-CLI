// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  loadCapabilityRegister,
  validateCapabilityRegister,
  renderCapabilityReport,
} from '../scripts/capability-register.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const { register, context } = await loadCapabilityRegister(root);
const digest = (text) => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
const fixturePath = 'docs/engineering-runs/evidence/delivery-access25.json';
const fixtureText = await fs.readFile(new URL('../' + fixturePath, import.meta.url), 'utf8');

function fixture() {
  const value = structuredClone(register),
    inputs = structuredClone(context);
  const receipt = JSON.parse(fixtureText);
  const replacedIds = new Set(
    value.deliveryObservations
      .filter(
        (item) =>
          item.repository === receipt.repository &&
          item.pullRequest === receipt.pullRequest &&
          item.kind === 'QUALIFIED_PARTIAL_COMPONENTS',
      )
      .map((item) => item.id),
  );
  value.deliveryObservations = value.deliveryObservations.filter((item) => !replacedIds.has(item.id));
  for (const requirement of value.requirements)
    requirement.deliveryObservationRefs = requirement.deliveryObservationRefs.filter(
      (id) => !replacedIds.has(id),
    );
  // The actual two-job historical Access workflow is intentional. No invented
  // CLI jobs or current-workflow downgrade may stand in for this exact source.
  const sourceKey = 'fixture_access_source';
  const row = value.requirements.find((item) => item.id === 'MTR-SKILL-02');
  value.evidenceSources[sourceKey] = {
    repository: receipt.repository,
    productLayers: ['managed_bridge'],
    sourceSha: receipt.mainSha,
    sourceFiles: [
      {
        path: 'integrations/mcp-manager/lib/engineering-tools.mjs',
        ref: receipt.mainSha,
        url: `https://github.com/${receipt.repository}/blob/${receipt.mainSha}/integrations/mcp-manager/lib/engineering-tools.mjs`,
      },
    ],
  };
  row.sourceSnapshotRefs.push(sourceKey);
  const item = {
    id: 'fixture-access-delivery',
    kind: 'QUALIFIED_PARTIAL_COMPONENTS',
    repository: receipt.repository,
    pullRequest: receipt.pullRequest,
    candidateSha: receipt.candidateSha,
    mainSha: receipt.mainSha,
    tree: receipt.tree,
    observedAt: receipt.observedAt,
    layer: 'managed_bridge',
    candidateChecksPassed: 2,
    mainChecksPassed: 2,
    evidencePath: fixturePath,
    sourceEvidenceKey: sourceKey,
    requirementIds: [row.id],
    scope: 'Accurate engineering tool description source, without runtime/UI acceptance.',
    deployed: false,
    wholeRequirementAcceptance: false,
  };
  value.deliveryObservations.push(item);
  row.deliveryObservationRefs.push(item.id);
  inputs.evidenceTexts[fixturePath] = fixtureText;
  value.inputEvidenceHashes[fixturePath] = digest(fixtureText);
  return { value, inputs, item, receipt, row };
}

function replaceReceipt(f, change) {
  change(f.receipt);
  const text = JSON.stringify(f.receipt);
  f.inputs.evidenceTexts[fixturePath] = text;
  f.value.inputEvidenceHashes[fixturePath] = digest(text);
}

function replaceIdentity(f, change) {
  const original = f.receipt.originalEvidence.find((entry) => entry.role === 'github-api-identity');
  const raw = JSON.parse(f.inputs.evidenceTexts[original.repositoryPath]);
  change(raw);
  const text = JSON.stringify(raw);
  f.inputs.evidenceTexts[original.repositoryPath] = text;
  f.value.inputEvidenceHashes[original.repositoryPath] = digest(text);
  original.sha256 = original.lfNormalizedSha256 = digest(text);
  original.bytes = Buffer.byteLength(text);
  replaceReceipt(f, () => {});
}

test('the actual historical two-job Access contract qualifies without six invented CLI jobs', () => {
  const f = fixture();
  const result = validateCapabilityRegister(f.value, f.inputs);
  assert.equal(result.productRequirements, 143);
  assert.equal(result.deployed, 0);
  assert.equal(result.accepted, 0);
  assert.ok(result.qualifiedPartialRows > 0);
});

test('delivery links use the owning repository, including historical records', () => {
  const f = fixture();
  // Rendering alone must not silently convert the owning repository into CLI.
  const report = renderCapabilityReport(f.value, validateCapabilityRegister(register, context));
  assert.ok(report.includes('https://github.com/MulattoTech/MTechLabs-Access/pull/25'));
  assert.ok(!report.includes('https://github.com/MulattoTech/MTerm-CLI/pull/25)'));
});

test('a CLI receipt cannot be relabeled as a managed-bridge delivery', () => {
  const value = structuredClone(register);
  const item = value.deliveryObservations.find((x) => x.kind === 'QUALIFIED_PARTIAL_COMPONENTS');
  item.layer = 'managed_bridge';
  item.repository = 'MulattoTech/MTechLabs-Access';
  assert.throws(() => validateCapabilityRegister(value, context), /SOURCE_BINDING/);
});

test('a delivery is not qualified when its candidate checks are missing or failed', () => {
  for (const change of [
    (receipt) => {
      receipt.candidate.checks = [];
    },
    (receipt) => {
      receipt.candidate.checks[0].conclusion = 'failure';
    },
    (receipt) => {
      receipt.candidate.checks[0].headSha = 'b'.repeat(40);
    },
  ]) {
    const f = fixture();
    replaceReceipt(f, change);
    assert.throws(() => validateCapabilityRegister(f.value, f.inputs), /SOURCE_BINDING/);
  }
});

test('missing, duplicate, skipped and unrelated main jobs fail qualification', () => {
  for (const change of [
    (receipt) => {
      receipt.main.checks.pop();
    },
    (receipt) => {
      receipt.main.checks[1] = receipt.main.checks[0];
    },
    (receipt) => {
      receipt.main.checks[0].conclusion = 'skipped';
    },
    (receipt) => {
      receipt.main.checks[0].name = 'trivial-green-check';
    },
  ]) {
    const f = fixture();
    replaceReceipt(f, change);
    assert.throws(() => validateCapabilityRegister(f.value, f.inputs), /SOURCE_BINDING|DUPLICATE_ID/);
  }
});

test('job runs, attempts, events and repository URLs must describe the same evidence', () => {
  for (const change of [
    (receipt) => {
      receipt.main.checks[0].runAttempt += 1;
    },
    (receipt) => {
      receipt.main.checks[0].runId += 1;
    },
    (receipt) => {
      receipt.main.runs[0].event = 'pull_request';
    },
    (receipt) => {
      receipt.main.runs[0].headSha = receipt.candidateSha;
    },
    (receipt) => {
      receipt.main.checks[0].url = receipt.main.checks[0].url.replace('MTechLabs-Access', 'MTerm-CLI');
    },
    (receipt) => {
      receipt.candidate.runs[0].conclusion = 'cancelled';
    },
  ]) {
    const f = fixture();
    replaceReceipt(f, change);
    assert.throws(() => validateCapabilityRegister(f.value, f.inputs), /SOURCE_BINDING/);
  }
});

test('workflow content, source pins and exact check sets cannot be substituted', () => {
  for (const change of [
    (receipt) => {
      receipt.workflows[0].sha256 = 'b'.repeat(64);
    },
    (receipt) => {
      receipt.workflows[0].gitBlob = 'b'.repeat(40);
    },
    (receipt) => {
      receipt.workflows[0].repository = 'MulattoTech/MTerm-CLI';
    },
    (receipt) => {
      receipt.workflows[0].mainSourceSha = receipt.candidateSha;
    },
    (receipt) => {
      receipt.workflows[0].expectedCheckNames = ['test'];
    },
    (receipt) => {
      receipt.workflows[0].mainUrl = receipt.workflows[0].mainUrl.replace(receipt.mainSha, 'main');
    },
    (receipt) => {
      receipt.workflows.push(receipt.workflows[0]);
    },
  ]) {
    const f = fixture();
    replaceReceipt(f, change);
    assert.throws(() => validateCapabilityRegister(f.value, f.inputs), /SOURCE_BINDING|DUPLICATE_ID/);
  }
});

test('candidate/tree/merge relationships and pull request identity must match', () => {
  for (const change of [
    (receipt) => {
      receipt.mainParents[1] = 'b'.repeat(40);
    },
    (receipt) => {
      receipt.candidateTreeEqualsMergeTree = false;
    },
    (receipt) => {
      receipt.tree = 'b'.repeat(40);
    },
    (receipt) => {
      receipt.pullRequest += 1;
    },
    (receipt) => {
      receipt.repository = 'MulattoTech/MTerm-CLI';
    },
  ]) {
    const f = fixture();
    replaceReceipt(f, change);
    assert.throws(() => validateCapabilityRegister(f.value, f.inputs), /SOURCE_BINDING/);
  }
});

test('component references bind only to their explicitly reviewed requirement scope and source', () => {
  for (const change of [
    (f) => {
      f.item.requirementIds = [];
    },
    (f) => {
      f.item.requirementIds = ['MTR-METRIC-01'];
    },
    (f) => {
      f.row.sourceSnapshotRefs = f.row.sourceSnapshotRefs.filter((key) => key !== f.item.sourceEvidenceKey);
    },
    (f) => {
      f.value.evidenceSources[f.item.sourceEvidenceKey].repository = 'MulattoTech/MTerm-CLI';
    },
    (f) => {
      f.value.evidenceSources[f.item.sourceEvidenceKey].sourceSha = 'b'.repeat(40);
    },
  ]) {
    const f = fixture();
    change(f);
    assert.throws(() => validateCapabilityRegister(f.value, f.inputs), /SOURCE_BINDING|DANGLING_REFERENCE/);
  }
});

test('a qualified component cannot implicitly claim deployment or whole acceptance', () => {
  for (const flag of ['deployed', 'wholeRequirementAcceptance']) {
    const f = fixture();
    f.item[flag] = true;
    assert.throws(() => validateCapabilityRegister(f.value, f.inputs), /SOURCE_BINDING/);
  }
});

test('supersession must refer to a later record for the same repository and pull request', () => {
  const f = fixture();
  const old = f.value.deliveryObservations.find((item) => item.id === 'remote-profiles-candidate');
  old.supersededBy = f.item.id;
  assert.throws(() => validateCapabilityRegister(f.value, f.inputs), /SOURCE_BINDING/);
});

test('a known older Access workflow cannot lower the gate for a newer source commit', () => {
  const value = structuredClone(register),
    inputs = structuredClone(context);
  const item = value.deliveryObservations.find(
    (x) => x.repository === 'MulattoTech/MTechLabs-Access' && x.pullRequest === 27,
  );
  const receipt = JSON.parse(inputs.evidenceTexts[item.evidencePath]);
  const older = JSON.parse(fixtureText);
  receipt.workflows = older.workflows.map((workflow) => ({
    ...workflow,
    candidateSourceSha: item.candidateSha,
    mainSourceSha: item.mainSha,
    candidateUrl: `https://github.com/${item.repository}/blob/${item.candidateSha}/${workflow.path}`,
    mainUrl: `https://github.com/${item.repository}/blob/${item.mainSha}/${workflow.path}`,
  }));
  receipt.expectedCheckNames = ['test', 'managed-mcp'];
  for (const phase of ['candidate', 'main']) {
    receipt[phase].checks = receipt[phase].checks.filter((check) =>
      receipt.expectedCheckNames.includes(check.name),
    );
    item[`${phase}ChecksPassed`] = 2;
  }
  const text = JSON.stringify(receipt);
  inputs.evidenceTexts[item.evidencePath] = text;
  value.inputEvidenceHashes[item.evidencePath] = digest(text);
  assert.throws(() => validateCapabilityRegister(value, inputs), /SOURCE_BINDING/);
});

test('internally consistent invented job identities cannot replace saved GitHub observations', () => {
  const f = fixture();
  replaceReceipt(f, (receipt) => {
    const job = receipt.main.checks[0];
    job.id += 1;
    job.url = `https://github.com/${receipt.repository}/actions/runs/${job.runId}/job/${job.id}`;
  });
  assert.throws(() => validateCapabilityRegister(f.value, f.inputs), /SOURCE_BINDING/);
});

test('saved plugin metadata cannot claim OAuth, UI or runtime deployment verification', () => {
  for (const flag of [
    'backendDeploymentVerified',
    'canonicalOnlyOAuthVerified',
    'uiActivationVerified',
    'workingWrapperRemovalVerified',
  ]) {
    const value = structuredClone(register);
    value.savedPluginReleaseObservations[0][flag] = true;
    assert.throws(() => validateCapabilityRegister(value, context), /SOURCE_BINDING/);
  }
});

test('joint run and job edits cannot invent a later attempt or reuse another phase', () => {
  for (const change of [
    (receipt) => {
      for (const run of receipt.main.runs) run.runAttempt += 1;
      for (const check of receipt.main.checks) check.runAttempt += 1;
    },
    (receipt) => {
      receipt.main.runs[0].workflowId = 1;
    },
    (receipt) => {
      const candidateRun = receipt.candidate.runs[0];
      candidateRun.id = receipt.main.runs[0].id;
      candidateRun.url = receipt.main.runs[0].url;
      for (const check of receipt.candidate.checks) {
        const main = receipt.main.checks.find((job) => job.name === check.name);
        check.id = main.id;
        check.runId = candidateRun.id;
        check.url = main.url;
      }
    },
  ]) {
    const f = fixture();
    replaceReceipt(f, change);
    assert.throws(() => validateCapabilityRegister(f.value, f.inputs), /SOURCE_BINDING/);
  }
});

test('the raw evidence input must belong to the source being summarized', () => {
  const f = fixture();
  const identity = f.receipt.originalEvidence.find((entry) => entry.role === 'github-api-identity');
  const raw = JSON.parse(f.inputs.evidenceTexts[identity.repositoryPath]);
  raw.main.commit.response.tree.sha = 'd'.repeat(40);
  const text = JSON.stringify(raw);
  f.inputs.evidenceTexts[identity.repositoryPath] = text;
  f.value.inputEvidenceHashes[identity.repositoryPath] = digest(text);
  replaceReceipt(f, (receipt) => {
    receipt.originalEvidence.find((entry) => entry.role === 'github-api-identity').lfNormalizedSha256 =
      digest(text);
  });
  assert.throws(() => validateCapabilityRegister(f.value, f.inputs), /SOURCE_BINDING/);
});

test('the same qualified PR cannot be counted twice under separate observation IDs', () => {
  const f = fixture();
  const duplicate = { ...f.item, id: 'duplicate-qualified-pr' };
  f.value.deliveryObservations.push(duplicate);
  f.row.deliveryObservationRefs.push(duplicate.id);
  assert.throws(() => validateCapabilityRegister(f.value, f.inputs), /DUPLICATE_ID/);
});

test('package readback time cannot be backfilled from its later source reconciliation', () => {
  const value = structuredClone(register);
  value.savedPluginReleaseObservations[0].sourceReconciliationObservedAt = '2026-11-12T20:00:00Z';
  assert.throws(() => validateCapabilityRegister(value, context), /SOURCE_BINDING/);
});

test('a saved plugin package must preserve the exact independently read back file manifest', () => {
  for (const change of [
    (receipt) => {
      receipt.files['unrelated.md'] = receipt.files['README.md'];
      delete receipt.files['README.md'];
    },
    (receipt) => {
      receipt.files['README.md'].sha256 = 'b'.repeat(64);
    },
    (receipt) => {
      receipt.files['README.md'].bytes += 1;
    },
  ]) {
    const value = structuredClone(register),
      inputs = structuredClone(context);
    const release = value.savedPluginReleaseObservations[0];
    const receipt = JSON.parse(inputs.evidenceTexts[release.evidencePath]);
    change(receipt);
    const text = JSON.stringify(receipt);
    inputs.evidenceTexts[release.evidencePath] = text;
    value.inputEvidenceHashes[release.evidencePath] = digest(text);
    assert.throws(() => validateCapabilityRegister(value, inputs), /SOURCE_BINDING/);
  }
});

test('duplicate row references cannot inflate its qualified component count', () => {
  const f = fixture();
  f.row.deliveryObservationRefs.push(f.item.id);
  assert.throws(() => validateCapabilityRegister(f.value, f.inputs), /DUPLICATE_ID/);
});

test('missing workflow identities cannot agree through two undefined values', () => {
  const f = fixture();
  delete f.receipt.main.runs[0].workflowId;
  replaceIdentity(f, (raw) => {
    delete raw.main.runs[0].response.workflow_id;
  });
  assert.throws(() => validateCapabilityRegister(f.value, f.inputs), /SOURCE_BINDING/);
});

test('candidate branch identity remains required when both captured fields are omitted', () => {
  const f = fixture();
  replaceIdentity(f, (raw) => {
    delete raw.pullRequest.response.head;
    for (const entry of raw.candidate.runs) delete entry.response.head_branch;
  });
  assert.throws(() => validateCapabilityRegister(f.value, f.inputs), /SOURCE_BINDING/);
});

test('one physical run or job cannot attest both candidate and actual main', () => {
  const f = fixture();
  const candidateRun = f.receipt.candidate.runs[0],
    mainRun = f.receipt.main.runs[0];
  candidateRun.id = mainRun.id;
  candidateRun.url = mainRun.url;
  for (const job of f.receipt.candidate.checks) {
    const main = f.receipt.main.checks.find((entry) => entry.name === job.name);
    job.id = main.id;
    job.runId = mainRun.id;
    job.url = main.url;
  }
  replaceIdentity(f, (raw) => {
    const api = `https://api.github.com/repos/${f.item.repository}`;
    const entry = raw.candidate.runs[0];
    entry.requestUrl = entry.response.url = `${api}/actions/runs/${mainRun.id}`;
    entry.response.id = mainRun.id;
    entry.response.html_url = mainRun.url;
    const list = raw.candidate.jobLists[0];
    list.requestUrl = `${api}/actions/runs/${mainRun.id}/jobs?per_page=100`;
    for (const job of list.response.jobs) {
      const main = f.receipt.main.checks.find((entry) => entry.name === job.name);
      job.id = main.id;
      job.run_id = mainRun.id;
      job.html_url = main.url;
      job.url = `${api}/actions/jobs/${job.id}`;
      job.run_url = `${api}/actions/runs/${mainRun.id}`;
    }
  });
  assert.throws(() => validateCapabilityRegister(f.value, f.inputs), /SOURCE_BINDING/);
});

test('captured API URLs must agree with their recorded run and job identities', () => {
  for (const change of [
    (raw) => {
      raw.main.runs[0].response.url += '0';
    },
    (raw) => {
      raw.main.runs[0].response.workflow_url += '0';
    },
    (raw) => {
      raw.main.jobLists[0].response.jobs[0].url += '0';
    },
    (raw) => {
      raw.main.jobLists[0].response.jobs[0].run_url += '0';
    },
  ]) {
    const f = fixture();
    replaceIdentity(f, change);
    assert.throws(() => validateCapabilityRegister(f.value, f.inputs), /SOURCE_BINDING/);
  }
});

test('qualification cannot be observed before the source merge or completed main checks', () => {
  for (const observedAt of ['2026-11-12T00:00:00Z', '2026-11-12T19:41:27Z']) {
    const f = fixture();
    f.item.observedAt = observedAt;
    replaceReceipt(f, (receipt) => {
      receipt.observedAt = observedAt;
    });
    assert.throws(() => validateCapabilityRegister(f.value, f.inputs), /SOURCE_BINDING/);
  }
});

test('repeat observation of a saved package cannot count as another release', () => {
  const value = structuredClone(register);
  value.savedPluginReleaseObservations.push({
    ...value.savedPluginReleaseObservations[0],
    id: 'repeated-readback',
  });
  assert.throws(() => validateCapabilityRegister(value, context), /DUPLICATE_ID/);
});
