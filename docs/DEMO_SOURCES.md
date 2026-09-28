# Fuentes reproducibles

BitLab incluye fuentes sintéticas y fixtures binarios válidos generados o embebidos localmente para repetir experimentos con los mismos bytes de entrada. Su objetivo es facilitar la comparación entre distribuciones distintas sin depender de archivos externos.

## Casos incluidos

| Fuente | Propósito |
| --- | --- |
| Texto repetitivo | Observar una fuente con patrones muy concentrados y alta repetición. |
| Texto variado | Contrastar el caso repetitivo con vocabulario, números y estructuras más diversas. |
| JSON estructurado | Observar patrones introducidos por claves, sintaxis y valores recurrentes. |
| BMP sin compresión | Contrastar un raster RGB sin compresión con formatos de imagen que ya codifican redundancia. |
| PNG | Analizar una imagen válida con compresión interna sin asumir cuánto margen adicional conserva. |
| JPEG | Analizar una imagen válida que ya pasó por compresión con pérdida. |
| PDF | Observar un contenedor documental válido cuyo resultado depende de su estructura interna. |
| ZIP | Observar un archivo válido con entradas realmente comprimidas mediante DEFLATE. |
| Datos pseudoaleatorios | Aproximarse a una distribución más uniforme mediante un generador determinista. |

Las descripciones son hipótesis cualitativas, no resultados precalculados. Entropía, frecuencias, longitud media, eficiencia, payload, metadata y tamaño final se obtienen siempre mediante el mismo core usado para cualquier archivo cargado por el usuario.

## Reproducibilidad

Cada identificador de fuente produce exactamente la misma secuencia de bytes en ejecuciones repetidas. En particular, el caso pseudoaleatorio usa una semilla fija; no usa `Math.random()`.

Los fixtures PNG, JPEG, PDF y ZIP también son estáticos y deterministas. El BMP se genera mediante una estructura binaria conocida con header de 54 bytes y píxeles RGB de 24 bits sin compresión.

Esto permite comparar tamaños de palabra distintos sin introducir cambios accidentales en la entrada.

## Validez de formato

Los tests comprueban propiedades estructurales mínimas de cada fixture:

- BMP: firma `BM`, tamaño declarado, 24 bits por píxel y compresión `BI_RGB` (valor 0);
- PNG: firma estándar y chunk `IEND`;
- JPEG: marcadores SOI y EOI;
- PDF: cabecera `%PDF-1.4`, tabla `xref` y `%%EOF`;
- ZIP: cabecera local, nombres de entrada y registro EOCD.

Estos casos no se crean cambiando únicamente la extensión de un buffer.

## Interpretación

Los ejemplos no deben presentarse como reglas universales. Una fuente repetitiva suele ofrecer más redundancia explotable que una fuente cercana a una distribución uniforme, pero BitLab muestra el resultado medido para el tamaño de palabra seleccionado.

Del mismo modo, PNG, JPEG y ZIP ya aplican técnicas de compresión en su propio formato, pero BitLab no declara de antemano que Huffman externo vaya a aumentar o reducir el tamaño. La conclusión depende de las métricas observadas.

Una reducción del payload Huffman tampoco garantiza que el contenedor `.bitlab` completo sea menor que el archivo original, porque el formato también almacena header y metadata.

## Uso con el comparador

Seleccionar cualquiera de estas fuentes carga un `File` normal en el workbench. Por tanto, el comparador de tamaños de palabra reutiliza exactamente la misma entrada y puede evaluar distintos valores de `N` sin una ruta especial para las demostraciones.
