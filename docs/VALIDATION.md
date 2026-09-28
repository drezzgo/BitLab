# Validación

La validación del proyecto se apoya en propiedades reproducibles.

## Round-trip

Para todo archivo de prueba y ancho soportado:

```text
restore(encode(x)) = x
```

Los tests cubren tamaños como:

```text
2, 3, 7, 8, 13, 31, 64, 127, 256, 511, 1024, 2048 bits
```

## Integridad

Los contenedores nuevos guardan SHA-256 del archivo original. Después de restaurar:

```text
SHA256(original) = SHA256(restaurado)
```

También se prueba la detección de una discrepancia de digest.

## Huffman

Se comprueba:

- construcción determinista del código canónico;
- decodificación exacta;
- archivo vacío;
- fuente de un solo símbolo;
- palabras no múltiplo de 8;
- palabra de 2048 bits.

## Formato

Se comprueba rechazo de:

- firma inválida;
- versión no soportada;
- longitudes inconsistentes;
- payload truncado;
- metadata incompatible.

## Pruebas manuales recomendadas

- texto altamente repetitivo;
- JSON estructurado;
- imagen;
- PDF;
- ZIP;
- datos pseudoaleatorios;
- archivos `.bitlab` antiguos sin SHA-256;
- archivos `.bitlab` nuevos con integridad.
