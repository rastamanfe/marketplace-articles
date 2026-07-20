$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
$node = Resolve-Path -LiteralPath "..\OPV\.tools\node-v24.18.0-win-x64\node.exe"
& $node ".\server\server.js"
