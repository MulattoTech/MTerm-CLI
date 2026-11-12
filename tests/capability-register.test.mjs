// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  loadCapabilityRegister,
  validateCapabilityRegister,
  renderCapabilityReport,
} from '../scripts/capability-register.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const { register, context } = await loadCapabilityRegister(root);
const copy = () => structuredClone(register);
const fails = (change, code) => {
  const value = copy();
  change(value);
  assert.throws(() => validateCapabilityRegister(value, context), new RegExp(code));
};

test('capability report derives complete coverage without combining overlapping catalogs or granting acceptance', () => {
  const result = validateCapabilityRegister(register, context);
  assert.equal(result.productRequirements, 143);
  assert.equal(result.missionBullets, 488);
  assert.equal(result.featureBullets, 272);
  assert.equal(result.registeredRequirements, 143);
  assert.deepEqual(
    result.baselines.map((x) => x.total),
    [300, 48, 12, 117],
  );
  for (const key of ['codeComplete', 'tested', 'merged', 'deployed', 'accepted'])
    assert.equal(result[key], 0);
  assert.equal(result.roadmapMaturity, null);
  assert.ok(result.partialSourceRows > 0);
  assert.ok(result.qualifiedPartialRows > 0);
});

test('duplicate product and crosswalk IDs fail instead of increasing coverage', () => {
  fails((x) => x.requirements.push(x.requirements[0]), 'DUPLICATE_ID');
  fails((x) => x.missionBulletCrosswalk.push(x.missionBulletCrosswalk[0]), 'DUPLICATE_ID');
});

test('missing mission bullets and a product bullet hidden in governance fail coverage', () => {
  fails((x) => x.missionBulletCrosswalk.pop(), 'MISSION_COVERAGE');
  fails((x) => {
    const row = x.missionBulletCrosswalk.find((b) => b.kind === 'PRODUCT_REQUIREMENT');
    row.kind = 'RUN_OBLIGATION_OR_DISCOVERY_HINT';
    row.targets = [x.runObligations[0].id];
  }, 'MISSION_COVERAGE');
});

test('dangling issue, catalog, source, historical and delivery references fail closed', () => {
  fails((x) => {
    x.requirements[0].acceptance.trackingIssue = 99999;
  }, 'DANGLING_REFERENCE');
  fails((x) => x.requirements[0].requirementRefs.CLI.push('CLI-999'), 'DANGLING_REFERENCE');
  fails((x) => x.requirements[0].sourceSnapshotRefs.push('invented'), 'DANGLING_REFERENCE');
  fails((x) => x.requirements[0].test.historicalEvidenceRefs.push('invented'), 'DANGLING_REFERENCE');
  fails((x) => x.requirements[0].deliveryObservationRefs.push('invented'), 'DANGLING_REFERENCE');
});

test('implementation and final-acceptance dependency cycles are rejected', () => {
  fails((x) => {
    x.requirements[0].dependencies = [x.requirements[0].id];
  }, 'DEPENDENCY_CYCLE');
  fails((x) => {
    x.requirements[0].dependencies = [x.requirements[1].id];
    x.requirements[1].acceptance.dependsOnRequirementIds = [x.requirements[0].id];
  }, 'DEPENDENCY_CYCLE');
});

test('altered baseline denominators, hashes and cached coverage totals are rejected', () => {
  fails((x) => {
    x.baselineCatalogs[0].total = 299;
  }, 'BASELINE_CHANGED');
  fails((x) => {
    x.baselineCatalogs[1].sha256 = '0'.repeat(64);
  }, 'BASELINE_CHANGED');
  fails((x) => {
    x.coverage.productRequirements = 999;
  }, 'METRIC_DRIFT');
});

test('moving branch source links cannot masquerade as pinned observations', () => {
  fails((x) => {
    x.evidenceSources.auth.sourceFiles[0].ref = 'main';
  }, 'SOURCE_BINDING');
  fails((x) => {
    x.evidenceSources.auth.sourceFiles[0].url =
      'https://github.com/MulattoTech/MTerm-CLI/blob/main/gateway/app.mjs';
  }, 'SOURCE_BINDING');
});

test('acceptance ownership URLs cannot silently redirect readers to another issue or host', () => {
  fails((x) => {
    x.requirements[0].acceptance.trackingUrl = 'https://example.test/owner';
  }, 'DANGLING_REFERENCE');
  fails((x) => {
    x.requirements[0].acceptance.trackingUrl = 'https://github.com/MulattoTech/MTerm-CLI/issues/81';
  }, 'DANGLING_REFERENCE');
});

test('claimed qualified component delivery needs its matching saved main check receipt', () => {
  fails((x) => {
    x.deliveryObservations[0].mainSha = 'd'.repeat(40);
  }, 'SOURCE_BINDING');
  fails((x) => {
    x.deliveryObservations[0].evidencePath = 'docs/missing-receipt.json';
  }, 'SOURCE_BINDING');
});

test('consumed evidence bytes are pinned', () => {
  fails((x) => {
    x.inputEvidenceHashes['docs/engineering-runs/evidence/upstream-research.json'] = 'c'.repeat(64);
  }, 'EVIDENCE_CHANGED');
});

test('unknown delivery labels cannot claim extra verification states', () => {
  fails((x) => {
    x.deliveryObservations[0].kind = 'QUALIFIED_ALL_PRODUCTION_DEPLOYED';
  }, 'SOURCE_BINDING');
});

test('issue closure and historical green CI never create whole-requirement credit', () => {
  const value = copy();
  value.issueIndex['10'].state = 'closed';
  value.requirements[0].github.issues.find((i) => i.number === 10).state = 'closed';
  const metrics = validateCapabilityRegister(value, context);
  assert.equal(metrics.accepted, 0);
  assert.equal(metrics.tested, 0);
  for (const [section, flag] of [
    ['implementation', 'codeComplete'],
    ['test', 'currentRequirementSuitePassed'],
    ['merge', 'requirementCompleteMerged'],
    ['deployment', 'requirementCompleteDeployed'],
  ]) {
    fails((x) => {
      x.requirements[0][section][flag] = true;
    }, 'QUALIFICATION_REQUIRED');
  }
  fails((x) => {
    x.requirements[0].acceptance.status = 'ACCEPTED';
  }, 'QUALIFICATION_REQUIRED');
});

function completeOne(value) {
  const row = value.requirements[0];
  const sourceSha = value.evidenceSources.auth.sourceFiles[0].ref;
  row.qualifiedSource = {
    sourceSha,
    evidenceKey: 'auth',
    repository: 'MulattoTech/MTerm-CLI',
    layer: 'standalone_staging_gateway',
    environment: 'owned-test',
  };
  const at = '2026-11-12T18:00:00.000Z';
  const criteriaSha256 = createHash('sha256').update(JSON.stringify(row.acceptance.criteria)).digest('hex');
  for (const axis of ['implementation', 'test', 'merge', 'deployment', 'acceptance']) {
    const id = 'fixture-' + axis;
    value.qualificationReceipts[id] = {
      requirementId: row.id,
      axis,
      ...row.qualifiedSource,
      criteriaSha256,
      fullRequirement: true,
      result: 'PASS',
      verifiedAt: at,
      reviewer: 'independent-fixture-reviewer',
      evidence: [
        {
          url: `https://github.com/MulattoTech/MTerm-CLI/blob/${sourceSha}/docs/owned-fixture.json`,
          sha256: 'a'.repeat(64),
        },
      ],
    };
    row[axis].qualificationRef = id;
  }
  row.implementation.codeComplete = true;
  row.test.currentRequirementSuitePassed = true;
  row.merge.requirementCompleteMerged = true;
  row.deployment.requirementCompleteDeployed = true;
  row.acceptance.status = 'ACCEPTED';
  row.lifecycleState = 'ACCEPTED';
  row.lastVerifiedAt = row.acceptance.lastVerifiedAt = at;
  return row;
}

test('explicit full-scope receipts produce separate counts without partial component inference', () => {
  const value = copy();
  completeOne(value);
  const result = validateCapabilityRegister(value, context);
  for (const key of ['codeComplete', 'tested', 'merged', 'deployed', 'accepted'])
    assert.equal(result[key], 1);
  assert.equal(result.productRequirements, 143);
  assert.equal(result.roadmapMaturity, null);
});

test('source implementation, tests and merge can qualify without runtime deployment or acceptance', () => {
  const value = copy();
  const row = completeOne(value);
  row.deployment.requirementCompleteDeployed = false;
  row.acceptance.status = 'NOT_ACCEPTED';
  row.lifecycleState = 'MERGED';
  row.lastVerifiedAt = row.acceptance.lastVerifiedAt = null;
  const result = validateCapabilityRegister(value, context);
  assert.equal(result.codeComplete, 1);
  assert.equal(result.tested, 1);
  assert.equal(result.merged, 1);
  assert.equal(result.deployed, 0);
  assert.equal(result.accepted, 0);
});

test('full acceptance cannot bypass its explicit final-qualification prerequisites', () => {
  const value = copy();
  const row = completeOne(value);
  row.acceptance.dependsOnRequirementIds = [value.requirements[1].id];
  assert.throws(() => validateCapabilityRegister(value, context), /QUALIFICATION_SCOPE/);
});

test('stale source, wrong layer and changed acceptance criteria invalidate qualification', () => {
  for (const [key, replacement] of [
    ['sourceSha', 'b'.repeat(40)],
    ['layer', 'managed_bridge'],
    ['criteriaSha256', 'b'.repeat(64)],
  ]) {
    const value = copy();
    completeOne(value);
    value.qualificationReceipts['fixture-test'][key] = replacement;
    assert.throws(() => validateCapabilityRegister(value, context), /QUALIFICATION_SCOPE/);
  }
});

test('internally consistent receipts cannot attribute CLI source to the separate managed bridge', () => {
  const value = copy(),
    row = completeOne(value);
  row.qualifiedSource.layer = 'managed_bridge';
  row.qualifiedSource.repository = 'MulattoTech/MTechLabs-Access';
  for (const receipt of Object.values(value.qualificationReceipts)) {
    receipt.layer = row.qualifiedSource.layer;
    receipt.repository = row.qualifiedSource.repository;
  }
  assert.throws(() => validateCapabilityRegister(value, context), /QUALIFICATION_SCOPE/);
});

test('six unrelated green jobs cannot substitute for the required platform and isolation checks', () => {
  const changed = structuredClone(context);
  const value = copy(),
    input = register.deliveryObservations[0].evidencePath;
  const receipt = JSON.parse(changed.evidenceTexts[input]);
  receipt.main.checks[0].name = 'unrelated-trivial-check';
  changed.evidenceTexts[input] = JSON.stringify(receipt);
  value.inputEvidenceHashes[input] = createHash('sha256').update(changed.evidenceTexts[input]).digest('hex');
  assert.throws(() => validateCapabilityRegister(value, changed), /SOURCE_BINDING/);
});

test('partial receipts, unpinned evidence and unqualified verification timestamps cannot award acceptance', () => {
  for (const mutate of [
    (receipt) => {
      receipt.fullRequirement = false;
    },
    (receipt) => {
      receipt.evidence[0].url = 'https://github.com/MulattoTech/MTerm-CLI/blob/main/report.md';
    },
    (receipt) => {
      receipt.evidence = [];
    },
  ]) {
    const value = copy();
    completeOne(value);
    mutate(value.qualificationReceipts['fixture-acceptance']);
    assert.throws(() => validateCapabilityRegister(value, context), /QUALIFICATION_SCOPE/);
  }
  fails((x) => {
    x.requirements[0].lastVerifiedAt = '2026-11-12T18:00:00Z';
  }, 'VERIFICATION_TIMESTAMP');
});

test('report rendering is deterministic and keeps unsafe presentation characters literal', () => {
  const value = copy();
  value.requirements[0].name = '<script>alert(1)</script> | misleading\nrow';
  const result = validateCapabilityRegister(value, context);
  const rendered = renderCapabilityReport(value, result);
  assert.equal(rendered, renderCapabilityReport(value, result));
  assert.equal(rendered.includes('<script>'), false);
  assert.ok(rendered.includes('maturity is not calculated'));
  assert.ok(rendered.includes('0 / 143'));
});
