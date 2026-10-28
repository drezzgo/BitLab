# Fase 3 — RLE + Huffman

## Objetivo

Añadir la primera estrategia que pueda superar al baseline Huffman en fuentes adecuadas.

```text
archivo
  ↓
RLE byte-oriented
  ↓
flujo de tokens
  ↓
Huffman de 8 bits
  ↓
.bitlab
```

## RLE implementado

El formato se inspira en PackBits:

```text
control 0..127
→ bloque literal de control + 1 bytes

control 128..255
→ run de (control & 0x7f) + 3 repeticiones del siguiente byte
```

Solo se crean runs a partir de 3 bytes repetidos.

Un run de dos bytes no reduciría tamaño:

```text
AA
```

necesitaría igualmente control + valor, por lo que se mantiene dentro de un bloque literal.

## Por qué N = 8

La primera implementación de RLE opera sobre bytes.

No se reutiliza silenciosamente el tamaño N de Huffman porque conceptualmente son parámetros distintos.

Por eso:

```text
RLE + Huffman → N fijo = 8
```

La UI deshabilita el selector de N cuando este codec está activo.

## Metadata

El codec almacena:

- versión de metadata RLE + Huffman;
- tamaño del flujo RLE antes de Huffman;
- longitud de metadata Huffman;
- metadata Huffman canónica.

El header principal continúa siendo `.bitlab` v1.

## codecId

```text
0 RAW
1 Huffman
2 RLE + Huffman
```

## Métricas

La ejecución registra:

- bytes originales;
- bytes después de RLE;
- ahorro o expansión de RLE;
- cantidad de bloques run;
- cantidad de bloques literales;
- bits y bytes del payload Huffman;
- codebook Huffman;
- metadata;
- tamaño final `.bitlab`;
- variación final frente al original.

## Resultado esperado

RLE + Huffman no se presenta como universalmente mejor.

Fuentes con runs:

```text
AAAAAAAAAAAAAAAA
0000000000000000
```

pueden beneficiarse mucho.

Fuentes variadas o previamente comprimidas pueden crecer debido a los controles RLE.

Este comportamiento no es un error: es la evidencia que usará el futuro Auto Optimizer para elegir entre codecs.

## Validación

La fase se acepta si:

1. RLE hace round-trip exacto;
2. RLE detecta runs mayores que un token;
3. datos sin runs siguen siendo reversibles;
4. `.bitlab` con codecId 2 se restaura exactamente;
5. SHA-256 sigue verificando;
6. una fuente dominada por runs produce un `.bitlab` menor con RLE + Huffman que con Huffman baseline;
7. N distinto de 8 se rechaza en este codec.
