// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-08-aug011-update-check (OpenAI / GPT-6 Astra Pro; self-reported)
import path from 'node:path';
import { createHash } from 'node:crypto';
import { RootPolicy } from './policy.js';
import { cancelled, fail, safeError } from './errors.js';
import { capturePack, readRegistrySnapshot } from './tool-packs.js';
import { verifyProvenance } from './provenance.js';

type Snapshot = Awaited<ReturnType<typeof capturePack>>;
type Blocker = { code: string; message: string; path?: string; source?: string };
type UpdateOptions = {
  root: string;
  registry: string;
  manifestPath: string;
  manifestSha256: string;
  provenancePath: string;
  provenanceSha256: string;
  timeoutMs?: number;
  signal?: AbortSignal;
};
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const key = (p: string) => (process.platform === 'win32' ? p.toLowerCase() : p);
const reportLimit = 262144;
function stable(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => compare(a, b))
        .map(([name, item]) => JSON.stringify(name) + ':' + stable(item))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
function summary(snapshot: Snapshot) {
  const { checked, payload } = snapshot,
    manifest = checked.manifest;
  return {
    id: manifest.id,
    version: manifest.version,
    manifestPath: checked.manifestPath,
    manifestSha256: checked.manifestSha256,
    source: manifest.source,
    compatibility: {
      abiVersion: manifest.abiVersion,
      runtime: manifest.runtime,
      platforms: manifest.platforms,
    },
    permissions: [...manifest.permissions],
    files: payload
      .map(({ path: name, sha256, bytes }) => ({ path: name, sha256, bytes }))
      .sort((a, b) => compare(a.path, b.path)),
    payloadBytes: payload.reduce((sum, file) => sum + file.bytes, 0),
    tools: manifest.tools
      .map((tool) => ({
        name: tool.name,
        description: tool.description,
        timeoutMs: tool.timeoutMs,
        inputSchemaSha256: sha(stable(tool.inputSchema)),
        outputSchemaSha256: sha(stable(tool.outputSchema)),
      }))
      .sort((a, b) => compare(a.name, b.name)),
  };
}
type Summary = ReturnType<typeof summary>;
function differences(old: Summary | null, next: Summary) {
  const oldFiles = new Map((old?.files ?? []).map((f) => [f.path, f]));
  const newFiles = new Map(next.files.map((f) => [f.path, f]));
  const files = [...new Set([...oldFiles.keys(), ...newFiles.keys()])].sort(compare).flatMap((name) => {
    const before = oldFiles.get(name),
      after = newFiles.get(name);
    if (before?.sha256 === after?.sha256) return [];
    return [
      {
        path: name,
        change: !before ? 'added' : !after ? 'removed' : 'changed',
        before: before ?? null,
        after: after ?? null,
      },
    ];
  });
  const oldTools = new Map((old?.tools ?? []).map((tool) => [tool.name, tool]));
  const newTools = new Map(next.tools.map((tool) => [tool.name, tool]));
  const tools = [...new Set([...oldTools.keys(), ...newTools.keys()])].sort(compare).flatMap((name) => {
    const before = oldTools.get(name),
      after = newTools.get(name);
    if (stable(before ?? null) === stable(after ?? null)) return [];
    return [
      {
        name,
        change: !before ? 'added' : !after ? 'removed' : 'changed',
        before: before ?? null,
        after: after ?? null,
      },
    ];
  });
  return {
    sameVersionDifferentPin: old?.version === next.version && old.manifestSha256 !== next.manifestSha256,
    version: { before: old?.version ?? null, after: next.version },
    source: { before: old?.source ?? null, after: next.source },
    sourceChanged: stable(old?.source ?? null) !== stable(next.source),
    permissions: {
      added: next.permissions.filter((p) => !old?.permissions.includes(p)).sort(compare),
      removed: (old?.permissions ?? []).filter((p) => !next.permissions.includes(p)).sort(compare),
    },
    compatibilityChanged: stable(old?.compatibility ?? null) !== stable(next.compatibility),
    payloadByteDelta: next.payloadBytes - (old?.payloadBytes ?? 0),
    files,
    tools,
  };
}

/** Offline comparison of captured local bytes. No write, lock, network, spawn or activation. */
export async function checkPackUpdate(options: UpdateOptions) {
  const timeout = options.timeoutMs ?? 3000;
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 30000)
    fail('USAGE', 'Use a deadline from 1 to 30000 ms.');
  const deadline = performance.now() + timeout;
  const checkpoint = () => {
    cancelled(options.signal);
    if (performance.now() >= deadline)
      fail('PACK_UPDATE_TIMEOUT', 'Update comparison exceeded its deadline.');
  };
  checkpoint();
  for (const selected of [options.root, options.registry, options.manifestPath, options.provenancePath])
    if (
      typeof selected !== 'string' ||
      !path.isAbsolute(selected) ||
      selected.length > 4096 ||
      /[\x00-\x1f\x7f]/.test(selected)
    )
      fail('USAGE', 'Select explicit absolute root, registry, candidate and provenance paths.');
  if (!/^[a-f0-9]{64}$/.test(options.manifestSha256) || !/^[a-f0-9]{64}$/.test(options.provenanceSha256))
    fail('USAGE', 'Select exact candidate and provenance SHA-256 pins.');
  try {
    const owner = await RootPolicy.create(options.root);
    checkpoint();
    const registry = await readRegistrySnapshot(options.registry, owner);
    checkpoint();
    const candidateSnapshot = await capturePack(
      { manifestPath: options.manifestPath, manifestSha256: options.manifestSha256 },
      owner,
      options.signal,
      deadline,
    );
    checkpoint();
    const candidate = summary(candidateSnapshot);
    const registration = registry.registry.packs.find((p) => p.id === candidate.id);
    const blockers: Blocker[] = [];
    let previous: Summary | null = null,
      currentError: ReturnType<typeof safeError> | null = null;
    if (registration) {
      try {
        const captured = await capturePack(registration, owner, options.signal, deadline);
        checkpoint();
        if (
          captured.checked.manifest.id !== registration.id ||
          captured.checked.manifest.version !== registration.version
        )
          fail('PACK_CURRENT_IDENTITY', 'Registered identity differs from its verified manifest.');
        previous = summary(captured);
      } catch (error) {
        checkpoint();
        currentError = safeError(error);
        blockers.push({
          code: 'PACK_CURRENT_UNVERIFIED',
          message: 'Previous registration payload could not be verified; no rollback payload is established.',
        });
      }
    }
    checkpoint();
    const provenancePath = await owner.resolve(options.provenancePath);
    checkpoint();
    const review = await verifyProvenance({
      root: owner.root,
      manifestPath: provenancePath,
      manifestSha256: options.provenanceSha256,
      timeoutMs: Math.max(1, Math.ceil(deadline - performance.now())),
      signal: options.signal,
    });
    checkpoint();
    blockers.push(...review.blockers);
    // The generated SPDX name is derived from the verified review's exact name/version.
    // Its random UUID/time are deliberately excluded from the deterministic plan.
    const primary = review.attribution.sources.filter(
      (s) =>
        s.repository === candidate.source.url &&
        s.commit === candidate.source.commit &&
        s.license === candidate.source.license &&
        s.version === candidate.version,
    );
    if (review.sbom.name !== candidate.id + '@' + candidate.version || primary.length !== 1)
      blockers.push({
        code: 'PACK_REVIEW_IDENTITY',
        message:
          'Review subject and one primary source must match candidate ID, version, repository, commit and license.',
      });
    type Attribution = (typeof review.attribution.files)[number];
    const attributed = new Map<string, Attribution[]>();
    for (const item of review.attribution.files) {
      checkpoint();
      const full = await owner.resolve(item.path);
      checkpoint();
      const location = key(full);
      attributed.set(location, [...(attributed.get(location) ?? []), item]);
    }
    const coverage = [],
      contributions = new Set<string>();
    for (const file of candidateSnapshot.payload) {
      checkpoint();
      const matches = attributed.get(key(file.fullPath)) ?? [];
      if (matches.length !== 1 || matches[0]!.rawSha256 !== file.sha256) {
        blockers.push({
          code: 'PACK_REVIEW_COVERAGE',
          path: file.path,
          message: 'Payload needs one attribution at its exact canonical location and raw SHA-256.',
        });
        continue;
      }
      const match = matches[0]!;
      contributions.add(match.source);
      coverage.push({
        path: file.path,
        sha256: file.sha256,
        source: match.source,
        reviewPath: match.path,
        reviewedSha256: match.verifiedSha256,
        hashMode: match.hashMode,
      });
    }
    if (primary.length === 1 && !contributions.has(primary[0]!.id))
      blockers.push({
        code: 'PACK_REVIEW_IDENTITY',
        message: 'The matching primary source must contribute verified candidate payload.',
      });
    const contributingSources = review.attribution.sources
      .filter((s) => contributions.has(s.id))
      .sort((a, b) => compare(a.id, b.id));
    for (const source of contributingSources)
      if (source.transitiveReview !== 'complete')
        blockers.push({
          code: 'PACK_REVIEW_INCOMPLETE',
          source: source.id,
          message: 'Every contributing source requires complete transitive and bundled-code review.',
        });
    checkpoint();
    const after = await readRegistrySnapshot(registry.path, owner);
    checkpoint();
    if (after.version !== registry.version)
      fail(
        'PACK_UPDATE_STALE',
        'Registry changed during comparison; repeat with the current selected state.',
      );
    const same =
      registration?.manifestPath === candidate.manifestPath &&
      registration.manifestSha256 === candidate.manifestSha256 &&
      registration.version === candidate.version;
    const eligible = blockers.length === 0;
    const plan = {
      schemaVersion: 1,
      command: 'packs update --check',
      readOnly: true,
      scope: 'Only the explicitly supplied local candidate; no upstream discovery or version ordering.',
      root: owner.root,
      registry: { path: registry.path, version: registry.version },
      outcome: !eligible ? 'blocked' : same ? 'no-change' : 'differences',
      operation: !registration ? 'add' : same ? 'none' : 'replace',
      eligible,
      blockers,
      current: registration
        ? {
            registration: { ...registration },
            ...(previous ?? {}),
            verified: previous !== null,
            error: currentError,
          }
        : null,
      candidate,
      differences: registration && !previous ? null : differences(previous, candidate),
      integrity: {
        basis: 'Owner-selected raw SHA-256 pins and captured verified UTF-8 payload.',
        signatureAuthenticated: false,
      },
      rights: {
        reviewManifestPath: provenancePath,
        reviewManifestSha256: review.manifestSha256,
        subject: review.sbom.name,
        review: review.review,
        coveredPayloadFiles: coverage.length,
        coverage: coverage.sort((a, b) => compare(a.path, b.path)),
        contributingSources,
        selectedReviewEligible: review.eligible,
        licenseAuthorityAuthenticated: false,
        upstreamFetched: false,
        patchReplayed: false,
        evidenceBytes: review.observedEvidenceBytes,
        evidenceBytesScope:
          'Verifier-read evidence, including its review manifest; may overlap payload. Not an installed footprint.',
      },
      rollback: {
        previousRegistration: registration ? { ...registration } : null,
        previousPayloadVerified: previous !== null,
        backupCreated: false,
        executed: false,
        scope:
          'Conditional previous registration only. No retained backup, staged installation or tested rollback is created.',
      },
      platform: process.platform + '-' + process.arch,
      nodeVersion: process.versions.node,
      executionGranted: false,
      activationAvailable: false,
      modelCalls: 0,
      snapshotScope:
        'Captured verified bytes only; paths are not reserved for later installation or execution.',
      cancellationMode:
        'Cooperative checkpoints around bounded reads; no hard interruption of a pending filesystem operation.',
    };
    const result = {
      ...plan,
      planSha256: sha(stable(plan)),
      limits: { reportBytes: reportLimit, timeoutMs: timeout },
    };
    if (Buffer.byteLength(JSON.stringify(result) + '\n') > reportLimit)
      fail('PACK_UPDATE_LIMIT', 'Update plan exceeds its report byte bound.');
    checkpoint();
    return result;
  } catch (error) {
    checkpoint();
    throw error;
  }
}

export async function packUpdateMain(args: string[]): Promise<number> {
  if (args.length === 1 && args[0] === '--help') {
    console.log(
      'packs update --check --root ABS_DIR --manifest ABS_FILE --sha256 SHA256 --registry ABS_FILE --provenance ABS_FILE --provenance-sha256 SHA256 [--timeout-ms 1..30000]\nOffline comparison only; no apply, download, installation or execution.',
    );
    return 0;
  }
  const values = new Map<string, string>();
  const allowed = [
    '--check',
    '--root',
    '--manifest',
    '--sha256',
    '--registry',
    '--provenance',
    '--provenance-sha256',
    '--timeout-ms',
  ];
  for (let i = 0; i < args.length; i++) {
    const name = args[i]!;
    if (!allowed.includes(name) || values.has(name))
      fail('USAGE', 'Unknown or repeated update-check option.');
    const value = name === '--check' ? 'true' : args[++i];
    if (!value || value.startsWith('--')) fail('USAGE', 'Update-check option requires a value.');
    values.set(name, value);
  }
  for (const name of allowed.filter((name) => name !== '--timeout-ms'))
    if (!values.has(name))
      fail('USAGE', 'Check, root, registry, candidate and provenance pins are all required.');
  const report = await checkPackUpdate({
    root: values.get('--root')!,
    registry: values.get('--registry')!,
    manifestPath: values.get('--manifest')!,
    manifestSha256: values.get('--sha256')!,
    provenancePath: values.get('--provenance')!,
    provenanceSha256: values.get('--provenance-sha256')!,
    ...(values.has('--timeout-ms') ? { timeoutMs: Number(values.get('--timeout-ms')) } : {}),
  });
  console.log(JSON.stringify(report));
  return report.eligible ? 0 : 2;
}
