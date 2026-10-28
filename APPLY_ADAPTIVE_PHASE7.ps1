$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== BitLab · Benchmark final + corrección de tests ===" -ForegroundColor Cyan

$required = @(
  "tests/optimizer/compression-optimizer.test.ts",
  "src/core/benchmark/report.ts",
  "src/core/benchmark/index.ts",
  "src/components/react/BenchmarkPanel.tsx",
  "src/components/react/BitLabWorkbench.tsx",
  "src/styles/adaptive-phase7.css",
  "tests/benchmark/report.test.ts",
  "docs/PHASE_ADAPTIVE_07_FINAL_BENCHMARK.md",
  "docs/FINAL_PROJECT_SUMMARY.md"
)

foreach ($file in $required) {
  if (-not (Test-Path -LiteralPath $file)) {
    throw "Falta un archivo del paquete: $file"
  }
}

$globalCss = "src/styles/global.css"
$content = Get-Content -LiteralPath $globalCss -Raw -Encoding UTF8
$importLine = "@import './adaptive-phase7.css';"

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
  $needle = '- `docs/PHASE_ADAPTIVE_06_PARAMETER_OPTIMIZATION.md`'

  if ($readme.Contains($needle) -and -not $readme.Contains("PHASE_ADAPTIVE_07_FINAL_BENCHMARK.md")) {
    $replacement = $needle + [Environment]::NewLine +
      '- `docs/PHASE_ADAPTIVE_07_FINAL_BENCHMARK.md`' + [Environment]::NewLine +
      '- `docs/FINAL_PROJECT_SUMMARY.md`'
    $readme = $readme.Replace($needle, $replacement)
    Set-Content -LiteralPath $readmePath -Value $readme -Encoding UTF8 -NoNewline
    Write-Host "ACTUALIZADO README.md" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "=== Revisión del test obsoleto ===" -ForegroundColor Cyan

$optimizerTest = Get-Content -LiteralPath "tests/optimizer/compression-optimizer.test.ts" -Raw -Encoding UTF8

if ($optimizerTest.Contains("toHaveLength(4)")) {
  throw "El test antiguo todavía espera 4 candidatos."
}

if (-not $optimizerTest.Contains("buildCompressionSearchPlan")) {
  throw "El test no está sincronizado con el plan de Fase 6."
}

Write-Host "OK  regression test sincronizado con el plan actual." -ForegroundColor Green

Write-Host ""
Write-Host "Paquete aplicado. Ejecuta:" -ForegroundColor Green
Write-Host "  git diff --check"
Write-Host "  pnpm test"
Write-Host "  pnpm build"
