# Fase 0 — Alcance y modelo inicial

## Interpretación provisional

Hasta confirmar el enunciado exacto con el profesor, BitLab interpreta "de 2 bits hasta 2048 bits" como el **tamaño de palabra o símbolo binario** usado por el codificador.

Esto no implica que la segmentación sea por sí misma compresión o codificación de fuente.

## Representación exacta

- Contenido binario: `Uint8Array` + operaciones de bits.
- No se usa `Number` para guardar palabras grandes.
- `number` sí podrá usarse para probabilidades, entropía y métricas reales.

## Propiedad fundamental

Antes de implementar Huffman debe cumplirse:

`reassemble(segment(file, N)) === file`

para tamaños de palabra válidos, incluidos tamaños no múltiplos de 8 y el límite de 2048 bits.

## Exclusiones de esta fase

Todavía no hay:
- Huffman;
- compresión;
- formato codificado descargable;
- entropía;
- SHA-256;
- procesamiento por chunks o Web Worker.
