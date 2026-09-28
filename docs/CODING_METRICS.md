# Métricas de codificación

BitLab distingue las métricas del payload de las métricas del archivo `.bitlab` completo.

## Entropía

`H(X) = -Σ p(x_i) log2 p(x_i)`

Representa la incertidumbre media de la fuente para el alfabeto definido por el tamaño de palabra seleccionado.

## Longitud media del código

`L̄ = Σ p(x_i) l_i`

donde `l_i` es la longitud del código Huffman asignado al símbolo `x_i`.

## Eficiencia del código

`η = H(X) / L̄`

BitLab la expresa como porcentaje cuando `L̄ > 0`.

## Ahorro del payload

Se compara el flujo Huffman con la representación fija de los símbolos:

`bits_fijos = cantidad_simbolos × N`

`ahorro_payload = 1 - bits_huffman / bits_fijos`

Este indicador no incluye header, codebook ni integridad.

## Resultado total

El tamaño final sí incluye:

- header fijo;
- nombre del archivo;
- MIME type;
- envoltura de integridad y SHA-256;
- metadata propia del codec;
- payload Huffman.

Por eso un payload puede reducirse y, aun así, el `.bitlab` completo puede ser mayor que el archivo original. Esto ocurre especialmente cuando hay muchos símbolos distintos y el codebook ocupa más que el ahorro conseguido.
