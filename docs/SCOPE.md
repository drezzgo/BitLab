# Alcance de BitLab

BitLab procesa archivos localmente en el navegador como secuencias de bytes. El tamaño configurable de palabra se interpreta como el número de bits de cada símbolo lógico y puede tomar valores enteros entre 2 y 2048.

La segmentación binaria no se presenta como compresión. Sobre los símbolos resultantes, BitLab puede estudiar la distribución de la fuente y aplicar codificación Huffman canónica. El codec RAW se conserva como referencia sin compresión.

## Qué estudia

- cómo cambia el alfabeto observado al modificar el tamaño de palabra;
- frecuencia y probabilidad de símbolos;
- entropía de la fuente;
- redundancia respecto a una representación fija;
- longitud media y eficiencia de Huffman;
- diferencia entre payload codificado y contenedor completo;
- costo de metadata y codebook;
- reconstrucción exacta;
- integridad mediante SHA-256;
- efecto de distintos tamaños de palabra sobre una misma fuente.

## Principios

- Los bytes se mantienen en `Uint8Array`.
- No se representan palabras de hasta 2048 bits mediante `Number`.
- El formato del archivo no modifica el tratamiento binario del motor.
- La extensión o MIME se usa para presentación y para conservar metadata, no para decidir las métricas.
- El resultado debe poder reconstruirse byte a byte.
- Los cálculos visibles deben poder auditarse desde los datos reales del archivo.
- Una reducción del payload no implica automáticamente una reducción del `.bitlab` completo.

## Procesamiento

Las operaciones intensivas se ejecutan en un Web Worker para evitar bloquear la interfaz. Actualmente el archivo completo se carga con `File.arrayBuffer()` y el resultado también se materializa en memoria.

Por tanto, BitLab no implementa streaming de archivos arbitrariamente grandes. El Worker mejora la capacidad de respuesta, pero no elimina los límites de memoria del navegador.

## Integridad

Los contenedores actuales pueden guardar SHA-256 del archivo original. Al recuperar el archivo se calcula nuevamente el digest y se compara con el valor almacenado.

Una coincidencia verifica la igualdad del digest; no certifica autoría, ausencia de malware ni seguridad general del archivo.

## Objetivo académico

El objetivo es que un experimento pueda explicarse desde la definición de símbolo hasta el tamaño final del contenedor, distinguiendo teoría, codificación y overhead del formato.
