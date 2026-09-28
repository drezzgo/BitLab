# Fase 2 — Contenedor BitLab v1

## Objetivo

Crear el primer formato de intercambio reversible de BitLab. Esta fase NO implementa compresión.
El codec `RAW` conserva los bytes originales y añade un header binario con la información
necesaria para identificar y reconstruir el archivo.

## Formato fijo v1

Todos los enteros multibyte se almacenan en big-endian.

| Offset | Bytes | Campo |
|---:|---:|---|
| 0 | 4 | Magic ASCII `BTLB` |
| 4 | 1 | Version = 1 |
| 5 | 1 | Codec = 0 (`RAW`) |
| 6 | 2 | Word size (2–2048 bits) |
| 8 | 2 | Padding lógico |
| 10 | 2 | Flags reservados |
| 12 | 8 | Tamaño original (`uint64`) |
| 20 | 2 | Longitud nombre UTF-8 |
| 22 | 2 | Longitud MIME UTF-8 |
| 24 | 4 | Longitud metadata del codec |
| 28 | 8 | Longitud payload (`uint64`) |

Después del header fijo de 36 bytes:

1. nombre UTF-8;
2. MIME UTF-8;
3. metadata del codec;
4. payload.

## Precisión numérica

Los tamaños persistidos se escriben como `uint64` mediante `BigInt`/`DataView.setBigUint64`.
Solo se convierten a `number` cuando es necesario indexar un `ArrayBuffer`, y se rechaza un valor
que exceda `Number.MAX_SAFE_INTEGER`.

Los datos del archivo nunca se convierten a un entero JavaScript grande.

## Codec RAW

`RAW` permite validar el contenedor antes de añadir Huffman:

`archivo -> contenedor RAW -> parser -> archivo`

Debe cumplirse igualdad byte a byte. El tamaño `.bitlab` será mayor que el original por el header;
esto no debe interpretarse como un intento fallido de compresión.

## Vista previa

La UI puede interpretar el MIME/extensión únicamente para representación visual:

- imágenes: preview local mediante `URL.createObjectURL`;
- PDF, ZIP, TXT, audio, video, documentos y binarios: icono/tarjeta de tipo.

Esta clasificación NO modifica el motor binario ni el payload.

## Gate

- tests de round-trip para 2, 13 y 2048 bits;
- parser rechaza magic inválido;
- parser rechaza truncamiento;
- nombre UTF-8 y MIME preservados;
- `/codificar` descarga `.bitlab`;
- `/decodificar` recupera el archivo RAW;
- preview de imagen no sube el archivo a un servidor.
