@echo off
setlocal
cd /d "%~dp0"
"..\OPV\.tools\node-v24.18.0-win-x64\node.exe" ".\server\server.js"
