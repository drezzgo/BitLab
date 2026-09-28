$ErrorActionPreference = "Stop"

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][scriptblock]$Command
  )

  Write-Host ""
  Write-Host "=== $Label ===" -ForegroundColor Cyan
  & $Command

  if ($LASTEXITCODE -ne 0) {
    throw "$Label falló con código $LASTEXITCODE."
  }

  Write-Host "OK  $Label" -ForegroundColor Green
}

Invoke-CheckedCommand "git diff --check" {
  git diff --check
}

Invoke-CheckedCommand "pnpm test" {
  pnpm test
}

Invoke-CheckedCommand "pnpm build" {
  pnpm build
}

Write-Host ""
Write-Host "=== Documentación final ===" -ForegroundColor Cyan

$legacyFiles = @(
  "docs/PHASE_00_SCOPE.md",
  "docs/PHASE_02_CONTAINER.md",
  "docs/PHASE_02B_BLENDY_AUDIT.md",
  "docs/PROJECT_PLAN.md"
)

foreach ($path in $legacyFiles) {
  if (Test-Path $path) {
    throw "Todavía existe documentación interna/obsoleta: $path"
  }
}

$requiredFiles = @(
  "README.md",
  "docs/SCOPE.md",
  "docs/CONTAINER_FORMAT.md",
  "docs/HUFFMAN_CODEC.md",
  "docs/CODING_METRICS.md",
  "docs/INTEGRITY.md",
  "docs/PROCESSING_ARCHITECTURE.md",
  "docs/WORD_SIZE_COMPARISON.md",
  "docs/DEMO_SOURCES.md",
  "docs/RESULT_INTERPRETATION.md",
  "docs/REAL_FORMAT_EXAMPLES.md",
  "docs/VALIDATION.md",
  "docs/ACADEMIC_DEFENSE.md",
  "docs/FINAL_CHECKLIST.md"
)

foreach ($path in $requiredFiles) {
  if (-not (Test-Path $path)) {
    throw "Falta un archivo requerido para el cierre: $path"
  }
}

$forbiddenPatterns = @(
  "100%\s+segur",
  "compresi[oó]n\s+garantizada",
  "certificad[oa]\s+como\s+segur"
)

$searchFiles = @("README.md")
$searchFiles += Get-ChildItem -Path "docs", "src" -Recurse -File |
  Where-Object {
    $_.FullName -notmatch "[\\/](node_modules|dist)[\\/]" -and
    $_.Extension -in @(".md", ".astro", ".tsx", ".ts")
  } |
  Select-Object -ExpandProperty FullName

foreach ($pattern in $forbiddenPatterns) {
  $matches = Select-String -Path $searchFiles -Pattern $pattern -CaseSensitive:$false
  if ($matches) {
    $matches | ForEach-Object { Write-Host $_ }
    throw "Se encontró una afirmación prohibida o excesiva: $pattern"
  }
}

Write-Host "OK  documentación y afirmaciones" -ForegroundColor Green

Write-Host ""
Write-Host "=== Estado Git ===" -ForegroundColor Cyan
git status --short

Write-Host ""
Write-Host "BitLab superó el chequeo automático final." -ForegroundColor Green
Write-Host "Aún deben realizarse las verificaciones manuales de docs/FINAL_CHECKLIST.md."
