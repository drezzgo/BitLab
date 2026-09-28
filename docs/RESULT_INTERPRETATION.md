# Interpretación de resultados

BitLab separa el cálculo de la explicación visual. Las métricas se obtienen en el core y la interfaz presenta relaciones derivadas de esos valores sin inferir propiedades a partir de la extensión del archivo.

## Fuente

Para una palabra de `N` bits se muestran:

- entropía `H(X)`;
- diferencia `N - H(X)`;
- utilización de entropía respecto al ancho fijo;
- frecuencia del símbolo más observado;
- cantidad de símbolos distintos.

`N - H(X)` expresa redundancia estadística respecto a una representación fija de `N` bits. No representa bits que ya hayan sido comprimidos.

La frecuencia del símbolo dominante ayuda a observar si la distribución está concentrada, pero la entropía depende de todas las probabilidades de la fuente.

Al cambiar `N` cambia la definición de símbolo. Por ello se reconstruyen frecuencias, probabilidades y entropía para cada tamaño de palabra.

## Huffman

La lectura pedagógica distingue cuatro niveles:

1. `H(X)`: información promedio de la fuente.
2. `L̄`: longitud media obtenida por Huffman.
3. payload: bits realmente emitidos por el código.
4. contenedor: payload más header, nombre, MIME, metadata del codebook e integridad.

La diferencia `L̄ - H(X)` muestra cuánto se separa la longitud media del valor de entropía en ese experimento.

## Payload y archivo final

La reducción del payload no implica necesariamente que el archivo `.bitlab` sea menor que el original.

BitLab calcula:

```text
overhead = bytes(.bitlab) - bytes(payload)
```

y compara además:

```text
bytes(.bitlab) - bytes(original)
```

Así puede mostrarse explícitamente un caso donde Huffman reduce el flujo codificado pero la metadata necesaria para reconstruirlo supera ese ahorro.

## Qué no se concluye

La interpretación no declara que un formato comprime bien o mal por ser PNG, JPEG, ZIP, PDF u otro tipo. Todos los casos se explican a partir de las métricas medidas sobre los bytes y el tamaño de palabra seleccionado.
