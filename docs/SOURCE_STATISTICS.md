# Estadística de la fuente

BitLab puede analizar los símbolos observados después de segmentar el flujo original con un ancho de palabra `N` entre 2 y 2048 bits.

Para cada símbolo observado se calcula:

- frecuencia absoluta `n_i`;
- probabilidad `p(x_i) = n_i / N_s`;
- entropía de la fuente `H(X) = -Σ p(x_i) log2 p(x_i)`.

`N_s` representa el número total de símbolos generados por la segmentación.

La interfaz también muestra la diferencia `N - H(X)` como redundancia teórica respecto de la representación fija de `N` bits por símbolo. Esta cantidad no implica que el archivo ya esté comprimido: únicamente caracteriza la distribución observada y sirve de base para evaluar posteriormente un código de fuente.

## Representación exacta

Los símbolos se leen desde `Uint8Array` y se usan claves binarias/hexadecimales para contabilizarlos. Las palabras grandes no se convierten a `Number`.

El análisis se ejecuta bajo demanda dentro de un Web Worker para evitar ocupar el hilo principal. La versión actual todavía carga el archivo completo en memoria antes de transferirlo al Worker; este límite se documenta en `PROCESSING_ARCHITECTURE.md`.
