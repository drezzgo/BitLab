$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== BitLab · Verificación final ===" -ForegroundColor Cyan

Write-Host ""
Write-Host "[1/4] git diff --check" -ForegroundColor Yellow
git diff --check
if ($LASTEXITCODE -ne 0) { throw "git diff --check falló." }

Write-Host ""
Write-Host "[2/4] tests" -ForegroundColor Yellow
pnpm test
if ($LASTEXITCODE -ne 0) { throw "pnpm test falló." }

Write-Host ""
Write-Host "[3/4] build" -ForegroundColor Yellow
pnpm build
if ($LASTEXITCODE -ne 0) { throw "pnpm build falló." }

Write-Host ""
Write-Host "[4/4] términos obsoletos" -ForegroundColor Yellow
$hits = Get-ChildItem -Path "src" -Recurse -File |
  Select-String -SimpleMatch "FASE ACTUAL"

if ($hits) {
  Write-Host "REVISAR: todavía aparece 'FASE ACTUAL'." -ForegroundColor Yellow
  $hits | ForEach-Object { Write-Host "$($_.Path):$($_.LineNumber) $($_.Line.Trim())" }
}
else {
  Write-Host "OK  no aparece 'FASE ACTUAL' en src." -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Verificación final completada ===" -ForegroundColor Green
