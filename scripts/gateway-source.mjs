// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-gateway-source (OpenAI / GPT-6 Astra Pro; self-reported)
// Verify trusted checkout provenance; this is not a sandbox for hostile Git/compiler installations.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const gatewayPaths = [
  'gateway/app.mjs',
  'gateway/dashboard.mjs',
  'gateway/registry.mjs',
  'gateway/security.mjs',
  'gateway/worker.mjs',
];
const materialPaths = [
  ...gatewayPaths,
  'src/remote/protocol.ts',
  'tsconfig.json',
  'package.json',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'scripts/build-gateway.mjs',
  'scripts/gateway-source.mjs',
];
const sha = (value) => createHash('sha256').update(value).digest('hex');
const text = (bytes) =>
  new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes).replace(/\r\n/g, '\n');
const maxInputBytes = 1048576;

export async function verifiedGatewaySource(root, sourceCommit) {
  // A caller's Git directory/config overrides must not substitute a different source repository.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !/^GIT_|^NODE_OPTIONS$/i.test(key)),
  );
  Object.assign(env, {
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
    GIT_NO_REPLACE_OBJECTS: '1',
    GIT_TERMINAL_PROMPT: '0',
  });
  const git = async (args) =>
    (
      await exec('git', ['--no-pager', '-C', root, ...args], {
        env,
        encoding: 'buffer',
        timeout: 10000,
        maxBuffer: maxInputBytes + 1,
        windowsHide: true,
      })
    ).stdout;
  const head = text(await git(['rev-parse', '--verify', 'HEAD^{commit}'])).trim();
  if (head !== sourceCommit) throw Error('Gateway source commit must equal the current raw HEAD commit.');
  const read = async (file) => {
    const target = path.join(root, file);
    const stat = await fs.lstat(target);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxInputBytes)
      throw Error('Gateway input must be a bounded regular file: ' + file);
    const bytes = await fs.readFile(target);
    if (bytes.length > maxInputBytes) throw Error('Gateway input grew beyond its byte limit: ' + file);
    return text(bytes);
  };
  const captured = new Map();
  const inputs = [];
  for (const file of materialPaths) {
    const working = await read(file);
    const committed = text(await git(['cat-file', 'blob', sourceCommit + ':' + file]));
    if (working !== committed) throw Error('Gateway source input differs from its commit: ' + file);
    captured.set(file, committed);
    inputs.push({ path: file, bytes: Buffer.byteLength(committed), sha256: sha(committed) });
  }
  const testedProtocol = await read('dist/remote/protocol.js').catch((error) => {
    if (error.code === 'ENOENT')
      throw Error('Missing tested protocol output; complete the normal reviewed build/check first.');
    throw error;
  });
  const pkg = JSON.parse(captured.get('package.json'));
  const lock = JSON.parse(captured.get('package-lock.json'));
  const compilerVersion = pkg.devDependencies?.typescript;
  if (
    typeof compilerVersion !== 'string' ||
    !/^\d+\.\d+\.\d+$/.test(compilerVersion) ||
    lock.packages?.['node_modules/typescript']?.version !== compilerVersion ||
    lock.packages?.['']?.devDependencies?.typescript !== compilerVersion ||
    captured.get('package-lock.json') !== captured.get('npm-shrinkwrap.json') ||
    pkg.type !== 'module'
  )
    throw Error('Gateway compilation requires matching exact TypeScript pins, locks and ESM package type.');
  const config = JSON.parse(captured.get('tsconfig.json'));
  const options = config.compilerOptions;
  const allowedOptions = new Set([
    'target',
    'module',
    'moduleResolution',
    'strict',
    'noUncheckedIndexedAccess',
    'outDir',
    'rootDir',
    'types',
    'skipLibCheck',
    'sourceMap',
    'declaration',
    'noEmitOnError',
  ]);
  if (
    Object.keys(config).some((key) => !['compilerOptions', 'include'].includes(key)) ||
    !options ||
    Object.keys(options).some((key) => !allowedOptions.has(key)) ||
    options.rootDir !== 'src' ||
    options.outDir !== 'dist' ||
    options.noEmitOnError !== true ||
    JSON.stringify(config.include) !== JSON.stringify(['src/**/*.ts'])
  )
    throw Error(
      'Unsupported gateway compiler routing; extends/references/custom output require explicit support.',
    );
  const require = createRequire(path.join(root, 'package.json'));
  const compilerPackage = require.resolve('typescript/package.json');
  const installed = JSON.parse(await fs.readFile(compilerPackage, 'utf8'));
  if (installed.version !== compilerVersion)
    throw Error('Installed TypeScript does not match the committed pin.');
  const compiler = path.join(path.dirname(compilerPackage), 'bin', 'tsc');
  const runCompiler = (args, cwd) =>
    exec(process.execPath, [compiler, ...args], {
      cwd,
      env,
      timeout: 30000,
      maxBuffer: 1048576,
      windowsHide: true,
    });
  if ((await runCompiler(['--version'], root)).stdout.trim() !== 'Version ' + compilerVersion)
    throw Error('TypeScript CLI version does not match the committed pin.');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-gateway-compile-'));
  let protocol;
  try {
    await fs.mkdir(path.join(temporary, 'src', 'remote'), { recursive: true });
    await fs.writeFile(
      path.join(temporary, 'src', 'remote', 'protocol.ts'),
      captured.get('src/remote/protocol.ts'),
      { flag: 'wx' },
    );
    await fs.writeFile(path.join(temporary, 'package.json'), JSON.stringify({ type: 'module' }), {
      flag: 'wx',
    });
    // This protocol is standalone. Do not resolve user type roots or emit into the shared checkout.
    await fs.writeFile(
      path.join(temporary, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: { ...options, types: [], declaration: false, sourceMap: false, newLine: 'lf' },
        files: ['src/remote/protocol.ts'],
      }),
      { flag: 'wx' },
    );
    await runCompiler(['-p', path.join(temporary, 'tsconfig.json')], temporary);
    const outputs = (await fs.readdir(path.join(temporary, 'dist'), { recursive: true, withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) =>
        path
          .relative(path.join(temporary, 'dist'), path.join(entry.parentPath, entry.name))
          .split(path.sep)
          .join('/'),
      );
    if (outputs.length !== 1 || outputs[0] !== 'remote/protocol.js')
      throw Error('Gateway protocol must compile as one standalone module.');
    protocol = text(await fs.readFile(path.join(temporary, 'dist', 'remote', 'protocol.js')));
    if (protocol !== testedProtocol)
      throw Error('Tested protocol output is stale; complete the normal reviewed build/check first.');
  } finally {
    await fs.rm(temporary, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  }
  return {
    modules: [
      ...gatewayPaths.map((name) => ({ name, content: captured.get(name) })),
      { name: 'dist/remote/protocol.js', content: protocol },
    ],
    sourceVerification: {
      method: 'raw-head-and-committed-inputs-with-fresh-protocol-comparison',
      compiler: { name: 'typescript', version: compilerVersion },
      inputs,
      lineEndings: 'LF',
      testsExecutedByBuilder: false,
      deploymentVerified: false,
    },
  };
}
