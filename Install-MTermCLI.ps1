# SPDX-License-Identifier: MIT
# AI-Change: 2026-10-18-automated-setup (OpenAI / GPT-6)
# One-command bootstrap/readiness and bounded sprint entry point.
# No user config mutation without -Apply, no model invocation without -Execute.
[CmdletBinding()]
param(
    [ValidateSet('Plan', 'Install', 'Repair', 'Verify', 'Sprint')]
    [string]$Mode = 'Plan',
    [string]$TrustedRoot = '',
    [ValidatePattern('^[A-Za-z0-9_-]{1,48}$')][string]$Name = 'mterm-local',
    [switch]$CompatDesktopCommander,
    [switch]$AllowWrite,
    [switch]$AllowExec,
    [switch]$Apply,
    [switch]$SkipTests,
    [string]$CodexHome = '',
    [ValidateRange(0, 99999)][int]$IssueNumber = 0,
    [switch]$Execute,
    [string]$BaseRef = 'HEAD',
    [string]$Model = '',
    [switch]$FullTests
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repo = $PSScriptRoot
$rootInput = if ($TrustedRoot) { $TrustedRoot } else { $repo }
if (!(Test-Path -LiteralPath $rootInput -PathType Container)) {
    throw 'TrustedRoot must be an existing directory.'
}
$root = (Resolve-Path -LiteralPath $rootInput).Path
$drive = [System.IO.Path]::GetPathRoot($root)
if ($root.TrimEnd('\', '/') -eq $drive.TrimEnd('\', '/')) {
    throw 'Refusing whole-drive root; select a bounded trusted project directory.'
}
$setup = Join-Path $repo 'scripts\automation\Setup-MTermCLI.ps1'
$sprint = Join-Path $repo 'scripts\automation\Start-MTermSprint.ps1'
foreach ($required in @($setup, $sprint, (Join-Path $repo 'package-lock.json'))) {
    if (!(Test-Path -LiteralPath $required -PathType Leaf)) {
        throw "Incomplete MTerm-CLI checkout: $required"
    }
}

if ($Mode -in @('Plan', 'Install', 'Repair')) {
    if ($Execute) { throw '-Execute is only valid with -Mode Sprint.' }
    $opts = @{
        TrustedRoot = $root
        Name = $Name
        CompatDesktopCommander = $CompatDesktopCommander.IsPresent
        AllowWrite = $AllowWrite.IsPresent
        AllowExec = $AllowExec.IsPresent
        Apply = $Apply.IsPresent
        SkipTests = $SkipTests.IsPresent
    }
    if ($CodexHome) { $opts['CodexHome'] = $CodexHome }
    if ($Mode -eq 'Plan' -and $Apply) {
        throw 'Use -Mode Install -Apply or -Mode Repair -Apply to change Codex registration.'
    }
    & $setup @opts
    if ($LASTEXITCODE -ne 0) { throw 'Setup command failed; existing user settings were preserved where possible.' }
    return
}

if ($Mode -eq 'Sprint') {
    if ($Apply) { throw '-Apply is for installation. Sprint model usage requires -Execute.' }
    if ($SkipTests -or $FullTests -or $CodexHome) {
        throw 'Unsupported Sprint flags; use the documented bounded issue-worker options.'
    }
    $opts = @{ IssueNumber = $IssueNumber; Execute = $Execute.IsPresent; BaseRef = $BaseRef }
    if ($Model) { $opts['Model'] = $Model }
    & $sprint @opts
    if ($LASTEXITCODE -ne 0) { throw 'Sprint command failed; its isolated worktree should remain available.' }
    return
}

# Verify is read-only with respect to user Codex settings and credentials.
if ($Apply -or $Execute -or $SkipTests) {
    throw 'Verify does not accept mutation or execution shortcuts.'
}
$node = Get-Command node -ErrorAction SilentlyContinue
$npm = Get-Command npm -ErrorAction SilentlyContinue
$codex = Get-Command codex -ErrorAction SilentlyContinue
$entry = Join-Path $repo 'bin\mterm-cli.js'
$built = Test-Path -LiteralPath (Join-Path $repo 'dist\cli.js') -PathType Leaf
$doctor = $null
if ($node -and $built -and (Test-Path -LiteralPath $entry -PathType Leaf)) {
    $raw = & $node.Source $entry doctor --json --root $root 2>&1
    if ($LASTEXITCODE -eq 0) {
        try { $doctor = ($raw -join [Environment]::NewLine | ConvertFrom-Json) }
        catch { throw 'CLI doctor returned non-JSON output; inspect the installed build.' }
    }
}
$ready = [bool]($doctor -and $doctor.localMcp.ready -and $codex)
$report = [ordered]@{
    schemaVersion = 1
    mode = 'verify-read-only'
    readyLocalCodexMcp = $ready
    trustedRoot = $root
    nodeAvailable = [bool]$node
    npmAvailable = [bool]$npm
    codexAvailable = [bool]$codex
    compiledCliPresent = $built
    mcpStdioSupported = [bool]($doctor -and $doctor.localMcp.ready)
    remoteCloudflareGatewayReady = $false
    browserRelayReady = $false
    message = if ($ready) {
        'Local prerequisites appear ready. Run Codex-managed MCP smoke to certify the installed registration.'
    } else {
        'Some local prerequisites or the compiled CLI are unavailable; run -Mode Install -Apply after reviewing its plan.'
    }
}
if ($FullTests) {
    if (!$npm) { throw 'npm is required for -FullTests.' }
    Push-Location $repo
    try {
        & $npm.Source run check
        if ($LASTEXITCODE -ne 0) { throw 'MTerm normal validation gate failed.' }
        $report['fullProjectCheck'] = 'PASS'
    } finally { Pop-Location }
}
$report | ConvertTo-Json -Depth 6
