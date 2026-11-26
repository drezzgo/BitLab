# BitLab

Aplicación web académica para estudiar **codificación de fuente** sobre archivos arbitrarios tratados como secuencias de bits. El usuario puede definir palabras lógicas entre 2 y 65.535 bits dentro de .bitlab v1, analizar la distribución de símbolos, codificar con Huffman, crear un contenedor `.bitlab`, recuperar el archivo original y comparar el efecto de distintos tamaños de palabra.

El procesamiento se realiza localmente en el navegador; BitLab no necesita un backend para analizar o reconstruir archivos.

## Funcionalidades

- lectura de cualquier archivo como `Uint8Array`;
- segmentación exacta en símbolos de 2 a 65.535 bits, incluido padding lógico;
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
- optimización automática entre estrategias y parámetros medidos por tamaño completo;
- laboratorio local de envío 5G/6G con velocidad, latencia y eficiencia editables;
- árbol de decisión didáctico inspirado en IA que explica una sugerencia de codec.

## Control de errores

### Sustentación en dos minutos

Abre **Control de errores** en el menú superior. Carga un archivo en el compresor o escribe un mensaje. Para reproducir los valores de la tabla, elige **Texto UTF-8** y escribe únicamente `B`. Las dos demostraciones usan la fuente seleccionada y aplican inversiones en la segunda trama de Hamming (7,4).

1. Pulsa **Cambiar un bit**. El recorrido muestra `B → C → B`. En la segunda trama se invierte la posición **7**. Hamming la localiza y recupera el archivo.
2. Pulsa **Cambiar dos bits**. El recorrido muestra `B → A → A`. Cambian las posiciones **6 y 7** de la segunda trama. El síndrome señala la posición **1**, un bit de comprobación. Ambos bits de datos quedan alterados.
3. Abre **Guion para explicar este resultado**, justo debajo del inspector. Lee primero los conteos y luego explica **BER** y **FER**. La demostración muestra tanto la corrección de un error simple como el límite de esa corrección.

| Transmisión de `B` | **Cambiar un bit** | **Cambiar dos bits** |
| --- | ---: | ---: |
| Bits enviados / datos originales | 14 / 8 | 14 / 8 |
| Bits cambiados en el canal | 1 | 2 |
| Tramas con cambios en el canal | 1 de 2 | 1 de 2 |
| Tramas señaladas por el receptor | 1 | 1 |
| Correcciones verificadas / equivocadas | 1 / 0 | 0 / 1 |
| BER al recibir | 1 / 14 ≈ 7,143 % | 2 / 14 ≈ 14,29 % |
| FER al recibir | 1 / 2 = 50 % | 1 / 2 = 50 % |
| BER al recuperar | 0 / 8 = 0 % | 2 / 8 = 25 % |
| FER al recuperar | 0 / 2 = 0 % | 1 / 2 = 50 % |

Con un archivo mayor, los botones producen los mismos cambios en el primer byte y las tasas se calculan sobre todo el envío. Si transmites el contenedor comprimido, **Contenido** muestra el archivo subido y, cuando el contenedor coincide, el archivo descomprimido. **Bytes** compara las tres etapas del propio `.bitlab`.

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
  ├─ registro de codecs y optimizador
  ├─ contenedor
  ├─ simulación de transferencia
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
- `docs/EXTENDED_WORD_SIZES.md`
- `docs/DEMO_SOURCES.md`
- `docs/REAL_FORMAT_EXAMPLES.md`
- `docs/RESULT_INTERPRETATION.md`
- `docs/VALIDATION.md`
- `docs/ACADEMIC_DEFENSE.md`
- `docs/FINAL_CHECKLIST.md`
- `docs/EVOLUCION_Y_SIMULACION.md`

## Alcance

BitLab es una herramienta académica para estudiar teoría de la información y codificación de fuente. No pretende sustituir formatos de compresión de propósito general ni afirmar que existe un tamaño de palabra universalmente óptimo para todos los archivos.
