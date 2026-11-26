$pidFile = Join-Path $PSScriptRoot "preview_server.pid"
if (-not (Test-Path $pidFile)) { Write-Output "no preview PID file"; exit 0 }
$serverId = [int](Get-Content $pidFile)
$proc = Get-CimInstance Win32_Process -Filter "ProcessId=$serverId" -ErrorAction SilentlyContinue
if ($proc -and $proc.CommandLine -like "*preview_server.py*") {
  Stop-Process -Id $serverId -Force -ErrorAction Stop
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  Write-Output "stopped PID $serverId"
} else {
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  Write-Warning "PID $serverId is not preview_server.py; nothing was stopped"
}
