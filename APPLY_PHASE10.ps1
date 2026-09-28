$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== BitLab: aplicar cierre académico ===" -ForegroundColor Cyan

$legacyFiles = @(
  "docs/PHASE_00_SCOPE.md",
  "docs/PHASE_02_CONTAINER.md",
  "docs/PHASE_02B_BLENDY_AUDIT.md",
  "docs/PROJECT_PLAN.md"
)

foreach ($path in $legacyFiles) {
  if (Test-Path $path) {
    Remove-Item -LiteralPath $path -Force
    Write-Host "ELIMINADO  $path" -ForegroundColor Yellow
  }
  else {
    Write-Host "AUSENTE    $path" -ForegroundColor DarkGray
  }
}

$requiredFiles = @(
  "README.md",
  "docs/SCOPE.md",
  "docs/VALIDATION.md",
  "docs/ACADEMIC_DEFENSE.md",
  "docs/FINAL_CHECKLIST.md",
  "scripts/final-check.ps1"
)

foreach ($path in $requiredFiles) {
  if (-not (Test-Path $path)) {
    throw "Falta un archivo del overlay: $path"
  }
  Write-Host "OK         $path" -ForegroundColor Green
}

Write-Host ""
Write-Host "Overlay aplicado. Revisa ahora:" -ForegroundColor Green
Write-Host "  git status"
Write-Host "  git diff --check"
Write-Host "  pnpm test"
Write-Host "  pnpm build"
Write-Host "  powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/final-check.ps1"
