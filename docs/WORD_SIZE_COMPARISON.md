# Comparación del tamaño de palabra

BitLab puede aplicar Huffman sobre el mismo archivo usando distintos tamaños de palabra dentro del rango representable por `.bitlab` v1: `2 <= N <= 65.535`.

Para cada tamaño seleccionado calcula:

- cantidad total de símbolos;
- entropía de la fuente;
- longitud media del código;
- símbolos distintos;
- tamaño real del payload;
- reducción del payload;
- tamaño de la metadata del codebook;
- metadata total;
- variación del contenedor completo;
- tamaño final;
- tiempo de procesamiento observado.

## Reto ×2

El preset **Reto ×2** ejecuta:

```text
2048 → 4096 → 8192 → 16384 → 32768
```

El siguiente doble sería `65.536`, pero `.bitlab` v1 persiste `wordSizeBits` como `uint16`, cuyo valor máximo es `65.535`. Por eso el reto de duplicación termina correctamente en `32.768`.

El valor `65.535` está disponible por separado para validar el límite exacto de v1.

## Interpretación

El menor contenedor entre los tamaños seleccionados se resalta únicamente como resultado de esa comparación concreta. No se afirma que sea un óptimo global entre todos los enteros de 2 a 65.535.

Una palabra mayor reduce el número de símbolos procesados, pero cada símbolo ocupa más bytes y una entrada del codebook también crece. Por eso ahora se muestran por separado payload, codebook, metadata y tamaño final.

Si un `N` produce un único símbolo para todo el archivo, la entropía observada puede caer a cero. El cálculo es correcto, pero ese caso aporta poca información para comparar estadísticamente la fuente y no debe interpretarse como una compresión extraordinaria.
