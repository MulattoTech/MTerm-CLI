// SPDX-License-Identifier: MIT
// Modified: 2026-11-08-aug012-resource-budgets; explicit immutable startup budgets and no silent registration downgrade.
// Modified: 2026-11-07-aug001-pack-boundary; explicit local pack registration and execution grants.
// AI-Change: 2026-10-04-local-mcp (OpenAI / GPT-6 Astra Pro; self-reported)
import path from 'node:path';
import { safeError, fail } from './errors.js';
import { parseProcessBudget, type ProcessBudget } from './resource-budget-policy.js';
import { parseIsolationPolicy, type IsolationPolicy } from './isolation-policy.js';
import { getEnvironmentName, configPath } from './config.js';
export const VERSION = '0.0.1-preview.1';
export function parseHost(args: string[]) {
  const roots: string[] = [],
    allowedShells: string[] = [],
    allowPacks: string[] = [];
  let stdio = false,
    allowWrite = false,
    allowExec = false,
    allowIsolatedExec = false,
    compatDesktopCommander = false,
    allowConfigWrite = false;
  let compatConfig: string | undefined;
  let packRegistry: string | undefined;
  let processBudget: ProcessBudget | undefined;
  let isolationPolicy: IsolationPolicy | undefined;
  for (let i = 0; i < args.length; i++) {
    const option = args[i];
    if (
      option === '--root' ||
      option === '--compat-config' ||
      option === '--allow-shell' ||
      option === '--pack-registry' ||
      option === '--allow-pack' ||
      option === '--process-budget' ||
      option === '--isolation-policy'
    ) {
      const value = args[++i];
      if (!value || value.startsWith('--')) fail('USAGE', option + ' requires a value.');
      if (option === '--root') roots.push(path.resolve(value));
      else if (option === '--compat-config') {
        if (compatConfig || !path.isAbsolute(value))
          fail('USAGE', '--compat-config requires one absolute file path.');
        compatConfig = path.resolve(value);
      } else if (option === '--pack-registry') {
        if (packRegistry || !path.isAbsolute(value))
          fail('USAGE', '--pack-registry requires one absolute file path.');
        packRegistry = path.resolve(value);
      } else if (option === '--allow-pack') {
        if (value.length > 24 || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value) || allowPacks.includes(value))
          fail('USAGE', '--allow-pack requires a distinct supported pack ID.');
        allowPacks.push(value);
      } else if (option === '--isolation-policy') {
        if (isolationPolicy || Buffer.byteLength(value) > 2048)
          fail('USAGE', '--isolation-policy requires one JSON object of at most 2048 UTF-8 bytes.');
        let parsed: unknown;
        try {
          parsed = JSON.parse(value);
        } catch {
          fail('USAGE', '--isolation-policy requires valid JSON.');
        }
        isolationPolicy = parseIsolationPolicy(parsed);
      } else if (option === '--process-budget') {
        if (processBudget || Buffer.byteLength(value) > 1024)
          fail('USAGE', '--process-budget requires one JSON object of at most 1024 UTF-8 bytes.');
        let parsed: unknown;
        try {
          parsed = JSON.parse(value);
        } catch {
          fail('USAGE', '--process-budget requires valid JSON.');
        }
        processBudget = parseProcessBudget(parsed);
      } else allowedShells.push(value);
    } else if (option === '--stdio') stdio = true;
    else if (option === '--allow-write') allowWrite = true;
    else if (option === '--allow-exec') allowExec = true;
    else if (option === '--allow-isolated-exec') allowIsolatedExec = true;
    else if (option === '--compat-desktop-commander') compatDesktopCommander = true;
    else if (option === '--allow-config-write') allowConfigWrite = true;
    else fail('USAGE', 'Unsupported MCP option.');
  }
  if (roots.length < 1 || roots.length > 16)
    fail('USAGE', 'MCP requires between one and sixteen explicit --root directories.');
  if (!stdio) fail('USAGE', 'Only --stdio transport is implemented.');
  if (!compatDesktopCommander && (compatConfig || allowConfigWrite || allowedShells.length))
    fail('USAGE', 'Compatibility configuration options require --compat-desktop-commander.');
  if (allowedShells.length > 16) fail('USAGE', 'At most sixteen owner-selected shells are supported.');
  if (allowPacks.length > 16 || (allowPacks.length && !packRegistry))
    fail('USAGE', 'At most sixteen --allow-pack grants require an explicit --pack-registry.');
  if (allowIsolatedExec && !isolationPolicy)
    fail('USAGE', '--allow-isolated-exec requires an explicit --isolation-policy.');
  return {
    root: roots[0]!,
    roots,
    allowWrite,
    allowExec,
    allowIsolatedExec,
    isolationPolicy,
    compatDesktopCommander,
    compatConfig,
    allowConfigWrite,
    allowedShells,
    packRegistry,
    allowPacks,
    processBudget,
  };
}

function help() {
  return `MTerm-CLI ${VERSION} — workstation preview\n\n  mterm-cli                         Launch existing Codex, unchanged TUI\n  mterm-cli -- <codex arguments>     Explicit pass-through, no injected flags\n  mterm-cli mcp --stdio --root PATH [--root OTHER] [--allow-write] [--allow-exec]\n  mterm-cli provenance help          Verify pinned source/license evidence\n  mterm-cli packs help               Inspect and register optional local packs\n  mterm-cli remote help              Configure and pair an outbound read-only agent\n  mterm-cli doctor --json [--root PATH]\n  mterm-cli setup codex --root PATH [--allow-write] [--allow-exec] [--apply]\n  mterm-cli remove codex [--name NAME] [--apply]\n  mterm-cli config [show|get KEY|set KEY VALUE|path] [--json]\n  mterm-cli status [--json|--line]    Quota integration not implemented yet\n  mterm-cli update                   Managed updater not implemented yet\n\nOptional --compat-desktop-commander exposes eight implemented text/file aliases, not full26-tool parity.\nCompatibility options: --compat-desktop-commander [--compat-config ABSOLUTE_FILE] [--allow-config-write] [--allow-shell EXECUTABLE].\nOptional pack execution: --pack-registry ABS_FILE --allow-exec --allow-pack ID (repeat per pack).\nMCP defaults to read-only. Execution is separate and runs as your OS user, not a sandbox.\nRemote access requires explicit setup, authenticated pairing and foreground remote start.\nDefault local commands open no listener, start no daemon and make no quota request or automatic installation.\nsetup previews by default; --apply performs explicit backed-up registration. remove codex --apply removes only the exact owned block.\n`;
}
async function doctor(args: string[]) {
  const { settings } = await import('./config.js');
  const config = await settings();
  let root = config.settings.trustedRoot;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root') {
      root = args[++i];
      if (!root) fail('USAGE', 'Missing root.');
    } else if (args[i] !== '--json') fail('USAGE', 'Unknown doctor option.');
  }
  let rootState: { ready: boolean; root?: string; error?: unknown } = {
    ready: false,
    error: { code: 'ROOT_REQUIRED', message: 'Pass --root to verify scope.' },
  };
  if (root)
    try {
      const { RootPolicy } = await import('./policy.js');
      const p = await RootPolicy.create(path.resolve(root));
      rootState = { ready: true, root: p.root };
    } catch (e) {
      rootState = { ready: false, error: safeError(e) };
    }
  let codex: unknown;
  try {
    const { resolveCodex } = await import('./codex.js');
    codex = { ready: true, ...(await resolveCodex()) };
  } catch (e) {
    codex = { ready: false, error: safeError(e) };
  }
  const report = {
    schemaVersion: 1,
    ok: rootState.ready,
    version: VERSION,
    environment: getEnvironmentName(),
    configPath: configPath(),
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    recommendedLts: 24,
    nodeIsLts: !!process.release.lts,
    localMcp: { ...rootState, transport: 'stdio', defaultReadOnly: true, execIsNotSandbox: true },
    codex,
    remoteWebRelay: {
      ready: false,
      implemented: true,
      optIn: true,
      permissions: 'read-only',
      reason:
        'Use remote status to inspect the explicitly configured agent. This doctor does not contact the gateway.',
    },
    quota: { ready: false, reason: 'Not integrated' },
    networkChecked: false,
  };
  console.log(
    args.includes('--json')
      ? JSON.stringify(report, null, 2)
      : `MTerm-CLI ${VERSION}\nLocal MCP: ${rootState.ready ? 'ready for the selected root' : 'root not verified'}\nNode: ${process.version} (${process.release.lts ?? 'not LTS; use Node 24 LTS'})\nRemote agent: opt-in read-only mode; use remote status\nNo network or account checks performed.`,
  );
  return report.ok ? 0 : 2;
}
export async function main(args: string[]): Promise<number> {
  if (args[0] === '--help' || args[0] === 'help') {
    console.log(
      help() +
        '\nOptional isolated JavaScript: --allow-isolated-exec --isolation-policy JSON. Qualified native Linux x64 Docker only; no host mounts, network, image pulls or native-process grant. See docs/parity/ISOLATION.md.\n' +
        '\nProcess admission: --process-budget JSON sets immutable owner limits for this stdio host. See docs/parity/RESOURCE_BUDGETS.md. No hard CPU/GPU/RAM/disk-write or cross-host quota.\n',
    );
    return 0;
  }
  if (args[0] === '--version' || args[0] === 'version') {
    console.log(VERSION);
    return 0;
  }
  if (args.length === 0 || args[0] === '--' || args[0] === 'run') {
    let rest = args.length === 0 ? [] : args.slice(1);
    if (args[0] === 'run' && rest[0] === '--') rest = rest.slice(1);
    return (await import('./codex.js')).launchCodex(rest);
  }
  if (args[0] === 'mcp') {
    const options = parseHost(args.slice(1));
    await (await import('./mcp.js')).runMcp(options);
    return 0;
  }
  if (args[0] === 'remote') return (await import('./remote/cli.js')).remoteMain(args.slice(1));
  if (args[0] === 'packs') return (await import('./tool-packs.js')).packsMain(args.slice(1));
  if (args[0] === 'provenance') return (await import('./provenance.js')).provenanceMain(args.slice(1));
  if (args[0] === 'doctor') return doctor(args.slice(1));
  if (args[0] === 'tools') {
    const opts = parseHost(['--stdio', ...args.slice(1)]);
    const { RootPolicy } = await import('./policy.js');
    const root = await RootPolicy.create(opts.roots);
    console.log(
      JSON.stringify(
        {
          root: root.root,
          ownerRoots: root.roots,
          configWriteEnabled: opts.allowConfigWrite,
          writeEnabled: opts.allowWrite,
          executionEnabled: opts.allowExec,
          executionMode: 'unsandboxed-os-user',
          isolation: {
            configured: !!opts.isolationPolicy,
            enabled: opts.allowIsolatedExec,
            policy: opts.isolationPolicy ?? null,
            backendChecked: false,
          },
          processBudget: opts.processBudget ?? parseProcessBudget(),
          transport: 'stdio',
          networkListener: false,
          note: 'Full exact tool list is available through MCP tools/list.',
        },
        null,
        2,
      ),
    );
    return 0;
  }
  if (args[0] === 'config') {
    const { settings, setSetting, configPath } = await import('./config.js');
    const a = args.slice(1).filter((v) => v !== '--json');
    const mode = a[0] ?? 'show';
    if (mode === 'path' && a.length === 1) {
      console.log(configPath());
      return 0;
    }
    if (mode === 'show' && a.length <= 1) {
      console.log(JSON.stringify(await settings(), null, 2));
      return 0;
    }
    if (mode === 'get' && a.length === 2) {
      if (a[1] !== 'trustedRoot' && a[1] !== 'codexExecutable') fail('CONFIG_KEY', 'Unsupported config key.');
      const c = await settings();
      console.log(JSON.stringify({ key: a[1], value: c.settings[a[1]] ?? null }));
      return 0;
    }
    if (mode === 'set' && a.length === 3) {
      console.log(JSON.stringify(await setSetting(a[1]!, a[2]!), null, 2));
      return 0;
    }
    fail('USAGE', 'Use config show|get KEY|set KEY VALUE|path.');
  }
  if ((args[0] === 'setup' || args[0] === 'remove') && args[1] === 'codex') {
    let apply = false,
      name = 'mterm-local';
    const host: string[] = [];
    for (let i = 2; i < args.length; ++i) {
      if (args[i] === '--apply') {
        if (apply) fail('USAGE', '--apply must occur once.');
        apply = true;
      } else if (args[i] === '--name') {
        name = args[++i] ?? '';
      } else host.push(args[i]!);
    }
    const registration = await import('./codex-registration.js');
    if (args[0] === 'remove') {
      if (host.length) fail('USAGE', 'Use remove codex [--name NAME] [--apply].');
      console.log(JSON.stringify(await registration.removeCodexRegistration({ name, apply }), null, 2));
      return 0;
    }
    const opts = parseHost(['--stdio', ...host]);
    if (opts.isolationPolicy || opts.allowIsolatedExec)
      fail(
        'USAGE',
        'Managed Codex registration does not yet preserve isolation policy. Use explicit stdio arguments.',
      );
    if (opts.processBudget)
      fail(
        'USAGE',
        'Managed Codex registration does not yet preserve process budgets. Use explicit stdio arguments.',
      );
    if (opts.packRegistry)
      fail(
        'USAGE',
        'Managed Codex registration does not yet preserve optional-pack grants. Use explicit stdio arguments.',
      );
    const plan = await registration.planCodexRegistration({ ...opts, name });
    if (apply) console.log(JSON.stringify(await registration.applyCodexRegistration(plan), null, 2));
    else
      console.log(
        JSON.stringify(
          {
            schemaVersion: 1,
            applied: false,
            add: { command: 'codex', args: ['mcp', 'add', name, '--', plan.command, ...plan.args] },
            verify: { command: 'codex', args: ['mcp', 'get', name, '--json'] },
            remove: { command: 'codex', args: ['mcp', 'remove', name] },
            managedRemoval: { command: 'mterm-cli', args: ['remove', 'codex', '--name', name, '--apply'] },
            warning:
              'Preview only. Use setup codex --apply to apply with ownership tracking and backups. Direct Codex add is unmanaged. Existing unowned or changed entries are never overwritten. Execution runs as your OS user.',
          },
          null,
          2,
        ),
      );
    return 0;
  }
  if (args[0] === 'status' || args[0] === 'update') {
    const message =
      args[0] === 'status'
        ? 'The quota adapter is not integrated. No credentials or network endpoint were contacted.'
        : 'The managed updater is not implemented. No files or pins were changed.';
    if (args.includes('--json'))
      console.log(
        JSON.stringify({
          schemaVersion: 1,
          ok: false,
          provider: 'codex',
          windows: [],
          credits: null,
          error: { code: 'NOT_IMPLEMENTED', message },
        }),
      );
    else if (args.includes('--line')) console.log('codex usage: unavailable (not integrated)');
    else process.stderr.write('NOT_IMPLEMENTED: ' + message + '\n');
    return 4;
  }
  fail('USAGE', 'Unknown MTerm command. Use -- for Codex arguments or --help.');
}
export { safeError };
