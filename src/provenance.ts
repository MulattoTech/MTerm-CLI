// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-07-aug002-provenance (OpenAI / GPT-6 Astra Pro; self-reported)
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import { FileService } from './files.js';
import { cancelled, fail } from './errors.js';

const PLATFORM = process.platform + '-' + process.arch;
const PLATFORMS = ['win32-x64', 'linux-x64', 'darwin-arm64', 'darwin-x64'];
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const text = z
  .string()
  .min(1)
  .max(512)
  .regex(/^[^\x00-\x1f\x7f]*$/);
const identifier = z
  .string()
  .max(64)
  .regex(/^[a-z][a-z0-9-]*$/);
const relative = z
  .string()
  .min(1)
  .max(512)
  .refine((value) =>
    value.split('/').every((part) => /^[A-Za-z0-9_@-][A-Za-z0-9._@-]*$/.test(part) && !/[ .]$/.test(part)),
  );
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const pinSchema = z.strictObject({ path: relative, sha256: digest, hashMode: z.enum(['bytes', 'utf8-lf']) });
const integritySchema = z
  .string()
  .regex(/^sha512-[A-Za-z0-9+/]{86}==$/)
  .refine((value) => Buffer.from(value.slice(7), 'base64').length === 64);
const sourceSchema = z.strictObject({
  id: identifier,
  repository: z
    .string()
    .max(2048)
    .url()
    .refine((value) => {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash;
    }),
  commit: z.string().regex(/^[a-f0-9]{40}$/),
  version: text,
  license: text,
  copyright: text,
  licenseFiles: z.array(pinSchema).min(1).max(8),
  notices: z.strictObject({ status: z.enum(['none-at-pin', 'retained']), files: z.array(pinSchema).max(8) }),
  transitiveReview: z.enum(['reference-only', 'complete', 'pending']),
});
const manifestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  name: identifier,
  version: text,
  platforms: z.array(z.string().min(1).max(40)).min(1).max(8),
  review: z.strictObject({ reviewer: text, reviewedAt: z.string().datetime(), rationale: text }),
  sources: z.array(sourceSchema).min(1).max(16),
  files: z
    .array(
      pinSchema.extend({
        source: identifier,
        upstreamPath: relative,
        upstreamSha256: digest,
        modification: z.discriminatedUnion('kind', [
          z.strictObject({ kind: z.literal('unmodified') }),
          z.strictObject({
            kind: z.literal('patched'),
            base: pinSchema,
            patch: pinSchema,
            rationale: text,
            regressionEvidence: z.array(pinSchema).min(1).max(8),
          }),
        ]),
      }),
    )
    .max(64),
  packages: z
    .array(
      z.strictObject({
        location: z.union([z.literal(''), relative]),
        name: text,
        version: text,
        source: identifier,
        packageJson: pinSchema,
        integrity: integritySchema.optional(),
      }),
    )
    .max(64),
  lockfile: z.strictObject({ file: pinSchema, root: z.union([z.literal(''), relative]) }).optional(),
  sbom: pinSchema.optional(),
});
type Manifest = z.infer<typeof manifestSchema>;
type Pin = z.infer<typeof pinSchema>;
type Source = z.infer<typeof sourceSchema>;
type Package = {
  location: string;
  name: string;
  version: string;
  source: string;
  license: string;
  integrity?: string;
  resolved?: string;
};
type Edge = [string, string];
type JsonObject = Record<string, unknown>;
const permissive = new Set([
  'MIT',
  'Apache-2.0',
  'Apache-2.0 AND MIT',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
]);
const installedLocation =
  /^(?:node_modules\/(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+)(?:\/node_modules\/(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+)*$/;
function object(value: unknown, code = 'PROVENANCE_CLOSURE'): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code, 'Expected a bounded object.');
  return value as JsonObject;
}
function parseJson(value: string, code: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    fail(code, 'Expected a bounded JSON document.');
  }
}
function unique(values: string[], code: string) {
  if (new Set(values).size !== values.length) fail(code, 'Duplicate identities are not supported.');
}
function dependencies(value: JsonObject): Record<string, string> {
  for (const field of [
    'optionalDependencies',
    'peerDependencies',
    'bundleDependencies',
    'bundledDependencies',
  ])
    if (value[field] && Object.keys(object(value[field])).length)
      fail(
        'PROVENANCE_DEPENDENCY_UNSUPPORTED',
        'Optional, peer or bundled dependency metadata needs a separately supported review.',
      );
  const result = object(value.dependencies ?? {});
  if (Object.keys(result).length > 64)
    fail('PROVENANCE_CLOSURE', 'Dependency count exceeds the supported bound.');
  for (const [name, version] of Object.entries(result))
    if (
      !/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/.test(name) ||
      typeof version !== 'string' ||
      !version ||
      version.length > 256
    )
      fail('PROVENANCE_CLOSURE', 'Invalid dependency identity.');
  return result as Record<string, string>;
}
function sameDependencies(a: Record<string, string>, b: Record<string, string>) {
  const entries = (v: Record<string, string>) =>
    JSON.stringify(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)));
  return entries(a) === entries(b);
}
function licenseMatches(declared: string, reviewed: string) {
  return (
    declared === reviewed || (reviewed === 'Apache-2.0 AND MIT' && ['Apache-2.0', 'MIT'].includes(declared))
  );
}
function publicDownload(value?: string): string {
  if (!value) return 'NOASSERTION';
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash
      ? value
      : 'NOASSERTION';
  } catch {
    return 'NOASSERTION';
  }
}
function sbomFor(manifest: Manifest, packages: Package[], edges: Edge[]) {
  const nodes: Package[] = packages.length
    ? packages
    : manifest.sources.map((source) => ({
        location: source.id,
        name: source.id + '-reference-snapshot',
        version: source.version,
        source: source.id,
        license: source.license,
      }));
  const ids = new Map(nodes.map((node, i) => [node.location, 'SPDXRef-Package-' + i]));
  const roots = packages.length ? [manifest.lockfile!.root] : nodes.map((node) => node.location);
  const sources = new Map(manifest.sources.map((source) => [source.id, source]));
  return {
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    SPDXID: 'SPDXRef-DOCUMENT',
    name: manifest.name + '@' + manifest.version,
    documentNamespace: 'https://m-techlabs.com/spdx/' + manifest.name + '/' + randomUUID(),
    creationInfo: {
      created: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      creators: ['Tool: MTerm-Provenance-1'],
    },
    documentDescribes: roots.map((root) => ids.get(root)!),
    packages: nodes.map((node) => {
      const source = sources.get(node.source)!;
      return {
        SPDXID: ids.get(node.location)!,
        name: node.name,
        versionInfo: node.version,
        downloadLocation: publicDownload(node.resolved),
        filesAnalyzed: false,
        licenseDeclared: node.license,
        licenseConcluded: 'NOASSERTION',
        copyrightText: source.copyright,
        sourceInfo:
          source.repository +
          '@' +
          source.commit +
          '; source identity is distinct from registry artifact integrity. Selected file attribution and transitive review are in the companion report.',
        ...(node.integrity
          ? {
              checksums: [
                {
                  algorithm: 'SHA512',
                  checksumValue: Buffer.from(node.integrity.slice(7), 'base64').toString('hex'),
                },
              ],
            }
          : {}),
      };
    }),
    relationships: [
      ...roots.map((root) => ({
        spdxElementId: 'SPDXRef-DOCUMENT',
        relatedSpdxElement: ids.get(root)!,
        relationshipType: 'DESCRIBES',
      })),
      ...edges.map(([from, to]) => ({
        spdxElementId: ids.get(from)!,
        relatedSpdxElement: ids.get(to)!,
        relationshipType: 'DEPENDS_ON',
      })),
    ],
  };
}
function verifySuppliedSbom(input: unknown, expected: Package[], edges: Edge[]) {
  const code = 'PROVENANCE_SBOM',
    doc = object(input, code);
  if (
    doc.spdxVersion !== 'SPDX-2.3' ||
    doc.dataLicense !== 'CC0-1.0' ||
    doc.SPDXID !== 'SPDXRef-DOCUMENT' ||
    !Array.isArray(doc.packages) ||
    doc.packages.length !== expected.length ||
    !Array.isArray(doc.relationships) ||
    doc.relationships.length > 1024
  )
    fail(code, 'SPDX inventory does not match the selected production closure.');
  const ids = new Map<string, string>(),
    packages = new Map<string, JsonObject>();
  for (const raw of doc.packages) {
    const item = object(raw, code);
    if (
      typeof item.SPDXID !== 'string' ||
      !/^SPDXRef-[A-Za-z0-9.-]+$/.test(item.SPDXID) ||
      typeof item.name !== 'string' ||
      typeof item.versionInfo !== 'string'
    )
      fail(code, 'Invalid SPDX package identity.');
    const key = item.name + '@' + item.versionInfo;
    if (ids.has(item.SPDXID) || packages.has(key)) fail(code, 'Duplicate SPDX package identity.');
    ids.set(item.SPDXID, key);
    packages.set(key, item);
  }
  const identity = new Map(expected.map((item) => [item.location, item.name + '@' + item.version]));
  for (const node of expected) {
    const actual = packages.get(identity.get(node.location)!);
    if (!actual || actual.licenseDeclared !== node.license)
      fail(code, 'SPDX identity, version or declared license differs.');
    if (node.integrity) {
      const expectedHash = Buffer.from(node.integrity.slice(7), 'base64').toString('hex');
      const checksums = actual.checksums;
      if (
        !Array.isArray(checksums) ||
        checksums.filter((c) => c && c.algorithm === 'SHA512' && c.checksumValue === expectedHash).length !==
          1
      )
        fail(code, 'SPDX artifact integrity differs from the locked package.');
    }
  }
  const observed: string[] = [];
  for (const raw of doc.relationships) {
    const edge = object(raw, code);
    if (edge.relationshipType === 'DEPENDS_ON' || edge.relationshipType === 'DEPENDENCY_OF') {
      const from = ids.get(String(edge.spdxElementId)),
        to = ids.get(String(edge.relatedSpdxElement));
      if (!from || !to) fail(code, 'SPDX dependency endpoint is absent.');
      observed.push(edge.relationshipType === 'DEPENDS_ON' ? from + '>' + to : to + '>' + from);
    }
  }
  unique(observed, code);
  const wanted = edges.map(([from, to]) => identity.get(from) + '>' + identity.get(to)).sort();
  if (JSON.stringify(observed.sort()) !== JSON.stringify(wanted))
    fail(code, 'SPDX dependency graph is incomplete or unexpected.');
}

export async function verifyProvenance(options: {
  root: string;
  manifestPath: string;
  manifestSha256: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}) {
  const timeout = options.timeoutMs ?? 3000;
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 30000)
    fail('USAGE', 'Use a deadline from 1 to 30000 ms.');
  const started = performance.now();
  const checkpoint = () => {
    cancelled(options.signal);
    if (performance.now() - started >= timeout)
      fail('PROVENANCE_TIMEOUT', 'Provenance verification exceeded its deadline.');
  };
  checkpoint();
  if (
    !path.isAbsolute(options.root) ||
    !path.isAbsolute(options.manifestPath) ||
    !digest.safeParse(options.manifestSha256).success
  )
    fail('USAGE', 'Choose absolute root/manifest paths and an exact SHA-256.');
  const files = await FileService.create(options.root, { maxBytes: 1048576 });
  checkpoint();
  const raw = await files.read({ path: options.manifestPath });
  checkpoint();
  if (raw.bytes > 65536) fail('PROVENANCE_LIMIT', 'Review manifest exceeds 65536 bytes.');
  if (raw.version !== options.manifestSha256)
    fail('PROVENANCE_PIN', 'Review manifest does not match the selected SHA-256.');
  const parsed = manifestSchema.safeParse(parseJson(raw.text, 'PROVENANCE_MANIFEST'));
  if (!parsed.success)
    fail('PROVENANCE_MANIFEST', 'Review record does not match the bounded provenance contract.');
  const manifest = parsed.data;
  if (!PLATFORMS.includes(PLATFORM) || !manifest.platforms.includes(PLATFORM))
    fail('PROVENANCE_PLATFORM', 'This review does not support the selected OS/architecture.');
  unique(
    manifest.sources.map((s) => s.id),
    'PROVENANCE_MANIFEST',
  );
  unique(
    manifest.files.map((f) => f.path.toLowerCase()),
    'PROVENANCE_MANIFEST',
  );
  const sources = new Map(manifest.sources.map((s) => [s.id, s]));
  const sourceFor = (id: string): Source => {
    const source = sources.get(id);
    if (!source) fail('PROVENANCE_MANIFEST', 'File/package source is not declared.');
    return source;
  };
  let totalBytes = raw.bytes;
  const cache = new Map<string, Awaited<ReturnType<FileService['read']>>>();
  const readPin = async (pin: Pin) => {
    checkpoint();
    let read = cache.get(pin.path);
    if (!read) {
      if (cache.size >= 192) fail('PROVENANCE_LIMIT', 'Evidence file count exceeds the bound.');
      read = await files.read({ path: pin.path });
      checkpoint();
      totalBytes += read.bytes;
      if (totalBytes > 8388608) fail('PROVENANCE_LIMIT', 'Evidence exceeds the aggregate byte bound.');
      cache.set(pin.path, read);
    }
    const verifiedSha256 = pin.hashMode === 'bytes' ? read.version : hash(read.text.replace(/\r\n/g, '\n'));
    if (verifiedSha256 !== pin.sha256)
      fail('PROVENANCE_HASH', 'Evidence bytes differ from their reviewed pin.');
    return { ...read, verifiedSha256 };
  };
  const blockers: { code: string; source: string; message: string }[] = [];
  const sourceAttribution = [];
  for (const source of manifest.sources) {
    checkpoint();
    if (!permissive.has(source.license))
      blockers.push({
        code: /(?:GPL|AGPL|LGPL|MPL|EPL)/.test(source.license)
          ? 'REDISTRIBUTION_REVIEW_REQUIRED'
          : 'LICENSE_DENIED',
        source: source.id,
        message:
          'This license is outside the qualified permissive distribution policy; generic owner approval does not supply upstream rights.',
      });
    if (
      source.transitiveReview === 'pending' ||
      (manifest.packages.some((p) => p.source === source.id) && source.transitiveReview !== 'complete')
    )
      blockers.push({
        code: 'TRANSITIVE_REVIEW_PENDING',
        source: source.id,
        message: 'Separately installed dependency closure does not establish bundled-code license clearance.',
      });
    if ((source.notices.status === 'retained') !== source.notices.files.length > 0)
      fail('PROVENANCE_NOTICE', 'Retained/absent NOTICE declaration and evidence disagree.');
    const licenses = [],
      notices = [];
    for (const pin of source.licenseFiles) {
      const read = await readPin(pin);
      if (!read.text.trim()) fail('PROVENANCE_LICENSE_EVIDENCE', 'License evidence is empty.');
      licenses.push({ ...pin, rawSha256: read.version });
    }
    for (const pin of source.notices.files) {
      const read = await readPin(pin);
      if (!read.text.trim()) fail('PROVENANCE_NOTICE', 'Retained NOTICE evidence is empty.');
      notices.push({ ...pin, rawSha256: read.version });
    }
    sourceAttribution.push({
      ...source,
      licenseFiles: licenses,
      notices: { status: source.notices.status, files: notices },
    });
  }
  const fileAttribution = [];
  for (const item of manifest.files) {
    const source = sourceFor(item.source),
      read = await readPin(item);
    if (item.modification.kind === 'unmodified') {
      if (item.upstreamSha256 !== read.verifiedSha256)
        fail('PROVENANCE_PATCH', 'Unmodified file differs from the recorded upstream content.');
    } else {
      if (
        item.modification.base.sha256 !== item.upstreamSha256 ||
        item.modification.base.hashMode !== item.hashMode
      )
        fail('PROVENANCE_PATCH', 'Patch base does not match the recorded upstream content.');
      await readPin(item.modification.base);
      await readPin(item.modification.patch);
      for (const evidence of item.modification.regressionEvidence) await readPin(evidence);
    }
    fileAttribution.push({
      ...item,
      license: source.license,
      upstreamCommit: source.commit,
      rawSha256: read.version,
      verifiedSha256: read.verifiedSha256,
    });
  }
  const packages: Package[] = [],
    edges: Edge[] = [];
  if (manifest.packages.length || manifest.lockfile) {
    if (!manifest.lockfile || !manifest.packages.length)
      fail('PROVENANCE_CLOSURE', 'Both lock and package review records are required.');
    unique(
      manifest.packages.map((p) => p.location.toLowerCase()),
      'PROVENANCE_CLOSURE',
    );
    unique(
      manifest.packages.map((p) => p.name + '@' + p.version),
      'PROVENANCE_CLOSURE',
    );
    for (const record of manifest.packages) {
      if (
        (record.location && !installedLocation.test(record.location)) ||
        record.packageJson.path !== (record.location ? record.location + '/' : '') + 'package.json' ||
        (record.location &&
          record.name !== record.location.slice(record.location.lastIndexOf('node_modules/') + 13))
      )
        fail(
          'PROVENANCE_CLOSURE',
          'Package metadata must bind the exact installed location and dependency name; workspace and alias layouts are unsupported.',
        );
    }
    const locked = object(parseJson((await readPin(manifest.lockfile.file)).text, 'PROVENANCE_CLOSURE'));
    if (locked.lockfileVersion !== 3)
      fail('PROVENANCE_DEPENDENCY_UNSUPPORTED', 'Only npm lockfile version 3 is supported.');
    const entries = object(locked.packages);
    if (Object.keys(entries).length > 512 || !Object.hasOwn(entries, manifest.lockfile.root))
      fail('PROVENANCE_CLOSURE', 'Invalid lock scope/count.');
    const records = new Map(manifest.packages.map((p) => [p.location, p]));
    const resolveDependency = (from: string, name: string) => {
      let location = from;
      for (let depth = 0; depth < 32; depth++) {
        const candidate = (location ? location + '/' : '') + 'node_modules/' + name;
        if (Object.hasOwn(entries, candidate)) return candidate;
        if (!location) break;
        const cut = location.lastIndexOf('/node_modules/');
        location = cut < 0 ? '' : location.slice(0, cut);
      }
      fail('PROVENANCE_CLOSURE', 'Required dependency is absent from the lock.');
    };
    const pending = [manifest.lockfile.root],
      visited = new Set<string>();
    while (pending.length) {
      checkpoint();
      const location = pending.shift()!;
      if (visited.has(location)) continue;
      visited.add(location);
      if (visited.size > 64) fail('PROVENANCE_CLOSURE', 'Runtime closure exceeds the package bound.');
      const lockedPackage = object(entries[location]),
        record = records.get(location);
      if (
        !record ||
        record.version !== lockedPackage.version ||
        record.integrity !== lockedPackage.integrity ||
        lockedPackage.link
      )
        fail(
          'PROVENANCE_CLOSURE',
          'Runtime package identity, version or integrity lacks matching review evidence.',
        );
      const declared = object(parseJson((await readPin(record.packageJson)).text, 'PROVENANCE_CLOSURE'));
      const source = sourceFor(record.source);
      if (
        declared.name !== record.name ||
        declared.version !== record.version ||
        typeof declared.license !== 'string' ||
        !licenseMatches(declared.license, source.license)
      )
        fail('PROVENANCE_CLOSURE', 'Installed package metadata differs from its reviewed identity/license.');
      const deps = dependencies(lockedPackage);
      if (!sameDependencies(deps, dependencies(declared)))
        fail('PROVENANCE_CLOSURE', 'Installed and locked dependencies differ.');
      if (location !== manifest.lockfile.root && !record.integrity)
        fail('PROVENANCE_CLOSURE', 'A dependency needs an exact registry integrity.');
      packages.push({
        location,
        name: record.name,
        version: record.version,
        source: record.source,
        license: declared.license,
        ...(record.integrity ? { integrity: record.integrity } : {}),
        ...(typeof lockedPackage.resolved === 'string' ? { resolved: lockedPackage.resolved } : {}),
      });
      for (const name of Object.keys(deps).sort()) {
        const to = resolveDependency(location, name);
        if (records.get(to)?.name !== name)
          fail('PROVENANCE_CLOSURE', 'Resolved dependency has a different package identity.');
        edges.push([location, to]);
        pending.push(to);
      }
    }
    if (visited.size !== records.size)
      fail('PROVENANCE_CLOSURE', 'Review inventory contains an unexpected package.');
  }
  packages.sort((a, b) => a.location.localeCompare(b.location));
  if (manifest.sbom) {
    if (!packages.length)
      fail('PROVENANCE_SBOM', 'External SBOM comparison requires an explicit runtime closure.');
    verifySuppliedSbom(parseJson((await readPin(manifest.sbom)).text, 'PROVENANCE_SBOM'), packages, edges);
  }
  checkpoint();
  const report = {
    schemaVersion: 1,
    verifier: 'MTerm-Provenance-1',
    manifestSha256: raw.version,
    eligible: blockers.length === 0,
    blockers,
    readOnly: true,
    platform: PLATFORM,
    nodeVersion: process.versions.node,
    eligibilityScope:
      'Selected pinned review evidence only; not a legal attestation, package execution grant or verification of every installed runtime byte.',
    cancellationMode:
      'Cooperative checkpoints around bounded local reads; no hard interruption of a pending filesystem operation.',
    verificationBasis:
      'SHA-pinned local review record; source identity, registry integrity and installed evidence are distinct.',
    licenseAuthorityAuthenticated: false,
    upstreamFetched: false,
    patchReplayed: false,
    packAdmissionGranted: false,
    modelCalls: 0,
    review: manifest.review,
    attribution: { sources: sourceAttribution, files: fileAttribution },
    dependencyClosure: {
      packageCount: packages.length,
      edgeCount: edges.length,
      packages,
      edges,
      bundledCodeInferredFromLock: false,
    },
    suppliedSbomVerified: Boolean(manifest.sbom),
    suppliedSbomScope:
      'Package identities, versions, declared licenses, locked integrities and dependency edges only.',
    sbom: sbomFor(manifest, packages, edges),
    limits: {
      manifestBytes: 65536,
      singleEvidenceBytes: 1048576,
      aggregateBytes: 8388608,
      evidenceFiles: 192,
      reportBytes: 262144,
      timeoutMs: timeout,
    },
    observedEvidenceBytes: totalBytes,
  };
  if (Buffer.byteLength(JSON.stringify(report)) > 262144)
    fail('PROVENANCE_LIMIT', 'Attribution report exceeds its byte bound.');
  checkpoint();
  return report;
}

export async function provenanceMain(args: string[]): Promise<number> {
  if (!args.length || args[0] === 'help' || args[0] === '--help') {
    console.log(
      'provenance inspect --root ABS_DIR --manifest ABS_FILE --sha256 HEX [--timeout-ms 1..30000]\nOffline pinned review verification and MTerm-generated SPDX 2.3. No downloads, copies, pack execution or admission grants.',
    );
    return 0;
  }
  if (args[0] !== 'inspect') fail('USAGE', 'Use provenance inspect or provenance help.');
  const options = new Map<string, string>();
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i],
      value = args[i + 1];
    if (
      !key ||
      !['--root', '--manifest', '--sha256', '--timeout-ms'].includes(key) ||
      options.has(key) ||
      !value ||
      value.startsWith('--')
    )
      fail('USAGE', 'Use each supported provenance option once with a value.');
    options.set(key, value);
  }
  if (!options.has('--root') || !options.has('--manifest') || !options.has('--sha256'))
    fail('USAGE', 'Root, manifest and SHA-256 are required.');
  const report = await verifyProvenance({
    root: options.get('--root')!,
    manifestPath: options.get('--manifest')!,
    manifestSha256: options.get('--sha256')!,
    ...(options.has('--timeout-ms') ? { timeoutMs: Number(options.get('--timeout-ms')) } : {}),
  });
  process.stdout.write(JSON.stringify(report) + '\n');
  return report.eligible ? 0 : 2;
}
