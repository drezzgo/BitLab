# BitLab

Aplicación web académica para estudiar **codificación de fuente** sobre archivos arbitrarios tratados como secuencias de bits. El usuario puede definir palabras lógicas entre 2 y 2048 bits, analizar la distribución de símbolos, codificar con Huffman, crear un contenedor `.bitlab`, recuperar el archivo original y comparar el efecto de distintos tamaños de palabra.

El procesamiento se realiza localmente en el navegador; BitLab no necesita un backend para analizar o reconstruir archivos.

## Funcionalidades

- lectura de cualquier archivo como `Uint8Array`;
- segmentación exacta en símbolos de 2 a 2048 bits, incluido padding lógico;
- reconstrucción byte a byte;
- estadística de frecuencia y probabilidad de símbolos;
- entropía `H(X)` y redundancia respecto a representación fija;
- Huffman canónico reversible;
- longitud media, eficiencia y comparación entre representación fija y payload;
- distinción entre reducción del payload y tamaño real del contenedor;
- contenedor binario propio `.bitlab` con firma `BTLB`;
- codecs RAW y Huffman;
- SHA-256 del archivo original y verificación tras la reconstrucción;
- procesamiento intensivo mediante Web Workers con progreso y cancelación;
- comparador de tamaños de palabra sobre el mismo archivo;
- fuentes reproducibles y casos válidos BMP, PNG, JPEG, PDF y ZIP;
- recuperación de contenedores actuales y compatibilidad con contenedores anteriores sin metadata de integridad.

## Arquitectura

```text
Astro
  └─ estructura de la aplicación

React
  └─ interacción y presentación

TypeScript core
  ├─ bits y segmentación
  ├─ estadísticas
  ├─ Huffman
  ├─ contenedor
  ├─ integridad
  ├─ interpretación
  └─ comparación

Web Worker
  └─ operaciones intensivas
```

Las palabras binarias grandes no se representan mediante `Number`. Los bytes permanecen en estructuras binarias y `BigInt` se usa únicamente donde corresponde a enteros persistidos de gran tamaño.

## Ejecutar

```bash
pnpm install
pnpm test
pnpm build
pnpm dev
```

Antes del cierre o merge final:

```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/final-check.ps1
```

## Documentación

- `docs/SCOPE.md`
- `docs/CALCULATION_AUDIT.md`
- `docs/SOURCE_STATISTICS.md`
- `docs/HUFFMAN_CODEC.md`
- `docs/CODING_METRICS.md`
- `docs/CONTAINER_FORMAT.md`
- `docs/FILE_FORMAT_IMPLEMENTATION.md`
- `docs/INTEGRITY.md`
- `docs/PROCESSING_ARCHITECTURE.md`
- `docs/WORD_SIZE_COMPARISON.md`
- `docs/DEMO_SOURCES.md`
- `docs/REAL_FORMAT_EXAMPLES.md`
- `docs/RESULT_INTERPRETATION.md`
- `docs/VALIDATION.md`
- `docs/ACADEMIC_DEFENSE.md`
- `docs/FINAL_CHECKLIST.md`

## Alcance

BitLab es una herramienta académica para estudiar teoría de la información y codificación de fuente. No pretende sustituir formatos de compresión de propósito general ni afirmar que existe un tamaño de palabra universalmente óptimo para todos los archivos.
