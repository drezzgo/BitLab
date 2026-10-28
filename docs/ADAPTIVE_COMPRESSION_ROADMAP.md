# BitLab Adaptive Compression Lab — Roadmap aprobado

## Objetivo del nuevo proyecto

BitLab evoluciona desde una herramienta centrada en Huffman hacia un laboratorio de compresión
reversible capaz de probar varias estrategias y conservar el menor contenedor real entre las
configuraciones evaluadas.

La meta no se formula como "compresión óptima universal", porque no existe una estrategia que
garantice el mínimo absoluto para cualquier archivo. El criterio verificable será:

> Entre las estrategias y configuraciones que BitLab ejecuta, conservar el `.bitlab` completo de menor tamaño que pueda reconstruir exactamente el archivo original.

La comparación siempre debe incluir payload, metadata y estructura del contenedor.

## Fase 1 — UI/UX orientada a compresión

Estado: implementada en este paquete.

- Huffman se presenta como baseline actual.
- RAW se conserva como control.
- Estadística, métricas Huffman, comparador N y auditoría pasan a ser herramientas opcionales.
- Las herramientas se activan desde una tarjeta compacta expandible con Blendy.
- La sección grande de Teoría de la Información desaparece de la landing.
- El formato `.bitlab` se conserva en una tarjeta compacta expandible.
- Se añade "Cómo estamos mejorando BitLab", con una comparación real Antes vs Ahora.
- La primera mejora mostrada es el paso de lectura bit-a-bit a procesamiento por bloques para palabras grandes.
- No se presenta todavía un modo "automático" porque el registry multi-codec aún no existe.

## Fase 2 — Registry multi-codec

Objetivo:

- eliminar decisiones dispersas `if (codec === ...)`;
- registrar codecs mediante una interfaz común;
- cada codec debe declarar `id`, nombre, encode, decode y metadata;
- permitir añadir estrategias sin reescribir el Worker principal.

## Fase 3 — RLE + Huffman

Estado: implementada.

Primera mejora de compresión medible:

- detectar runs de valores repetidos;
- generar tokens RLE;
- aplicar Huffman sobre los tokens;
- comparar contra RAW y Huffman baseline;
- documentar cuándo mejora y cuándo empeora.

## Fase 4 — LZ77 + Huffman

- detectar secuencias repetidas mediante referencias hacia atrás;
- parametrizar ventana y longitud de match;
- aplicar Huffman sobre literales/referencias;
- validar round-trip e integridad;
- comparar tamaño, tiempo y memoria.

## Fase 5 — Auto Optimizer

El optimizador ejecutará candidatos definidos:

```text
RAW
Huffman
RLE + Huffman
LZ77 + Huffman
...
```

y conservará únicamente el menor contenedor válido.

No debe decidir por extensión del archivo; puede usar características del archivo para priorizar
candidatos, pero la selección final debe basarse en el resultado medido.

## Fase 6 — Optimización de parámetros

Explorar espacios acotados y reproducibles para:

- tamaños de palabra;
- ventanas LZ;
- match mínimo/máximo;
- otras configuraciones relevantes.

Evitar fuerza bruta sin límite.

## Fase 7 — Benchmark académico

Usar corpus reproducible y archivos reales:

- texto repetitivo;
- texto variado;
- JSON;
- BMP;
- PNG;
- JPEG;
- PDF;
- ZIP;
- binarios;
- pseudoaleatorio.

Métricas mínimas:

- bytes originales;
- bytes comprimidos;
- reducción final;
- payload;
- metadata;
- tiempo;
- memoria cuando pueda medirse de forma defendible;
- round-trip exacto;
- SHA-256.

## Regla de aceptación

Una optimización no se acepta porque "parezca mejor".

Debe:

1. ser reversible;
2. conservar integridad;
3. producir evidencia reproducible;
4. explicar qué mejora;
5. explicar sus trade-offs;
6. no confundir reducción de payload con reducción del `.bitlab` completo.
