$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$python = (Get-Command python).Source
$pidFile = Join-Path $PSScriptRoot "preview_server.pid"
$logFile = Join-Path $PSScriptRoot "preview_server.log"
$models = Join-Path (Split-Path -Parent $repo) "tcm-human-model\web\assets"
$existing = Get-NetTCPConnection -LocalPort 8020 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existing) {
  Write-Output "8020 already in use by PID $($existing.OwningProcess)"
  exit 0
}
$p = Start-Process -FilePath $python -ArgumentList @(
  (Join-Path $PSScriptRoot "preview_server.py"),
  "--port", "8020", "--bind", "127.0.0.1",
  "--root", (Join-Path $repo "web"), "--models-dir", $models
) -WorkingDirectory $repo -WindowStyle Hidden -PassThru -RedirectStandardOutput $logFile -RedirectStandardError (Join-Path $PSScriptRoot "preview_server.err.log")
Set-Content -Path $pidFile -Value $p.Id
Write-Output "started PID $($p.Id) at http://127.0.0.1:8020/"
