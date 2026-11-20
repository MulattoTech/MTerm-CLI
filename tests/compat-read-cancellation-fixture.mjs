// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-20-compat-preflight-cancellation (OpenAI / GPT-6 Astra Pro; self-reported)
// Owned real-handle observations shared by direct and pinned-SDK cancellation fixtures.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const entry = path.resolve(
  process.env.MTERM_VERIFY_BIN ?? fileURLToPath(new URL('../bin/mterm-cli.js', import.meta.url)),
);
export const moduleUrl = (name) => pathToFileURL(path.resolve(path.dirname(entry), '../dist', name)).href;
export const { FileService } = await import(moduleUrl('files.js'));
export const { DesktopCommanderFiles } = await import(moduleUrl('desktop-commander-files.js'));
export const sampleText = 'owned needle\nsecond line\n';
const sha = (value) => createHash('sha256').update(value).digest('hex');
const modules = [
  'mcp.js',
  'files.js',
  'desktop-commander-files.js',
  'errors.js',
  'policy.js',
  'compat-config.js',
  'config.js',
  'processes.js',
];
let bindingPromise;
export function bindings() {
  return (bindingPromise ??= (async () => {
    const selected = [entry, ...modules.map((name) => fileURLToPath(moduleUrl(name)))];
    const sourceRequire = createRequire(import.meta.url),
      runtimeRequire = createRequire(entry);
    const sdk = [];
    for (const [name, resolver, version] of [
      ['@modelcontextprotocol/client', sourceRequire, '2.3.0'],
      ['@modelcontextprotocol/server', runtimeRequire, '2.3.0-mterm.1'],
    ]) {
      // These pinned packages place both ESM and CJS entries under dist. Bind the
      // declared import exports actually used by the fixtures/runtime, not CJS.
      const packageRoot = path.dirname(path.dirname(resolver.resolve(name)));
      const packageFile = path.join(packageRoot, 'package.json');
      const pkg = JSON.parse(await fs.readFile(packageFile, 'utf8'));
      if (pkg.name !== name || pkg.version !== version) throw new Error('Unexpected selected SDK pin');
      sdk.push(packageFile);
      for (const key of ['.', './stdio']) {
        const selected = pkg.exports[key]?.import?.default;
        if (typeof selected !== 'string' || !selected.startsWith('./dist/') || !selected.endsWith('.mjs'))
          throw new Error('Unexpected selected SDK import export');
        sdk.push(path.resolve(packageRoot, selected));
      }
    }
    return {
      entry,
      node: process.version,
      executable: process.execPath,
      executableSha256: sha(await fs.readFile(process.execPath)),
      modules: await Promise.all(
        [...selected, ...sdk].map(async (file) => ({
          path: file,
          sha256: sha(await fs.readFile(file)),
        })),
      ),
    };
  })());
}
export async function fixture() {
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-compat-preflight-')));
  const f = { parent };
  for (const name of ['root', 'home', 'cwd', 'config', 'control']) {
    f[name] = path.join(parent, name);
    await fs.mkdir(f[name]);
  }
  f.target = path.join(f.root, 'sample.txt');
  f.configFile = path.join(f.config, 'compat.json');
  await fs.writeFile(f.target, sampleText);
  // Explicit fixture config avoids reading the real user's compatibility preferences.
  await fs.writeFile(f.configFile, JSON.stringify({ schemaVersion: 1, allowedDirectories: [f.root] }));
  return f;
}
export const dispose = (f) =>
  fs.rm(f.parent, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
export async function manifest(f) {
  const rows = [];
  async function visit(file, relative) {
    if (rows.length >= 64) throw new Error('Owned manifest exceeded its fixture bound');
    const st = await fs.lstat(file, { bigint: true });
    const row = {
      path: relative,
      type: st.isDirectory() ? 'directory' : st.isFile() ? 'file' : 'other',
      dev: String(st.dev),
      ino: String(st.ino),
      mode: String(st.mode),
      nlink: String(st.nlink),
      mtimeNs: String(st.mtimeNs),
    };
    if (st.isFile()) {
      if (st.size > 65536n) throw new Error('Owned manifest file exceeded its fixture bound');
      row.bytes = Number(st.size);
      row.sha256 = sha(await fs.readFile(file));
    }
    rows.push(row);
    if (st.isDirectory())
      for (const name of (await fs.readdir(file)).sort())
        await visit(path.join(file, name), relative + '/' + name);
  }
  // Control/gate/report files deliberately change; all exposed and private fixture state is included.
  for (const name of ['root', 'home', 'cwd', 'config']) await visit(f[name], name);
  return rows;
}
export const outcome = (error) => ({ ok: false, code: error?.code ?? error?.name ?? 'UNKNOWN' });
export async function settle(action) {
  try {
    return { observation: { ok: true, result: await action() }, error: undefined };
  } catch (error) {
    return { observation: outcome(error), error };
  }
}
export async function bounded(promise, label, timeout = 10000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Fixture timeout: ' + label)), timeout);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export async function waitFile(file, json = false) {
  const until = performance.now() + 15000;
  for (;;) {
    try {
      const bytes = await fs.readFile(file, 'utf8');
      return json ? JSON.parse(bytes) : bytes;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (performance.now() >= until) throw new Error('Fixture gate timeout: ' + path.basename(file));
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
export async function publish(file, value) {
  await fs.writeFile(file + '.tmp', JSON.stringify(value));
  await fs.rename(file + '.tmp', file);
}
export function instrument(f, afterStat, files) {
  const observed = {
    opens: 0,
    successfulStats: 0,
    reads: 0,
    bytes: 0,
    readsAfterAbort: 0,
    bytesAfterAbort: 0,
    closes: 0,
    writeCalls: 0,
    resolutions: 0,
    lstats: 0,
    mutationAttempts: [],
    events: [],
    aborted: false,
  };
  const restores = [],
    handles = [];
  const wrap = (object, name, replacement) => {
    const original = object[name];
    object[name] = replacement(original.bind(object));
    restores.push(() => {
      object[name] = original;
    });
  };
  const event = (value) => {
    if (observed.events.length >= 64) throw new Error('Fixture event bound exceeded');
    observed.events.push(value);
  };
  const inside = (file) => {
    const relative = path.relative(f.root, path.resolve(String(file)));
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  };
  for (const name of ['rename', 'link', 'unlink', 'writeFile', 'mkdir'])
    wrap(fs, name, (original) => async (...args) => {
      if (inside(args[0])) observed.mutationAttempts.push(name);
      return original(...args);
    });
  wrap(fs, 'lstat', (original) => async (file, ...args) => {
    if (inside(file)) observed.lstats++;
    return original(file, ...args);
  });
  let first = true;
  wrap(fs, 'open', (original) => async (file, flags, ...args) => {
    if (inside(file) && (typeof flags === 'string' ? /[wa+]/.test(flags) : (flags & 3) !== 0))
      observed.mutationAttempts.push('open-write');
    const handle = await original(file, flags, ...args);
    if (path.resolve(String(file)) !== f.target) return handle;
    observed.opens++;
    const realStat = handle.stat.bind(handle);
    handles.push({ handle, realStat });
    wrap(handle, 'stat', (stat) => async (...values) => {
      const result = await stat(...values);
      observed.successfulStats++;
      event('real-stat');
      if (first) {
        first = false;
        await afterStat(observed, event);
      }
      return result;
    });
    wrap(handle, 'read', (read) => async (...values) => {
      observed.reads++;
      const afterAbort = observed.aborted;
      if (afterAbort) observed.readsAfterAbort++;
      event(afterAbort ? 'read-after-abort' : 'read');
      const result = await read(...values);
      observed.bytes += result.bytesRead;
      if (afterAbort) observed.bytesAfterAbort += result.bytesRead;
      return result;
    });
    wrap(handle, 'close', (close) => async () => {
      await close();
      observed.closes++;
      event('closed');
    });
    return handle;
  });
  if (files)
    wrap(files, 'write', (write) => async (...args) => {
      observed.writeCalls++;
      return write(...args);
    });
  if (files)
    wrap(files.policy, 'resolve', (resolve) => async (...args) => {
      observed.resolutions++;
      return resolve(...args);
    });
  return {
    observed,
    event,
    abort() {
      observed.aborted = true;
      event('abort');
    },
    async finish() {
      observed.descriptors = await Promise.all(
        handles.map(async ({ handle, realStat }) => ({
          fd: handle.fd,
          probe: (await settle(() => realStat())).observation,
        })),
      );
      event('settled');
      return observed;
    },
    restore() {
      for (const restore of restores.reverse()) restore();
    },
  };
}
export const argumentsFor = (name, target) => {
  if (name === 'metadata') return { path: target };
  if (name === 'edit') return { file_path: target, old_string: 'needle', new_string: 'changed' };
  return { path: target, content: 'replacement\n', ...(name === 'omitted-mode' ? {} : { mode: name }) };
};
export const methodFor = (name) =>
  name === 'metadata' ? 'getFileInfo' : name === 'edit' ? 'editBlock' : 'writeFile';

export async function runObservedHost(f, name) {
  const { runMcp } = await import(moduleUrl('mcp.js'));
  const method = methodFor(name),
    original = DesktopCommanderFiles.prototype[method];
  let used = false;
  DesktopCommanderFiles.prototype[method] = async function (input, signal) {
    if (used) return original.call(this, input, signal);
    used = true;
    const io = instrument(
      f,
      async () => {
        await publish(path.join(f.control, 'reached'), { realStat: true });
        await waitFile(path.join(f.control, 'release'));
      },
      this.files,
    );
    let abortWrite = Promise.resolve();
    const onAbort = () => {
      io.abort();
      abortWrite = publish(path.join(f.control, 'aborted'), { actualServerSignalAborted: signal.aborted });
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    const result = await settle(() => original.call(this, input, signal));
    try {
      await abortWrite;
      const observed = await io.finish();
      await publish(path.join(f.control, 'report'), {
        observed,
        service: result.observation,
        actualServerSignalAborted: signal?.aborted === true,
        modePropertyPresent: Object.hasOwn(input, 'mode'),
        bindings: await bindings(),
      });
    } finally {
      signal?.removeEventListener('abort', onAbort);
      io.restore();
    }
    if (result.error) throw result.error;
    return result.observation.result;
  };
  await runMcp({ root: f.root, allowWrite: true, compatDesktopCommander: true, compatConfig: f.configFile });
}
