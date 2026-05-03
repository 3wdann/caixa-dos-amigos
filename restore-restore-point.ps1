$ErrorActionPreference = "Stop"

$workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
$markerPath = Join-Path $workspace ".codex-restore-point.txt"

if (-not (Test-Path $markerPath)) {
  throw "Arquivo .codex-restore-point.txt nao encontrado."
}

$snapshot = (Get-Content $markerPath -Raw).Trim()

if (-not (Test-Path $snapshot)) {
  throw "Snapshot nao encontrado em: $snapshot"
}

Write-Host "Restaurando snapshot:" $snapshot

Get-ChildItem -LiteralPath $workspace -Force |
  Where-Object { $_.Name -notin @(".","..",".codex-restore-point.txt","restore-restore-point.ps1") } |
  Remove-Item -Recurse -Force

robocopy $snapshot $workspace /MIR /R:1 /W:1 | Out-Null

Write-Host "Restauracao concluida."
