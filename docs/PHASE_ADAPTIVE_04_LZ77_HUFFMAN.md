# LZ77 + Huffman

## Qué problema resuelve

RLE solo reconoce repeticiones consecutivas:

```text
AAAAAAAA
```

LZ77 busca secuencias que ya aparecieron dentro de una ventana reciente:

```text
UNIVERSIDAD-DISTRITAL ... UNIVERSIDAD-DISTRITAL
```

La segunda aparición puede representarse mediante distancia y longitud.

## Pipeline

```text
archivo
  ↓
LZ77
  ↓
literales + referencias
  ↓
Huffman
  ↓
.bitlab
```

## Formato de tokens

El flujo LZ77 es byte-oriented.

### Bloque literal

```text
control 0..127
longitud = control + 1
datos = 1..128 bytes
```

### Match

```text
control 128..255
longitud = (control & 0x7f) + 4
distancia = uint16 big-endian
```

La distancia máxima utilizada por el encoder es 32 KiB.

## Búsqueda de matches

No se recorre toda la ventana para cada posición.

La implementación utiliza:

- ventana de 32 KiB;
- hash de tres bytes;
- cadenas de posiciones anteriores;
- máximo de 64 candidatos por búsqueda;
- match mínimo de 4 bytes;
- match máximo de 131 bytes.

La cadena limitada evita que una fuente repetitiva convierta la búsqueda en una exploración exhaustiva de toda la ventana.

## Por qué Huffman después

LZ77 genera bytes de control, distancias y literales.

Esos bytes también tienen una distribución estadística. Huffman intenta reducir el costo del flujo de tokens resultante.

## codecId

```text
0 RAW
1 Huffman
2 RLE + Huffman
3 LZ77 + Huffman
```

El layout del header de `.bitlab` continúa siendo v1. Se añade un codec reconocido por el parser actual.

## N = 8

Esta implementación opera sobre bytes y utiliza N = 8.

No se reutiliza N como parámetro LZ77 porque tamaño de símbolo y ventana/match son conceptos diferentes.

## Limitación importante

LZ77 + Huffman tampoco garantiza reducir todos los archivos.

PNG, JPEG, ZIP y otros formatos ya comprimidos pueden no tener redundancia aprovechable para esta implementación.

Eso no se considera un fallo del codec: es la razón por la que el proyecto necesita un selector automático que compare resultados reales.

## Validación

La fase comprueba:

- round-trip de LZ77;
- matches solapados;
- datos poco repetitivos;
- referencias corruptas;
- contenedor `codecId = 3`;
- SHA-256;
- rechazo de N distinto de 8;
- un corpus repetitivo donde LZ77 + Huffman supera al Huffman baseline.
