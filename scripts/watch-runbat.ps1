param(
  [string[]] $Paths = @('src', 'public', 'server.ts', 'start-server.ts', 'vite.config.ts'),
  [string] $Command = '.\\run.bat',
  [int] $DebounceMs = 800,
  [int] $ExitAfterSeconds = 0,
  [switch] $DryRun
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

function Resolve-RepoPath([string] $path) {
  if ([System.IO.Path]::IsPathRooted($path)) { return (Resolve-Path $path).Path }
  return (Resolve-Path (Join-Path $repoRoot $path)).Path
}

$resolvedCommand = $null
try {
  $resolvedCommand = Resolve-RepoPath $Command
} catch {
  throw "Command not found: '$Command' (from repo root: '$repoRoot')"
}

Write-Host "Watching for changes..."
Write-Host "  Paths:   $($Paths -join ', ')"
Write-Host "  Command: $resolvedCommand"
Write-Host "  Debounce: ${DebounceMs}ms"
if ($DryRun) { Write-Host '  Mode:    DRY RUN (no process launch)' }
if ($ExitAfterSeconds -gt 0) { Write-Host "  Auto-exit after: ${ExitAfterSeconds}s" }
Write-Host ''

$ignoreDirNames = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
@('node_modules', 'dist', '.git', '.vite', 'logs', 'playwright-report', 'test-results') | ForEach-Object { [void]$ignoreDirNames.Add($_) }

function Should-Ignore([string] $fullPath) {
  if ([string]::IsNullOrWhiteSpace($fullPath)) { return $true }
  $normalized = $fullPath.Replace('/', '\')
  foreach ($dirName in $ignoreDirNames) {
    if ($normalized -match [regex]::Escape("\$dirName\")) { return $true }
  }
  return $false
}

$timer = New-Object System.Timers.Timer
$timer.Interval = [Math]::Max(50, $DebounceMs)
$timer.AutoReset = $false

$pendingEvent = $null
$lockObj = New-Object object

function Launch-RunBat {
  $evt = $null
  [System.Threading.Monitor]::Enter($lockObj)
  try {
    $evt = $pendingEvent
    $pendingEvent = $null
  } finally {
    [System.Threading.Monitor]::Exit($lockObj)
  }

  if ($null -ne $evt -and (Should-Ignore $evt.FullPath)) { return }

  $stamp = Get-Date -Format 'HH:mm:ss'
  $changed = if ($null -ne $evt) { $evt.FullPath } else { '<unknown>' }
  Write-Host "[$stamp] change detected: $changed"

  if ($DryRun) { return }

  # Use cmd's "start" to ensure a new window is created.
  # Title is provided to avoid path-with-spaces being interpreted as the title.
  $args = @(
    '/c',
    'start',
    '"Top That! (auto-run)"',
    '"' + $resolvedCommand + '"'
  )

  Start-Process -FilePath 'cmd.exe' -ArgumentList $args -WorkingDirectory $repoRoot | Out-Null
}

Register-ObjectEvent -InputObject $timer -EventName Elapsed -Action { Launch-RunBat } | Out-Null

$watchers = New-Object 'System.Collections.Generic.List[System.IO.FileSystemWatcher]'
$subscriptions = New-Object 'System.Collections.Generic.List[System.Management.Automation.Job]'

foreach ($path in $Paths) {
  $full = $null
  try {
    $full = Resolve-RepoPath $path
  } catch {
    Write-Host "Skipping missing path: $path"
    continue
  }

  $watchPath = $full
  $filter = '*'
  $includeSubdirs = $true

  if (Test-Path $full -PathType Leaf) {
    $watchPath = Split-Path -Parent $full
    $filter = Split-Path -Leaf $full
    $includeSubdirs = $false
  }

  $fsw = New-Object System.IO.FileSystemWatcher
  $fsw.Path = $watchPath
  $fsw.Filter = $filter
  $fsw.IncludeSubdirectories = $includeSubdirs
  $fsw.NotifyFilter = [System.IO.NotifyFilters]'FileName, DirectoryName, LastWrite, Size, CreationTime'
  $fsw.EnableRaisingEvents = $true
  [void]$watchers.Add($fsw)

  foreach ($eventName in @('Changed', 'Created', 'Renamed')) {
    $sub = Register-ObjectEvent -InputObject $fsw -EventName $eventName -Action {
      $evt = $Event.SourceEventArgs
      if (Should-Ignore $evt.FullPath) { return }

      [System.Threading.Monitor]::Enter($lockObj)
      try {
        $pendingEvent = $evt
      } finally {
        [System.Threading.Monitor]::Exit($lockObj)
      }

      $timer.Stop()
      $timer.Start()
    }
    [void]$subscriptions.Add($sub)
  }
}

if ($watchers.Count -eq 0) {
  throw 'No valid watch paths were configured.'
}

Write-Host 'Ready. Edit a file to trigger a new `run.bat` window. Press Ctrl+C to stop.'

if ($ExitAfterSeconds -gt 0) {
  $deadline = (Get-Date).AddSeconds($ExitAfterSeconds)
  while ((Get-Date) -lt $deadline) { Wait-Event -Timeout 1 | Out-Null }
} else {
  while ($true) { Wait-Event | Out-Null }
}
