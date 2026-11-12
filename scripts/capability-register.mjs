// SPDX-License-Identifier: MIT
// Development-only inventory checks. Evidence coherence is not behavioral attestation.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

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
        item.wholeRequirementAcceptance === false,
      'SOURCE_BINDING',
      `Partial delivery ${item.id}`,
    );
    if (item.kind === 'QUALIFIED_PARTIAL_COMPONENTS') {
      const receipt = JSON.parse(context.evidenceTexts[item.evidencePath]);
      ensure(
        SHA.test(item.mainSha) &&
          item.mainChecksPassed === 6 &&
          item.candidateChecksPassed === 6 &&
          receipt &&
          receipt.mergedMain === item.mainSha &&
          receipt.candidate === item.candidateSha &&
          receipt.tree === item.tree &&
          receipt.pullRequest === item.pullRequest &&
          receipt.checkRuns?.length === 6 &&
          new Set(receipt.checkRuns.map((j) => j.name)).size === 6 &&
          receipt.checkRuns.every(
            (j) =>
              REQUIRED_MAIN_CHECKS.has(j.name) &&
              j.headSha === item.mainSha &&
              j.status === 'completed' &&
              j.conclusion === 'success',
          ),
        'SOURCE_BINDING',
        item.id,
      );
    }
  }
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
    for (const ref of row.deliveryObservationRefs)
      ensure(observations.has(ref), 'DANGLING_REFERENCE', `${row.id} delivery ${ref}`);
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
    '| Observation | Source | Status |',
    '| --- | --- | --- |',
    ...register.deliveryObservations.map(
      (o) =>
        `| ${cell(o.id)} | [PR #${o.pullRequest}](https://github.com/${register.sourceRepository}/pull/${o.pullRequest}), \`${o.mainSha ?? o.candidateSha}\` | ${cell(o.kind)}; ${cell(o.observedAt)}; whole requirement acceptance: false |`,
    ),
    '',
    '## Product requirements',
    '',
    '| Requirement | Category | Acceptance owner | Current scope | Whole acceptance |',
    '| --- | --- | --- | --- | --- |',
    ...register.requirements.map(
      (r) =>
        `| **${r.id}** ${cell(r.name)} | ${cell(r.category)} | [#${r.acceptance.trackingIssue}](${r.acceptance.trackingUrl}) | ${cell(r.lifecycleState)}; ${r.sourceSnapshotRefs.length} source groups; ${r.deliveryObservationRefs.length} delivery observations | ${cell(r.acceptance.status)} |`,
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
    ensure(
      /^docs\/engineering-runs\/evidence\/[a-zA-Z0-9_-]+\.json$/.test(item.evidencePath),
      'SOURCE_BINDING',
      'Unsafe delivery receipt path',
    );
    evidenceTexts[item.evidencePath] = await readText(root, item.evidencePath);
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
