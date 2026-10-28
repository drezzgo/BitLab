$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== BitLab Adaptive Compression · Fase 3 RLE + Huffman ===" -ForegroundColor Cyan

$required = @(
  "src/core/codecs/rle/rle.ts",
  "src/core/codecs/rle-huffman/metadata.ts",
  "src/core/container/rle-huffman.ts",
  "src/core/codecs/registry/index.ts",
  "src/components/react/BitLabWorkbench.tsx",
  "src/components/react/CompressionEvolutionCard.tsx",
  "tests/codecs/rle.test.ts",
  "tests/container/rle-huffman-container.test.ts"
)

foreach ($file in $required) {
  if (-not (Test-Path -LiteralPath $file)) {
    throw "Falta un archivo de la fase 3: $file"
  }
}

# Importar estilos de la fase 3.
$globalCss = "src/styles/global.css"
$content = Get-Content -LiteralPath $globalCss -Raw -Encoding UTF8
$importLine = "@import './adaptive-phase3.css';"

if (-not $content.Contains($importLine)) {
  $lines = Get-Content -LiteralPath $globalCss -Encoding UTF8
  $newLines = @()
  $lastImport = -1

  for ($i = 0; $i -lt $lines.Count; $i++) {
    $newLines += $lines[$i]
    if ($lines[$i].TrimStart().StartsWith("@import")) {
      $lastImport = $newLines.Count - 1
    }
  }

  if ($lastImport -ge 0) {
    $before = @($newLines[0..$lastImport])
    $after = @()
    if ($lastImport + 1 -lt $newLines.Count) {
      $after = @($newLines[($lastImport + 1)..($newLines.Count - 1)])
    }
    $newLines = $before + $importLine + $after
  }
  else {
    $newLines = @($importLine) + $newLines
  }

  Set-Content -LiteralPath $globalCss -Value $newLines -Encoding UTF8
  Write-Host "ACTUALIZADO $globalCss" -ForegroundColor Green
}

# Documentación.
$readmePath = "README.md"
if (Test-Path -LiteralPath $readmePath) {
  $readme = Get-Content -LiteralPath $readmePath -Raw -Encoding UTF8
  $needle = '- `docs/PHASE_ADAPTIVE_02_CODEC_REGISTRY.md`'

  if ($readme.Contains($needle) -and -not $readme.Contains("PHASE_ADAPTIVE_03_RLE_HUFFMAN.md")) {
    $replacement = $needle + [Environment]::NewLine +
      '- `docs/PHASE_ADAPTIVE_03_RLE_HUFFMAN.md`'
    $readme = $readme.Replace($needle, $replacement)
    Set-Content -LiteralPath $readmePath -Value $readme -Encoding UTF8 -NoNewline
    Write-Host "ACTUALIZADO README.md" -ForegroundColor Green
  }
}

$roadmapPath = "docs/ADAPTIVE_COMPRESSION_ROADMAP.md"
if (Test-Path -LiteralPath $roadmapPath) {
  $roadmap = Get-Content -LiteralPath $roadmapPath -Raw -Encoding UTF8
  $phase3 = "## Fase 3 — RLE + Huffman"
  if ($roadmap.Contains($phase3) -and -not $roadmap.Contains("## Fase 3 — RLE + Huffman`r`n`r`nEstado: implementada")) {
    $roadmap = $roadmap.Replace(
      $phase3,
      "$phase3`r`n`r`nEstado: implementada."
    )
    Set-Content -LiteralPath $roadmapPath -Value $roadmap -Encoding UTF8 -NoNewline
    Write-Host "ACTUALIZADO roadmap" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "=== Auditoría rápida ===" -ForegroundColor Cyan

$registry = Get-Content -LiteralPath "src/core/codecs/registry/index.ts" -Raw -Encoding UTF8
if ($registry.Contains("key: 'rle-huffman'")) {
  Write-Host "OK  RLE + Huffman está registrado." -ForegroundColor Green
}
else {
  throw "RLE + Huffman no aparece en el registry."
}

$format = Get-Content -LiteralPath "src/core/container/types.ts" -Raw -Encoding UTF8
if ($format.Contains("RleHuffman = 2")) {
  Write-Host "OK  codecId 2 definido." -ForegroundColor Green
}
else {
  throw "No se encontró codecId 2."
}

Write-Host ""
Write-Host "Fase 3 aplicada. Ejecuta:" -ForegroundColor Green
Write-Host "  git diff --check"
Write-Host "  pnpm test"
Write-Host "  pnpm build"
