# Comparación del tamaño de palabra

BitLab puede aplicar Huffman sobre el mismo archivo usando distintos tamaños de palabra.

Para cada tamaño seleccionado calcula:

- entropía de la fuente;
- longitud media del código;
- símbolos distintos;
- reducción del payload;
- variación del contenedor completo;
- tamaño final;
- tiempo de procesamiento observado.

El menor contenedor entre los tamaños seleccionados se resalta únicamente como resultado de esa
comparación concreta. No se afirma que sea un óptimo global entre todos los enteros de 2 a 2048.

Una palabra mayor puede reducir la cantidad de símbolos procesados, pero también puede aumentar
el número de símbolos distintos y el costo del codebook. Por eso el tamaño de palabra debe
analizarse sobre la fuente real y no elegirse por intuición.
