# Fase 1 — Rediseño UI/UX para Adaptive Compression Lab

## Propósito

La primera fase no modifica el algoritmo de compresión. Reorganiza la interfaz para que el nuevo
objetivo del proyecto sea visible sin presentar como terminadas funciones que aún no existen.

## Cambios

### Flujo principal

La landing ahora prioriza:

1. seleccionar archivo;
2. configurar el baseline;
3. comprimir;
4. ver el resultado real;
5. descargar;
6. abrir herramientas de diagnóstico solo si se necesitan.

### Baseline explícito

Huffman se presenta como baseline de compresión y RAW como control.

El modo automático no aparece como funcional todavía.

### Herramientas opcionales

Una tarjeta Blendy permite activar/desactivar:

- estadística de la fuente;
- métricas Huffman;
- comparador de tamaño N;
- auditoría de cálculos.

Los componentes originales se conservan: cambia su jerarquía visual, no su lógica.

### Antes vs Ahora

La tarjeta "Cómo estamos mejorando BitLab" comienza con una mejora ya implementada:

- antes: lectura de palabras recorriendo bits individualmente;
- ahora: copia por bloques de bytes cuando la alineación lo permite.

Se aclara que esta optimización mejora rendimiento, no ratio de compresión.

### Formato `.bitlab`

La explicación extensa desaparece de la landing.

Una tarjeta compacta conserva:

- firma `BTLB`;
- versión;
- `codecId`;
- tamaño de palabra y padding;
- metadata;
- payload;
- integridad SHA-256.

También presenta `codecId` como punto de extensión para las próximas estrategias.

## Lo que esta fase NO hace

- no implementa RLE;
- no implementa LZ77;
- no implementa auto optimizer;
- no afirma que BitLab elige todavía el mejor codec;
- no modifica el formato `.bitlab` v1;
- no altera la lógica de Huffman o RAW.
