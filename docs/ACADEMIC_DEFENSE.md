# Guía de sustentación académica

Esta guía resume los conceptos que deben poder explicarse y relacionarse con la implementación de BitLab.

## 1. ¿Qué representa un archivo para BitLab?

El motor recibe bytes. Un archivo de imagen, texto, PDF o ZIP termina siendo una secuencia binaria.

La extensión y el MIME ayudan a presentar el archivo y se conservan como metadata, pero no cambian la forma en que el motor segmenta y analiza los bits.

## 2. ¿Qué es el tamaño de palabra?

`N` define cuántos bits forman un símbolo lógico.

Con `N = 8` cada símbolo ocupa un byte. Con `N = 13`, `N = 64` o `N = 2048` los límites de símbolo ya no tienen por qué coincidir con límites de byte.

Cambiar `N` cambia el alfabeto observado. Por eso las frecuencias y probabilidades deben calcularse otra vez.

## 3. Segmentación no es compresión

Segmentar significa decidir cómo se agrupan los bits en símbolos.

No se reduce información por el hecho de pasar de bytes a palabras de `N` bits. La codificación de fuente aparece después, cuando se aprovechan las probabilidades de los símbolos.

## 4. Entropía

Para probabilidades `p(x_i)`:

```text
H(X) = -Σ p(x_i) log2 p(x_i)
```

`H(X)` se expresa en bit/símbolo y representa la información promedio de la fuente bajo el modelo observado.

BitLab también muestra:

```text
N - H(X)
```

como redundancia estadística respecto a una representación fija de `N` bits por símbolo.

No debe confundirse con el porcentaje de reducción real de un archivo.

## 5. Huffman

Huffman construye un código prefijo: ningún código válido es prefijo de otro. Esto permite decodificar la concatenación de códigos sin separadores.

BitLab usa Huffman canónico. En lugar de almacenar el árbol completo, conserva información suficiente para reconstruir el mismo conjunto de códigos a partir de sus longitudes.

Los símbolos frecuentes tienden a recibir códigos más cortos y los menos frecuentes códigos más largos.

## 6. Longitud media y eficiencia

La longitud media es:

```text
L̄ = Σ p(x_i) · l_i
```

donde `l_i` es la longitud del código asignado al símbolo.

La eficiencia mostrada es:

```text
η = H(X) / L̄
```

La diferencia:

```text
L̄ - H(X)
```

permite observar cuánto se separa la longitud media del valor de entropía en ese experimento.

## 7. Payload no es lo mismo que archivo final

BitLab distingue:

- representación fija de los símbolos;
- bits emitidos por Huffman;
- bytes del payload;
- metadata del codebook;
- metadata de integridad;
- header y metadata general;
- tamaño completo `.bitlab`.

Puede ocurrir:

```text
payload Huffman < representación fija
```

pero al mismo tiempo:

```text
.bitlab > archivo original
```

porque el contenedor necesita información adicional para ser interpretable y reversible.

## 8. ¿Qué es `.bitlab`?

No es un archivo renombrado. El parser exige una estructura binaria propia.

La firma principal es:

```text
BTLB
```

El contenedor almacena versión, codec, tamaño de palabra, padding, tamaño original, nombre, MIME, metadata y payload.

RAW usa `codecId = 0` y Huffman usa `codecId = 1`.

## 9. ¿Para qué sirve RAW?

RAW es el caso de control.

No intenta comprimir: conserva los bytes originales dentro del formato BitLab. Permite comprobar el costo estructural del contenedor y validar la reconstrucción independientemente de Huffman.

## 10. Integridad SHA-256

Los contenedores actuales pueden incluir una envoltura de metadata identificada como:

```text
BIMD
```

que guarda el SHA-256 del archivo original.

Al recuperar:

1. BitLab reconstruye los bytes.
2. Calcula SHA-256 sobre los bytes restaurados.
3. Compara el digest con el almacenado.

Una coincidencia no demuestra autoría, legitimidad ni ausencia de malware. Demuestra que el digest calculado coincide con el valor almacenado.

## 11. ¿Por qué Web Workers?

Análisis, Huffman y restauración pueden recorrer grandes cantidades de datos. Ejecutarlos en el hilo principal puede congelar la interfaz.

El Worker separa ese cálculo de React y permite mostrar progreso o cancelar la operación.

El archivo todavía se carga completo mediante `File.arrayBuffer()`, por lo que Worker no significa procesamiento ilimitado ni streaming.

## 12. Comparador de tamaño de palabra

Para el mismo archivo se repite el experimento usando varios valores de `N`.

Cambiar `N` puede:

- reducir la cantidad total de símbolos;
- aumentar o reducir el número de símbolos distintos;
- modificar la distribución;
- cambiar el codebook;
- modificar payload, metadata y tiempo de procesamiento.

BitLab puede resaltar el menor contenedor entre los casos ejecutados, pero eso no demuestra que sea el mejor `N` posible entre todos los enteros de 2 a 2048.

## 13. Fuentes reproducibles

Las demostraciones usan siempre los mismos bytes para que dos ejecuciones sean comparables.

Los casos incluyen texto repetitivo, texto variado, JSON, datos pseudoaleatorios y formatos válidos BMP, PNG, JPEG, PDF y ZIP.

Los resultados no se deciden por la extensión. Las hipótesis se contrastan con las métricas calculadas.

## Preguntas que conviene poder responder

### ¿Por qué no usaron `Number` para una palabra de 2048 bits?

Porque JavaScript `Number` no puede representar exactamente enteros arbitrarios de ese tamaño. El flujo principal se conserva como bytes y operaciones de bits.

### ¿Por qué un archivo ya comprimido puede crecer?

Porque puede conservar poca redundancia adicional y, además, `.bitlab` necesita header, metadata, codebook e integridad.

### ¿Por qué no basta con cambiar la extensión a `.bitlab`?

Porque un formato real depende de su estructura interna. El parser valida firma, versión, longitudes, codec y metadata.

### ¿SHA-256 garantiza que el archivo es seguro?

No. Se usa para comprobar coincidencia del digest del archivo reconstruido con el valor almacenado.

### ¿Por qué no existe un tamaño de palabra óptimo universal?

Porque cada `N` redefine los símbolos y, por tanto, cambia la distribución estadística y el costo de representar el codebook.

### ¿Qué limitación técnica importante conserva BitLab?

El archivo completo y el resultado se materializan en memoria. Web Workers evitan bloquear la UI, pero no convierten el proceso en streaming.
