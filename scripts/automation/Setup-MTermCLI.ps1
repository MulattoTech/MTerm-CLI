# SPDX-License-Identifier: MIT
# AI-Change: 2026-10-16-har-automation (OpenAI / GPT-6)
# One-command local setup. Read-only preview by default; -Apply is an explicit mutation.
[CmdletBinding()]
param(
    [string]$TrustedRoot = '',
    [ValidatePattern('^[A-Za-z0-9_-]{1,48}$')][string]$Name = 'mterm-local',
    [switch]$AllowWrite,
    [switch]$AllowExec,
    [switch]$CompatDesktopCommander,
    [switch]$Apply,
    [switch]$SkipTests,
    [string]$CodexHome = ''
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
if (!$TrustedRoot) { $TrustedRoot = $repo }
if (!(Test-Path -LiteralPath $TrustedRoot -PathType Container)) {
    throw 'TrustedRoot must refer to an existing directory.'
}
$trusted = (Resolve-Path -LiteralPath $TrustedRoot).Path
$driveRoot = [System.IO.Path]::GetPathRoot($trusted)
if ($trusted.TrimEnd('\','/') -eq $driveRoot.TrimEnd('\','/')) {
    throw 'Refusing whole-drive root; choose a bounded project directory.'
}
$node = Get-Command node -ErrorAction SilentlyContinue
$npm = Get-Command npm -ErrorAction SilentlyContinue
$codex = Get-Command codex -All -ErrorAction SilentlyContinue | Where-Object { $_.CommandType -eq 'Application' -and $_.Source -match '\.(cmd|exe)$' } | Select-Object -First 1
if (!$node -or !$npm) { throw 'Node.js and npm are required. Install a supported Node LTS first.' }
$versionString = (& $node.Source --version).TrimStart('v')
if ($LASTEXITCODE) { throw 'Could not read Node.js version.' }
$version = [version]$versionString
if ($version.Major -lt 24) { throw 'MTerm-CLI requires Node.js 24 or newer. Prefer supported Node LTS.' }
if ($Apply -and !$codex) { throw 'Codex CLI is required for -Apply. No config was changed.' }
if ($CodexHome -and !(Test-Path -LiteralPath $CodexHome -PathType Container)) {
    throw 'CodexHome must be a pre-existing directory; never create or copy authentication storage silently.'
}
$commandArgs = @('setup','codex','--name',$Name,'--root',$trusted)
if ($CompatDesktopCommander) { $commandArgs += '--compat-desktop-commander' }
if ($AllowWrite) { $commandArgs += '--allow-write' }
if ($AllowExec) { $commandArgs += '--allow-exec' }
$plan = [ordered]@{
    product = 'MTerm-CLI'
    mode = $(if ($Apply) { 'apply' } else { 'preview' })
    repo = $repo
    trustedRoot = $trusted
    codexName = $Name
    nodeVersion = $versionString
    codexAvailable = [bool]$codex
    allowWrite = [bool]$AllowWrite
    allowExec = [bool]$AllowExec
    compatDesktopCommander = [bool]$CompatDesktopCommander
    validation = $(if ($SkipTests) { 'skipped-by-explicit-request' } else { 'required' })
    command = @('node','bin/mterm-cli.js') + $commandArgs + @('--apply')
    warning = 'Never set a drive root, re-register another existing entry, copy auth secrets or enable broad exec by default.'
}
if (!$Apply) {
    $plan | ConvertTo-Json -Depth 6
    Write-Host 'PREVIEW ONLY: rerun with -Apply to install dependencies, validate, build and register Codex.' -ForegroundColor Yellow
    return
}
$previousHome = [Environment]::GetEnvironmentVariable('CODEX_HOME','Process')
try {
    if ($CodexHome) { $env:CODEX_HOME = (Resolve-Path -LiteralPath $CodexHome).Path }
    Push-Location $repo
    try {
        if (!(Test-Path -LiteralPath 'package-lock.json' -PathType Leaf)) {
            throw 'Pinned package-lock.json is missing; refusing unpinned npm install.'
        }
        & $npm.Source ci --ignore-scripts
        if ($LASTEXITCODE) { throw 'npm ci failed. No Codex registration attempted.' }
        # Fresh clones have no dist/ modules; compile before running JS test fixtures.
        & $npm.Source run build
        if ($LASTEXITCODE) { throw 'npm run build failed. No Codex registration attempted.' }
        if (!$SkipTests) {
            & $npm.Source run check
            if ($LASTEXITCODE) { throw 'npm run check failed. No Codex registration attempted.' }
        }
        $compiled = Join-Path $repo 'dist\cli.js'
        if (!(Test-Path -LiteralPath $compiled)) { throw 'Compiled module is missing.' }
        $entry = Join-Path $repo 'bin\mterm-cli.js'
        if (!(Test-Path -LiteralPath $entry)) { throw 'Compiled CLI entry is missing.' }
        & $node.Source $entry @commandArgs '--apply'
        if ($LASTEXITCODE) { throw 'Managed Codex registration failed; inspect its safe backup and error.' }
        & $codex.Source mcp get $Name --json | Out-Null
        if ($LASTEXITCODE) { throw 'Codex could not read the installed MCP registration.' }
    } finally {
        Pop-Location
    }
} finally {
    if ($null -eq $previousHome) { Remove-Item Env:CODEX_HOME -ErrorAction SilentlyContinue }
    else { $env:CODEX_HOME = $previousHome }
}
$plan['result'] = 'registration-applied-and-verified'
$plan | ConvertTo-Json -Depth 6
