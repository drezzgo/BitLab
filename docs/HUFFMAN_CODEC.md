# Codificación Huffman en BitLab

BitLab trata el archivo como una fuente de símbolos de ancho fijo `N`, donde `2 <= N <= 2048`.
El codec Huffman trabaja sobre los símbolos realmente observados, no sobre todo el espacio teórico de `2^N` símbolos posibles.

## Flujo

1. Se recorre el archivo como flujo binario.
2. Se forman símbolos de `N` bits; el último puede requerir padding a la derecha.
3. Se cuenta la frecuencia de cada símbolo observado.
4. Se construye un árbol Huffman a partir de las frecuencias.
5. Se obtienen longitudes de código.
6. BitLab convierte esas longitudes en códigos Huffman canónicos.
7. El archivo se vuelve a recorrer y cada símbolo se sustituye por su código variable.
8. Los bits codificados se empaquetan en bytes para formar el payload.

## ¿Por qué Huffman canónico?

Un árbol Huffman completo no necesita almacenarse en el contenedor. Si se conservan el símbolo y la longitud de su código, los códigos pueden reconstruirse de manera determinista ordenando por longitud y luego por símbolo.

La metadata Huffman almacena:

- versión de la metadata;
- cantidad exacta de bits útiles del payload;
- cantidad total de símbolos;
- cantidad de símbolos distintos;
- para cada símbolo observado: bytes del símbolo y longitud de código.

El decoder reconstruye el codebook canónico y lee el payload bit a bit hasta recuperar la cantidad esperada de símbolos.

## Palabras grandes

Un símbolo de 2048 bits equivale a 256 bytes. BitLab no lo convierte a `Number`. Se conserva como `Uint8Array` y se usa una representación hexadecimal como clave interna.

## Caso de un único símbolo

Si toda la fuente contiene un único símbolo, BitLab asigna un código de 1 bit (`0`). La entropía de esa fuente es 0 bit/símbolo, pero esta implementación conserva un bit por ocurrencia para mantener un flujo explícito y simple de validar.
