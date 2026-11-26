$ErrorActionPreference = "Stop"

$deploy = $PSScriptRoot
$root = Split-Path $deploy -Parent
$web = Join-Path $root "web"

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw "python is not in PATH. Install Python 3 or add it to PATH."
}
if (-not (Test-Path (Join-Path $web "index.html"))) {
    throw "web/index.html not found under $web"
}

$startup = [Environment]::GetFolderPath("Startup")
$desktop = [Environment]::GetFolderPath("Desktop")
$wscript = Join-Path $env:SystemRoot "System32\wscript.exe"
$hidden = Join-Path $deploy "start_local_hidden.vbs"

$shell = New-Object -ComObject WScript.Shell
$lnkPath = Join-Path $startup "TCM-YinYang-LocalServer.lnk"
$lnk = $shell.CreateShortcut($lnkPath)
$lnk.TargetPath = $wscript
$lnk.Arguments = '"' + $hidden + '"'
$lnk.WorkingDirectory = $deploy
$lnk.WindowStyle = 7
$lnk.Description = "TCM Yin-Yang local static server (127.0.0.1:8000)"
$lnk.Save()

$urlPath = Join-Path $desktop "TCM-YinYang.url"
@"
[InternetShortcut]
URL=http://127.0.0.1:8000/
"@ | Set-Content -Path $urlPath -Encoding ASCII

function Get-TcmServerProcess {
    $pidFile = Join-Path $deploy "local_server.pid"
    if (Test-Path $pidFile) {
        $procId = 0
        [int]::TryParse((Get-Content $pidFile -Raw).Trim(), [ref]$procId) | Out-Null
        if ($procId -gt 0) {
            $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $procId" -ErrorAction SilentlyContinue
            if ($proc -and $proc.CommandLine -match "local_server\.py") { return $proc }
        }
    }
    return Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match "local_server\.py" } |
        Select-Object -First 1
}

$portConflict = $false
$listening = @(Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue)
$tcm = Get-TcmServerProcess

if ($listening.Count -gt 0 -and -not $tcm) {
    $portConflict = $true
    $ownerId = $listening[0].OwningProcess
    $owner = Get-CimInstance Win32_Process -Filter "ProcessId = $ownerId" -ErrorAction SilentlyContinue
    Write-Warning "Port 8000 is occupied by PID $ownerId ($($owner.Name)), not the TCM server."
    Write-Warning "Stop that process, or run: python `"$deploy\local_server.py`" --port 8010"
    Write-Warning "The desktop/startup shortcut still points to 8000; update it if you change the port."
} elseif (-not $listening) {
    Start-Process -FilePath $wscript -ArgumentList ('"' + $hidden + '"') -WorkingDirectory $deploy -WindowStyle Hidden
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Milliseconds 250
        $listening = @(Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue)
        $tcm = Get-TcmServerProcess
        if ($listening.Count -gt 0 -and $tcm) { break }
    }
}

$ok = $false
if (-not $portConflict -and $listening.Count -gt 0 -and $tcm) {
    try {
        $homeResp = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:8000/" -TimeoutSec 5
        $dataResp = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:8000/dataset.html" -TimeoutSec 5
        $ok = ($homeResp.StatusCode -eq 200 -and $dataResp.StatusCode -eq 200 -and $homeResp.Content -match "dataset\.html")
    } catch {
        $ok = $false
    }
}

Write-Host ""
Write-Host "TCM local deployment installed."
Write-Host "Open:      http://127.0.0.1:8000/"
Write-Host "Dataset:   http://127.0.0.1:8000/dataset.html"
Write-Host "Research:  http://127.0.0.1:8000/research.html"
Write-Host "Desktop:   $urlPath"
Write-Host "Startup:   $lnkPath"
Write-Host "Stop:      powershell -ExecutionPolicy Bypass -File `"$deploy\stop_local.ps1`""
Write-Host "Log:       $deploy\local_server.log"
Write-Host ""
if ($portConflict) {
    Write-Warning "HTTP check skipped: port 8000 is used by another process."
} elseif ($ok) {
    Write-Host "HTTP check: OK (TCM server responding)"
} else {
    Write-Warning "HTTP check failed. See deploy\local_server.log; the TCM server may not have started."
}
