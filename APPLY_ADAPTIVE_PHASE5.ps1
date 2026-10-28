$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== BitLab · Auto Optimizer ===" -ForegroundColor Cyan

$required = @(
  "src/core/optimizer/types.ts",
  "src/core/optimizer/compression-optimizer.ts",
  "src/core/optimizer/index.ts",
  "src/workers/protocol.ts",
  "src/workers/bitlab.worker.ts",
  "src/components/react/AutoOptimizerPanel.tsx",
  "src/components/react/BitLabWorkbench.tsx",
  "src/styles/adaptive-phase5.css",
  "tests/optimizer/compression-optimizer.test.ts"
)

foreach ($file in $required) {
  if (-not (Test-Path -LiteralPath $file)) {
    throw "Falta un archivo del paquete: $file"
  }
}

$globalCss = "src/styles/global.css"
$content = Get-Content -LiteralPath $globalCss -Raw -Encoding UTF8
$importLine = "@import './adaptive-phase5.css';"

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
  $needle = '- `docs/PHASE_ADAPTIVE_04_LZ77_HUFFMAN.md`'

  if ($readme.Contains($needle) -and -not $readme.Contains("PHASE_ADAPTIVE_05_AUTO_OPTIMIZER.md")) {
    $replacement = $needle + [Environment]::NewLine +
      '- `docs/PHASE_ADAPTIVE_05_AUTO_OPTIMIZER.md`'
    $readme = $readme.Replace($needle, $replacement)
    Set-Content -LiteralPath $readmePath -Value $readme -Encoding UTF8 -NoNewline
    Write-Host "ACTUALIZADO README.md" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "=== Comprobaciones rápidas ===" -ForegroundColor Cyan

$protocol = Get-Content -LiteralPath "src/workers/protocol.ts" -Raw -Encoding UTF8
if (-not $protocol.Contains("ManualEncodeCodec | 'auto'")) {
  throw "El protocolo no expone el modo auto."
}
Write-Host "OK  modo automático disponible." -ForegroundColor Green

$worker = Get-Content -LiteralPath "src/workers/bitlab.worker.ts" -Raw -Encoding UTF8
if (-not $worker.Contains("optimizeCompression")) {
  throw "El Worker no usa el optimizador."
}
Write-Host "OK  Worker ejecuta Auto Optimizer." -ForegroundColor Green

Write-Host ""
Write-Host "Ejecuta ahora:" -ForegroundColor Green
Write-Host "  git diff --check"
Write-Host "  pnpm test"
Write-Host "  pnpm build"
