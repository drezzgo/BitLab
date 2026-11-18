# Evolución de BitLab y simulación de redes

## Compresión adaptativa

BitLab comenzó con codificación Huffman sobre palabras lógicas. La implementación actual incorpora un registro de codecs y evalúa RAW, Huffman, RLE + Huffman y LZ77 + Huffman. El modo automático prueba combinaciones acotadas de codecs y parámetros, mide el tamaño **completo** de cada contenedor `.bitlab` y conserva el menor de los candidatos evaluados. La recuperación es reversible y puede verificar SHA-256.

El flujo de desarrollo que antes estaba dividido en siete documentos de fase se resume así:

1. Se reorganizó la interfaz alrededor de cargar, comprimir, inspeccionar y descargar.
2. Se creó el registro de codecs con una interfaz común para codificar y recuperar.
3. RLE + Huffman añadió una opción para secuencias de bytes iguales.
4. LZ77 + Huffman añadió referencias a secuencias anteriores.
5. El optimizador empezó a comparar los contenedores completos.
6. La búsqueda automática incorporó parámetros de Huffman y LZ77 dentro de un espacio limitado.
7. El benchmark incorporó un corpus reproducible y exportación de resultados.

Los detalles vigentes del contenedor, de las métricas y de la validación están en los documentos temáticos de `docs/`. Los antiguos scripts de aplicación y parches de fase eran material de migración; el código actual ya contiene esos cambios.

## Selector inspirado en IA

El apartado «Selector inspirado en IA» es una **simulación didáctica de un árbol de decisión**, no un modelo entrenado ni un servicio de IA. Lee hasta 64 KiB del archivo cargado, calcula entropía por byte y porcentaje de bytes consecutivos iguales, y sugiere RAW, Huffman, RLE + Huffman o LZ77 + Huffman. Sus umbrales son reglas explicables y pueden equivocarse. La selección automática efectiva sigue comparando los tamaños medidos de los contenedores, incluida su metadata. La descompresión usa el codec indicado en el contenedor y no requiere inferencia.

## Simulador 5G y 6G

El laboratorio usa el archivo que el usuario carga en el compresor. Tras comprimir, compara el tamaño original con el tamaño real del `.bitlab`. Para cada perfil editable calcula:

```text
velocidad_efectiva = velocidad_configurada × eficiencia / 100
tiempo_transmisión_ms = bytes × 8 / (velocidad_efectiva_Mb/s × 1 000 000) × 1 000
tiempo_total_ms = latencia_ms + tiempo_transmisión_ms
ahorro_ms = tiempo_original_ms − tiempo_bitlab_ms
```

Los valores iniciales (5G: 100 Mb/s y 20 ms; 6G: 1000 Mb/s y 5 ms) son **escenarios de laboratorio ilustrativos**. El perfil 6G es hipotético. Se puede ajustar velocidad, latencia y eficiencia. La simulación no establece una conexión ni envía bytes a ninguna red. No modela cobertura, congestión, retransmisiones, protocolos ni tiempo de compresión. Por eso sus resultados sirven para comparar el efecto del tamaño del archivo bajo supuestos controlados, no para predecir el desempeño de una red real.
