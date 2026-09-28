# Validación

La validación de BitLab se apoya en propiedades reproducibles y en la separación entre el motor binario, los codecs y la interfaz.

## Round-trip

La propiedad principal es:

```text
restore(encode(x)) = x
```

Los tests cubren tamaños de palabra como:

```text
2, 3, 7, 8, 13, 31, 64, 127, 256, 511, 1024, 2048 bits
```

Se incluyen tamaños no múltiplos de 8 para comprobar el manejo de padding y estado de bits.

## Integridad

Los contenedores actuales guardan SHA-256 del archivo original. Después de restaurar:

```text
SHA256(original) = SHA256(restaurado)
```

También se prueba la detección de una discrepancia de digest y la lectura de contenedores anteriores sin metadata de integridad.

## Huffman

Se comprueba:

- construcción determinista del código canónico;
- decodificación exacta;
- archivo vacío;
- fuente de un solo símbolo;
- palabras no múltiplos de 8;
- palabra de 2048 bits;
- métricas coherentes de entropía, longitud media y payload.

## Contenedor

Se comprueba rechazo de:

- firma inválida;
- versión no soportada;
- longitudes inconsistentes;
- payload truncado;
- metadata incompatible;
- codec desconocido cuando corresponde.

## Comparador

El comparador usa el mismo archivo para cada tamaño seleccionado. Cada fila debe ser consistente con ejecutar individualmente ese mismo `N`.

El menor contenedor observado se interpreta únicamente dentro del conjunto evaluado; no demuestra un óptimo global entre todos los valores enteros de 2 a 2048.

## Fuentes reproducibles

Se comprueba que una misma demostración genere los mismos bytes en ejecuciones repetidas.

Los casos de formato real verifican propiedades estructurales de:

- BMP sin compresión;
- PNG;
- JPEG;
- PDF;
- ZIP con entradas DEFLATE.

Las extensiones no se usan como sustituto de un formato binario válido.

## Procesamiento

Análisis, codificación, recuperación y comparación se ejecutan mediante Web Workers cuando corresponde. La cancelación termina el Worker activo.

El uso de Worker no modifica la propiedad de round-trip ni elimina el límite de memoria derivado de cargar el archivo completo.

## Gate antes de merge

```bash
pnpm test
pnpm build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/final-check.ps1
```

Los tres pasos deben terminar correctamente antes del merge final.
