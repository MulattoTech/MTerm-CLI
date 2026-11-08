// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-07-aug013-evidence-matrix
// Development-only evidence validation. Never executes receipts or awards acceptance.
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { sourceFingerprint, subjectFingerprint, ReviewSourceError } from './review-source.mjs';

export const PLATFORMS = Object.freeze(['win32-x64', 'linux-x64', 'darwin-arm64', 'darwin-x64']);
export const SCENARIOS = Object.freeze([
  'success',
  'permission_denied',
  'cancelled',
  'deadline',
  'unsupported_platform',
]);
export const LIMITS = Object.freeze({
  fileBytes: 2 * 1024 * 1024,
  totalBytes: 16 * 1024 * 1024,
  files: 2048,
  reportBytes: 2 * 1024 * 1024,
});
const SOURCE_SCOPE = '575962fac918fcc75f35d10058894f64491dec46afcb1f9cfc2717c2de31c954';
const ISSUE_SCOPE = 'f239ad33cbe9cab7173d72dc8129186f5b2f3f484f9f5ac655e9512170f68723';
const NO_COPY = new Set([
  'vinci0007/cf_gptcodingmcp_auto',
  'a252937166/localpilot',
  'aetherradar/web-mcp-gateway',
  'wikkiwk/chatgpt-codex-desktop-mcp',
  'susuky/webcodex-harness',
  'desktop-commander/remote-desktop-commander',
  'chongdashu/unreal-mcp',
]);
const COPYLEFT = new Set([
  'longngn204/local-coding-agent',
  'oraios/serena',
  'nendotools/tree-sitter-mcp',
  'dmontgomery40/bambu-printer-mcp',
]);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const plain = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const hash = (value, length = 64) =>
  typeof value === 'string' && new RegExp('^[a-f0-9]{' + length + '}$').test(value);
const string = (value, max = 4096) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const stable = (value) =>
  JSON.stringify(value, (_, x) =>
    plain(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : x,
  );
const same = (a, b) => stable(a) === stable(b);
const utc = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) &&
  Number.isFinite(Date.parse(value));

class MatrixError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
function requireThat(condition, code, message) {
  if (!condition) throw new MatrixError(code, message);
}
function keys(value, allowed, context) {
  requireThat(
    plain(value) && Object.keys(value).every((key) => allowed.includes(key)),
    'INVALID_EVIDENCE',
    'Unknown or malformed fields: ' + context,
  );
}
function list(value, max, context) {
  requireThat(
    Array.isArray(value) && value.length <= max,
    'INVALID_LEDGER',
    'Invalid bounded list: ' + context,
  );
  return value;
}
function unique(values, context, fold = (x) => x) {
  requireThat(
    new Set(values.map(fold)).size === values.length,
    'INVALID_LEDGER',
    'Duplicate identity or edge: ' + context,
  );
}
function safeRelative(value) {
  requireThat(
    string(value, 240) &&
      !/[\\:\x00-\x1f\x7f]/.test(value) &&
      !path.posix.isAbsolute(value) &&
      !path.win32.isAbsolute(value),
    'PERMISSION_DENIED',
    'Evidence path is not a permitted repository-relative path',
  );
  const parts = value.split('/');
  requireThat(
    parts.every(
      (part) =>
        part &&
        part !== '.' &&
        part !== '..' &&
        !part.startsWith('.') &&
        !/[. ]$/.test(part) &&
        !/^(?:node_modules|artifacts|auth|credentials)$/i.test(part),
    ),
    'PERMISSION_DENIED',
    'Evidence path contains a denied component',
  );
  return parts;
}

function budget(options = {}) {
  const timeout = options.timeoutMs ?? 3000;
  requireThat(
    Number.isInteger(timeout) && timeout >= 1 && timeout <= 30000,
    'INVALID_ARGUMENT',
    'timeout-ms must be an integer from 1 through 30000',
  );
  const now = options.now ?? (() => performance.now());
  const enclosingCheckpoint = options.checkpoint;
  const start = now();
  requireThat(Number.isFinite(start), 'INVALID_ARGUMENT', 'Invalid monotonic clock');
  return () => {
    enclosingCheckpoint?.();
    if (options.signal?.aborted) throw new MatrixError('CANCELLED', 'Evidence inspection cancelled');
    const elapsed = now() - start;
    requireThat(Number.isFinite(elapsed) && elapsed >= 0, 'INVALID_ARGUMENT', 'Invalid monotonic clock');
    if (elapsed >= timeout) throw new MatrixError('DEADLINE', 'Evidence inspection deadline reached');
  };
}

async function reader(root, checkpoint, onRead) {
  requireThat(
    typeof root === 'string' && path.isAbsolute(root) && path.resolve(root) !== path.parse(root).root,
    'PERMISSION_DENIED',
    'Select an absolute repository directory',
  );
  checkpoint();
  let canonical;
  try {
    const info = await fs.lstat(root);
    requireThat(
      info.isDirectory() && !info.isSymbolicLink(),
      'PERMISSION_DENIED',
      'Repository root must be an ordinary directory',
    );
    canonical = await fs.realpath(root);
  } catch (error) {
    if (error instanceof MatrixError) throw error;
    throw new MatrixError('PERMISSION_DENIED', 'Repository root is unavailable');
  }
  const cache = new Map();
  let total = 0;
  async function components(relative) {
    let current = canonical;
    const parts = safeRelative(relative);
    for (let index = 0; index < parts.length; index++) {
      checkpoint();
      current = path.join(current, parts[index]);
      const info = await fs.lstat(current);
      checkpoint();
      requireThat(!info.isSymbolicLink(), 'PERMISSION_DENIED', 'Linked evidence is not permitted');
      if (index < parts.length - 1)
        requireThat(info.isDirectory(), 'PERMISSION_DENIED', 'Evidence parent is not a directory');
      else
        requireThat(
          info.isFile() && info.nlink === 1,
          'PERMISSION_DENIED',
          'Evidence must be a single-link regular file',
        );
    }
    return current;
  }
  const identity = (value) => [value.dev, value.ino, value.size, value.mtimeMs, value.ctimeMs];
  async function read(relative, kind = 'INVALID_EVIDENCE') {
    checkpoint();
    safeRelative(relative);
    if (cache.has(relative)) return cache.get(relative);
    requireThat(cache.size < LIMITS.files, 'LIMIT_EXCEEDED', 'Too many evidence files');
    let handle;
    try {
      const filename = await components(relative);
      const before = await fs.lstat(filename);
      requireThat(
        before.size <= LIMITS.fileBytes && total + before.size <= LIMITS.totalBytes,
        'LIMIT_EXCEEDED',
        'Evidence byte budget exceeded',
      );
      handle = await fs.open(filename, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      const opened = await handle.stat();
      requireThat(
        opened.isFile() && opened.nlink === 1 && same(identity(opened), identity(before)),
        'PERMISSION_DENIED',
        'Evidence identity changed before read',
      );
      const pieces = [];
      let length = 0;
      while (true) {
        checkpoint();
        const piece = Buffer.alloc(Math.min(65536, LIMITS.fileBytes + 1 - length));
        const { bytesRead } = await handle.read(piece, 0, piece.length, null);
        checkpoint();
        if (bytesRead === 0) break;
        length += bytesRead;
        requireThat(
          length <= LIMITS.fileBytes && total + length <= LIMITS.totalBytes,
          'LIMIT_EXCEEDED',
          'Evidence byte budget exceeded',
        );
        pieces.push(piece.subarray(0, bytesRead));
      }
      const after = await handle.stat();
      requireThat(
        same(identity(before), identity(after)) && length === before.size,
        'PERMISSION_DENIED',
        'Evidence changed during read',
      );
      await components(relative);
      const final = await fs.lstat(filename);
      requireThat(
        same(identity(before), identity(final)),
        'PERMISSION_DENIED',
        'Evidence path changed during read',
      );
      const bytes = Buffer.concat(pieces, length);
      let text;
      try {
        text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
      } catch {
        throw new MatrixError(kind, 'Evidence is not valid UTF-8');
      }
      const result = { text, sha256: sha(text.replace(/\r\n/g, '\n')) };
      total += length;
      cache.set(relative, result);
      if (onRead) onRead(relative);
      checkpoint();
      return result;
    } catch (error) {
      if (error instanceof MatrixError) throw error;
      if (['EACCES', 'EPERM', 'ELOOP', 'ENOTDIR'].includes(error.code))
        throw new MatrixError('PERMISSION_DENIED', 'Evidence access denied');
      throw new MatrixError(kind, 'Evidence file is unavailable');
    } finally {
      await handle?.close();
    }
  }
  return {
    read,
    async json(relative, kind = 'INVALID_EVIDENCE') {
      const value = await read(relative, kind);
      try {
        return JSON.parse(value.text);
      } catch {
        throw new MatrixError(kind, 'Evidence must be valid JSON');
      }
    },
    async pin(value) {
      keys(value, ['path', 'sha256'], 'file pin');
      requireThat(hash(value.sha256), 'INVALID_EVIDENCE', 'Invalid evidence SHA-256');
      const file = await read(value.path);
      requireThat(file.sha256 === value.sha256, 'INVALID_EVIDENCE', 'Evidence hash does not match its pin');
      return file;
    },
    get usage() {
      return { files: cache.size, bytes: total };
    },
  };
}

function validateGraph(sources, queue) {
  requireThat(
    sources?.schemaVersion === 1 &&
      queue?.schemaVersion === 1 &&
      sources.epic === 81 &&
      queue.epic === 81 &&
      queue.repository === 'MulattoTech/MTerm-CLI',
    'INVALID_LEDGER',
    'Unexpected expansion identity or schema',
  );
  const sourceRows = list(sources.sources, 152, 'sources');
  const issueRows = list(queue.issues, 117, 'issues');
  requireThat(
    sourceRows.length === 152 &&
      sources.count === 152 &&
      issueRows.length === 117 &&
      queue.counts?.total === 117,
    'INVALID_LEDGER',
    'Original 152-source/117-capability scope is required',
  );
  for (const source of sourceRows) {
    requireThat(
      plain(source) &&
        string(source.repository, 180) &&
        /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(source.repository) &&
        source.url === 'https://github.com/' + source.repository,
      'INVALID_LEDGER',
      'Invalid source identity',
    );
    requireThat(
      source.sourceSha === null || hash(source.sourceSha, 40),
      'INVALID_LEDGER',
      'Source pin must be exact or explicitly unknown',
    );
    requireThat(
      source.version === null || string(source.version),
      'INVALID_LEDGER',
      'Source version must be recorded or explicitly unknown',
    );
    requireThat(
      string(source.epicReuseRule) && string(source.epicLicenseClaim) && string(source.reuseStatus),
      'INVALID_LEDGER',
      'Missing source restrictions',
    );
    list(source.localImportedPaths, 64, 'imported paths');
    for (const name of source.localImportedPaths) safeRelative(name.replace(/\/$/, ''));
    list(source.issues, 117, 'source mappings');
    requireThat(source.issues.every(Number.isInteger), 'INVALID_LEDGER', 'Invalid source issue mapping');
    unique(source.issues, source.repository);
    const name = source.repository.toLowerCase();
    if (NO_COPY.has(name))
      requireThat(
        source.localImportedPaths.length === 0 &&
          source.reuseStatus === 'no-code-copied' &&
          source.epicReuseRule.includes('NO code copying'),
        'RIGHTS_RESTRICTION',
        'Reference-only source cannot become an imported implementation',
      );
    if (COPYLEFT.has(name))
      requireThat(
        source.localImportedPaths.length === 0 && source.reuseStatus === 'no-code-copied',
        'RIGHTS_RESTRICTION',
        'Copyleft ingestion needs a separately implemented compliance boundary',
      );
  }
  for (const row of issueRows) {
    requireThat(
      plain(row) &&
        /^AUG-\d{3}$/.test(row.id) &&
        Number.isInteger(row.issue) &&
        typeof row.accepted === 'boolean',
      'INVALID_LEDGER',
      'Invalid capability identity or acceptance flag',
    );
    list(row.sourceRepositories, 152, 'capability sources');
    requireThat(
      row.sourceRepositories.every((name) => typeof name === 'string'),
      'INVALID_LEDGER',
      'Invalid capability source mapping',
    );
    unique(row.sourceRepositories, row.id, (name) => name.toLowerCase());
    list(row.declaredCliDependencies, 300, 'CLI dependencies');
    requireThat(
      row.declaredCliDependencies.every((id) => /^CLI-\d{3}$/.test(id)),
      'INVALID_LEDGER',
      'Invalid CLI dependency',
    );
  }
  unique(
    sourceRows.map((row) => row.repository),
    'source repositories',
    (name) => name.toLowerCase(),
  );
  unique(
    issueRows.map((row) => row.id),
    'AUG IDs',
  );
  unique(
    issueRows.map((row) => row.issue),
    'GitHub issue numbers',
  );
  requireThat(
    sha(JSON.stringify(sourceRows.map((row) => row.repository.toLowerCase()).sort())) === SOURCE_SCOPE &&
      sha(
        JSON.stringify(
          issueRows.map((row) => [row.id, row.issue]).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        ),
      ) === ISSUE_SCOPE,
    'INVALID_LEDGER',
    'Original expansion identities changed',
  );
  const sourceMap = new Map(sourceRows.map((row) => [row.repository.toLowerCase(), row]));
  const issueMap = new Map(issueRows.map((row) => [row.issue, row]));
  let mappings = 0;
  for (const source of sourceRows)
    for (const number of source.issues) {
      const target = issueMap.get(number);
      requireThat(
        target?.sourceRepositories.some((name) => name.toLowerCase() === source.repository.toLowerCase()),
        'INVALID_LEDGER',
        'Dangling or one-sided source mapping',
      );
      mappings++;
    }
  for (const issue of issueRows)
    for (const name of issue.sourceRepositories)
      requireThat(
        sourceMap.get(name.toLowerCase())?.issues.includes(issue.issue),
        'INVALID_LEDGER',
        'Dangling or one-sided capability mapping',
      );
  const accepted = issueRows.filter((row) => row.accepted).length;
  requireThat(
    queue.counts.accepted === accepted,
    'INVALID_LEDGER',
    'Acceptance counter disagrees with capability flags',
  );
  for (const source of sourceRows) {
    if (source.issues.length) {
      requireThat(
        source.disposition == null,
        'INVALID_LEDGER',
        'Mapped source also has an exclusion disposition',
      );
      continue;
    }
    const d = source.disposition;
    requireThat(
      plain(d) && ['duplicate', 'not_applicable'].includes(d.kind) && string(d.reason) && plain(d.review),
      'INVALID_LEDGER',
      'Unmapped source needs a justified reviewed disposition',
    );
    if (d.kind === 'not_applicable')
      requireThat(
        d.duplicateOf === null,
        'INVALID_LEDGER',
        'Not-applicable source cannot identify a duplicate',
      );
    else {
      const visited = new Set([source.repository.toLowerCase()]);
      let next = source;
      while (next.disposition?.kind === 'duplicate') {
        const name = next.disposition.duplicateOf;
        requireThat(
          typeof name === 'string' && sourceMap.has(name.toLowerCase()) && !visited.has(name.toLowerCase()),
          'INVALID_LEDGER',
          'Missing or cyclic duplicate disposition',
        );
        visited.add(name.toLowerCase());
        next = sourceMap.get(name.toLowerCase());
      }
    }
  }
  return { sourceRows, issueRows, sourceMap, mappings, accepted };
}

function validSubject(value) {
  keys(value, ['testedCommit', 'subjectFingerprint', 'backend', 'runtime'], 'execution subject');
  requireThat(
    hash(value.testedCommit, 40) && hash(value.subjectFingerprint),
    'INVALID_EVIDENCE',
    'Execution subject needs exact source identities',
  );
  for (const key of ['backend', 'runtime']) {
    keys(value[key], ['name', 'version'], key);
    requireThat(
      string(value[key].name, 120) && string(value[key].version, 120),
      'INVALID_EVIDENCE',
      'Execution subject needs exact backend/runtime versions',
    );
  }
}
function missingCase() {
  return { status: 'not_run', fixtureId: null, receipt: null };
}
function missingCell() {
  return {
    support: 'unknown',
    reason: 'No structured execution observation retained',
    subject: null,
    cases: Object.fromEntries(SCENARIOS.map((name) => [name, missingCase()])),
  };
}

export async function inspectMatrix(root, options = {}) {
  const checkpoint = budget(options);
  checkpoint();
  requireThat(
    PLATFORMS.includes(options.platform ?? process.platform + '-' + process.arch),
    'UNSUPPORTED_PLATFORM',
    'Evidence checker is not qualified for this host platform',
  );
  const io = await reader(root, checkpoint, options.onRead);
  const sources = await io.json('docs/expansion/sources.json', 'INVALID_LEDGER');
  const queue = await io.json('docs/expansion/queue.json', 'INVALID_LEDGER');
  const evidence = await io.json('docs/expansion/evidence.json', 'INVALID_LEDGER');
  const graph = validateGraph(sources, queue);
  keys(evidence, ['schemaVersion', 'hashMode', 'capabilities'], 'evidence ledger');
  requireThat(
    evidence.schemaVersion === 1 && evidence.hashMode === 'sha256-utf8-lf' && plain(evidence.capabilities),
    'INVALID_EVIDENCE',
    'Unsupported evidence schema/hash convention',
  );
  const ids = new Set(graph.issueRows.map((row) => row.id));
  requireThat(
    Object.keys(evidence.capabilities).every((id) => ids.has(id)),
    'INVALID_EVIDENCE',
    'Evidence references an unknown capability',
  );
  for (const source of graph.sourceRows)
    if (!source.issues.length) {
      const d = source.disposition;
      const file = await io.pin(d.review);
      let report;
      try {
        report = JSON.parse(file.text);
      } catch {
        throw new MatrixError('INVALID_EVIDENCE', 'Disposition review must be JSON');
      }
      requireThat(
        report?.schemaVersion === 1 &&
          report.kind === 'mterm-source-disposition' &&
          report.repository === source.repository &&
          report.disposition === d.kind &&
          report.duplicateOf === d.duplicateOf &&
          report.reason === d.reason &&
          string(report.reviewer) &&
          utc(report.reviewedAt),
        'INVALID_EVIDENCE',
        'Disposition review does not bind the recorded decision',
      );
    }
  const caseCounts = { not_run: 0, passed: 0, failed: 0 };
  const capabilities = [];
  for (const row of graph.issueRows) {
    checkpoint();
    const entry = evidence.capabilities[row.id] ?? {
      scope: 'No scoped execution evidence recorded',
      limitations: [row.blocker ?? 'Capability acceptance is unverified'],
      fixtures: [],
      references: [],
      platforms: {},
      acceptanceReview: null,
    };
    keys(entry, ['scope', 'limitations', 'fixtures', 'references', 'platforms', 'acceptanceReview'], row.id);
    requireThat(
      string(entry.scope) &&
        Array.isArray(entry.limitations) &&
        entry.limitations.length >= 1 &&
        entry.limitations.length <= 32 &&
        entry.limitations.every((item) => string(item)),
      'INVALID_EVIDENCE',
      'Capability scope and limitations must be explicit',
    );
    list(entry.fixtures, 32, 'fixtures');
    list(entry.references ?? [], 32, 'historical references');
    unique(
      entry.fixtures.map((item) => item.id),
      'fixture IDs',
    );
    const fixtures = new Map();
    for (const item of entry.fixtures) {
      keys(item, ['id', 'path', 'sha256'], 'fixture');
      requireThat(
        typeof item.id === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(item.id),
        'INVALID_EVIDENCE',
        'Invalid fixture ID',
      );
      await io.pin({ path: item.path, sha256: item.sha256 });
      fixtures.set(item.id, item);
    }
    for (const item of entry.references ?? []) {
      keys(item, ['kind', 'path', 'sha256'], 'historical reference');
      requireThat(
        item.kind === 'historical-qualification',
        'INVALID_EVIDENCE',
        'Unknown historical reference type',
      );
      await io.pin({ path: item.path, sha256: item.sha256 });
    }
    keys(entry.platforms, PLATFORMS, 'platform observations');
    const cells = {};
    for (const platform of PLATFORMS) {
      const cell = entry.platforms[platform];
      const normalized = missingCell();
      if (cell) {
        keys(cell, ['support', 'reason', 'subject', 'cases'], 'platform cell');
        requireThat(
          ['unknown', 'supported', 'unsupported'].includes(cell.support),
          'INVALID_EVIDENCE',
          'Unknown platform support state',
        );
        if (cell.support === 'unsupported')
          requireThat(string(cell.reason), 'INVALID_EVIDENCE', 'Unsupported platform needs a reason');
        if (cell.subject != null) validSubject(cell.subject);
        keys(cell.cases, SCENARIOS, 'scenario observations');
        normalized.support = cell.support;
        normalized.reason = cell.reason ?? null;
        normalized.subject = cell.subject ?? null;
        for (const scenario of SCENARIOS) {
          const observation = cell.cases[scenario];
          if (!observation) continue;
          keys(observation, ['status', 'fixtureId', 'receipt'], 'scenario observation');
          requireThat(
            ['not_run', 'passed', 'failed'].includes(observation.status),
            'INVALID_EVIDENCE',
            'Unknown scenario result',
          );
          if (observation.status === 'not_run') {
            requireThat(
              observation.fixtureId == null && observation.receipt == null,
              'INVALID_EVIDENCE',
              'Unrun scenario must not impersonate an observation',
            );
            continue;
          }
          requireThat(
            cell.subject != null && fixtures.has(observation.fixtureId),
            'INVALID_EVIDENCE',
            'Observed scenario needs a subject and pinned fixture',
          );
          const file = await io.pin(observation.receipt);
          let receipt;
          try {
            receipt = JSON.parse(file.text);
          } catch {
            throw new MatrixError('INVALID_EVIDENCE', 'Execution receipt must be JSON');
          }
          requireThat(
            receipt?.schemaVersion === 1 &&
              receipt.kind === 'mterm-expansion-execution' &&
              receipt.capability === row.id &&
              receipt.platform === platform &&
              same(receipt.subject, cell.subject) &&
              utc(receipt.observedAt) &&
              string(receipt.command, 2048) &&
              Number.isInteger(receipt.exitCode) &&
              receipt.exitCode >= 0 &&
              Array.isArray(receipt.limitations) &&
              receipt.limitations.length > 0 &&
              receipt.limitations.every((item) => string(item)),
            'INVALID_EVIDENCE',
            'Execution receipt does not bind the observed subject/platform',
          );
          requireThat(
            same(receipt.cases?.[scenario], {
              status: observation.status,
              fixtureId: observation.fixtureId,
              fixtureSha256: fixtures.get(observation.fixtureId).sha256,
            }) &&
              (observation.status !== 'passed' || receipt.exitCode === 0),
            'INVALID_EVIDENCE',
            'Execution receipt does not support this scenario and exact fixture',
          );
          normalized.cases[scenario] = { ...observation };
        }
        if (cell.support === 'supported')
          requireThat(
            cell.subject != null && Object.values(normalized.cases).some((item) => item.status !== 'not_run'),
            'INVALID_EVIDENCE',
            'Supported platform needs an execution observation',
          );
      }
      for (const item of Object.values(normalized.cases)) caseCounts[item.status]++;
      cells[platform] = normalized;
    }
    const sourceRows = row.sourceRepositories.map((name) => graph.sourceMap.get(name.toLowerCase()));
    const requiredPlatforms = Array.isArray(row.platformScope) ? row.platformScope : null;
    if (requiredPlatforms) {
      requireThat(
        requiredPlatforms.length > 0 && requiredPlatforms.every((item) => PLATFORMS.includes(item)),
        'INVALID_LEDGER',
        'Invalid selected platform scope',
      );
      unique(requiredPlatforms, 'platform scope');
    }
    const scopeDigest = sha(
      stable({
        id: row.id,
        issue: row.issue,
        bodySha256: row.bodySha256,
        testPlan: row.testPlan,
        commonTestPlan: queue.commonTestPlan,
        declaredCliDependencies: row.declaredCliDependencies,
        declaredIssueDependencies: row.declaredIssueDependencies,
        scope: entry.scope,
        limitations: entry.limitations,
        requiredPlatforms,
        scenarios: SCENARIOS,
        sources: sourceRows
          .map((source) => ({
            repository: source.repository,
            sourceSha: source.sourceSha,
            version: source.version,
            restriction: source.epicReuseRule,
            reuseStatus: source.reuseStatus,
            licenseClaim: source.epicLicenseClaim,
            observedLicenses: source.observedLicenses,
            dependencyLicenseReview: source.dependencyLicenseReview,
            localImportedPaths: source.localImportedPaths,
          }))
          .sort((a, b) => a.repository.localeCompare(b.repository, 'en')),
        fixtures: entry.fixtures,
      }),
    );
    const evidenceDigest = sha(
      stable({
        capability: row.id,
        requiredPlatforms,
        observations: Object.fromEntries(
          (requiredPlatforms ?? PLATFORMS).map((platform) => [platform, cells[platform]]),
        ),
      }),
    );
    const review = entry.acceptanceReview;
    if (row.accepted || review != null) {
      requireThat(
        plain(review) &&
          string(review.executorTask, 240) &&
          string(review.reviewerTask, 240) &&
          review.executorTask !== review.reviewerTask &&
          hash(review.testedCommit, 40) &&
          hash(review.subjectFingerprint) &&
          hash(options.subjectFingerprint) &&
          review.subjectFingerprint === options.subjectFingerprint &&
          review.scopeDigest === scopeDigest &&
          review.evidenceDigest === evidenceDigest &&
          utc(review.acceptedAt) &&
          review.allCriteriaSatisfied === true &&
          requiredPlatforms != null,
        'INVALID_ACCEPTANCE',
        'Acceptance requires distinct review, current subject, exact scope and evidence, and explicit platforms',
      );
      for (const platform of requiredPlatforms) {
        const cell = cells[platform];
        requireThat(
          cell.support === 'supported' &&
            cell.subject?.testedCommit === review.testedCommit &&
            cell.subject?.subjectFingerprint === review.subjectFingerprint &&
            Object.values(cell.cases).every((item) => item.status === 'passed'),
          'INVALID_ACCEPTANCE',
          'Acceptance lacks matching platform/scenario execution evidence',
        );
      }
      const file = await io.pin(review.report);
      let report;
      try {
        report = JSON.parse(file.text);
      } catch {
        throw new MatrixError('INVALID_ACCEPTANCE', 'Independent review report must be JSON');
      }
      requireThat(
        report?.schemaVersion === 1 &&
          report.kind === 'mterm-expansion-review' &&
          report.capability === row.id &&
          report.verdict === 'accepted' &&
          [
            'executorTask',
            'reviewerTask',
            'testedCommit',
            'subjectFingerprint',
            'scopeDigest',
            'evidenceDigest',
            'acceptedAt',
            'allCriteriaSatisfied',
          ].every((name) => report[name] === review[name]),
        'INVALID_ACCEPTANCE',
        'Retained review report does not bind the acceptance assertion',
      );
    }
    capabilities.push({
      id: row.id,
      issue: row.issue,
      title: row.title,
      recordedGitHubState: row.githubState,
      implementationState: row.status,
      accepted: row.accepted,
      scope: entry.scope,
      scopeDigest,
      evidenceDigest,
      limitations: entry.limitations,
      requiredPlatforms,
      sourceRepositories: row.sourceRepositories,
      cliDependencies: row.declaredCliDependencies,
      fixtures: entry.fixtures,
      references: entry.references ?? [],
      platforms: cells,
      acceptanceReview: review ?? null,
    });
  }
  checkpoint();
  const result = {
    ok: true,
    schemaVersion: 1,
    meaning: 'Evidence ledger consistency, not a product PASS or automatic acceptance award',
    facts: {
      networkRequests: 0,
      modelCalls: 0,
      backendExecutions: 0,
      mutations: 0,
      liveGitHubState: false,
      reviewerIdentityAuthenticated: false,
      hashMode: 'sha256-utf8-lf',
    },
    summary: {
      sources: 152,
      accountedSources: 152,
      capabilities: 117,
      mappings: graph.mappings,
      recordedAccepted: graph.accepted,
      caseCounts,
    },
    sources: graph.sourceRows.map((source) => ({
      repository: source.repository,
      issues: source.issues,
      sourceSha: source.sourceSha,
      version: source.version,
      observedLicenses: source.observedLicenses,
      licenseClaim: source.epicLicenseClaim,
      reuseRule: source.epicReuseRule,
      reviewStatus: source.reviewStatus,
      reuseStatus: source.reuseStatus,
      localImportedPaths: source.localImportedPaths,
      dependencyLicenseReview: source.dependencyLicenseReview,
      blocker: source.blocker,
      disposition: source.disposition ?? null,
    })),
    capabilities,
    usage: io.usage,
  };
  requireThat(
    Buffer.byteLength(JSON.stringify(result)) <= LIMITS.reportBytes,
    'LIMIT_EXCEEDED',
    'Evidence report exceeds its output budget',
  );
  return result;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  try {
    const args = process.argv.slice(2);
    const operation = args.shift();
    requireThat(
      ['--check', '--report'].includes(operation),
      'INVALID_ARGUMENT',
      'Use --check or --report with optional --root ABS_DIR and --timeout-ms 1..30000',
    );
    const values = new Map();
    while (args.length) {
      const key = args.shift();
      const value = args.shift();
      requireThat(
        ['--root', '--timeout-ms'].includes(key) && value != null && !values.has(key),
        'INVALID_ARGUMENT',
        'Invalid or duplicate argument',
      );
      values.set(key, value);
    }
    const root = values.get('--root') ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const options = {
      signal: controller.signal,
      timeoutMs: values.has('--timeout-ms') ? Number(values.get('--timeout-ms')) : 3000,
    };
    const checkpoint = budget(options);
    const io = await reader(root, checkpoint);
    let freshness = 'not_reviewed';
    try {
      await fs.lstat(path.join(root, 'docs/roadmap/review.json'));
      const reviewed = await io.json('docs/roadmap/review.json');
      const actual = await sourceFingerprint(root, checkpoint);
      requireThat(
        reviewed.sourceFingerprint === actual.hash,
        'STALE_REVIEW',
        'Roadmap source review is stale; rendering a matrix cannot approve it',
      );
      options.subjectFingerprint = subjectFingerprint(actual.files);
      freshness = 'current_source_review';
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    checkpoint();
    // One shared deadline spans source-review inspection and bounded evidence reads.
    options.checkpoint = checkpoint;
    const result = await inspectMatrix(root, options);
    checkpoint();
    const output =
      operation === '--report'
        ? { ...result, reviewFreshness: freshness }
        : {
            ok: true,
            meaning: result.meaning,
            facts: result.facts,
            summary: result.summary,
            reviewFreshness: freshness,
            usage: result.usage,
          };
    const text = JSON.stringify(output) + '\n';
    requireThat(
      Buffer.byteLength(text) <= LIMITS.reportBytes,
      'LIMIT_EXCEEDED',
      'Evidence report exceeds its output budget',
    );
    process.stdout.write(text);
  } catch (error) {
    const known = error instanceof MatrixError || error instanceof ReviewSourceError;
    process.stdout.write(
      JSON.stringify({
        ok: false,
        error: {
          code: known ? error.code : 'INSPECTION_FAILED',
          message: known ? error.message : 'Evidence inspection failed',
        },
      }) + '\n',
    );
    process.exitCode = error.code === 'CANCELLED' ? 130 : 1;
  } finally {
    process.removeListener('SIGINT', cancel);
    process.removeListener('SIGTERM', cancel);
  }
}
