@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_preview.ps1"
start "" "http://127.0.0.1:8020/herbs.html"
