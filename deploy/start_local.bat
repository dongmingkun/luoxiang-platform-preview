@echo off
cd /d "%~dp0"
python local_server.py --open
if errorlevel 1 pause
