# BitLab — cierre académico

Aplica este overlay **después** de 9C y después de confirmar `pnpm test` y `pnpm build`.

## Desde Git Bash

```bash
powershell.exe -NoProfile -Command "Expand-Archive -Path 'S:\Downloads\bitlab-phase10-academic-closure.zip' -DestinationPath '.' -Force"
```

Valida:

```bash
git apply --check ./bitlab-phase10-academic-closure.patch
```

Aplica:

```bash
git apply ./bitlab-phase10-academic-closure.patch
```

Ejecuta:

```bash
pnpm test
pnpm build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/final-check.ps1
```

Después revisa manualmente:

```text
docs/FINAL_CHECKLIST.md
docs/ACADEMIC_DEFENSE.md
```

## Qué hace

- actualiza README y alcance al estado real;
- amplía la validación;
- añade guía de sustentación académica;
- añade checklist final;
- añade un chequeo automático de tests/build/documentación;
- elimina snapshots internos obsoletos:
  - `docs/PHASE_00_SCOPE.md`
  - `docs/PHASE_02_CONTAINER.md`
  - `docs/PHASE_02B_BLENDY_AUDIT.md`
  - `docs/PROJECT_PLAN.md`
