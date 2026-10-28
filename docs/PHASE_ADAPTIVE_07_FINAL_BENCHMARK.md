# Benchmark final de BitLab

## Propósito

La etapa final no añade otro algoritmo de compresión.

Su objetivo es responder con evidencia:

```text
¿cuánto mejoró BitLab y en qué tipos de archivo?
```

## Flujo

La tarjeta `Benchmark` permite seleccionar hasta 20 archivos.

Cada archivo se procesa de forma secuencial:

```text
archivo
  ↓
Auto Optimizer
  ↓
11 combinaciones
  ↓
menor .bitlab
  ↓
fila del benchmark
```

No se conservan todos los contenedores del corpus en memoria.

## Datos registrados por archivo

- nombre;
- MIME;
- tamaño original;
- tamaño `.bitlab`;
- reducción o expansión;
- codec ganador;
- parámetros ganadores;
- número de candidatos evaluados;
- tiempo de optimización.

## Resumen

BitLab calcula para el corpus:

- bytes originales acumulados;
- bytes `.bitlab` acumulados;
- variación global;
- cantidad de archivos que realmente redujeron;
- cantidad que no redujeron;
- tiempo acumulado;
- número de victorias por codec.

## Exportación

Los resultados pueden descargarse como:

```text
bitlab-benchmark.csv
bitlab-benchmark.json
```

El CSV está orientado al análisis en hoja de cálculo.

El JSON conserva el resumen y las filas con mayor estructura.

## Cómo interpretar una imagen que aumenta

Una imagen PNG/JPEG puede producir:

```text
original < menor .bitlab
```

Eso no contradice el optimizador.

Significa que ninguna de las estrategias disponibles logró compensar:

- la compresión interna que ya posee el formato;
- el header BitLab;
- metadata;
- SHA-256;
- codebook si aplica.

En ese caso debe reportarse como `no redujo`.

## Tiempo

El tiempo medido corresponde al trabajo del Web Worker desde el inicio de la
optimización hasta su respuesta.

Incluye:

- SHA-256;
- ejecución de los 11 candidatos;
- construcción del contenedor ganador.

El tiempo depende del navegador, CPU y memoria del equipo.

Por eso un informe académico debe registrar también el entorno donde se hizo el benchmark.

## Corpus recomendado

Como mínimo:

- texto altamente repetitivo;
- JSON estructurado;
- LOG con bloques repetidos;
- datos pseudoaleatorios;
- PNG;
- JPEG;
- PDF;
- ZIP.

## Criterios finales

BitLab no afirma ser el compresor universal óptimo.

La afirmación defendible es:

> BitLab explora un conjunto reproducible de codecs y parámetros, conserva el menor contenedor BitLab reversible encontrado y permite medir en qué fuentes esa búsqueda produce una reducción real.
