// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-04-local-mcp
// Development-only generator. Rendering never awards progress or approves changed source.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
export const STAGES = Object.freeze({
  not_started: 0,
  planned: 10,
  implementation: 40,
  integrated: 65,
  validated: 85,
  complete: 100,
});
const COLORS = {
  not_started: '#64748b',
  planned: '#8b5cf6',
  implementation: '#3b82f6',
  integrated: '#06b6d4',
  validated: '#eab308',
  complete: '#22c55e',
};
const digest = (x) => createHash('sha256').update(x).digest('hex');
const json = (x) => JSON.stringify(x, null, 2) + '\n';
const escape = (x) =>
  String(x).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const md = (x) =>
  String(x ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ');
export function validateCatalog(c) {
  if (c.schemaVersion !== 1 || typeof c.baseline !== 'string' || !Array.isArray(c.items) || !c.items.length)
    throw Error('Invalid catalog');
  const ids = new Set();
  for (const x of c.items) {
    if (!/^CLI-\d{3}$/.test(x.id) || ids.has(x.id)) throw Error('Duplicate/invalid requirement ID');
    ids.add(x.id);
    if (!Object.hasOwn(STAGES, x.stage) || !Number.isFinite(x.weight) || x.weight <= 0)
      throw Error('Invalid stage or baseline weight');
    if (!x.title || !x.acceptance || !x.section || !Array.isArray(x.evidence))
      throw Error('Incomplete requirement');
    if (STAGES[x.stage] >= 65 && !x.evidence.length) throw Error('Implemented stages require evidence paths');
    if (
      !Array.isArray(x.remainingHours) ||
      x.remainingHours.length !== 2 ||
      x.remainingHours.some((n) => !Number.isFinite(n) || n < 0) ||
      x.remainingHours[0] > x.remainingHours[1]
    )
      throw Error('Invalid remaining estimate');
  }
  return c;
}
export function summarize(c) {
  const total = c.items.reduce((a, x) => a + x.weight, 0);
  const earned = c.items.reduce((a, x) => a + x.weight * STAGES[x.stage], 0);
  return {
    count: c.items.length,
    percent: Number((earned / total).toFixed(2)),
    baselineWeight: total,
    complete: c.items.filter((x) => x.stage === 'complete').length,
    blocked: c.items.filter((x) => x.blocker).length,
    notStarted: c.items.filter((x) => x.stage === 'not_started').length,
  };
}
export function svg(percent, label, stage, blocked = false) {
  const color = blocked ? '#ef4444' : (COLORS[stage] ?? '#3b82f6');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="26" viewBox="0 0 300 26" role="img" aria-label="${escape(label)}: ${percent}%${blocked ? ' blocked' : ''}"><title>${escape(label)}: ${percent}%${blocked ? ' blocked' : ''}</title><rect width="300" height="26" rx="6" fill="#172033"/><rect width="${Math.max(0, Math.min(100, percent)) * 3}" height="26" rx="6" fill="${color}"/><text x="150" y="17" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#fff">${percent}% · ${escape(blocked ? 'blocked' : (stage ?? 'weighted maturity'))}</text></svg>\n`;
}
export function renderHtml(c, summary) {
  const data = JSON.stringify(c.items.map((x) => ({ ...x, percent: STAGES[x.stage] })))
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'"><title>MTerm CLI roadmap</title><style>body{font:15px system-ui;background:#0b1220;color:#e4ecf8;max-width:1400px;margin:32px auto;padding:0 24px}h1{font-size:30px}p{color:#a7b7d0;line-height:1.6}input,select{background:#17243b;color:#eff5ff;border:1px solid #405575;border-radius:7px;padding:10px;margin:4px 8px 18px 0}input{width:min(600px,80%)}table{border-collapse:collapse;width:100%}td,th{padding:12px;border-bottom:1px solid #25364f;text-align:left;vertical-align:top}td:first-child{white-space:nowrap}progress{width:130px;height:13px;accent-color:#38bdf8}.blocked progress{accent-color:#ef4444}.complete progress{accent-color:#22c55e}small{display:block;color:#98acc9;margin-top:6px}th{color:#98b8e5}.meta{font-size:20px;color:#c1d9ff}</style><h1>MTerm CLI · full-scope roadmap</h1><p class="meta">${summary.percent}% weighted delivery maturity · ${summary.count} requirements · ${summary.blocked} blocked</p><p>This is an evidence-reviewed planning assessment, not release readiness. All desired Web, quota, update and platform requirements remain visible. Estimates are low-confidence engineer hours, not elapsed AI runtime. Calendar ETAs remain unscheduled without an owner/capacity basis.</p><input id="search" aria-label="Search requirements" placeholder="Search ID, feature, acceptance or blocker"><select id="filter" aria-label="Stage filter"><option value="all">All stages</option><option value="blocked">Blocked</option>${Object.keys(
    STAGES,
  )
    .map((s) => `<option value="${s}">${s}</option>`)
    .join(
      '',
    )}</select><p id="count"></p><table><thead><tr><th>ID</th><th>Feature and acceptance</th><th>Progress</th><th>Remaining / ETA</th></tr></thead><tbody id="rows"></tbody></table><script id="catalog" type="application/json">${data}</script><script>const items=JSON.parse(document.getElementById('catalog').textContent);const rows=document.getElementById('rows');function draw(){const q=document.getElementById('search').value.toLowerCase();const f=document.getElementById('filter').value;const selected=items.filter(x=>(f==='all'||f==='blocked'&&x.blocker||x.stage===f)&&[x.id,x.title,x.section,x.acceptance,x.notes,x.blocker].join(' ').toLowerCase().includes(q));rows.replaceChildren();for(const x of selected){const tr=document.createElement('tr');tr.className=x.blocker?'blocked':x.stage;for(let i=0;i<4;i++)tr.appendChild(document.createElement('td'));tr.children[0].textContent=x.id;tr.children[1].textContent=x.title;const detail=document.createElement('small');detail.textContent=x.acceptance+' — '+x.notes+(x.blocker?' BLOCKED: '+x.blocker:'');tr.children[1].appendChild(detail);const bar=document.createElement('progress');bar.max=100;bar.value=x.percent;bar.setAttribute('aria-label',x.id+' '+x.percent+'%');tr.children[2].appendChild(bar);const state=document.createElement('small');state.textContent=x.percent+'% '+x.stage;tr.children[2].appendChild(state);tr.children[3].textContent=x.remainingHours.join('–')+' h · '+x.eta;rows.appendChild(tr);}document.getElementById('count').textContent=selected.length+' of '+items.length+' visible';}document.getElementById('search').addEventListener('input',draw);document.getElementById('filter').addEventListener('change',draw);draw();</script></html>\n`;
}
const roots = ['src', 'bin', 'scripts', 'tests', '.github'];
const singles = [
  'package.json',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'tsconfig.json',
  '.prettierrc.json',
  'Start-MTerm-CLI.ps1',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'CLAUDE.md',
  'GEMINI.md',
  'versions.json',
  'docs/SECURITY.md',
  'docs/ARCHITECTURE.md',
  'docs/TODAY_CANDIDATE.md',
  'docs/roadmap/desktop-commander-parity.json',
  'docs/DESKTOP_COMMANDER_CODEX_PARITY.md',
  'docs/execution/DESKTOP_COMMANDER_100_PASS_PROMPT.md',
];
// Normalize Git checkout line endings only for known UTF-8 source text; binary remains exact.
// Backported from unmerged PR #52 to make the independent fast CI gate portable.
export function sourceDigest(bytes, relativePath) {
  if (/\.(?:md|txt|json|mjs|cjs|js|ts|tsx|yaml|yml|toml|ps1|sh|css|html|svg)$/.test(relativePath)) {
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    return digest(text.replace(/\r\n/g, '\n'));
  }
  return digest(bytes);
}
async function sourceFingerprint(root) {
  const files = [];
  async function walk(relative) {
    let entries;
    try {
      entries = await fs.readdir(path.join(root, relative), { withFileTypes: true });
    } catch (e) {
      if (e.code === 'ENOENT') return;
      throw e;
    }
    for (const e of entries) {
      if (e.isSymbolicLink()) throw Error('Symlink in reviewed source');
      const rel = relative + '/' + e.name;
      if (e.isDirectory()) await walk(rel);
      else files.push(rel);
    }
  }
  for (const d of roots) await walk(d);
  for (const f of singles)
    try {
      await fs.access(path.join(root, f));
      files.push(f);
    } catch {}
  const manifest = {};
  for (const f of files.sort()) manifest[f] = sourceDigest(await fs.readFile(path.join(root, f)), f);
  return { hash: digest(json(manifest)), files: manifest };
}
async function load(root) {
  const c = validateCatalog(
    JSON.parse(await fs.readFile(path.join(root, 'docs/roadmap/progress.json'), 'utf8')),
  );
  const seed = await fs
    .readFile(path.join(root, 'docs/roadmap/requirements-seed.json'), 'utf8')
    .then(JSON.parse)
    .catch((e) => {
      if (e.code === 'ENOENT') return null;
      throw e;
    });
  if (seed) {
    if (seed.items.length !== c.items.length) throw Error('Requirement scope mismatch');
    for (let i = 0; i < seed.items.length; i++) {
      if (seed.items[i].id !== c.items[i].id || seed.items[i].acceptanceSeed !== c.items[i].acceptance)
        throw Error('Requirement seed traceability mismatch');
    }
  }
  for (const x of c.items)
    for (const rel of x.evidence) {
      if (path.isAbsolute(rel) || rel.split(/[\\/]/).includes('..')) throw Error('Unsafe evidence path');
      await fs.access(path.join(root, rel));
    }
  return c;
}
async function state(root) {
  const c = await load(root);
  return {
    c,
    source: await sourceFingerprint(root),
    catalog: digest(json(c)),
    weights: digest(json(c.items.map((x) => [x.id, x.weight]))),
  };
}
export async function review(root, changeId) {
  if (!/^[a-zA-Z0-9_-]+$/.test(changeId)) throw Error('Invalid change ID');
  const s = await state(root);
  const record = JSON.parse(
    await fs.readFile(path.join(root, 'docs/ai/changes', changeId + '.json'), 'utf8'),
  );
  if (
    record.change_id !== changeId ||
    !record.provider ||
    !record.model ||
    !record.tests?.length ||
    !record.roadmap_updates?.length
  )
    throw Error('Explicit change record with tests and roadmap_updates is required');
  const file = path.join(root, 'docs/roadmap/review.json');
  const old = await fs
    .readFile(file, 'utf8')
    .then(JSON.parse)
    .catch((e) => {
      if (e.code === 'ENOENT') return null;
      throw e;
    });
  if (old && old.weightFingerprint !== s.weights)
    throw Error(
      'Baseline weights/scope changed; requires a separate documented scope revision, not routine credit regeneration',
    );
  const data = {
    schemaVersion: 1,
    changeId,
    reviewedAt: new Date().toISOString(),
    sourceFingerprint: s.source.hash,
    sourceFiles: s.source.files,
    catalogFingerprint: s.catalog,
    weightFingerprint: s.weights,
    assessment: 'Explicit source/catalog review; rendering does not infer progress',
  };
  await fs.writeFile(file, json(data));
  return data;
}
async function approved(root) {
  const s = await state(root);
  const reviewed = JSON.parse(await fs.readFile(path.join(root, 'docs/roadmap/review.json'), 'utf8'));
  if (
    reviewed.sourceFingerprint !== s.source.hash ||
    reviewed.catalogFingerprint !== s.catalog ||
    reviewed.weightFingerprint !== s.weights
  )
    throw Error(
      'Roadmap review is stale: review affected IDs/evidence and record the change before rendering',
    );
  return s;
}
function outputs(c, parity) {
  const summary = summarize(c);
  const out = new Map();
  out.set('docs/roadmap/bars/overall.svg', svg(summary.percent, 'Overall CLI delivery maturity'));
  const groups = [...new Set(c.items.map((x) => x.section))];
  let dashboard = `# MTerm CLI roadmap\n\n![Weighted delivery maturity](roadmap/bars/overall.svg)\n\n**${summary.percent}% reviewed weighted delivery maturity** across ${summary.count} requirements; ${summary.complete} complete and ${summary.blocked} blocked. Not release readiness.\n\n[Every feature and evidence](roadmap/FEATURES.md) · [Offline searchable dashboard](roadmap/index.html) · [Metric contract](roadmap/METRICS.md)\n\nNo GUI progress is inherited. Baseline weights are rough engineering estimates, frozen for this catalog. Calendar ETAs are Unscheduled without a real schedule.\n\n| Area | Progress | Items |\n|---|---|---:|\n`;
  for (let i = 0; i < groups.length; i++) {
    const section = groups[i],
      group = c.items.filter((x) => x.section === section),
      s = summarize({ items: group }),
      name = `area-${String(i + 1).padStart(2, '0')}.svg`;
    out.set('docs/roadmap/bars/' + name, svg(s.percent, section, undefined, s.blocked > 0));
    dashboard += `| ${md(section)} | ![${s.percent}%](roadmap/bars/${name}) | ${group.length} |\n`;
  }
  dashboard += `\n## DesktopCommander Codex parity gate\n\n**${parity.closedGapCount}/${parity.gaps.length} parity gaps closed — ${parity.pass ? 'PASS' : 'NOT PASS'}.** This gate is independent of the whole-product weighted maturity above.\n\nPinned baseline: \`${parity.upstream.repository}\` ${parity.upstream.version} / \`${parity.upstream.commit}\`, ${parity.upstream.publishedToolCount} published MCP tools.\n\n[Parity ledger](DESKTOP_COMMANDER_CODEX_PARITY.md) · [GitHub epic #${parity.epic.issue}](${parity.epic.url}) · [100%-PASS execution prompt](execution/DESKTOP_COMMANDER_100_PASS_PROMPT.md)\n`;
  let detail =
    '# Every MTerm CLI feature\n\nAll original requirement IDs/acceptance text are retained. Stage credit is explicit review, not lines of code or test count.\n\n';
  for (const x of c.items) {
    const value = STAGES[x.stage];
    const name = x.id.toLowerCase() + '.svg';
    out.set('docs/roadmap/bars/' + name, svg(value, x.id, x.stage, !!x.blocker));
    detail += `## ${x.id} — ${x.title}\n\n![${value}% ${x.stage}](bars/${name})\n\n**Objective / acceptance:** ${x.acceptance}\n\n**Current scope:** ${x.notes}\n\n**Baseline weight:** ${x.weight} h (rough). **Remaining:** ${x.remainingHours.join('–')} engineer hours. **ETA:** ${x.eta}.\n\n**Platform:** ${x.platforms ?? 'Required platforms not yet validated'}. **Blocker:** ${x.blocker ?? 'None recorded; incomplete work remains in scope'}.\n\n**Evidence:** ${x.evidence.length ? x.evidence.map((p) => '`' + p + '`').join(', ') : 'None; no implementation credit.'}\n\n`;
  }
  out.set('docs/ROADMAP.md', dashboard);
  out.set('docs/roadmap/FEATURES.md', detail.trimEnd() + '\n');
  out.set('docs/roadmap/index.html', renderHtml(c, summary));
  out.set(
    'docs/roadmap/summary.json',
    json({
      ...summary,
      asOf: c.reviewedAt,
      meaning: 'Reviewed delivery maturity, not readiness',
      guiCreditImported: false,
    }),
  );
  return out;
}
export async function render(root) {
  const s = await approved(root);
  const parity = JSON.parse(
    await fs.readFile(path.join(root, 'docs/roadmap/desktop-commander-parity.json'), 'utf8'),
  );
  const result = outputs(s.c, parity);
  for (const [rel, text] of result) {
    const file = path.join(root, rel);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, text);
  }
  return summarize(s.c);
}
export async function check(root) {
  const s = await approved(root);
  const parity = JSON.parse(
    await fs.readFile(path.join(root, 'docs/roadmap/desktop-commander-parity.json'), 'utf8'),
  );
  for (const [rel, text] of outputs(s.c, parity)) {
    const actual = await fs.readFile(path.join(root, rel), 'utf8').catch(() => null);
    if (actual !== text) throw Error('Generated roadmap is stale or altered: ' + rel);
  }
  return summarize(s.c);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const args = process.argv.slice(2);
  try {
    let result;
    if (args[0] === '--review' && args[1] === '--change' && args.length === 3)
      result = await review(root, args[2]);
    else if (args[0] === '--render' && args.length === 1) result = await render(root);
    else if (args[0] === '--check' && args.length === 1) result = await check(root);
    else throw Error('Use --check, --render, or --review --change ID after explicit assessment');
    console.log(
      JSON.stringify(
        result.sourceFiles
          ? { reviewed: result.changeId, sourceFingerprint: result.sourceFingerprint }
          : result,
        null,
        2,
      ),
    );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
