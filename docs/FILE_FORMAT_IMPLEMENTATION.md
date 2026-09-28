# Cómo se implementa el formato `.bitlab`

La extensión `.bitlab` identifica el contenedor definido por el proyecto, pero la extensión por sí sola no demuestra que un archivo sea válido. La aplicación reconoce el formato por su estructura interna.

## Firma

`src/core/container/types.ts` define:

```ts
BITLAB_MAGIC_TEXT = 'BTLB'
```

Los primeros cuatro bytes contienen esa firma.

## Header

`src/core/container/format.ts` contiene `encodeBitLabContainerParts()`, que escribe un header fijo de 36 bytes con `DataView`.

Allí se almacenan versión, codec, tamaño de palabra, padding, tamaño original, longitudes de metadata y tamaño del payload. Los tamaños de 64 bits se escriben con `BigInt` y `setBigUint64()`.

## Integridad

`src/core/integrity/` implementa SHA-256 y una envoltura de metadata con firma `BIMD`.

Los contenedores nuevos guardan el digest del archivo original. La metadata del codec queda contenida dentro de esa envoltura, por lo que RAW y Huffman pueden usar la misma capa de integridad sin cambiar el header principal.

## Codec RAW

`encodeRawContainer()` reutiliza el constructor del contenedor y coloca los bytes originales directamente en el payload.

## Codec Huffman

`src/core/codecs/huffman/` contiene la construcción del modelo y los códigos canónicos.

`src/core/container/huffman.ts`:

1. genera el payload Huffman;
2. serializa el codebook;
3. envuelve codebook + SHA-256 en la metadata;
4. entrega metadata y payload a `encodeBitLabContainerParts()`.

El codebook no enumera los `2^N` símbolos posibles. Solo guarda los símbolos que aparecen realmente en el archivo.

## Lectura

`parseBitLabContainer()` valida la estructura común.

`restoreBitLabContainer()` consulta `codecId` y ejecuta:

- RAW: copia del payload;
- Huffman: lectura del codebook, decodificación de símbolos y recomposición de bytes.

Después, la capa de aplicación calcula SHA-256 de los bytes restaurados y lo compara con el digest almacenado cuando está disponible.

## Asociación con el sistema operativo

La aplicación no registra `.bitlab` como una extensión global en Windows, Linux o macOS. Definir el formato y usar una extensión propia es independiente de registrar una aplicación como manejador predeterminado.
