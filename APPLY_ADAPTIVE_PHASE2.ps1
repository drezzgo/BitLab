$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== BitLab Adaptive Compression · Fase 2 Codec Registry ===" -ForegroundColor Cyan

$required = @(
  "src/core/codecs/registry/types.ts",
  "src/core/codecs/registry/index.ts",
  "src/core/codecs/index.ts",
  "src/core/container/restore.ts",
  "src/workers/protocol.ts",
  "src/workers/bitlab.worker.ts",
  "tests/codecs/codec-registry.test.ts",
  "docs/PHASE_ADAPTIVE_02_CODEC_REGISTRY.md"
)

foreach ($file in $required) {
  if (-not (Test-Path -LiteralPath $file)) {
    throw "Falta un archivo de la fase 2: $file"
  }
}

$readmePath = "README.md"
if (Test-Path -LiteralPath $readmePath) {
  $readme = Get-Content -LiteralPath $readmePath -Raw -Encoding UTF8
  $needle = '- `docs/PHASE_ADAPTIVE_01_UI_UX.md`'

  if ($readme.Contains($needle) -and -not $readme.Contains("PHASE_ADAPTIVE_02_CODEC_REGISTRY.md")) {
    $replacement = $needle + [Environment]::NewLine +
      '- `docs/PHASE_ADAPTIVE_02_CODEC_REGISTRY.md`'
    $readme = $readme.Replace($needle, $replacement)
    Set-Content -LiteralPath $readmePath -Value $readme -Encoding UTF8 -NoNewline
    Write-Host "ACTUALIZADO README.md" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "=== Auditoría de decisiones rígidas ===" -ForegroundColor Cyan

$workerHits = Select-String -LiteralPath "src/workers/bitlab.worker.ts" `
  -Pattern "request\.codec\s*===" -CaseSensitive:$false

$restoreHits = Select-String -LiteralPath "src/core/container/restore.ts" `
  -Pattern "codecId\s*===" -CaseSensitive:$false

if ($workerHits) {
  Write-Host "REVISAR: el Worker todavía contiene selección rígida por codec." -ForegroundColor Yellow
  $workerHits | ForEach-Object { Write-Host $_.Line.Trim() }
}
else {
  Write-Host "OK  Worker delega selección al registry." -ForegroundColor Green
}

if ($restoreHits) {
  Write-Host "REVISAR: restore.ts todavía contiene selección rígida por codecId." -ForegroundColor Yellow
  $restoreHits | ForEach-Object { Write-Host $_.Line.Trim() }
}
else {
  Write-Host "OK  restauración delega al registry." -ForegroundColor Green
}

Write-Host ""
Write-Host "Fase 2 aplicada. Ejecuta:" -ForegroundColor Green
Write-Host "  git diff --check"
Write-Host "  pnpm test"
Write-Host "  pnpm build"
