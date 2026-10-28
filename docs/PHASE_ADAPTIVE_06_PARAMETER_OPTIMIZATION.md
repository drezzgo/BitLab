# Optimización de parámetros

BitLab ya no compara únicamente algoritmos.

Ahora la pregunta es:

```text
¿Qué codec + qué configuración produce el menor .bitlab?
```

## Espacio de búsqueda

La búsqueda está limitada deliberadamente a 11 candidatos.

### RAW

```text
N = 8
```

### Huffman

```text
N = 4
N = 8
N = 12
N = 16
```

### RLE + Huffman

```text
N = 8
```

### LZ77 + Huffman

Se prueban cinco perfiles:

```text
ventana 4 KiB   · match >= 4 · búsqueda 24
ventana 16 KiB  · match >= 4 · búsqueda 48
ventana 32 KiB  · match >= 4 · búsqueda 64
ventana 32 KiB  · match >= 5 · búsqueda 64
ventana 64 KiB  · match >= 4 · búsqueda 96
```

## Qué significa cada parámetro LZ77

### Ventana

Define cuánto puede mirar hacia atrás el encoder para buscar una secuencia ya vista.

Una ventana mayor puede encontrar repeticiones más lejanas, pero amplía el espacio de búsqueda.

### Match mínimo

Define desde cuántos bytes iguales vale la pena emitir una referencia.

El formato binario de LZ77 sigue pudiendo representar matches desde 4 bytes.
El parámetro solo cambia la decisión del encoder.

Por eso no es necesario cambiar el decoder ni almacenar este parámetro en `.bitlab`.

### Profundidad de búsqueda

El hash de LZ77 puede apuntar a muchas posiciones previas.

`maxChain` limita cuántos candidatos se inspeccionan antes de aceptar el mejor encontrado.

Más profundidad puede mejorar la coincidencia, pero consume más CPU.

## Compatibilidad del formato

No se creó una nueva versión de `.bitlab`.

Los parámetros anteriores son decisiones del encoder.

El flujo final ya contiene:

```text
literal
o
distancia + longitud
```

y eso es suficiente para reconstruirlo.

El decoder acepta distancias de hasta 65.535 bytes porque la distancia se almacena como `uint16`.

## Por qué no probar miles de configuraciones

El objetivo es optimizar sin convertir la aplicación web en una búsqueda de fuerza bruta.

Con 11 candidatos podemos:

- demostrar búsqueda de parámetros;
- comparar trade-offs;
- mantener tiempos razonables;
- conservar un experimento reproducible.

Si el benchmark final demuestra que una región del espacio de parámetros merece más detalle, se puede refinar después.

## Criterio de ganador

Cada candidato produce un contenedor completo.

Se elige:

```text
min(bytes del .bitlab)
```

No:

```text
min(payload)
```

La metadata y el codebook también cuentan.

## Siguiente paso

Benchmark reproducible:

- TXT repetitivo;
- JSON estructurado;
- LOG;
- binario pseudoaleatorio;
- PNG;
- JPEG;
- PDF;
- ZIP;
- otros archivos reales.

El objetivo será determinar qué estrategias ganan según el tipo de redundancia y cuánto tiempo cuesta encontrarlas.
