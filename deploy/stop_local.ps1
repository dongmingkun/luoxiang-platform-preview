$ErrorActionPreference = "SilentlyContinue"

$deploy = $PSScriptRoot
$pidFile = Join-Path $deploy "local_server.pid"
$stopped = $false

if (Test-Path $pidFile) {
    $procId = 0
    [int]::TryParse((Get-Content $pidFile -Raw).Trim(), [ref]$procId) | Out-Null
    if ($procId -gt 0) {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $procId"
        if ($proc -and $proc.CommandLine -match "local_server\.py") {
            Stop-Process -Id $procId -Force
            $stopped = $true
        }
    }
    Remove-Item $pidFile -Force
}

Get-CimInstance Win32_Process |
    Where-Object { $_.CommandLine -match "local_server\.py" } |
    ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force
        $stopped = $true
    }

if ($stopped) {
    Write-Host "TCM local server stopped."
} else {
    Write-Host "TCM local server is not running."
}
