param(
  [string]$ComposeFile = "docker-compose.yml",
  [string]$BackendDbDir = ".\backend\db",
  [string]$InitFile = "init.sql",
  [string]$SeedFile = "seed.sql"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Ok($msg)   { Write-Host "[OK]   $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Bad($msg)  { Write-Host "[FAIL] $msg" -ForegroundColor Red }

function Resolve-FullPath([string]$p) {
  return (Resolve-Path -LiteralPath $p).Path
}

function Require-File([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Missing required file: $path"
  }
  $item = Get-Item -LiteralPath $path
  if ($item.PSIsContainer) {
    throw "Expected a FILE but found a DIRECTORY: $path"
  }
  Write-Ok "File exists: $path"
}

function Require-Dir([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Missing required directory: $path"
  }
  $item = Get-Item -LiteralPath $path
  if (-not $item.PSIsContainer) {
    throw "Expected a DIRECTORY but found a FILE: $path"
  }
  Write-Ok "Directory exists: $path"
}

function Find-ComposeMountLines([string]$composeText, [string]$containerPathPattern) {
  # crude but robust for typical compose YAML. Returns all lines containing the container path
  $lines = $composeText -split "`r?`n"
  return $lines | Where-Object { $_ -match [regex]::Escape($containerPathPattern) }
}

function Normalize-HostPathFromMountLine([string]$line) {
  # line like: - ./backend/db/init.sql:/docker-entrypoint-initdb.d/001-init.sql:ro
  # returns host part before first colon
  $trim = $line.Trim()
  $trim = $trim.TrimStart("-").Trim()
  $parts = $trim.Split(":")
  if ($parts.Count -lt 2) { return $null }
  return $parts[0].Trim("'`" ")
}

try {
  Write-Host "=== Docker Compose Preflight (Windows-safe) ===" -ForegroundColor Cyan

  # 1) Basic files/dirs
  Require-File $ComposeFile
  Require-Dir  $BackendDbDir

  $initPath = Join-Path $BackendDbDir $InitFile
  $seedPath = Join-Path $BackendDbDir $SeedFile

  Require-File $initPath
  Require-File $seedPath

  # 2) Detect dangerous "directory named *.sql"
  $sqlItems = Get-ChildItem -LiteralPath $BackendDbDir -Force | Where-Object { $_.Name -match "\.sql$" }
  foreach ($it in $sqlItems) {
    if ($it.PSIsContainer) {
      throw "Found a DIRECTORY with .sql extension (this will break Postgres init mounts): $($it.FullName)"
    }
  }
  Write-Ok "No .sql directories found in $BackendDbDir"

  # 3) Parse docker-compose.yml for the init mount targets
  $composeText = Get-Content -LiteralPath $ComposeFile -Raw

  # Look for postgres initdb mount targets
  $target1 = "/docker-entrypoint-initdb.d/001-init.sql"
  $target2 = "/docker-entrypoint-initdb.d/002-seed.sql"

  $lines1 = Find-ComposeMountLines $composeText $target1
  $lines2 = Find-ComposeMountLines $composeText $target2

  if (-not $lines1 -or $lines1.Count -eq 0) {
    Write-Warn "Compose does not contain mount for $target1 (Postgres may not initialize schema)."
  } else {
    Write-Ok "Found mount line(s) for $target1:"
    $lines1 | ForEach-Object { Write-Host "       $_" }
  }

  if (-not $lines2 -or $lines2.Count -eq 0) {
    Write-Warn "Compose does not contain mount for $target2 (seed may not run)."
  } else {
    Write-Ok "Found mount line(s) for $target2:"
    $lines2 | ForEach-Object { Write-Host "       $_" }
  }

  # 4) Validate host paths referenced by those mount lines (if present)
  foreach ($ln in @($lines1 + $lines2)) {
    if (-not $ln) { continue }
    $hostPart = Normalize-HostPathFromMountLine $ln
    if (-not $hostPart) { continue }

    # convert ./ to full path relative to compose file directory
    $composeDir = Split-Path -Parent (Resolve-FullPath $ComposeFile)
    $hostResolved = $hostPart

    if ($hostPart.StartsWith("./") -or $hostPart.StartsWith(".\")) {
      $hostResolved = Join-Path $composeDir ($hostPart.Substring(2))
    } elseif (-not [System.IO.Path]::IsPathRooted($hostPart)) {
      $hostResolved = Join-Path $composeDir $hostPart
    }

    if (-not (Test-Path -LiteralPath $hostResolved)) {
      throw "Mount host path does not exist: $hostPart  ->  $hostResolved"
    }

    $hi = Get-Item -LiteralPath $hostResolved
    if ($hi.PSIsContainer) {
      throw "Mount host path points to a DIRECTORY, but should be a FILE (this matches your error): $hostPart  ->  $hostResolved"
    }

    Write-Ok "Mount host path is a file: $hostPart  ->  $hostResolved"
  }

  # 5) Optional: verify backend bind mount risk (dist disappearing)
  $suspectMounts = ($composeText -split "`r?`n") | Where-Object { $_ -match ":\s*/app(\s|$|:)" -and $_ -match "^\s*-\s*" }
  if ($suspectMounts.Count -gt 0) {
    Write-Warn "Found bind mount(s) to /app. This can remove /app/dist in the container and cause 'Cannot find /app/dist/index.js'."
    $suspectMounts | ForEach-Object { Write-Host "       $_" }
    Write-Warn "For production runs, remove /app bind mounts; for dev, use a dev container + npm run dev."
  } else {
    Write-Ok "No bind mounts to /app detected (good for production image runs)."
  }

  Write-Host ""
  Write-Host "Preflight result: PASS" -ForegroundColor Green
  Write-Host "You can run: docker compose up postgres (or docker compose up backend)" -ForegroundColor Green
}
catch {
  Write-Host ""
  Write-Bad $_.Exception.Message
  Write-Host ""
  Write-Host "Preflight result: FAIL" -ForegroundColor Red
  Write-Host "Fix the above issue(s) before running docker compose up." -ForegroundColor Red
  exit 1
}
