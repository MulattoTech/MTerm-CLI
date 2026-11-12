// SPDX-License-Identifier: MIT
// Modified: 2026-11-09-installer-review; include the supported root installer in reviewed source.
// AI-Change: 2026-11-07-aug013-evidence-matrix
// Existing review hashing, shared by development-only roadmap and expansion checks.
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const digest = (x) => createHash('sha256').update(x).digest('hex');
const json = (x) => JSON.stringify(x, null, 2) + '\n';
export const EXPANSION_INPUTS = Object.freeze([
  'docs/expansion/sources.json',
  'docs/expansion/queue.json',
  'docs/expansion/evidence.json',
]);
const roots = [
  'src',
  'bin',
  'scripts',
  'tests',
  'gateway',
  '.github',
  'docs/parity',
  'docs/provenance',
  'docs/capabilities',
  'vendor',
];
const singles = [
  ...EXPANSION_INPUTS,
  'docs/expansion/MATRIX.md',
  'package.json',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'tsconfig.json',
  '.prettierrc.json',
  '.gitattributes',
  'Start-MTerm-CLI.ps1',
  'Install-MTermCLI.ps1',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'CLAUDE.md',
  'GEMINI.md',
  'versions.json',
  'THIRD_PARTY.md',
  'docs/PROVENANCE.md',
  'docs/SECURITY.md',
  'docs/OWNER_AUTHORIZATION.md',
  'docs/ORCHESTRATION.md',
  'docs/GITHUB_ORCHESTRATION_SETUP.md',
  'docs/CODEX_REGISTRATION.md',
  'docs/execution/NEXT_PARITY_PROMPT.md',
  'docs/validation/2026-10-05-codex-parity-foundation.md',
  'docs/ARCHITECTURE.md',
  'docs/TODAY_CANDIDATE.md',
  'docs/roadmap/desktop-commander-parity.json',
  'docs/DESKTOP_COMMANDER_CODEX_PARITY.md',
  'docs/execution/DESKTOP_COMMANDER_100_PASS_PROMPT.md',
];
// Git normalizes known text to LF; hash equivalent CRLF checkouts identically.
// Binary files remain byte-exact. Content edits still require explicit metric review.
export function sourceDigest(bytes, relativePath) {
  if (/\.(?:md|txt|json|mjs|cjs|js|ts|tsx|yaml|yml|toml|ps1|sh|css|html|svg)$/.test(relativePath)) {
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    return digest(text.replace(/\r\n/g, '\n'));
  }
  return digest(bytes);
}
export const SOURCE_LIMITS = Object.freeze({
  fileBytes: 8 * 1024 * 1024,
  totalBytes: 64 * 1024 * 1024,
  files: 4096,
  entries: 8192,
  depth: 32,
});
export class ReviewSourceError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
const ensure = (condition, code, message) => {
  if (!condition) throw new ReviewSourceError(code, message);
};
const identity = (value) => [value.dev, value.ino, value.size, value.mtimeNs, value.ctimeNs];
const sameIdentity = (a, b) => identity(a).every((value, index) => value === identity(b)[index]);

export async function sourceFingerprint(root, checkpoint = () => {}) {
  ensure(
    typeof root === 'string' && path.isAbsolute(root) && path.resolve(root) !== path.parse(root).root,
    'PERMISSION_DENIED',
    'Select an absolute reviewed-source directory',
  );
  checkpoint();
  try {
    const rootInfo = await fs.lstat(root, { bigint: true });
    ensure(
      rootInfo.isDirectory() && !rootInfo.isSymbolicLink(),
      'PERMISSION_DENIED',
      'Reviewed-source root must be an ordinary directory',
    );
    const canonical = await fs.realpath(root);
    checkpoint();
    const files = new Set();
    let entries = 0,
      total = 0;
    async function components(relative, type, optional = false) {
      ensure(
        typeof relative === 'string' && !/[\\:\x00-\x1f\x7f]/.test(relative),
        'PERMISSION_DENIED',
        'Ambiguous reviewed-source path',
      );
      const parts = relative.split('/');
      ensure(
        parts.every((part) => part && part !== '.' && part !== '..' && !/[. ]$/.test(part)),
        'PERMISSION_DENIED',
        'Unsafe reviewed-source path',
      );
      let current = canonical,
        info;
      for (let i = 0; i < parts.length; i++) {
        checkpoint();
        current = path.join(current, parts[i]);
        try {
          info = await fs.lstat(current, { bigint: true });
        } catch (error) {
          if (optional && error.code === 'ENOENT') return null;
          throw error;
        }
        checkpoint();
        ensure(!info.isSymbolicLink(), 'PERMISSION_DENIED', 'Linked reviewed source is not permitted');
        if (i < parts.length - 1 || type === 'directory')
          ensure(
            info.isDirectory(),
            'PERMISSION_DENIED',
            'Reviewed-source parent is not an ordinary directory',
          );
        else
          ensure(
            info.isFile() && info.nlink === 1n,
            'PERMISSION_DENIED',
            'Reviewed source must be a single-link regular file',
          );
      }
      return { filename: current, info };
    }
    async function add(relative) {
      ensure(files.size < SOURCE_LIMITS.files, 'LIMIT_EXCEEDED', 'Reviewed-source file count exceeded');
      await components(relative, 'file');
      files.add(relative);
    }
    async function walk(relative, depth = 0) {
      checkpoint();
      ensure(depth < SOURCE_LIMITS.depth, 'LIMIT_EXCEEDED', 'Reviewed-source depth exceeded');
      const before = await components(relative, 'directory', true);
      if (!before) return;
      const directory = await fs.opendir(before.filename);
      try {
        while (true) {
          checkpoint();
          const entry = await directory.read();
          checkpoint();
          if (!entry) break;
          ensure(
            ++entries <= SOURCE_LIMITS.entries,
            'LIMIT_EXCEEDED',
            'Reviewed-source entry count exceeded',
          );
          ensure(!entry.isSymbolicLink(), 'PERMISSION_DENIED', 'Linked reviewed source is not permitted');
          const relativeEntry = relative + '/' + entry.name;
          if (entry.isDirectory()) await walk(relativeEntry, depth + 1);
          else {
            ensure(entry.isFile(), 'PERMISSION_DENIED', 'Nonregular reviewed source is not permitted');
            await add(relativeEntry);
          }
        }
      } finally {
        await directory.close();
      }
      const after = await components(relative, 'directory');
      ensure(
        sameIdentity(before.info, after.info),
        'PERMISSION_DENIED',
        'Reviewed-source directory changed during inspection',
      );
    }
    for (const relative of roots) await walk(relative);
    for (const relative of singles) if (await components(relative, 'file', true)) await add(relative);
    const manifest = {};
    for (const relative of [...files].sort()) {
      checkpoint();
      const before = await components(relative, 'file');
      ensure(
        before.info.size <= BigInt(SOURCE_LIMITS.fileBytes) &&
          BigInt(total) + before.info.size <= BigInt(SOURCE_LIMITS.totalBytes),
        'LIMIT_EXCEEDED',
        'Reviewed-source byte budget exceeded',
      );
      const handle = await fs.open(
        before.filename,
        constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0),
      );
      try {
        const opened = await handle.stat({ bigint: true });
        ensure(
          opened.isFile() && opened.nlink === 1n && sameIdentity(before.info, opened),
          'PERMISSION_DENIED',
          'Reviewed-source identity changed before read',
        );
        const chunks = [];
        let length = 0;
        while (true) {
          checkpoint();
          const bytes = Buffer.alloc(Math.min(65536, SOURCE_LIMITS.fileBytes + 1 - length));
          const { bytesRead } = await handle.read(bytes, 0, bytes.length, null);
          checkpoint();
          if (!bytesRead) break;
          length += bytesRead;
          ensure(
            length <= SOURCE_LIMITS.fileBytes && total + length <= SOURCE_LIMITS.totalBytes,
            'LIMIT_EXCEEDED',
            'Reviewed-source byte budget exceeded',
          );
          chunks.push(bytes.subarray(0, bytesRead));
        }
        const afterHandle = await handle.stat({ bigint: true });
        const afterPath = await components(relative, 'file');
        ensure(
          sameIdentity(before.info, afterHandle) &&
            sameIdentity(before.info, afterPath.info) &&
            BigInt(length) === before.info.size,
          'PERMISSION_DENIED',
          'Reviewed source changed during read',
        );
        total += length;
        manifest[relative] = sourceDigest(Buffer.concat(chunks, length), relative);
      } finally {
        await handle.close();
      }
      checkpoint();
    }
    return { hash: digest(json(manifest)), files: manifest };
  } catch (error) {
    if (
      error instanceof ReviewSourceError ||
      ['CANCELLED', 'DEADLINE', 'INVALID_ARGUMENT'].includes(error.code)
    )
      throw error;
    throw new ReviewSourceError('PERMISSION_DENIED', 'Reviewed source is unavailable or malformed');
  }
}

export function subjectFingerprint(files) {
  const subject = Object.fromEntries(
    Object.entries(files)
      .filter(([name]) => !EXPANSION_INPUTS.includes(name))
      .sort(([a], [b]) => a.localeCompare(b, 'en')),
  );
  return digest(json(subject));
}
