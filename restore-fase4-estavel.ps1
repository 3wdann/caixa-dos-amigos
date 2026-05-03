param()

$projectPath = 'C:\Users\danco\OneDrive\Documentos\_codex_CAIXA v1'
$snapshotPath = 'C:\Users\danco\OneDrive\Documentos\_codex_CAIXA_v1_snapshot_fase4_estavel_2026-05-03_124816'

Get-ChildItem -LiteralPath $projectPath -Force |
  Where-Object { $_.Name -notin @('.', '..') } |
  Remove-Item -Recurse -Force

Copy-Item -LiteralPath (Join-Path $snapshotPath '*') -Destination $projectPath -Recurse -Force

Write-Output 'Restore concluido.'
