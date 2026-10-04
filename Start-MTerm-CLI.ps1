# SPDX-License-Identifier: MIT
# AI-Change: 2026-10-04-local-mcp
[CmdletBinding()]
param([Parameter(ValueFromRemainingArguments=$true)][string[]]$CliArgs)
$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$manifest=Join-Path $root 'artifacts\node-lts.json'
$node=$null
if(Test-Path -LiteralPath $manifest){$candidate=(Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json).node;if(Test-Path -LiteralPath $candidate){$node=$candidate}}
if(!$node){$node=(Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source}
$entry=Join-Path $root 'bin\mterm-cli.js'
if(!(Test-Path -LiteralPath (Join-Path $root 'dist\cli.js'))){throw 'Build first using supported Node and npm run build. No automatic installation was performed.'}
& $node $entry @CliArgs
exit $LASTEXITCODE
