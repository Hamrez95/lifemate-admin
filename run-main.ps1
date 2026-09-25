[CmdletBinding()]
param(
  [ValidateRange(1024, 65535)]
  [int]$Port = 3000,
  [switch]$Install,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([Parameter(Mandatory)][string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "'$Name' is required. Install it, reopen PowerShell, then run this script again."
  }
}

function Invoke-Git {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

  & git @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
  }
}

function Test-LoopbackPortInUse {
  param([Parameter(Mandatory)][int]$TargetPort)

  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $client.Connect("127.0.0.1", $TargetPort)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Test-RequiredEnvironment {
  param([Parameter(Mandatory)][string]$Root)

  $envPath = Join-Path $Root ".env.local"
  if (-not (Test-Path $envPath)) {
    throw "'.env.local' is missing. Copy '.env.example' to '.env.local', fill the browser-safe Supabase values, then retry."
  }

  $content = Get-Content -Raw $envPath
  $required = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_ADMIN_API_URL"
  )
  $missing = @(
    $required | Where-Object {
      $content -notmatch "(?m)^\\s*$_\\s*=\\s*\\S"
    }
  )

  if ($missing.Count -gt 0) {
    throw "'.env.local' is missing required values: $($missing -join ', '). The runner never prints or creates secrets."
  }
}

Require-Command git
Require-Command node
Require-Command npm

$repositoryRoot = $PSScriptRoot
Set-Location $repositoryRoot

if (-not (Test-Path (Join-Path $repositoryRoot ".git"))) {
  throw "run-main.ps1 must stay in the repository root. '.git' was not found beside this script."
}

$workingTree = (& git status --porcelain)
if ($LASTEXITCODE -ne 0) {
  throw "Could not inspect the Git working tree."
}

if ($workingTree) {
  throw @"
Your working tree has uncommitted changes, so main was not changed.
Commit, stash, or discard your own changes first; this script never resets, stashes, or overwrites work.
"@
}

$lockBefore = (& git rev-parse HEAD:package-lock.json 2>$null)
if ($LASTEXITCODE -ne 0) {
  $lockBefore = $null
}

Write-Host "Fetching latest origin/main..." -ForegroundColor Cyan
Invoke-Git fetch origin main
Invoke-Git switch main
Invoke-Git pull --ff-only origin main

Test-RequiredEnvironment -Root $repositoryRoot

$commit = (& git rev-parse --short HEAD).Trim()
if ($LASTEXITCODE -ne 0) {
  throw "Could not read the updated main commit."
}

$lockAfter = (& git rev-parse HEAD:package-lock.json 2>$null)
if ($LASTEXITCODE -ne 0) {
  $lockAfter = $null
}

$nodeVersionText = (& node --version).Trim().TrimStart("v")
$nodeVersion = [version]$nodeVersionText
if ($nodeVersion -lt [version]"20.9.0") {
  throw "Node.js 20.9+ is required; found v$nodeVersionText. Install a supported Node LTS release, then retry."
}

$nodeModules = Join-Path $repositoryRoot "node_modules"
$shouldInstall = $Install -or -not (Test-Path $nodeModules) -or ($lockBefore -ne $lockAfter)
if ($shouldInstall) {
  Write-Host "Synchronizing locked npm dependencies..." -ForegroundColor Cyan
  & npm ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) {
    throw "npm ci failed with exit code $LASTEXITCODE. Fix the reported npm error, then retry."
  }
}

if (Test-LoopbackPortInUse -TargetPort $Port) {
  throw "http://127.0.0.1:$Port is already in use. Stop that process or run .\run-main.ps1 -Port <another-port>."
}

$url = "http://127.0.0.1:$Port"
Write-Host "LifeMate Command Center main@$commit will start at $url" -ForegroundColor Green
if (-not $NoBrowser) {
  Start-Process $url
}

$nextCli = Join-Path $repositoryRoot "node_modules\\next\\dist\\bin\\next"
if (-not (Test-Path $nextCli)) {
  throw "Next.js CLI was not found after dependency setup. Run .\\run-main.ps1 -Install and retry."
}

& node $nextCli dev --hostname 127.0.0.1 --port $Port
exit $LASTEXITCODE
