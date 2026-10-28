# Auto Optimizer

## Objetivo

BitLab ya tiene varias estrategias, pero hasta ahora el usuario debía decidir cuál ejecutar.

El Auto Optimizer cambia el flujo:

```text
archivo
  ↓
RAW ──────────────┐
Huffman ──────────┤
RLE + Huffman ────┤→ comparar .bitlab completos → conservar el menor
LZ77 + Huffman ───┘
```

## Qué significa "mejor"

En esta fase, "mejor" significa:

> menor número de bytes del contenedor `.bitlab` completo entre los codecs probados.

No se compara únicamente el payload.

Se cuentan:

- header;
- nombre y MIME;
- metadata;
- SHA-256;
- codebook;
- payload.

## Configuración común

El Auto Optimizer de esta fase utiliza:

```text
N = 8
```

para los cuatro candidatos.

Esto permite comparar selección de codec sin mezclar todavía la búsqueda de parámetros.

La optimización de N, ventana LZ77 y otras configuraciones corresponde al siguiente paso del proyecto.

## Memoria

Los candidatos se ejecutan secuencialmente.

El optimizador conserva:

- el mejor contenedor encontrado;
- el candidato actual;
- un resumen numérico de cada resultado.

No conserva cuatro contenedores completos simultáneamente.

## Casos donde no hay compresión

Si todos los codecs producen un `.bitlab` mayor que el archivo original, el optimizador sigue escogiendo el menor contenedor válido.

Frecuentemente será RAW.

Esto es especialmente relevante para:

- JPEG;
- PNG;
- ZIP;
- contenido cifrado;
- datos pseudoaleatorios;
- formatos ya comprimidos.

No se debe presentar como una falla del algoritmo.

## Siguiente paso

La siguiente optimización amplía el problema desde:

```text
¿qué codec produce menos bytes?
```

a:

```text
¿qué codec + parámetros produce menos bytes?
```

Ejemplos:

- varios N para Huffman;
- ventanas LZ77;
- límites de búsqueda;
- longitudes mínimas de match.
