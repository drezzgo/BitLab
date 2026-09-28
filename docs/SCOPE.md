# Alcance de BitLab

BitLab procesa archivos localmente en el navegador como secuencias de bytes. El tamaño configurable de palabra se interpreta como el número de bits de cada símbolo lógico y puede tomar valores enteros entre 2 y 2048.

La segmentación binaria no se presenta como compresión. El codec disponible actualmente es RAW y su objetivo es validar un formato reversible de intercambio antes de incorporar codificación de fuente.

## Principios

- Los bytes se mantienen en `Uint8Array`.
- No se representan palabras grandes mediante `Number`.
- El formato del archivo no modifica el tratamiento binario.
- El resultado debe poder reconstruirse byte a byte.
- Los cálculos visibles deben poder auditarse desde el tamaño original del archivo.
