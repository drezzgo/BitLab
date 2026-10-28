$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== BitLab · Optimización de parámetros ===" -ForegroundColor Cyan

$required = @(
  "src/core/codecs/lz77/lz77.ts",
  "src/core/container/lz77-huffman.ts",
  "src/core/codecs/registry/types.ts",
  "src/core/codecs/registry/index.ts",
  "src/core/optimizer/types.ts",
  "src/core/optimizer/compression-optimizer.ts",
  "src/workers/protocol.ts",
  "src/workers/bitlab.worker.ts",
  "src/components/react/AutoOptimizerPanel.tsx",
  "src/components/react/BitLabWorkbench.tsx",
  "src/styles/adaptive-phase6.css",
  "tests/codecs/lz77-parameters.test.ts",
  "tests/optimizer/parameter-optimizer.test.ts"
)

foreach ($file in $required) {
  if (-not (Test-Path -LiteralPath $file)) {
    throw "Falta un archivo del paquete: $file"
  }
}

$globalCss = "src/styles/global.css"
$content = Get-Content -LiteralPath $globalCss -Raw -Encoding UTF8
$importLine = "@import './adaptive-phase6.css';"

if (-not $content.Contains($importLine)) {
  $lines = Get-Content -LiteralPath $globalCss -Encoding UTF8
  $lastImport = -1

  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i].TrimStart().StartsWith("@import")) {
      $lastImport = $i
    }
  }

  if ($lastImport -ge 0) {
    $before = @($lines[0..$lastImport])
    $after = @()
    if ($lastImport + 1 -lt $lines.Count) {
      $after = @($lines[($lastImport + 1)..($lines.Count - 1)])
    }
    $lines = $before + $importLine + $after
  }
  else {
    $lines = @($importLine) + $lines
  }

  Set-Content -LiteralPath $globalCss -Value $lines -Encoding UTF8
  Write-Host "ACTUALIZADO $globalCss" -ForegroundColor Green
}

$readmePath = "README.md"
if (Test-Path -LiteralPath $readmePath) {
  $readme = Get-Content -LiteralPath $readmePath -Raw -Encoding UTF8
  $needle = '- `docs/PHASE_ADAPTIVE_05_AUTO_OPTIMIZER.md`'

  if ($readme.Contains($needle) -and -not $readme.Contains("PHASE_ADAPTIVE_06_PARAMETER_OPTIMIZATION.md")) {
    $replacement = $needle + [Environment]::NewLine +
      '- `docs/PHASE_ADAPTIVE_06_PARAMETER_OPTIMIZATION.md`'
    $readme = $readme.Replace($needle, $replacement)
    Set-Content -LiteralPath $readmePath -Value $readme -Encoding UTF8 -NoNewline
    Write-Host "ACTUALIZADO README.md" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "=== Comprobaciones rápidas ===" -ForegroundColor Cyan

$optimizer = Get-Content -LiteralPath "src/core/optimizer/compression-optimizer.ts" -Raw -Encoding UTF8
if (-not $optimizer.Contains("HUFFMAN_WORD_SIZE_CANDIDATES")) {
  throw "No se encontró la búsqueda de N para Huffman."
}
if (-not $optimizer.Contains("LZ77_PARAMETER_CANDIDATES")) {
  throw "No se encontró la búsqueda de parámetros LZ77."
}
Write-Host "OK  espacio de parámetros definido." -ForegroundColor Green

$lz = Get-Content -LiteralPath "src/core/codecs/lz77/lz77.ts" -Raw -Encoding UTF8
if (-not $lz.Contains("LZ77_MAX_DISTANCE = 0xffff")) {
  throw "El decoder LZ77 no expone el rango uint16 completo."
}
Write-Host "OK  LZ77 admite distancia uint16 completa." -ForegroundColor Green

Write-Host ""
Write-Host "Ejecuta ahora:" -ForegroundColor Green
Write-Host "  git diff --check"
Write-Host "  pnpm test"
Write-Host "  pnpm build"
