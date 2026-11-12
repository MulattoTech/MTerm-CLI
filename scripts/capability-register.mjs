// SPDX-License-Identifier: MIT
// Development-only inventory checks. Evidence coherence is not behavioral attestation.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateDeliveryIdentity } from './capability-delivery-evidence.mjs';

const HASH = /^[a-f0-9]{64}$/;
const SHA = /^[a-f0-9]{40}$/;
const hash = (text) => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const ensure = (ok, code, message) => {
  if (!ok) throw new Error(`[${code}] ${message}`);
};
const unique = (values, label) => {
  ensure(new Set(values).size === values.length, 'DUPLICATE_ID', label);
  return new Set(values);
};
const date = (value) =>
  typeof value === 'string' && /T.*(?:Z|\+00:00)$/.test(value) && Number.isFinite(Date.parse(value));
const BASELINES = [
  ['CLI-300', 'CLI', 'docs/roadmap/requirements-seed.json', 'items', 300],
  ['DCP-48', 'DCP', 'docs/roadmap/desktop-commander-parity.json', 'gaps', 48],
  ['WEB-12', 'WEB', 'docs/roadmap/remote-web-progress.json', 'items', 12],
  ['AUG-117', 'AUG', 'docs/expansion/queue.json', 'issues', 117],
];
const AXES = {
  implementation: 'codeComplete',
  test: 'currentRequirementSuitePassed',
  merge: 'requirementCompleteMerged',
  deployment: 'requirementCompleteDeployed',
  acceptance: 'status',
};
const REQUIRED_MAIN_CHECKS = new Set([
  'CI / fast',
  'Native Linux isolation / Node 24',
  'ubuntu-24.04 / Node 24',
  'windows-2022 / Node 24',
  'macos-15 / Node 24',
  'macos-15-intel / Node 24',
]);
// These immutable workflow identities were independently inspected with the
// candidate/main receipts. A new workflow needs explicit contract review;
// neither a job count nor a caller-supplied list can lower the required gate.
const WORKFLOW_CONTRACTS = {
  'MulattoTech/MTerm-CLI': {
    '.github/workflows/ci-fast.yml': {
      '8d564a5ed8743b8186d628d796d057c3131a98b6': {
        sha256: '78ea3ed7766e9ae4061dc8ec3abae8fd21eedbf90e8daf731b693c9043e1327f',
        checks: ['CI / fast'],
      },
    },
    '.github/workflows/cli-ci.yml': {
      '1120c455f1ccf743b2e27f99b6f4ed3d57b06319': {
        sha256: '5b4fbe4bf4f8debf43653909d7f8e18357f1a39ae2736f8a6a2f0119aa1a62a5',
        checks: [...REQUIRED_MAIN_CHECKS].filter((name) => name !== 'CI / fast'),
      },
    },
  },
  'MulattoTech/MTechLabs-Access': {
    '.github/workflows/check.yml': {
      '725e009c295a8df5056d7df23fc75bcf11bdfc70': {
        sha256: 'a353e58216b351c171ff0e15a1e6fad977d40d6ff8a79e0b90508d4307ceddc3',
        checks: ['test', 'managed-mcp'],
      },
      '1e59843724dae5d6d13a4eef8fdbb37e25c868da': {
        sha256: '224b2314069cd97cb7e8c75f79db58c654eef4a14119b445c164292248b24d06',
        checks: [
          'test',
          'managed-mcp',
          'Upstream qualification / ubuntu-latest / Node 24',
          'Upstream qualification / windows-latest / Node 24',
        ],
      },
      '518de4914af36042a0c1a4476fc3fca7340169c1': {
        sha256: 'de994aae5acefd11f5762436d88500e4e9dd0f74d886f973b2af90a9463b4aad',
        checks: [
          'test',
          'managed-mcp',
          'managed-mcp-windows',
          'Upstream qualification / ubuntu-latest / Node 24',
          'Upstream qualification / windows-latest / Node 24',
        ],
      },
    },
  },
};
const sameSet = (values, expected) =>
  Array.isArray(values) &&
  values.length === expected.length &&
  new Set(values).size === values.length &&
  values.every((value) => expected.includes(value));
const positiveInteger = (value) => Number.isSafeInteger(value) && value > 0;
const evidencePath = (value) =>
  typeof value === 'string' && /^docs\/engineering-runs\/evidence\/[a-zA-Z0-9_-]+\.json$/.test(value);
const UPSTREAM_INPUT = 'docs/engineering-runs/evidence/upstream-research.json';
const DELIVERY_KINDS = new Set([
  'PARTIAL_CANDIDATE',
  'SUPERSEDED_PARTIAL_CANDIDATE',
  'MERGED_PENDING_MAIN_QUALIFICATION',
  'QUALIFIED_PARTIAL_COMPONENTS',
]);

function missionBullets(text) {
  let section = 0,
    ordinal = 0;
  return text.split(/\r?\n/).flatMap((line, index) => {
    if (line.startsWith('## ')) section = Number(line.match(/^## (\d+)\./)?.[1] ?? 0);
    if (!/^(?:- |\d+\. )/.test(line)) return [];
    if ([4, 5, 6, 7, 8].includes(section)) ordinal++;
    return [
      {
        id: `MISSION-L${String(index + 1).padStart(4, '0')}`,
        line: index + 1,
        text: line.replace(/^(?:- |\d+\. )/, ''),
        product: [4, 5, 6, 7, 8].includes(section) && ordinal >= 11,
      },
    ];
  });
}

function acyclic(rows) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const active = new Set(),
    done = new Set();
  function visit(id) {
    ensure(!active.has(id), 'DEPENDENCY_CYCLE', id);
    if (done.has(id)) return;
    ensure(byId.has(id), 'DANGLING_REFERENCE', `Dependency ${id}`);
    active.add(id);
    const row = byId.get(id);
    for (const target of [...row.dependencies, ...row.acceptance.dependsOnRequirementIds]) visit(target);
    active.delete(id);
    done.add(id);
  }
  for (const row of rows) visit(row.id);
}

function pinnedUrl(value, sourceSha) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) return false;
    const match =
      url.hostname === 'github.com'
        ? url.pathname.match(/^\/[^/]+\/[^/]+\/blob\/([a-f0-9]{40})\/.+/)
        : url.hostname === 'raw.githubusercontent.com'
          ? url.pathname.match(/^\/[^/]+\/[^/]+\/([a-f0-9]{40})\/.+/)
          : null;
    return Boolean(match && (!sourceSha || match[1] === sourceSha));
  } catch {
    return false;
  }
}

function validateReceipt(register, row, axis) {
  const ref = row[axis].qualificationRef;
  const receipt = register.qualificationReceipts?.[ref];
  ensure(receipt, 'QUALIFICATION_REQUIRED', `${row.id} ${axis}`);
  const source = row.qualifiedSource;
  const observation = register.evidenceSources[source?.evidenceKey];
  const sourceRefs = observation
    ? [observation.ref, observation.sourceSha, ...(observation.sourceFiles ?? []).map((f) => f.ref)]
    : [];
  ensure(
    source &&
      SHA.test(source.sourceSha) &&
      sourceRefs.includes(source.sourceSha) &&
      row.sourceSnapshotRefs.includes(source.evidenceKey) &&
      Object.hasOwn(register.productLayers, source.layer) &&
      register.productLayers[source.layer].repository === source.repository &&
      (observation.repository ?? observation.sourceRepository) === source.repository &&
      observation.productLayers?.includes(source.layer) &&
      typeof source.environment === 'string' &&
      source.environment.length > 0 &&
      receipt.requirementId === row.id &&
      receipt.axis === axis &&
      receipt.sourceSha === source.sourceSha &&
      receipt.evidenceKey === source.evidenceKey &&
      receipt.repository === source.repository &&
      receipt.layer === source.layer &&
      receipt.environment === source.environment &&
      receipt.criteriaSha256 === hash(JSON.stringify(row.acceptance.criteria)) &&
      receipt.fullRequirement === true &&
      receipt.result === 'PASS' &&
      date(receipt.verifiedAt) &&
      typeof receipt.reviewer === 'string' &&
      receipt.reviewer.trim().length > 0 &&
      Array.isArray(receipt.evidence) &&
      receipt.evidence.length > 0 &&
      receipt.evidence.every((e) => HASH.test(e.sha256) && pinnedUrl(e.url)),
    'QUALIFICATION_SCOPE',
    `${row.id} ${axis}: exact source/layer/environment/criteria and full-scope evidence required`,
  );
  return receipt;
}

function qualifiedDelivery(register, item, receipt, context) {
  const repository = item.repository;
  const source = register.evidenceSources[item.sourceEvidenceKey];
  ensure(
    receipt &&
      receipt.repository === repository &&
      receipt.layer === item.layer &&
      receipt.productionRuntimeDeployment === false &&
      receipt.wholeRequirementAcceptance === false &&
      receipt.pullRequest === item.pullRequest &&
      receipt.candidateSha === item.candidateSha &&
      receipt.mainSha === item.mainSha &&
      receipt.tree === item.tree &&
      receipt.observedAt === item.observedAt &&
      receipt.candidateTreeEqualsMergeTree === true &&
      Array.isArray(receipt.mainParents) &&
      receipt.mainParents.length === 2 &&
      receipt.mainParents.every((sha) => SHA.test(sha)) &&
      receipt.mainParents[1] === item.candidateSha &&
      receipt.mainParents[0] !== item.candidateSha &&
      source &&
      (source.repository ?? source.sourceRepository) === repository &&
      source.sourceSha === item.mainSha &&
      source.productLayers?.includes(item.layer) &&
      Array.isArray(source.sourceFiles) &&
      source.sourceFiles.length > 0 &&
      source.sourceFiles.every((file) => file.ref === item.mainSha) &&
      Array.isArray(item.requirementIds) &&
      item.requirementIds.length > 0 &&
      typeof item.scope === 'string' &&
      item.scope.trim().length > 0,
    'SOURCE_BINDING',
    `${item.id}: repository/source/scope/merge identity`,
  );
  unique(item.requirementIds, `${item.id} requirement scope`);
  const contracts = WORKFLOW_CONTRACTS[repository];
  ensure(
    contracts &&
      Array.isArray(receipt.workflows) &&
      sameSet(
        receipt.workflows.map((w) => w.path),
        Object.keys(contracts),
      ),
    'SOURCE_BINDING',
    `${item.id}: reviewed workflow set`,
  );
  const expectedChecks = [];
  const byWorkflow = new Map();
  for (const workflow of receipt.workflows) {
    const contract = contracts[workflow.path]?.[workflow.gitBlob];
    ensure(
      contract &&
        workflow.repository === repository &&
        workflow.sha256 === contract.sha256 &&
        workflow.candidateSourceSha === item.candidateSha &&
        workflow.mainSourceSha === item.mainSha &&
        workflow.sameBytesOnCandidateAndMain === true &&
        workflow.candidateUrl ===
          `https://github.com/${repository}/blob/${item.candidateSha}/${workflow.path}` &&
        workflow.mainUrl === `https://github.com/${repository}/blob/${item.mainSha}/${workflow.path}` &&
        sameSet(workflow.expectedCheckNames, contract.checks),
      'SOURCE_BINDING',
      `${item.id}: exact workflow ${workflow.path}`,
    );
    byWorkflow.set(workflow.path, contract.checks);
    expectedChecks.push(...contract.checks);
  }
  ensure(
    sameSet(receipt.expectedCheckNames, expectedChecks),
    'SOURCE_BINDING',
    `${item.id}: full expected check set`,
  );
  for (const [phase, sha, event] of [
    ['candidate', item.candidateSha, 'pull_request'],
    ['main', item.mainSha, 'push'],
  ]) {
    const runs = receipt[phase]?.runs,
      checks = receipt[phase]?.checks;
    ensure(
      Array.isArray(runs) &&
        runs.length === byWorkflow.size &&
        sameSet(
          runs.map((run) => run.workflowPath),
          [...byWorkflow.keys()],
        ) &&
        new Set(runs.map((run) => run.id)).size === runs.length &&
        Array.isArray(checks) &&
        receipt[phase].allRequiredChecksPassed === true &&
        sameSet(
          checks.map((check) => check.name),
          expectedChecks,
        ) &&
        new Set(checks.map((check) => check.id)).size === checks.length &&
        item[`${phase}ChecksPassed`] === checks.length,
      'SOURCE_BINDING',
      `${item.id}: ${phase} complete run/check sets`,
    );
    const runMap = new Map(runs.map((run) => [run.id, run]));
    for (const run of runs)
      ensure(
        positiveInteger(run.id) &&
          positiveInteger(run.workflowId) &&
          positiveInteger(run.runAttempt) &&
          run.headSha === sha &&
          run.event === event &&
          run.status === 'completed' &&
          run.conclusion === 'success' &&
          run.url === `https://github.com/${repository}/actions/runs/${run.id}`,
        'SOURCE_BINDING',
        `${item.id}: ${phase} run identity/result`,
      );
    for (const check of checks) {
      const run = runMap.get(check.runId);
      ensure(
        run &&
          positiveInteger(check.id) &&
          check.runAttempt === run.runAttempt &&
          check.headSha === sha &&
          byWorkflow.get(run.workflowPath).includes(check.name) &&
          check.status === 'completed' &&
          check.conclusion === 'success' &&
          check.url === `https://github.com/${repository}/actions/runs/${run.id}/job/${check.id}`,
        'SOURCE_BINDING',
        `${item.id}: ${phase} job identity/result`,
      );
    }
  }
  for (const key of ['runs', 'checks']) {
    const candidateIds = new Set(receipt.candidate[key].map((entry) => entry.id));
    ensure(
      receipt.main[key].every((entry) => !candidateIds.has(entry.id)),
      'SOURCE_BINDING',
      `${item.id}: candidate/main ${key} must have distinct physical identities`,
    );
  }
  validateDeliveryIdentity(item, receipt, context.evidenceTexts);
}

const UNVERIFIED_RELEASE_AXES = [
  'backendDeploymentVerified',
  'canonicalOnlyOAuthVerified',
  'uiActivationVerified',
  'workingWrapperRemovalVerified',
];
const SAVED_PLUGIN_FILES = [
  '.app.json',
  '.codex-plugin/plugin.json',
  '.mcp.json',
  'README.md',
  'assets/icon.svg',
  'mcp.json',
  'plugin.json',
  'skills/connection-recovery/SKILL.md',
];
function validateSavedPackage(register, release, context, observations) {
  const receipt = JSON.parse(context.evidenceTexts[release.evidencePath]);
  const manifest = JSON.parse(context.evidenceTexts[receipt.readbackManifestEvidence.repositoryPath]);
  const source = observations.get(release.sourceDeliveryRef);
  const files = receipt.files && Object.entries(receipt.files);
  ensure(
    release.kind === 'VERIFIED_SAVED_PLUGIN_PACKAGE' &&
      release.layer === 'canonical_plugin' &&
      source?.layer === release.layer &&
      source.kind === 'QUALIFIED_PARTIAL_COMPONENTS' &&
      register.productLayers[release.layer].repository === release.repository &&
      register.productLayers[release.layer].version === release.version &&
      receipt.sourceRepository === release.repository &&
      source.repository === release.repository &&
      receipt.sourceMainSha === source.mainSha &&
      release.sourceMainSha === source.mainSha &&
      receipt.version === release.version &&
      /^\d+\.\d+\.\d+$/.test(release.version) &&
      receipt.status === 'published-release-source-readback-verified' &&
      receipt.verifiedAt === release.observedAt &&
      date(release.observedAt) &&
      date(release.sourceReconciliationObservedAt) &&
      Date.parse(release.sourceReconciliationObservedAt) >= Date.parse(release.observedAt) &&
      release.sourceReconciliationObservedAt === receipt.sourceReconciliationObservedAt &&
      release.wholeRequirementAcceptance === false &&
      receipt.wholeRequirementAcceptance === false &&
      UNVERIFIED_RELEASE_AXES.every((axis) => release[axis] === false && receipt[axis] === false) &&
      receipt.allEightFilesMatchApprovedCandidate === true &&
      receipt.fileCount === 8 &&
      Array.isArray(files) &&
      files.length === receipt.fileCount &&
      sameSet(Object.keys(receipt.files), SAVED_PLUGIN_FILES) &&
      sameSet(Object.keys(manifest.files ?? {}), SAVED_PLUGIN_FILES) &&
      manifest.verifiedAt === receipt.verifiedAt &&
      manifest.observedVersion === receipt.version &&
      manifest.status === receipt.status &&
      manifest.originalReadbackSha256 === receipt.originalReadbackEvidence?.sha256 &&
      HASH.test(manifest.approvedReceiptSha256) &&
      HASH.test(manifest.publishedSourceReceiptSha256) &&
      manifest.independentReadback?.fileCount === receipt.fileCount &&
      manifest.preservation?.everyFileByteIdenticalToApprovedCandidate === true &&
      files.every(
        ([filename, details]) =>
          typeof filename === 'string' &&
          filename.length > 0 &&
          !filename.startsWith('/') &&
          !filename.includes('..') &&
          HASH.test(details.sha256) &&
          positiveInteger(details.bytes) &&
          details.matchesApprovedCandidate === true &&
          manifest.files[filename]?.sha256 === details.sha256 &&
          manifest.files[filename]?.bytes === details.bytes &&
          manifest.files[filename]?.matchesApprovedCandidate === true,
      ) &&
      HASH.test(receipt.originalReadbackEvidence?.sha256),
    'SOURCE_BINDING',
    `${release.id}: saved package readback is separate from runtime and OAuth`,
  );
}

export function validateCapabilityRegister(register, context) {
  ensure(
    register.schemaVersion === 1 && Array.isArray(register.requirements),
    'SCHEMA',
    'Unsupported register',
  );
  ensure(
    (register.deliveryObservations ?? []).every((item) => DELIVERY_KINDS.has(item.kind)),
    'SOURCE_BINDING',
    'Unknown delivery observation kind',
  );
  const inputPaths = new Set([
    UPSTREAM_INPUT,
    ...(register.deliveryObservations ?? [])
      .filter((item) => item.kind === 'QUALIFIED_PARTIAL_COMPONENTS')
      .map((item) => item.evidencePath),
  ]);
  for (const release of register.savedPluginReleaseObservations ?? []) {
    ensure(
      evidencePath(release.evidencePath) && typeof context.evidenceTexts?.[release.evidencePath] === 'string',
      'SOURCE_BINDING',
      'Saved package receipt path',
    );
    inputPaths.add(release.evidencePath);
    const receipt = JSON.parse(context.evidenceTexts[release.evidencePath]);
    const manifest = receipt.readbackManifestEvidence;
    ensure(
      evidencePath(manifest?.repositoryPath) &&
        HASH.test(manifest.lfNormalizedSha256) &&
        typeof context.evidenceTexts?.[manifest.repositoryPath] === 'string' &&
        hash(context.evidenceTexts[manifest.repositoryPath]) === manifest.lfNormalizedSha256,
      'SOURCE_BINDING',
      'Saved package readback manifest',
    );
    inputPaths.add(manifest.repositoryPath);
  }
  for (const item of register.deliveryObservations ?? []) {
    if (item.kind !== 'QUALIFIED_PARTIAL_COMPONENTS') continue;
    ensure(
      evidencePath(item.evidencePath) && typeof context.evidenceTexts?.[item.evidencePath] === 'string',
      'SOURCE_BINDING',
      `${item.id}: saved delivery evidence`,
    );
    const receipt = JSON.parse(context.evidenceTexts[item.evidencePath]);
    ensure(
      Array.isArray(receipt.originalEvidence) && receipt.originalEvidence.length > 0,
      'SOURCE_BINDING',
      `${item.id}: retained original qualification`,
    );
    for (const original of receipt.originalEvidence) {
      ensure(
        evidencePath(original.repositoryPath) &&
          HASH.test(original.lfNormalizedSha256) &&
          typeof context.evidenceTexts?.[original.repositoryPath] === 'string' &&
          hash(context.evidenceTexts[original.repositoryPath]) === original.lfNormalizedSha256,
        'SOURCE_BINDING',
        `${item.id}: retained original evidence binding`,
      );
      inputPaths.add(original.repositoryPath);
    }
  }
  ensure(
    JSON.stringify([...inputPaths].sort()) ===
      JSON.stringify(Object.keys(register.inputEvidenceHashes ?? {}).sort()),
    'SOURCE_BINDING',
    'Consumed evidence must have an explicit reviewed hash',
  );
  for (const input of inputPaths) {
    ensure(typeof context.evidenceTexts?.[input] === 'string', 'SOURCE_BINDING', input);
    ensure(
      register.inputEvidenceHashes[input] === hash(context.evidenceTexts[input]),
      'EVIDENCE_CHANGED',
      input,
    );
  }
  const rows = register.requirements;
  const ids = unique(
    rows.map((r) => r.id),
    'Product requirements',
  );
  ensure(
    rows.every((r) => /^MTR-[A-Z]+-\d{2}$/.test(r.id)),
    'SCHEMA',
    'Invalid product ID',
  );
  unique(
    register.runObligations.map((r) => r.id),
    'Run obligations',
  );
  unique(
    register.missionBulletCrosswalk.map((r) => r.bulletId),
    'Mission crosswalk',
  );
  ensure(
    register.runObligations.every((r) => r.countsTowardProductCompletion === false),
    'MISSION_COVERAGE',
    'Governance cannot award product completion',
  );

  ensure(
    register.baselineCatalogs.length === BASELINES.length,
    'BASELINE_CHANGED',
    'Separate catalogs required',
  );
  const catalogs = {},
    baselines = [];
  for (const [id, prefix, filename, key, total] of BASELINES) {
    const baseline = register.baselineCatalogs.find((b) => b.id === id);
    const text = context.catalogTexts[filename],
      actual = JSON.parse(text)[key];
    ensure(
      baseline &&
        baseline.path === filename &&
        baseline.total === total &&
        actual.length === total &&
        baseline.sha256 === hash(text) &&
        baseline.treatment === 'PRESERVED_SEPARATE_DENOMINATOR',
      'BASELINE_CHANGED',
      id,
    );
    catalogs[prefix] = unique(
      actual.map((item) => item.id),
      id,
    );
    baselines.push({ id, total, sha256: baseline.sha256 });
  }
  ensure(
    register.metricBaselineEvidence.path === 'docs/roadmap/progress.json' &&
      register.metricBaselineEvidence.sha256 === hash(context.progressText),
    'BASELINE_CHANGED',
    'CLI stage/weight snapshot changed; explicit reconciliation required',
  );
  ensure(
    register.mission.path === 'docs/capabilities/mission-2026-11-12.md' &&
      register.mission.sha256 === hash(context.missionText),
    'MISSION_COVERAGE',
    'Mission source hash',
  );
  const bullets = missionBullets(context.missionText),
    bulletMap = new Map(bullets.map((b) => [b.id, b]));
  const groups = new Map(register.runObligations.map((g) => [g.id, g]));
  ensure(
    bullets.length === register.missionBulletCrosswalk.length,
    'MISSION_COVERAGE',
    'Every original bullet must remain mapped',
  );
  const rowMap = new Map(rows.map((r) => [r.id, r]));
  for (const entry of register.missionBulletCrosswalk) {
    const source = bulletMap.get(entry.bulletId);
    ensure(
      source &&
        source.line === entry.line &&
        Array.isArray(entry.targets) &&
        entry.targets.length > 0 &&
        entry.kind === (source.product ? 'PRODUCT_REQUIREMENT' : 'RUN_OBLIGATION_OR_DISCOVERY_HINT'),
      'MISSION_COVERAGE',
      entry.bulletId,
    );
    unique(entry.targets, entry.bulletId);
    for (const target of entry.targets) {
      if (source.product) {
        ensure(
          ids.has(target) &&
            rowMap
              .get(target)
              .source.references.some(
                (r) => r.bulletId === entry.bulletId && r.line === source.line && r.text === source.text,
              ),
          'MISSION_COVERAGE',
          `${entry.bulletId} -> ${target}`,
        );
      } else
        ensure(
          groups.get(target)?.sourceBulletIds.includes(entry.bulletId),
          'MISSION_COVERAGE',
          `${entry.bulletId} -> ${target}`,
        );
    }
  }

  for (const [key, source] of Object.entries(register.evidenceSources)) {
    const repository = source.repository ?? source.sourceRepository;
    for (const file of source.sourceFiles ?? []) {
      const ref = file.ref ?? source.ref ?? source.sourceSha;
      ensure(
        SHA.test(ref) &&
          pinnedUrl(file.url, ref) &&
          file.url === `https://github.com/${repository}/blob/${ref}/${file.path}` &&
          (file.sha256 === undefined || HASH.test(file.sha256)),
        'SOURCE_BINDING',
        key,
      );
    }
    if (source.sourceFile)
      ensure(
        SHA.test(source.ref) &&
          source.sourceUrl === `https://github.com/${repository}/blob/${source.ref}/${source.sourceFile}`,
        'SOURCE_BINDING',
        key,
      );
  }
  const observations = new Map((register.deliveryObservations ?? []).map((o) => [o.id, o]));
  unique(
    (register.deliveryObservations ?? []).map((o) => o.id),
    'Delivery observations',
  );
  for (const item of observations.values()) {
    ensure(
      SHA.test(item.candidateSha) &&
        SHA.test(item.tree) &&
        date(item.observedAt) &&
        Object.hasOwn(register.productLayers, item.layer) &&
        typeof item.repository === 'string' &&
        register.productLayers[item.layer].repository === item.repository &&
        positiveInteger(item.pullRequest) &&
        item.deployed === false &&
        item.wholeRequirementAcceptance === false,
      'SOURCE_BINDING',
      `Partial delivery ${item.id}`,
    );
    if (item.kind === 'QUALIFIED_PARTIAL_COMPONENTS') {
      const receipt = JSON.parse(context.evidenceTexts[item.evidencePath]);
      ensure(SHA.test(item.mainSha), 'SOURCE_BINDING', item.id);
      qualifiedDelivery(register, item, receipt, context);
      for (const id of item.requirementIds)
        ensure(
          rowMap.get(id)?.deliveryObservationRefs.includes(item.id),
          'SOURCE_BINDING',
          `${item.id}: unmapped scoped requirement ${id}`,
        );
    }
    if (item.supersededBy !== undefined) {
      const later = observations.get(item.supersededBy);
      ensure(
        later &&
          later.id !== item.id &&
          later.repository === item.repository &&
          later.pullRequest === item.pullRequest &&
          Date.parse(later.observedAt) > Date.parse(item.observedAt),
        'SOURCE_BINDING',
        `${item.id}: invalid superseding delivery`,
      );
      ensure(
        item.kind !== 'QUALIFIED_PARTIAL_COMPONENTS' &&
          (item.kind !== 'MERGED_PENDING_MAIN_QUALIFICATION' ||
            (later.kind === 'QUALIFIED_PARTIAL_COMPONENTS' &&
              later.candidateSha === item.candidateSha &&
              later.mainSha === item.mainSha &&
              later.tree === item.tree)),
        'SOURCE_BINDING',
        `${item.id}: supersession cannot replace a merged source identity`,
      );
    }
  }
  unique(
    [...observations.values()]
      .filter((item) => item.kind === 'QUALIFIED_PARTIAL_COMPONENTS')
      .map((item) => `${item.repository}#${item.pullRequest}`),
    'Qualified source deliveries',
  );
  unique(
    (register.savedPluginReleaseObservations ?? []).map((item) => item.id),
    'Saved plugin releases',
  );
  unique(
    (register.savedPluginReleaseObservations ?? []).map(
      (item) => `${item.repository}/${item.layer}@${item.version}`,
    ),
    'Saved plugin package identities',
  );
  for (const release of register.savedPluginReleaseObservations ?? [])
    validateSavedPackage(register, release, context, observations);
  const upstreamIds = new Set(
    JSON.parse(context.evidenceTexts[UPSTREAM_INPUT]).capability_groups.map((u) => u.id),
  );
  const issueNumbers = new Set();
  let codeComplete = 0,
    tested = 0,
    merged = 0,
    deployed = 0,
    accepted = 0;
  const states = new Set(register.statePolicy.lifecycleStates);
  for (const row of rows) {
    ensure(
      typeof row.name === 'string' &&
        row.name.trim() &&
        states.has(row.lifecycleState) &&
        row.acceptance.criteria.length > 0 &&
        row.acceptance.criteria.every((c) => typeof c === 'string' && c.trim()),
      'SCHEMA',
      row.id,
    );
    ensure(
      Object.hasOwn(register.issueIndex, row.acceptance.trackingIssue) &&
        row.github.primaryIssue === row.acceptance.trackingIssue &&
        row.acceptance.trackingUrl ===
          `https://github.com/${register.sourceRepository}/issues/${row.acceptance.trackingIssue}` &&
        row.github.issues.some((i) => i.number === row.acceptance.trackingIssue),
      'DANGLING_REFERENCE',
      `${row.id} acceptance owner`,
    );
    for (const issue of row.github.issues) {
      ensure(
        Object.hasOwn(register.issueIndex, issue.number) &&
          issue.url === `https://github.com/${register.sourceRepository}/issues/${issue.number}`,
        'DANGLING_REFERENCE',
        `${row.id} issue`,
      );
      issueNumbers.add(issue.number);
    }
    for (const [prefix, refs] of Object.entries(row.requirementRefs)) {
      ensure(Object.hasOwn(catalogs, prefix), 'DANGLING_REFERENCE', prefix);
      for (const ref of refs) ensure(catalogs[prefix].has(ref), 'DANGLING_REFERENCE', `${row.id} ${ref}`);
    }
    for (const ref of row.upstreamRequirementRefs)
      ensure(upstreamIds.has(ref), 'DANGLING_REFERENCE', `${row.id} ${ref}`);
    const current = new Set(row.sourceSnapshotRefs);
    for (const ref of [
      ...row.sourceSnapshotRefs,
      ...row.implementation.sourceObservationKeys,
      ...row.merge.partialBaselineComponents,
      ...row.implementation.layers.flatMap((layer) => layer.sourceEvidence),
    ])
      ensure(
        Object.hasOwn(register.evidenceSources, ref) && current.has(ref),
        'DANGLING_REFERENCE',
        `${row.id} source ${ref}`,
      );
    for (const ref of row.test.historicalEvidenceRefs)
      ensure(
        Object.hasOwn(register.historicalEvidenceSources, ref),
        'DANGLING_REFERENCE',
        `${row.id} history ${ref}`,
      );
    unique(row.deliveryObservationRefs, `${row.id}: component delivery references`);
    for (const ref of row.deliveryObservationRefs) {
      ensure(observations.has(ref), 'DANGLING_REFERENCE', `${row.id} delivery ${ref}`);
      const item = observations.get(ref);
      if (item.kind === 'QUALIFIED_PARTIAL_COMPONENTS')
        ensure(
          item.requirementIds.includes(row.id) && current.has(item.sourceEvidenceKey),
          'SOURCE_BINDING',
          `${row.id}: unrelated component ${ref}`,
        );
    }
    const claims = {};
    for (const [axis, flag] of Object.entries(AXES)) {
      if (axis === 'acceptance')
        ensure(['NOT_ACCEPTED', 'ACCEPTED'].includes(row[axis][flag]), 'SCHEMA', `${row.id} acceptance`);
      else ensure(typeof row[axis][flag] === 'boolean', 'SCHEMA', `${row.id} ${axis}`);
      claims[axis] = axis === 'acceptance' ? row[axis][flag] === 'ACCEPTED' : row[axis][flag];
      if (claims[axis]) validateReceipt(register, row, axis);
    }
    if (claims.acceptance) {
      ensure(
        Object.values(claims).every(Boolean),
        'QUALIFICATION_SCOPE',
        `${row.id} accepted without all required axes`,
      );
      ensure(
        row.acceptance.dependsOnRequirementIds.every(
          (id) => rowMap.get(id)?.acceptance.status === 'ACCEPTED',
        ),
        'QUALIFICATION_SCOPE',
        `${row.id} has unaccepted final-qualification prerequisites`,
      );
      const at = register.qualificationReceipts[row.acceptance.qualificationRef].verifiedAt;
      ensure(
        row.lastVerifiedAt === at && row.acceptance.lastVerifiedAt === at,
        'VERIFICATION_TIMESTAMP',
        row.id,
      );
    } else
      ensure(
        row.lastVerifiedAt === null && row.acceptance.lastVerifiedAt === null,
        'VERIFICATION_TIMESTAMP',
        row.id,
      );
    for (const [state, axis] of [
      ['CODE_COMPLETE', 'implementation'],
      ['TESTED', 'test'],
      ['MERGED', 'merge'],
      ['DEPLOYED', 'deployment'],
      ['ACCEPTED', 'acceptance'],
    ])
      if (row.lifecycleState === state)
        ensure(claims[axis], 'QUALIFICATION_REQUIRED', `${row.id} lifecycle ${state}`);
    codeComplete += Number(claims.implementation);
    tested += Number(claims.test);
    merged += Number(claims.merge);
    deployed += Number(claims.deployment);
    accepted += Number(claims.acceptance);
  }
  acyclic(rows);
  const categories = {};
  for (const row of rows) categories[row.category] = (categories[row.category] ?? 0) + 1;
  const expected = {
    missionBullets: bullets.length,
    mappedMissionBullets: bullets.length,
    featureBullets: bullets.filter((b) => b.product).length,
    mappedFeatureBullets: bullets.filter((b) => b.product).length,
    productRequirements: rows.length,
    runObligationGroups: groups.size,
    trackedProductRequirements: rows.length,
    linkedGitHubIssues: issueNumbers.size,
    resolvedProposedScopes: register.issueDispositions.length,
    issuesCreatedForMission: register.issueDispositions.filter((d) => d.status === 'CREATED').length,
    existingIssueAddendaVerified: register.registeredExistingIssueUpdates.filter(
      (d) => d.status === 'ADDENDUM_VERIFIED_PRESENT',
    ).length,
    unresolvedIssueCandidates: register.issueCandidates.length,
  };
  for (const [key, value] of Object.entries(expected))
    ensure(register.coverage[key] === value, 'METRIC_DRIFT', key);
  ensure(
    JSON.stringify(Object.entries(register.coverage.byCategory).sort()) ===
      JSON.stringify(Object.entries(categories).sort()),
    'METRIC_DRIFT',
    'Categories',
  );
  ensure(register.coverage.unmappedBulletIds.length === 0, 'MISSION_COVERAGE', 'Unmapped bullets');
  return {
    schemaVersion: 1,
    catalog: register.catalog,
    inventoryObservedAt: register.observedAt,
    ...expected,
    registeredRequirements: rows.length,
    codeComplete,
    tested,
    merged,
    deployed,
    accepted,
    partialSourceRows: rows.filter((r) => r.sourceSnapshotRefs.length > 0).length,
    partialMergedRows: rows.filter((r) => r.merge.partialBaselineComponents.length > 0).length,
    qualifiedPartialRows: rows.filter((r) =>
      r.deliveryObservationRefs.some((ref) => observations.get(ref).kind === 'QUALIFIED_PARTIAL_COMPONENTS'),
    ).length,
    qualifiedComponentDeliveries: [...observations.values()].filter(
      (item) => item.kind === 'QUALIFIED_PARTIAL_COMPONENTS',
    ).length,
    verifiedSavedPluginPackages: (register.savedPluginReleaseObservations ?? []).length,
    qualifiedDeliveriesByRepository: Object.fromEntries(
      [...new Set([...observations.values()].map((item) => item.repository))]
        .sort()
        .map((repository) => [
          repository,
          [...observations.values()].filter(
            (item) => item.repository === repository && item.kind === 'QUALIFIED_PARTIAL_COMPONENTS',
          ).length,
        ]),
    ),
    inProgress: rows.filter((r) => r.lifecycleState === 'IMPLEMENTING').length,
    roadmapMaturity: null,
    baselines,
    byCategory: categories,
    rule: 'Distinct axes; partial components and issue states never award whole-requirement acceptance. Overlapping catalog totals are never summed.',
  };
}

const cell = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\|/g, '\\|')
    .replace(/[\r\n]+/g, ' ');
export function renderCapabilityReport(register, metrics) {
  const lines = [
    '# MTerm capability delivery register',
    '',
    `**${metrics.productRequirements} scoped product requirements** cover ${metrics.featureBullets}/${metrics.featureBullets} feature bullets and ${metrics.missionBullets}/${metrics.missionBullets} mission bullets. Inventory observation: ${metrics.inventoryObservedAt}. Later component delivery observations retain their own timestamps.`,
    '',
    'This is an evidence inventory. Overall mission maturity is not calculated. Repository checks validate record coherence; reviewers must still establish the truth and completeness of each qualification receipt.',
    '',
    '[Machine-readable register](register.json) · [Derived counts](summary.json) · [Original mission](mission-2026-11-12.md) · [Metric and update contract](README.md)',
    '',
    '| Whole-requirement axis | Qualified / total |',
    '| --- | ---: |',
    ...[
      ['Code complete', 'codeComplete'],
      ['Tested', 'tested'],
      ['Merged', 'merged'],
      ['Deployed', 'deployed'],
      ['Accepted', 'accepted'],
    ].map(([name, key]) => `| ${name} | ${metrics[key]} / ${metrics.productRequirements} |`),
    '',
    `${metrics.registeredRequirements} requirements have issue owners; ${metrics.partialSourceRows} have partial source observations, ${metrics.partialMergedRows} have partial components in the original baseline, and ${metrics.qualifiedPartialRows} reference subsequently qualified component deliveries. These overlapping counts are not acceptance or a completion percentage.`,
    '',
    '## Separate baseline catalogs',
    '',
    '| Catalog | Requirements |',
    '| --- | ---: |',
    ...metrics.baselines.map((b) => `| ${b.id} | ${b.total} |`),
    '',
    'The CLI seed, progress snapshot, DCP, WEB and AUG baseline hashes are checked. These scopes overlap and their denominators remain separate.',
    '',
    '## Component delivery observations',
    '',
    `${metrics.qualifiedComponentDeliveries} qualified source deliveries across the owning repositories are recorded separately from runtime deployment and whole-requirement acceptance.`,
    '',
    '| Observation | Source / layer | Status |',
    '| --- | --- | --- |',
    ...register.deliveryObservations.map(
      (o) =>
        `| ${cell(o.id)} | [${cell(o.repository)} #${o.pullRequest}](https://github.com/${o.repository}/pull/${o.pullRequest}), \`${o.mainSha ?? o.candidateSha}\`; ${cell(o.layer)} | ${cell(o.kind)}; ${cell(o.observedAt)}${o.supersededBy ? `; historical, superseded by ${cell(o.supersededBy)}` : ''}; whole requirement acceptance: false |`,
    ),
    '',
    '## Saved plugin packages',
    '',
    ...((register.savedPluginReleaseObservations ?? []).length
      ? register.savedPluginReleaseObservations.map(
          (release) =>
            `- ${cell(release.version)}: saved package readback ${cell(release.observedAt)}; later source reconciliation ${cell(release.sourceReconciliationObservedAt)}. Backend deployment, canonical-only OAuth, UI activation and wrapper removal remain unverified.`,
        )
      : ['No saved plugin-package release has a validated readback receipt.']),
    '',
    '## Product requirements',
    '',
    '| Requirement | Category | Acceptance owner | Current scope | Qualified components | Whole acceptance |',
    '| --- | --- | --- | --- | --- | --- |',
    ...register.requirements.map(
      (r) =>
        `| **${r.id}** ${cell(r.name)} | ${cell(r.category)} | [#${r.acceptance.trackingIssue}](${r.acceptance.trackingUrl}) | ${cell(r.lifecycleState)}; ${r.sourceSnapshotRefs.length} source groups; ${r.deliveryObservationRefs.length} delivery observations | ${r.deliveryObservationRefs.filter((ref) => register.deliveryObservations.find((item) => item.id === ref)?.kind === 'QUALIFIED_PARTIAL_COMPONENTS').length} | ${cell(r.acceptance.status)} |`,
    ),
    '',
    'Full acceptance criteria, dependencies, original bullet text, baseline mappings, limitations, layer-specific source observations and exact evidence references are retained in register.json. Governance/discovery obligations are mapped separately and never count as product completion.',
    '',
  ];
  return lines.join('\n');
}

async function readText(root, relative) {
  const filename = path.join(root, relative),
    stat = await fs.lstat(filename);
  ensure(stat.isFile() && !stat.isSymbolicLink() && stat.size < 8 * 1024 * 1024, 'INPUT', relative);
  return fs.readFile(filename, 'utf8');
}
export async function loadCapabilityRegister(root) {
  const catalogTexts = {};
  for (const [, , filename] of BASELINES) catalogTexts[filename] = await readText(root, filename);
  const register = JSON.parse(await readText(root, 'docs/capabilities/register.json'));
  const evidenceTexts = { [UPSTREAM_INPUT]: await readText(root, UPSTREAM_INPUT) };
  for (const item of register.deliveryObservations ?? []) {
    if (item.kind !== 'QUALIFIED_PARTIAL_COMPONENTS') continue;
    ensure(evidencePath(item.evidencePath), 'SOURCE_BINDING', 'Unsafe delivery receipt path');
    evidenceTexts[item.evidencePath] = await readText(root, item.evidencePath);
    const receipt = JSON.parse(evidenceTexts[item.evidencePath]);
    for (const original of receipt.originalEvidence ?? []) {
      ensure(evidencePath(original.repositoryPath), 'SOURCE_BINDING', 'Unsafe original receipt path');
      evidenceTexts[original.repositoryPath] = await readText(root, original.repositoryPath);
    }
  }
  for (const release of register.savedPluginReleaseObservations ?? []) {
    ensure(evidencePath(release.evidencePath), 'SOURCE_BINDING', 'Unsafe saved package receipt path');
    evidenceTexts[release.evidencePath] = await readText(root, release.evidencePath);
    const manifest = JSON.parse(evidenceTexts[release.evidencePath]).readbackManifestEvidence;
    ensure(evidencePath(manifest?.repositoryPath), 'SOURCE_BINDING', 'Unsafe saved readback manifest path');
    evidenceTexts[manifest.repositoryPath] = await readText(root, manifest.repositoryPath);
  }
  return {
    register,
    context: {
      catalogTexts,
      evidenceTexts,
      missionText: await readText(root, 'docs/capabilities/mission-2026-11-12.md'),
      progressText: await readText(root, 'docs/roadmap/progress.json'),
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    ensure(
      process.argv.length === 3 && ['--check', '--render'].includes(process.argv[2]),
      'USAGE',
      'Use --check or --render',
    );
    const root = fileURLToPath(new URL('../', import.meta.url));
    const { register, context } = await loadCapabilityRegister(root);
    const metrics = validateCapabilityRegister(register, context);
    const outputs = [
      ['summary.json', json(metrics)],
      ['REPORT.md', renderCapabilityReport(register, metrics)],
    ];
    for (const [name, expected] of outputs) {
      const filename = path.join(root, 'docs/capabilities', name);
      if (process.argv[2] === '--render') await fs.writeFile(filename, expected);
      else
        ensure(
          (await fs.readFile(filename, 'utf8')).replace(/\r\n/g, '\n') === expected,
          'STALE_REPORT',
          name,
        );
    }
    console.log(json(metrics));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
