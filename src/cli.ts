// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-04-local-mcp (OpenAI / GPT-6 Astra Pro; self-reported)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeError, fail } from './errors.js';
export const VERSION = '0.0.1-preview.1';
export function parseHost(args: string[]) {
  let root: string | undefined,
    stdio = false,
    allowWrite = false,
    allowExec = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--root') {
      if (root) fail('USAGE', '--root must occur once.');
      root = args[++i];
      if (!root || root.startsWith('--')) fail('USAGE', '--root requires an explicit directory.');
    } else if (a === '--stdio') stdio = true;
    else if (a === '--allow-write') allowWrite = true;
    else if (a === '--allow-exec') allowExec = true;
    else fail('USAGE', 'Unsupported MCP option.');
  }
  if (!root) fail('USAGE', 'MCP requires --root PATH; no implicit whole-machine scope.');
  if (!stdio) fail('USAGE', 'Only --stdio transport is implemented.');
  return { root: path.resolve(root), allowWrite, allowExec };
}
function help() {
  return `MTerm-CLI ${VERSION} — local workstation preview\n\n  mterm-cli                         Launch existing Codex, unchanged TUI\n  mterm-cli -- <codex arguments>     Explicit pass-through, no injected flags\n  mterm-cli mcp --stdio --root PATH [--allow-write] [--allow-exec]\n  mterm-cli doctor --json [--root PATH]\n  mterm-cli setup codex --root PATH [--allow-write] [--allow-exec]\n  mterm-cli config [show|get KEY|set KEY VALUE|path] [--json]\n  mterm-cli status [--json|--line]    Quota integration not implemented yet\n  mterm-cli update                   Managed updater not implemented yet\n\nMCP defaults to read-only. Execution is separate and runs as your OS user, not a sandbox.\nNo browser, Web relay, network listener, daemon, quota request or automatic installation.\nsetup prints a reversible plan; it never writes your real Codex configuration.\n`;
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
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    recommendedLts: 24,
    nodeIsLts: !!process.release.lts,
    localMcp: { ...rootState, transport: 'stdio', defaultReadOnly: true, execIsNotSandbox: true },
    codex,
    remoteWebRelay: { ready: false, reason: 'Not implemented' },
    quota: { ready: false, reason: 'Not integrated' },
    networkChecked: false,
  };
  console.log(
    args.includes('--json')
      ? JSON.stringify(report, null, 2)
      : `MTerm-CLI ${VERSION}\nLocal MCP: ${rootState.ready ? 'ready for the selected root' : 'root not verified'}\nNode: ${process.version} (${process.release.lts ?? 'not LTS; use Node 24 LTS'})\nWeb relay: not implemented\nNo network or account checks performed.`,
  );
  return report.ok ? 0 : 2;
}
export async function main(args: string[]): Promise<number> {
  if (args[0] === '--help' || args[0] === 'help') {
    console.log(help());
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
  if (args[0] === 'doctor') return doctor(args.slice(1));
  if (args[0] === 'tools') {
    const opts = parseHost(['--stdio', ...args.slice(1)]);
    const { RootPolicy } = await import('./policy.js');
    const root = await RootPolicy.create(opts.root);
    console.log(
      JSON.stringify(
        {
          root: root.root,
          writeEnabled: opts.allowWrite,
          executionEnabled: opts.allowExec,
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
  if (args[0] === 'setup' && args[1] === 'codex') {
    const opts = parseHost(['--stdio', ...args.slice(2)]);
    const { RootPolicy } = await import('./policy.js');
    const root = await RootPolicy.create(opts.root);
    const bin = fileURLToPath(new URL('../bin/mterm-cli.js', import.meta.url));
    const childArgs = [
      bin,
      'mcp',
      '--stdio',
      '--root',
      root.root,
      ...(opts.allowWrite ? ['--allow-write'] : []),
      ...(opts.allowExec ? ['--allow-exec'] : []),
    ];
    console.log(
      JSON.stringify(
        {
          schemaVersion: 1,
          applied: false,
          add: {
            command: 'codex',
            args: ['mcp', 'add', 'mterm-local', '--', process.execPath, ...childArgs],
          },
          verify: { command: 'codex', args: ['mcp', 'get', 'mterm-local', '--json'] },
          remove: { command: 'codex', args: ['mcp', 'remove', 'mterm-local'] },
          warning:
            'Review the root and privileges before applying. Do not replace an existing mterm-local entry without reviewing it. These local tools are not a Web relay or OS sandbox.',
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
