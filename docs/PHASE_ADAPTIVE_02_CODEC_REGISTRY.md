# Fase 2 — Registry multi-codec

## Objetivo

Separar la selección del algoritmo de la lógica del Worker y de la restauración.

Antes de esta fase, BitLab tenía decisiones explícitas:

```text
if codec === huffman
  usar Huffman
else
  usar RAW
```

y al restaurar:

```text
if codecId === RAW
  restaurar RAW
if codecId === HUFFMAN
  restaurar Huffman
```

Esto funciona con dos codecs, pero escala mal cuando se añaden nuevas estrategias.

## Registry

Ahora cada codec registrado declara:

```text
key
codecId
label
description
progressLabel
encode()
restore()
```

El Worker solo solicita el codec por `key` y ejecuta su contrato.

La recuperación lee `codecId` del contenedor, consulta el registry y delega en el restaurador correspondiente.

## Codecs actuales

```text
raw      → codecId 0
huffman  → codecId 1
```

No se han añadido codecs nuevos en esta fase.

## Por qué importa

La siguiente fase podrá registrar `RLE + Huffman` sin añadir nuevas ramas de selección al Worker.

El cambio esperado será conceptualmente:

```text
registry = [
  RAW,
  Huffman,
  RLE + Huffman,
  LZ77 + Huffman,
]
```

El futuro Auto Optimizer podrá iterar sobre candidatos registrados y comparar resultados mediante una interfaz común.

## Compatibilidad

- `.bitlab` continúa en versión 1.
- RAW conserva `codecId = 0`.
- Huffman conserva `codecId = 1`.
- Los archivos existentes siguen siendo interpretados de la misma manera.
- No cambian los payloads ni la metadata de los codecs actuales.

## Validación

Los tests comprueban:

- keys e IDs registrados;
- round-trip RAW por registry;
- round-trip Huffman por registry;
- conservación de nombres y MIME;
- métricas Huffman;
- ausencia de métricas específicas en RAW.
