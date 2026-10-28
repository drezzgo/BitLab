$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== BitLab · LZ77 + Huffman ===" -ForegroundColor Cyan

$required = @(
  "src/core/codecs/lz77/lz77.ts",
  "src/core/codecs/lz77-huffman/metadata.ts",
  "src/core/container/lz77-huffman.ts",
  "src/core/codecs/registry/index.ts",
  "src/components/react/BitLabWorkbench.tsx",
  "src/components/react/CompressionEvolutionCard.tsx",
  "src/styles/adaptive-phase4.css",
  "tests/codecs/lz77.test.ts",
  "tests/container/lz77-huffman-container.test.ts"
)

foreach ($file in $required) {
  if (-not (Test-Path -LiteralPath $file)) {
    throw "Falta un archivo del paquete: $file"
  }
}

$globalCss = "src/styles/global.css"
$content = Get-Content -LiteralPath $globalCss -Raw -Encoding UTF8
$importLine = "@import './adaptive-phase4.css';"

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
  $needle = '- `docs/PHASE_ADAPTIVE_03_RLE_HUFFMAN.md`'

  if ($readme.Contains($needle) -and -not $readme.Contains("PHASE_ADAPTIVE_04_LZ77_HUFFMAN.md")) {
    $replacement = $needle + [Environment]::NewLine +
      '- `docs/PHASE_ADAPTIVE_04_LZ77_HUFFMAN.md`'
    $readme = $readme.Replace($needle, $replacement)
    Set-Content -LiteralPath $readmePath -Value $readme -Encoding UTF8 -NoNewline
    Write-Host "ACTUALIZADO README.md" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "=== Comprobaciones rápidas ===" -ForegroundColor Cyan

$registry = Get-Content -LiteralPath "src/core/codecs/registry/index.ts" -Raw -Encoding UTF8
if (-not $registry.Contains("key: 'lz77-huffman'")) {
  throw "LZ77 + Huffman no aparece en el registry."
}
Write-Host "OK  LZ77 + Huffman registrado." -ForegroundColor Green

$types = Get-Content -LiteralPath "src/core/container/types.ts" -Raw -Encoding UTF8
if (-not $types.Contains("Lz77Huffman = 3")) {
  throw "No se encontró codecId 3."
}
Write-Host "OK  codecId 3 definido." -ForegroundColor Green

$workbench = Get-Content -LiteralPath "src/components/react/BitLabWorkbench.tsx" -Raw -Encoding UTF8
if ($workbench.Contains("FASE ACTUAL")) {
  throw "Todavía aparece el encabezado FASE ACTUAL."
}
Write-Host "OK  se retiró el encabezado FASE ACTUAL." -ForegroundColor Green

Write-Host ""
Write-Host "Ejecuta ahora:" -ForegroundColor Green
Write-Host "  git diff --check"
Write-Host "  pnpm test"
Write-Host "  pnpm build"
