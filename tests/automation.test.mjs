import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readdir, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const setup = path.join(root, 'scripts', 'automation', 'Setup-MTermCLI.ps1');
const sprint = path.join(root, 'scripts', 'automation', 'Start-MTermSprint.ps1');
const windows = process.platform === 'win32';
const shell = windows
  ? spawnSync('pwsh', ['-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.Major'], {
      encoding: 'utf8',
    })
  : null;
const available = windows && shell?.status === 0;

function run(script, args = []) {
  return spawnSync('pwsh', ['-NoProfile', '-NonInteractive', '-File', script, ...args], {
    encoding: 'utf8',
    timeout: 20000,
    windowsHide: true,
  });
}

test('automation PowerShell scripts parse without executing', { skip: !available }, () => {
  for (const script of [setup, sprint]) {
    const escaped = script.replaceAll("'", "''");
    const command =
      "$errors=$null;[System.Management.Automation.Language.Parser]::ParseFile('" +
      escaped +
      "',[ref]$null,[ref]$errors)|Out-Null;if($errors.Count){$errors|ForEach-Object{$_.Message};exit 1}";
    const result = spawnSync('pwsh', ['-NoProfile', '-NonInteractive', '-Command', command], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr + result.stdout);
  }
});

test('one-command setup preview is read-only and permission-conservative', { skip: !available }, async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'mterm-setup-preview-'));
  try {
    const before = await readdir(project);
    const result = run(setup, ['-TrustedRoot', project, '-CompatDesktopCommander']);
    assert.equal(result.status, 0, result.stderr);
    const plan = JSON.parse(
      result.stdout.slice(result.stdout.indexOf('{'), result.stdout.lastIndexOf('}') + 1),
    );
    assert.equal(plan.mode, 'preview');
    assert.equal(plan.allowWrite, false);
    assert.equal(plan.allowExec, false);
    assert.equal(plan.compatDesktopCommander, true);
    assert.equal(plan.trustedRoot.toLowerCase(), project.toLowerCase());
    assert.deepEqual(await readdir(project), before, 'preview must not create files in trusted root');
  } finally {
    await rm(project, { recursive: true, force: true });
  }
});

test('one-command setup refuses a whole-drive root', { skip: !available }, () => {
  const result = run(setup, ['-TrustedRoot', path.parse(root).root]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /whole-drive root/i);
});

test('setup executes the actual CLI bin entry, not the export-only compiled module', async () => {
  const source = await readFile(setup, 'utf8');
  assert.match(source, /bin\\mterm-cli\.js/);
  assert.match(source, /& \$node\.Source \$entry @commandArgs '--apply'/);
  assert.doesNotMatch(
    source,
    /Join-Path \$repo 'dist\\cli\.js'\s*\n\s*if \(!\(Test-Path -LiteralPath \$entry\)/,
  );
});
