$ErrorActionPreference = "Stop"

function Replace-Checked {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Old,
    [Parameter(Mandatory = $true)][string]$New
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "No existe el archivo requerido: $Path"
  }

  $content = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
  if (-not $content.Contains($Old)) {
    Write-Host "SIN CAMBIO  $Path  (texto no encontrado; puede estar ya actualizado)" -ForegroundColor DarkYellow
    return
  }

  $content = $content.Replace($Old, $New)
  Set-Content -LiteralPath $Path -Value $content -Encoding UTF8 -NoNewline
  Write-Host "ACTUALIZADO $Path" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== BitLab: ampliar tamaños de palabra dentro de v1 ===" -ForegroundColor Cyan

# Workbench principal: cambios pequeños para preservar las demos y demás evolución local.
Replace-Checked "src/components/react/BitLabWorkbench.tsx" `
  'const QUICK_SIZES = [2, 4, 8, 13, 16, 32, 64, 128, 256, 512, 1024, 2048];' `
  'const QUICK_SIZES = [2, 4, 8, 13, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65535];'

Replace-Checked "src/components/react/BitLabWorkbench.tsx" `
  'Define el ancho lógico de cada símbolo entre 2 y 2048 bits.' `
  'Define el ancho lógico de cada símbolo entre 2 y 65.535 bits dentro del formato .bitlab v1.'

Replace-Checked "src/components/react/BitLabWorkbench.tsx" `
  'if (Number.isInteger(value) && value >= 2 && value <= 2048) setWordSizeBits(value);' `
  'if (Number.isInteger(value) && value >= MIN_WORD_SIZE_BITS && value <= MAX_WORD_SIZE_BITS) setWordSizeBits(value);'

# Componentes heredados.
if (Test-Path -LiteralPath "src/components/react/FileInspector.tsx") {
  Replace-Checked "src/components/react/FileInspector.tsx" `
    'const QUICK_SIZES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];' `
    'const QUICK_SIZES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65535];'

  Replace-Checked "src/components/react/FileInspector.tsx" `
    'Define el ancho lógico de los símbolos: 2–2048 bits.' `
    'Define el ancho lógico de los símbolos: 2–65.535 bits (límite de .bitlab v1).'
}

if (Test-Path -LiteralPath "src/components/react/ContainerEncoder.tsx") {
  Replace-Checked "src/components/react/ContainerEncoder.tsx" `
    'const QUICK_SIZES = [2, 4, 8, 13, 16, 32, 64, 128, 256, 512, 1024, 2048];' `
    'const QUICK_SIZES = [2, 4, 8, 13, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65535];'

  Replace-Checked "src/components/react/ContainerEncoder.tsx" `
    'if (Number.isInteger(value) && value >= 2 && value <= 2048) setWordSizeBits(value);' `
    'if (Number.isInteger(value) && value >= MIN_WORD_SIZE_BITS && value <= MAX_WORD_SIZE_BITS) setWordSizeBits(value);'
}

# No mostrar una clave binaria interna gigante como tooltip.
Replace-Checked "src/components/react/SourceStatisticsPanel.tsx" `
  '<code title={symbol.key}>{symbol.display}</code>' `
  '<code title={symbol.display}>{symbol.display}</code>'

# Home / SEO.
Replace-Checked "src/pages/index.astro" `
  'BitLab convierte archivos en símbolos configurables de 2 a 2048 bits, permite inspeccionar' `
  'BitLab convierte archivos en símbolos configurables de 2 a 65.535 bits dentro de .bitlab v1, permite inspeccionar'

Replace-Checked "src/pages/index.astro" `
  '<span>LOCAL</span><span>BIT-EXACT</span><span>2—2048 BIT</span>' `
  '<span>LOCAL</span><span>BIT-EXACT</span><span>2—65.535 BIT · V1</span>'

Replace-Checked "src/layouts/BaseLayout.astro" `
  'BitLab: codificación y análisis de información binaria de 2 a 2048 bits.' `
  'BitLab: codificación y análisis de información binaria de 2 a 65.535 bits en .bitlab v1.'

# Hacer explícito el contrato uint16 antes de persistir los campos.
$formatPath = "src/core/container/format.ts"
if (Test-Path -LiteralPath $formatPath) {
  $format = Get-Content -LiteralPath $formatPath -Raw -Encoding UTF8
  $marker = "  const segmentation = calculateSegmentation(input.originalSizeBytes, input.wordSizeBits);"
  $assertions = @'
  const segmentation = calculateSegmentation(input.originalSizeBytes, input.wordSizeBits);

  assertFitsUint16(input.wordSizeBits, 'El tamaño de palabra');
  assertFitsUint16(segmentation.paddingBits, 'El padding lógico');
'@

  if ($format.Contains("assertFitsUint16(input.wordSizeBits")) {
    Write-Host "SIN CAMBIO  $formatPath  (aserciones v1 ya presentes)" -ForegroundColor DarkYellow
  }
  elseif ($format.Contains($marker)) {
    $format = $format.Replace($marker, $assertions.TrimEnd())
    Set-Content -LiteralPath $formatPath -Value $format -Encoding UTF8 -NoNewline
    Write-Host "ACTUALIZADO $formatPath" -ForegroundColor Green
  }
  else {
    Write-Host "SIN CAMBIO  $formatPath  (no se encontró el punto de inserción)" -ForegroundColor DarkYellow
  }
}

# Tabla del comparador: solo cambia si conserva el ancho anterior exacto.
if (Test-Path -LiteralPath "src/styles/global.css") {
  Replace-Checked "src/styles/global.css" `
    '  min-width: 850px;' `
    '  min-width: 1120px;'
}

# README y documentación.
Replace-Checked "README.md" `
  'entre 2 y 2048 bits' `
  'entre 2 y 65.535 bits dentro de .bitlab v1'

Replace-Checked "README.md" `
  'segmentación exacta en símbolos de 2 a 2048 bits' `
  'segmentación exacta en símbolos de 2 a 65.535 bits'

if (Test-Path -LiteralPath "docs/SCOPE.md") {
  Replace-Checked "docs/SCOPE.md" `
    'puede tomar valores enteros entre 2 y 2048.' `
    'puede tomar valores enteros entre 2 y 65.535. Este máximo corresponde al campo uint16 de .bitlab v1.'

  Replace-Checked "docs/SCOPE.md" `
    'No se representan palabras de hasta 2048 bits mediante `Number`.' `
    'No se representan palabras de hasta 65.535 bits mediante `Number`.'
}

if (Test-Path -LiteralPath "docs/SOURCE_STATISTICS.md") {
  Replace-Checked "docs/SOURCE_STATISTICS.md" `
    'un ancho de palabra `N` entre 2 y 2048 bits.' `
    'un ancho de palabra `N` entre 2 y 65.535 bits dentro de .bitlab v1.'
}

if (Test-Path -LiteralPath "docs/HUFFMAN_CODEC.md") {
  Replace-Checked "docs/HUFFMAN_CODEC.md" `
    'donde `2 <= N <= 2048`.' `
    'donde `2 <= N <= 65535` dentro de .bitlab v1.'

  Replace-Checked "docs/HUFFMAN_CODEC.md" `
    'Un símbolo de 2048 bits equivale a 256 bytes. BitLab no lo convierte a `Number`. Se conserva como `Uint8Array` y se usa una representación hexadecimal como clave interna.' `
    'Un símbolo de 65.535 bits necesita 8.192 bytes para su representación acolchada. BitLab no lo convierte a `Number`: se conserva como `Uint8Array`. Para identificar símbolos internamente se usa una clave binaria exacta de un carácter por byte, evitando duplicar memoria mediante una cadena hexadecimal completa.'
}

if (Test-Path -LiteralPath "docs/ACADEMIC_DEFENSE.md") {
  Replace-Checked "docs/ACADEMIC_DEFENSE.md" `
    'Con `N = 8` cada símbolo ocupa un byte. Con `N = 13`, `N = 64` o `N = 2048` los límites de símbolo ya no tienen por qué coincidir con límites de byte.' `
    'Con `N = 8` cada símbolo ocupa un byte. Con valores no múltiplos de 8 los límites de símbolo no coinciden con límites de byte. En v1, BitLab admite hasta N = 65.535 bits.'

  Replace-Checked "docs/ACADEMIC_DEFENSE.md" `
    'entre todos los enteros de 2 a 2048.' `
    'entre todos los enteros de 2 a 65.535.'
}

if (Test-Path -LiteralPath "docs/FINAL_CHECKLIST.md") {
  $checklist = Get-Content -LiteralPath "docs/FINAL_CHECKLIST.md" -Raw -Encoding UTF8
  $oldChecklist = '- [ ] Se prueba el límite de 2048 bits.'
  if ($checklist.Contains($oldChecklist)) {
    $newChecklist = @'
- [ ] Se prueba la secuencia 2.048 → 4.096 → 8.192 → 16.384 → 32.768 bits.
- [ ] Se prueba el límite exacto de v1: 65.535 bits.
- [ ] Se confirma que 65.536 bits es rechazado sin cambiar el formato.
'@
    $checklist = $checklist.Replace($oldChecklist, $newChecklist.TrimEnd())
    Set-Content -LiteralPath "docs/FINAL_CHECKLIST.md" -Value $checklist -Encoding UTF8 -NoNewline
    Write-Host "ACTUALIZADO docs/FINAL_CHECKLIST.md" -ForegroundColor Green
  }
}

if (Test-Path -LiteralPath "docs/VALIDATION.md") {
  Replace-Checked "docs/VALIDATION.md" `
    '2, 3, 7, 8, 13, 31, 64, 127, 256, 511, 1024, 2048 bits' `
    '2, 3, 7, 8, 13, 31, 64, 127, 256, 511, 1024, 2048, 4096, 8192, 16384, 32768, 65535 bits'

  $validation = Get-Content -LiteralPath "docs/VALIDATION.md" -Raw -Encoding UTF8
  $oldHuffman = '- palabra de 2048 bits;'
  if ($validation.Contains($oldHuffman)) {
    $newHuffman = @'
- palabras extendidas de 4.096, 8.192, 16.384 y 32.768 bits;
- límite v1 de 65.535 bits;
'@
    $validation = $validation.Replace($oldHuffman, $newHuffman.TrimEnd())
    Set-Content -LiteralPath "docs/VALIDATION.md" -Value $validation -Encoding UTF8 -NoNewline
    Write-Host "ACTUALIZADO docs/VALIDATION.md (Huffman extendido)" -ForegroundColor Green
  }
}

# Añadir referencia a la documentación nueva de forma segura.
$readme = Get-Content -LiteralPath "README.md" -Raw -Encoding UTF8
if (-not $readme.Contains("docs/EXTENDED_WORD_SIZES.md")) {
  $needle = '- `docs/WORD_SIZE_COMPARISON.md`'
  if ($readme.Contains($needle)) {
    $replacement = $needle + [Environment]::NewLine + '- `docs/EXTENDED_WORD_SIZES.md`'
    $readme = $readme.Replace($needle, $replacement)
    Set-Content -LiteralPath "README.md" -Value $readme -Encoding UTF8 -NoNewline
    Write-Host "ACTUALIZADO README.md (documentación extendida)" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "=== Verificación de referencias antiguas ===" -ForegroundColor Cyan
$matches = Get-ChildItem -Path "src", "docs" -Recurse -File |
  Where-Object { $_.Extension -in @(".ts", ".tsx", ".astro", ".md") } |
  Select-String -Pattern '2.?[–—-]?2048|2 a 2048|2 y 2048|hasta 2048|<= 2048' -CaseSensitive:$false

if ($matches) {
  Write-Host "Quedan referencias que conviene revisar manualmente:" -ForegroundColor Yellow
  $matches | ForEach-Object { Write-Host "$($_.Path):$($_.LineNumber): $($_.Line.Trim())" }
}
else {
  Write-Host "OK  no quedan referencias funcionales al límite anterior." -ForegroundColor Green
}

Write-Host ""
Write-Host "Overlay aplicado. Ejecuta:" -ForegroundColor Green
Write-Host "  git diff --check"
Write-Host "  pnpm test"
Write-Host "  pnpm build"
