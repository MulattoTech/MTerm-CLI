// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-07-aug001-pack-boundary (OpenAI / GPT-6 Astra Pro; self-reported)
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { FileService } from './files.js';
import { ProcessService } from './processes.js';
import { RootPolicy } from './policy.js';
import { cancelled, fail, safeError } from './errors.js';

const PROTOCOL = 'mterm-pack-stdio/1';
const MAX_BYTES = 65536;
const packId = z
  .string()
  .max(24)
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const version = z
  .string()
  .max(80)
  .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/);
const relativeFile = z
  .string()
  .max(240)
  .refine((s) =>
    s.split('/').every((part) => /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(part) && !/[ .]$/.test(part)),
  );
const manifestSchema = z.strictObject({
  manifestVersion: z.literal(1),
  abiVersion: z.number().int(),
  id: packId,
  version,
  source: z.strictObject({
    url: z
      .string()
      .max(2048)
      .url()
      .refine((s) => {
        const u = new URL(s);
        return u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash;
      }),
    commit: z.string().regex(/^[a-f0-9]{40}$/),
    license: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[A-Za-z0-9.+() -]+$/),
  }),
  runtime: z.strictObject({
    kind: z.literal('node-stdio-once'),
    nodeMajor: z.number().int(),
    entry: relativeFile,
  }),
  platforms: z.array(z.string().min(1).max(40)).min(1).max(16),
  dependencies: z
    .array(z.strictObject({ name: z.string().min(1).max(128), version, license: z.string().min(1).max(80) }))
    .max(32),
  files: z
    .array(z.strictObject({ path: relativeFile, sha256: digest }))
    .min(1)
    .max(16),
  permissions: z.array(z.string().min(1).max(80)).max(16),
  tools: z
    .array(
      z.strictObject({
        name: z
          .string()
          .max(24)
          .regex(/^[a-z][a-z0-9_]*$/),
        description: z
          .string()
          .min(1)
          .max(512)
          .regex(/^[^\x00-\x1f\x7f]*$/),
        inputSchema: z.record(z.string(), z.unknown()),
        outputSchema: z.record(z.string(), z.unknown()),
        timeoutMs: z.number().int().min(100).max(30000),
      }),
    )
    .min(1)
    .max(16),
});
type Manifest = z.infer<typeof manifestSchema>;
const registrationSchema = z.strictObject({
  id: packId,
  version,
  manifestPath: z.string().min(1).max(4096).refine(path.isAbsolute),
  manifestSha256: digest,
});
type Registration = z.infer<typeof registrationSchema>;
const registrySchema = z.strictObject({
  schemaVersion: z.literal(1),
  packs: z.array(registrationSchema).max(16),
});
type Registry = z.infer<typeof registrySchema>;

function json(text: string, code: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    fail(code, 'Expected a bounded JSON document.');
  }
}
function parsed<T>(schema: z.ZodType<T>, value: unknown, code: string): T {
  const result = schema.safeParse(value);
  if (!result.success) fail(code, 'Document does not match the supported contract.');
  return result.data;
}
function absolute(file: string): string {
  if (!path.isAbsolute(file) || file.length > 4096 || /[\x00-\x1f\x7f]/.test(file))
    fail('INVALID_PATH', 'Choose an explicit absolute file path.');
  return path.resolve(file);
}
function unique(values: string[], code: string) {
  if (new Set(values).size !== values.length) fail(code, 'Duplicate identifiers are not supported.');
}

/** A small, explicit JSON Schema subset: no references, code, regexes or remote resolution. */
function compileSchema(value: unknown, depth = 0, budget = { nodes: 0 }): z.ZodType {
  if (depth > 4 || ++budget.nodes > 128 || !value || typeof value !== 'object' || Array.isArray(value))
    fail('PACK_SCHEMA', 'Schema exceeds the supported structure limits.');
  const s = value as Record<string, unknown>;
  const allowed: Record<string, string[]> = {
    object: ['type', 'properties', 'required', 'additionalProperties'],
    string: ['type', 'minLength', 'maxLength'],
    number: ['type', 'minimum', 'maximum'],
    integer: ['type', 'minimum', 'maximum'],
    boolean: ['type'],
    array: ['type', 'items', 'minItems', 'maxItems'],
  };
  const keys = typeof s.type === 'string' && Object.hasOwn(allowed, s.type) ? allowed[s.type]! : undefined;
  if (!keys || Object.keys(s).some((key) => !keys.includes(key)))
    fail('PACK_SCHEMA', 'Unsupported schema type or keyword.');
  const limit = (key: string, fallback: number, ceiling: number) => {
    const n = s[key] ?? fallback;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > ceiling)
      fail('PACK_SCHEMA', 'Schema limit is invalid.');
    return n;
  };
  if (s.type === 'object') {
    if (
      s.additionalProperties !== false ||
      !s.properties ||
      typeof s.properties !== 'object' ||
      Array.isArray(s.properties) ||
      !Array.isArray(s.required) ||
      s.required.some((key) => typeof key !== 'string')
    )
      fail('PACK_SCHEMA', 'Objects require properties, required and additionalProperties:false.');
    const properties = s.properties as Record<string, unknown>;
    const names = Object.keys(properties);
    const required = s.required as string[];
    if (
      names.length > 32 ||
      names.some(
        (name) =>
          !/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(name) ||
          ['constructor', 'prototype', '__proto__'].includes(name),
      ) ||
      required.some((name) => !Object.hasOwn(properties, name))
    )
      fail('PACK_SCHEMA', 'Invalid object property or required key.');
    unique(required, 'PACK_SCHEMA');
    const shape: Record<string, z.ZodType> = Object.create(null);
    for (const name of names) {
      const schema = compileSchema(properties[name], depth + 1, budget);
      shape[name] = required.includes(name) ? schema : schema.optional();
    }
    return z.strictObject(shape);
  }
  if (s.type === 'string') {
    const min = limit('minLength', 0, 4096),
      max = limit('maxLength', 4096, 4096);
    if (min > max) fail('PACK_SCHEMA', 'Invalid string bounds.');
    return z.string().min(min).max(max);
  }
  if (s.type === 'array') {
    const min = limit('minItems', 0, 64),
      max = limit('maxItems', 64, 64);
    if (min > max) fail('PACK_SCHEMA', 'Invalid array bounds.');
    return z
      .array(compileSchema(s.items, depth + 1, budget))
      .min(min)
      .max(max);
  }
  if (s.type === 'boolean') return z.boolean();
  let number = s.type === 'integer' ? z.number().int() : z.number();
  for (const key of ['minimum', 'maximum']) {
    if (s[key] !== undefined && (typeof s[key] !== 'number' || !Number.isFinite(s[key])))
      fail('PACK_SCHEMA', 'Numeric bounds must be finite.');
  }
  if (s.minimum !== undefined) number = number.min(s.minimum as number);
  if (s.maximum !== undefined) number = number.max(s.maximum as number);
  if (typeof s.minimum === 'number' && typeof s.maximum === 'number' && s.minimum > s.maximum)
    fail('PACK_SCHEMA', 'Invalid numeric bounds.');
  return number;
}
function objectSchema(value: unknown): z.ZodObject {
  const schema = compileSchema(value);
  if (!(schema instanceof z.ZodObject)) fail('PACK_SCHEMA', 'Tool input and output must be objects.');
  return schema;
}

export async function inspectPack(
  input: { manifestPath: string; manifestSha256: string },
  owner?: RootPolicy,
  signal?: AbortSignal,
) {
  cancelled(signal);
  parsed(digest, input.manifestSha256, 'PACK_PIN');
  const selected = absolute(input.manifestPath);
  const file = owner ? await owner.resolve(selected) : selected;
  const files = await FileService.create(path.dirname(file), { maxBytes: MAX_BYTES });
  const read = await files.read({ path: file });
  cancelled(signal);
  if (read.version !== input.manifestSha256)
    fail('PACK_PIN', 'Manifest does not match the owner-selected SHA-256.');
  const manifest = parsed(manifestSchema, json(read.text, 'PACK_MANIFEST'), 'PACK_MANIFEST');
  if (manifest.abiVersion !== 1) fail('PACK_ABI', 'Only optional-pack ABI version 1 is supported.');
  if (manifest.runtime.nodeMajor !== 24 || Number(process.versions.node.split('.')[0]) !== 24)
    fail('PACK_RUNTIME', 'This pack boundary requires the selected Node.js 24 runtime.');
  if (
    !['win32-x64', 'linux-x64', 'darwin-arm64', 'darwin-x64'].includes(
      `${process.platform}-${process.arch}`,
    ) ||
    !manifest.platforms.includes(`${process.platform}-${process.arch}`)
  )
    fail('PACK_PLATFORM', 'Pack does not support this operating system and architecture.');
  if (manifest.permissions.length !== 1 || manifest.permissions[0] !== 'execute-unsandboxed')
    fail('PACK_PERMISSION', 'Version 1 supports only explicitly approved unsandboxed execution.');
  if (manifest.dependencies.length)
    fail('PACK_DEPENDENCY', 'External pack dependencies are not supported by this runtime.');
  unique(
    manifest.files.map((item) => item.path.toLowerCase()),
    'PACK_MANIFEST',
  );
  unique(
    manifest.tools.map((item) => item.name),
    'PACK_MANIFEST',
  );
  unique(manifest.platforms, 'PACK_MANIFEST');
  if (
    !manifest.runtime.entry.endsWith('.mjs') ||
    !manifest.files.some((item) => item.path === manifest.runtime.entry)
  )
    fail('PACK_MANIFEST', 'The .mjs entry must occur in the pinned file list.');
  for (const tool of manifest.tools) {
    objectSchema(tool.inputSchema);
    objectSchema(tool.outputSchema);
  }
  for (const item of manifest.files) {
    cancelled(signal);
    const target = path.resolve(files.policy.root, item.path);
    if (owner) await owner.resolve(target);
    const payload = await files.read({ path: target });
    cancelled(signal);
    if (payload.version !== item.sha256)
      fail('PACK_INTEGRITY', 'A declared payload file does not match its SHA-256.');
  }
  return {
    manifest,
    manifestPath: await files.policy.resolve(file),
    manifestSha256: read.version,
    entry: await files.policy.resolve(manifest.runtime.entry),
    root: files.policy.root,
  };
}

async function registryStore(file: string, write = false) {
  const selected = absolute(file);
  const files = await FileService.create(path.dirname(selected), { allowWrite: write, maxBytes: MAX_BYTES });
  return { files, file: await files.policy.resolve(selected, true) };
}
async function readStore(store: Awaited<ReturnType<typeof registryStore>>) {
  try {
    const read = await store.files.read({ path: store.file });
    const registry = parsed(registrySchema, json(read.text, 'PACK_REGISTRY'), 'PACK_REGISTRY');
    unique(
      registry.packs.map((item) => item.id),
      'PACK_REGISTRY',
    );
    return { registry, version: read.version };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return { registry: { schemaVersion: 1, packs: [] } as Registry, version: 'missing' };
  }
}
export async function readRegistry(file: string): Promise<Registry> {
  return (await readStore(await registryStore(file))).registry;
}
async function changeRegistry(file: string, apply: boolean, transform: (registry: Registry) => Registry) {
  const store = await registryStore(file, apply);
  const change = async () => {
    const old = await readStore(store);
    const next = parsed(registrySchema, transform(old.registry), 'PACK_REGISTRY');
    unique(
      next.packs.map((item) => item.id),
      'PACK_REGISTRY',
    );
    const changed = JSON.stringify(next) !== JSON.stringify(old.registry);
    if (apply && changed)
      await store.files.write({
        path: store.file,
        expectedVersion: old.version,
        text: JSON.stringify(next, null, 2) + '\n',
      });
    return { schemaVersion: 1, applied: apply, changed, registry: store.file, packs: next.packs };
  };
  if (!apply) return change();
  const lock = await store.files.policy.resolve(store.file + '.lock', true);
  const handle = await fs.open(lock, 'wx', 0o600).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'EEXIST')
      fail('PACK_REGISTRY_BUSY', 'Registry is locked; inspect the owning operation before retrying.');
    throw error;
  });
  const identity = await handle.stat();
  try {
    return await change();
  } finally {
    await handle.close();
    const current = await fs.lstat(lock).catch(() => undefined);
    if (current && current.dev === identity.dev && current.ino === identity.ino) await fs.unlink(lock);
  }
}

export async function packsMain(args: string[]): Promise<number> {
  if (args[0] === 'help' || args[0] === '--help' || args.length === 0) {
    console.log(
      'Optional local packs (ABI 1)\n  packs inspect --manifest ABS_FILE --sha256 SHA256\n  packs install --manifest ABS_FILE --sha256 SHA256 --registry ABS_FILE [--apply]\n  packs uninstall --id ID --registry ABS_FILE [--apply]\n  packs list --registry ABS_FILE\nInstall/uninstall preview by default; --apply changes only local registration. No download, dependency installation or execution.\nMCP execution additionally requires --pack-registry ABS_FILE --allow-exec --allow-pack ID; runs as your OS user without an OS sandbox.',
    );
    return 0;
  }
  const operation = args[0];
  const permitted: Record<string, string[]> = {
    inspect: ['--manifest', '--sha256'],
    install: ['--manifest', '--sha256', '--registry', '--apply'],
    uninstall: ['--id', '--registry', '--apply'],
    list: ['--registry'],
  };
  if (!operation || !Object.hasOwn(permitted, operation))
    fail('USAGE', 'Use packs inspect|install|uninstall|list|help.');
  const options = new Map<string, string>();
  for (let i = 1; i < args.length; i++) {
    const key = args[i]!;
    if (!permitted[operation]!.includes(key) || options.has(key))
      fail('USAGE', 'Unknown or repeated pack option.');
    const value = key === '--apply' ? 'true' : args[++i];
    if (!value || value.startsWith('--')) fail('USAGE', 'Pack option requires a value.');
    options.set(key, value);
  }
  const required = (key: string) => {
    const value = options.get(key);
    if (!value) fail('USAGE', 'Missing required pack option.');
    return value;
  };
  let result: unknown;
  if (operation === 'list') result = await readRegistry(required('--registry'));
  else if (operation === 'uninstall') {
    const id = parsed(packId, required('--id'), 'PACK_MANIFEST');
    result = await changeRegistry(required('--registry'), options.has('--apply'), (registry) => ({
      ...registry,
      packs: registry.packs.filter((item) => item.id !== id),
    }));
  } else {
    const checked = await inspectPack({
      manifestPath: required('--manifest'),
      manifestSha256: required('--sha256'),
    });
    if (operation === 'inspect')
      result = { schemaVersion: 1, ...checked, compatible: true, osSandbox: false, licenseVerified: false };
    else {
      const registration: Registration = {
        id: checked.manifest.id,
        version: checked.manifest.version,
        manifestPath: checked.manifestPath,
        manifestSha256: checked.manifestSha256,
      };
      result = await changeRegistry(required('--registry'), options.has('--apply'), (registry) => {
        const existing = registry.packs.find((item) => item.id === registration.id);
        if (existing && JSON.stringify(existing) !== JSON.stringify(registration))
          fail(
            'PACK_CONFLICT',
            'Pack ID already has a different registration; explicitly unregister it first.',
          );
        return existing ? registry : { ...registry, packs: [...registry.packs, registration] };
      });
    }
  }
  console.log(JSON.stringify(result, null, 2));
  return 0;
}

type PackTool = {
  name: string;
  description: string;
  inputSchema: z.ZodObject;
  invoke: (args: unknown, signal?: AbortSignal) => Promise<Record<string, unknown>>;
};
type CatalogOptions = { registry: string; allowPacks: readonly string[]; jobs: ProcessService };
export class PackCatalog {
  readonly tools: PackTool[] = [];
  private readonly diagnostics: Array<{ id?: string; error: { code: string; message: string } }> = [];
  private readonly admitted: Array<{
    id: string;
    version: string;
    manifestSha256: string;
    source: Manifest['source'];
  }> = [];
  private constructor(private readonly options: CatalogOptions) {}
  static async create(options: CatalogOptions): Promise<PackCatalog> {
    const catalog = new PackCatalog(options);
    try {
      await options.jobs.policy.resolve(absolute(options.registry), true);
      const registry = await readRegistry(options.registry);
      for (const item of registry.packs) {
        try {
          if (!options.jobs.allowExec || !options.allowPacks.includes(item.id))
            fail('PACK_DENIED', 'Pack requires --allow-exec and an exact --allow-pack ID.');
          const checked = await inspectPack(item, options.jobs.policy);
          if (checked.manifest.id !== item.id || checked.manifest.version !== item.version)
            fail('PACK_REGISTRY', 'Registry identity does not match the pinned manifest.');
          for (const tool of checked.manifest.tools) {
            const inputSchema = objectSchema(tool.inputSchema),
              outputSchema = objectSchema(tool.outputSchema);
            catalog.tools.push({
              name: `mterm_pack_${item.id}__${tool.name}`,
              description: `Owner-approved unsandboxed pack ${item.id}@${item.version}: ${tool.description}`,
              inputSchema,
              invoke: (args, signal) => catalog.invoke(item, tool, inputSchema, outputSchema, args, signal),
            });
          }
          catalog.admitted.push({
            id: item.id,
            version: item.version,
            manifestSha256: item.manifestSha256,
            source: checked.manifest.source,
          });
        } catch (error) {
          catalog.diagnostics.push({ id: item.id, error: safeError(error) });
        }
      }
    } catch (error) {
      catalog.diagnostics.push({ error: safeError(error) });
    }
    return catalog;
  }
  describe() {
    return {
      configured: true,
      abiVersion: 1,
      protocol: PROTOCOL,
      osSandbox: false,
      licenseVerified: false,
      discovery: 'startup-snapshot; registration and pins rechecked before each call',
      admitted: this.admitted,
      diagnostics: this.diagnostics,
    };
  }
  private async invoke(
    item: Registration,
    tool: Manifest['tools'][number],
    input: z.ZodObject,
    output: z.ZodObject,
    args: unknown,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>> {
    cancelled(signal);
    const deadline = performance.now() + tool.timeoutMs;
    const arguments_ = input.parse(args);
    if (!this.options.jobs.allowExec || !this.options.allowPacks.includes(item.id))
      fail('PACK_DENIED', 'Pack execution is not approved.');
    await this.options.jobs.policy.resolve(this.options.registry);
    const registered = (await readRegistry(this.options.registry)).packs.find(
      (entry) => entry.id === item.id,
    );
    if (!registered || JSON.stringify(registered) !== JSON.stringify(item))
      fail('PACK_UNREGISTERED', 'Pack registration changed; restart the host to rediscover tools.');
    const checked = await inspectPack(item, this.options.jobs.policy, signal);
    const id = randomUUID();
    const request =
      JSON.stringify({
        protocol: PROTOCOL,
        id,
        pack: item.id,
        version: item.version,
        tool: tool.name,
        arguments: arguments_,
      }) + '\n';
    if (Buffer.byteLength(request) > MAX_BYTES)
      fail('PACK_INPUT_LIMIT', 'Pack input exceeds the byte limit.');
    const remaining = Math.floor(deadline - performance.now());
    if (remaining < 100) fail('PACK_TIMEOUT', 'Pack validation exceeded its time budget.');
    cancelled(signal);
    const jobs = this.options.jobs;
    const session = await jobs.start({
      command: process.execPath,
      args: [checked.entry],
      cwd: checked.root,
      timeoutMs: remaining,
    });
    let stdout = '',
      bytes = 0,
      cursor = 0;
    try {
      cancelled(signal);
      await jobs.input({ sessionId: session.sessionId, text: request });
      for (;;) {
        cancelled(signal);
        const state = jobs.output({ sessionId: session.sessionId, afterSeq: cursor, maxBytes: MAX_BYTES });
        if (state.timedOut || performance.now() > deadline)
          fail('PACK_TIMEOUT', 'Pack exceeded its time budget.');
        if (state.lostOutput) fail('PACK_OUTPUT_LIMIT', 'Pack output exceeded the retained byte budget.');
        for (const event of state.events) {
          bytes += Buffer.byteLength(event.text);
          if (bytes > MAX_BYTES) fail('PACK_OUTPUT_LIMIT', 'Pack output exceeded its byte budget.');
          if (event.stream === 'stdout') stdout += event.text;
        }
        cursor = state.nextSeq;
        if (!state.running && state.events.length === 0) {
          if (state.exitCode !== 0) fail('PACK_EXIT', 'Pack did not exit successfully.');
          break;
        }
        if (state.running && state.events.length === 0)
          await new Promise((resolve) => setTimeout(resolve, 20));
      }
      cancelled(signal);
      const envelope = parsed(
        z.strictObject({
          protocol: z.literal(PROTOCOL),
          id: z.literal(id),
          pack: z.literal(item.id),
          version: z.literal(item.version),
          result: z.unknown(),
        }),
        json(stdout, 'PACK_PROTOCOL'),
        'PACK_PROTOCOL',
      );
      return parsed(output, envelope.result, 'PACK_OUTPUT_SCHEMA') as Record<string, unknown>;
    } finally {
      if (jobs.output({ sessionId: session.sessionId }).running)
        await jobs.stop({ sessionId: session.sessionId });
    }
  }
}
