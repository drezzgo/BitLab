# BitLab

Aplicación web académica para estudiar codificación de fuente sobre archivos arbitrarios mediante palabras binarias configurables de 2 a 2048 bits.

## Funcionalidades actuales

- lectura local de archivos como bytes;
- segmentación exacta de 2 a 2048 bits;
- preview para imágenes e identificación visual de otros formatos;
- contenedor binario propio `.bitlab`;
- codec RAW de referencia;
- estadística de símbolos, probabilidades y entropía;
- codec Huffman canónico reversible;
- métricas de longitud media, eficiencia y reducción del payload;
- recuperación del archivo original desde RAW o Huffman.

## Ejecutar

```bash
pnpm install
pnpm test
pnpm build
pnpm dev
```

## Documentación

- `docs/SCOPE.md`
- `docs/CALCULATION_AUDIT.md`
- `docs/SOURCE_STATISTICS.md`
- `docs/HUFFMAN_CODEC.md`
- `docs/CODING_METRICS.md`
- `docs/CONTAINER_FORMAT.md`
- `docs/FILE_FORMAT_IMPLEMENTATION.md`
