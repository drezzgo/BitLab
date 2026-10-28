$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== BitLab Adaptive Compression · Fase 1 UI/UX ===" -ForegroundColor Cyan

$required = @(
  "src/components/react/BitLabWorkbench.tsx",
  "src/components/react/AnalysisToolsCard.tsx",
  "src/components/react/CompressionEvolutionCard.tsx",
  "src/components/react/CompactFormatCard.tsx",
  "src/pages/index.astro",
  "src/styles/adaptive-phase1.css"
)

foreach ($file in $required) {
  if (-not (Test-Path -LiteralPath $file)) {
    throw "Falta un archivo del overlay: $file"
  }
}

# Importar estilos nuevos sin reescribir global.css completo.
$globalCss = "src/styles/global.css"
$content = Get-Content -LiteralPath $globalCss -Raw -Encoding UTF8
$importLine = "@import './adaptive-phase1.css';"

if (-not $content.Contains($importLine)) {
  # Debe ir después del @import de Google Fonts para mantener CSS válido.
  $lines = Get-Content -LiteralPath $globalCss -Encoding UTF8
  $newLines = @()
  $inserted = $false

  foreach ($line in $lines) {
    $newLines += $line
    if (-not $inserted -and $line.TrimStart().StartsWith("@import url(")) {
      $newLines += $importLine
      $inserted = $true
    }
  }

  if (-not $inserted) {
    $newLines = @($importLine) + $newLines
  }

  Set-Content -LiteralPath $globalCss -Value $newLines -Encoding UTF8
  Write-Host "ACTUALIZADO $globalCss" -ForegroundColor Green
}
else {
  Write-Host "OK  adaptive-phase1.css ya está importado" -ForegroundColor DarkYellow
}

# Agregar documentos al README si hay sección de documentación.
$readmePath = "README.md"
if (Test-Path -LiteralPath $readmePath) {
  $readme = Get-Content -LiteralPath $readmePath -Raw -Encoding UTF8
  $needle = '- `docs/FINAL_CHECKLIST.md`'

  if ($readme.Contains($needle) -and -not $readme.Contains("ADAPTIVE_COMPRESSION_ROADMAP.md")) {
    $addition = $needle + [Environment]::NewLine +
      '- `docs/ADAPTIVE_COMPRESSION_ROADMAP.md`' + [Environment]::NewLine +
      '- `docs/PHASE_ADAPTIVE_01_UI_UX.md`'
    $readme = $readme.Replace($needle, $addition)
    Set-Content -LiteralPath $readmePath -Value $readme -Encoding UTF8 -NoNewline
    Write-Host "ACTUALIZADO README.md" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "=== Verificación conceptual ===" -ForegroundColor Cyan

$forbidden = @(
  "mejor compresión automática activa",
  "LZ77 implementado",
  "RLE implementado"
)

$found = $false
foreach ($term in $forbidden) {
  $hits = Get-ChildItem -Path "src" -Recurse -File |
    Select-String -SimpleMatch $term -CaseSensitive:$false
  if ($hits) {
    $found = $true
    Write-Host "REVISAR: aparece '$term'" -ForegroundColor Yellow
  }
}

if (-not $found) {
  Write-Host "OK  la UI no presenta codecs futuros como implementados." -ForegroundColor Green
}

Write-Host ""
Write-Host "Fase 1 aplicada. Ejecuta:" -ForegroundColor Green
Write-Host "  git diff --check"
Write-Host "  pnpm test"
Write-Host "  pnpm build"
