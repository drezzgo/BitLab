# Formato de contenedor BitLab

El contenedor usa la firma `BTLB` y almacena versión, identificador de codec, tamaño de palabra, padding, tamaño original, nombre, MIME, metadata y payload.

## Header fijo

El header ocupa 36 bytes. Después aparecen, en orden:

1. nombre original UTF-8;
2. MIME type UTF-8;
3. metadata;
4. payload.

## Metadata de integridad

Los contenedores nuevos envuelven la metadata con una estructura identificada por `BIMD`.

La envoltura guarda:

- versión de metadata;
- identificador del algoritmo de integridad;
- SHA-256 del archivo original;
- longitud de la metadata propia del codec;
- metadata propia del codec.

Los contenedores anteriores que no contienen `BIMD` siguen siendo legibles, pero no pueden verificarse contra un SHA-256 almacenado.

## Codec RAW

`codecId = 0`.

Conserva los bytes originales como payload y no intenta reducir el flujo. Su metadata específica está vacía, aunque el contenedor nuevo sí puede incluir la envoltura de integridad.

## Codec Huffman

`codecId = 1`.

La metadata específica guarda la información suficiente para reconstruir un codebook Huffman canónico. El payload contiene los códigos variables empaquetados en bytes.

El parser valida la estructura general. Después se separa la metadata de integridad de la metadata del codec y el decodificador delega la restauración al codec indicado por el header.

## Importante

Cambiar la extensión de un archivo a `.bitlab` no lo convierte en un contenedor válido. BitLab exige la firma `BTLB`, una versión soportada y longitudes internamente coherentes.
