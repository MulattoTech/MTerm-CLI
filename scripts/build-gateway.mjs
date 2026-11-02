// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-remote-gateway (OpenAI / GPT-6 Astra Pro; self-reported)
// Produces immutable source modules for the Cloudflare API. Credentials/configuration
// are supplied separately by the authorized deployment connector, never this artifact.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceCommit = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(sourceCommit || '')) throw Error('Usage: node scripts/build-gateway.mjs <verified-source-commit>');
const paths = ['gateway/app.mjs', 'gateway/dashboard.mjs', 'gateway/registry.mjs', 'gateway/security.mjs', 'gateway/worker.mjs', 'dist/remote/protocol.js'];
const sha = value => createHash('sha256').update(value).digest('hex');
const modules = await Promise.all(paths.map(async name => ({ name, content: (await fs.readFile(path.join(root, name), 'utf8')).replace(/\r\n/g, '\n') })));
const files = modules.map(m => ({ path: m.name, bytes: Buffer.byteLength(m.content), sha256: sha(m.content) }));
const artifactSha256 = sha(JSON.stringify(files));
const destination = path.join(root, 'artifacts', 'gateway', sourceCommit + '-' + artifactSha256.slice(0, 12));
await fs.mkdir(destination, { recursive: true });
const manifest = { schemaVersion: 1, sourceCommit, entrypoint: 'gateway/worker.mjs', compatibilityDate: '2026-11-01', storage: 'SQLite Durable Object', permissions: 'read-only', files, artifactSha256 };
for (const [name, value] of [['manifest.json', manifest], ['modules.json', modules]]) {
  const bytes = JSON.stringify(value, null, 2) + '\n';
  try { await fs.writeFile(path.join(destination, name), bytes, { flag: 'wx' }); }
  catch (e) { if (e.code !== 'EEXIST' || await fs.readFile(path.join(destination, name), 'utf8') !== bytes) throw e; }
}
console.log(JSON.stringify({ destination, ...manifest }, null, 2));
