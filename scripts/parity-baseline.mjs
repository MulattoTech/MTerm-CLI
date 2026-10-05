// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-05-codex-parity-foundation
// Pure offline snapshot validation; network drift probe is explicit and never advances the target.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const json = (b) => JSON.parse(b.toString('utf8'));
const normalized = (b) => new TextDecoder('utf-8', { fatal: true }).decode(b).replace(/\r\n/g, '\n');
export async function verifyBaseline(root) {
  const dir = path.join(root, 'docs', 'parity');
  const baseline = json(await fs.readFile(path.join(dir, 'baseline.json')));
  if (
    baseline.repository !== 'wonderwhy-er/DesktopCommanderMCP' ||
    !/^\w{40}$/.test(baseline.commit) ||
    baseline.version !== '0.2.52'
  )
    throw Error('Unreviewed baseline identity');
  const identities = new Set();
  for (const file of baseline.files) {
    if (path.isAbsolute(file.path) || file.path.split(/[\\/]/).includes('..') || identities.has(file.path))
      throw Error('Unsafe or duplicate snapshot path');
    identities.add(file.path);
    const p = path.join(dir, file.path);
    const st = await fs.lstat(p);
    if (!st.isFile() || st.isSymbolicLink() || st.size > 2097152) throw Error('Unsafe snapshot file');
    if (sha(normalized(await fs.readFile(p))) !== file.sha256)
      throw Error('Upstream snapshot hash drift: ' + file.path);
  }
  for (const required of [
    'upstream/manifest.template.json',
    'upstream/src/tools/schemas.ts',
    'upstream/package.json',
    'upstream/LICENSE',
  ])
    if (!identities.has(required)) throw Error('Required baseline file absent');
  const manifest = json(await fs.readFile(path.join(dir, 'upstream/manifest.template.json')));
  const names = manifest.tools.map((x) => x.name);
  if (
    names.length !== 26 ||
    new Set(names).size !== 26 ||
    JSON.stringify(names) !== JSON.stringify(baseline.tools)
  )
    throw Error('Published tool manifest drift');
  const pkg = json(await fs.readFile(path.join(dir, 'upstream/package.json')));
  if (pkg.version !== baseline.version) throw Error('Baseline version mismatch');
  const schema = await fs.readFile(path.join(dir, 'upstream/src/tools/schemas.ts'), 'utf8');
  const mapping = schema.slice(schema.indexOf('export const toolArgSchemas'));
  for (const name of names)
    if (!new RegExp('\\b' + name + '\\s*:').test(mapping))
      throw Error('Published tool lacks argument schema: ' + name);
  return {
    verified: true,
    repository: baseline.repository,
    version: baseline.version,
    commit: baseline.commit,
    toolCount: names.length,
    snapshotFiles: baseline.files.length,
    runtimeParityProved: false,
  };
}
export function validateParity(p) {
  if (!Array.isArray(p.gaps) || p.gaps.length !== 48)
    throw Error('Parity scope identity must retain48 gaps until explicit scope revision');
  const ids = new Set(),
    issues = new Set();
  let closed = 0;
  for (const row of p.gaps) {
    if (
      !/^DCP-\d{3}$/.test(row.id) ||
      ids.has(row.id) ||
      !Number.isInteger(row.issue) ||
      issues.has(row.issue)
    )
      throw Error('Duplicate or invalid parity identity');
    ids.add(row.id);
    issues.add(row.issue);
    if (!['open', 'closed'].includes(row.state)) throw Error('Invalid issue state');
    if (row.state === 'closed') {
      if (
        !Array.isArray(row.evidence) ||
        !row.evidence.length ||
        !row.evidence.every((x) => typeof x === 'string' && x.length)
      )
        throw Error('Closed parity gaps require committed evidence');
      closed++;
    }
  }
  for (let i = 1; i <= 48; i++)
    if (!ids.has('DCP-' + String(i).padStart(3, '0'))) throw Error('Missing parity identity');
  if (p.closedGapCount !== closed) throw Error('Parity closed count does not match issue rows');
  const required = [
    'package',
    'codex-lifecycle',
    'tool-contracts',
    'windows',
    'macos',
    'linux',
    'security-licenses',
    'final-main',
  ];
  const gates = p.releaseChecks ?? [];
  const pass =
    closed === p.gaps.length &&
    required.every((id) =>
      gates.some(
        (g) => g.id === id && g.status === 'passed' && Array.isArray(g.evidence) && g.evidence.length,
      ),
    );
  if (p.pass !== pass) throw Error('PASS assertion does not match evidence and release gates');
  return { closed, gaps: p.gaps.length, pass };
}
export async function probeUpstream(root, fetcher = fetch) {
  const baseline = await verifyBaseline(root);
  const response = await fetcher(
    'https://api.github.com/repos/wonderwhy-er/DesktopCommanderMCP/commits/main',
    {
      headers: { Accept: 'application/vnd.github+json' },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok) throw Error('Upstream probe HTTP ' + response.status);
  let bytes = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > 2097152) throw Error('Upstream response byte limit');
    chunks.push(chunk);
  }
  const data = json(Buffer.concat(chunks));
  if (!/^[a-f0-9]{40}$/.test(data.sha)) throw Error('Upstream response has no valid SHA');
  return {
    baseline: baseline.commit,
    observed: data.sha,
    drift: baseline.commit !== data.sha,
    targetUpdated: false,
  };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  try {
    if (process.argv[2] === '--probe' && process.argv.length === 3) {
      const result = await probeUpstream(root);
      console.log(JSON.stringify(result, null, 2));
      if (result.drift) process.exitCode = 2;
    } else if (process.argv[2] === '--check' && process.argv.length === 3) {
      const baseline = await verifyBaseline(root);
      const p = json(await fs.readFile(path.join(root, 'docs/roadmap/desktop-commander-parity.json')));
      if (p.upstream.commit !== baseline.commit || p.upstream.version !== baseline.version)
        throw Error('Roadmap and pinned upstream differ');
      const parity = validateParity(p);
      for (const gap of p.gaps)
        for (const file of gap.evidence ?? []) {
          if (path.isAbsolute(file) || file.split(/[\\/]/).includes('..'))
            throw Error('Unsafe evidence path');
          await fs.access(path.join(root, file));
        }
      console.log(JSON.stringify({ baseline, parity }, null, 2));
    } else throw Error('Use --check (offline) or --probe (explicit network; no target mutation).');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
