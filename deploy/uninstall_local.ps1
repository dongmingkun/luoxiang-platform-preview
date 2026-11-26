$ErrorActionPreference = "SilentlyContinue"

$deploy = $PSScriptRoot
$startup = [Environment]::GetFolderPath("Startup")
$desktop = [Environment]::GetFolderPath("Desktop")

Remove-Item (Join-Path $startup "TCM-YinYang-LocalServer.lnk") -Force
Remove-Item (Join-Path $desktop "TCM-YinYang.url") -Force

& (Join-Path $deploy "stop_local.ps1")
Write-Host "TCM local deployment shortcuts removed."
