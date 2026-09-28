# Casos de formatos reales

Las demostraciones de formatos reales se usan para comparar la codificación de fuente sobre bytes que ya pertenecen a formatos válidos.

## Comparaciones pedagógicas

### BMP frente a PNG/JPEG

El BMP incluido almacena píxeles RGB sin compresión. PNG y JPEG representan imágenes válidas que ya aplican transformaciones y compresión internas.

El objetivo no es demostrar que un formato siempre comprime mejor que otro, sino observar cómo cambia la distribución de símbolos que recibe BitLab.

### PDF

El PDF contiene una página con texto, objetos, stream de contenido y tabla `xref`. Un PDF real puede contener texto, imágenes y streams comprimidos; por eso su resultado no se generaliza a todos los PDF.

### ZIP

El ZIP contiene dos entradas comprimidas con DEFLATE. Sirve para observar qué ocurre cuando Huffman se aplica externamente a datos que ya pasaron por otra etapa de compresión.

## Regla de interpretación

La extensión o MIME nunca decide el resultado. BitLab calcula frecuencias, probabilidades, entropía, Huffman, payload, metadata y tamaño final sobre los bytes reales del fixture.
