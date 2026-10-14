# Tamaños de palabra extendidos en `.bitlab` v1

## Alcance

BitLab mantiene el formato `.bitlab` en **versión 1** y amplía el tamaño de palabra desde el límite histórico de 2.048 bits hasta el máximo que ya puede representar el header existente:

```text
2 <= N <= 65.535 bits
```

No se introduce una versión 2.

## Por qué 65.535 es el límite

El header v1 almacena:

```text
wordSizeBits : uint16
paddingBits  : uint16
```

Un entero sin signo de 16 bits admite valores entre `0` y `65.535`.

Para una palabra de tamaño `N`, el padding máximo es `N - 1`. Con `N = 65.535`, el padding máximo es `65.534`, que también cabe en `uint16`.

Por tanto, `65.535` es el límite exacto compatible con el formato actual. `65.536` requeriría modificar la estructura binaria y ya no pertenece al alcance acordado.

## Reto de duplicación

A partir del límite anterior de 2.048 bits:

```text
2.048
4.096
8.192
16.384
32.768
```

`65.536` no es representable en v1, de modo que `32.768` es el último valor obtenido duplicando sucesivamente.

## Optimizaciones

### Lectura por bytes

`BitReader.readBits()` ya no necesita recorrer individualmente cada bit de una palabra grande. Construye la salida por bytes y usa copia directa cuando la posición está alineada.

### Escritura por bytes

`BitWriter.writeBits()` procesa bloques completos de ocho bits y solo usa operaciones individuales para el fragmento final.

### Reconstrucción alineada

Cuando `N` es múltiplo de ocho, la reconstrucción utiliza copias de bloques de bytes. Esto beneficia directamente a 2.048, 4.096, 8.192, 16.384 y 32.768.

### Identidad de símbolos

Antes, Huffman y la estadística convertían cada símbolo completo a hexadecimal para usarlo como clave. Eso necesitaba dos caracteres por byte.

Ahora se usa una clave binaria exacta de un carácter por byte. No se usa un hash probabilístico: dos secuencias de bytes diferentes siguen produciendo claves diferentes, por lo que no se introducen colisiones.

La representación hexadecimal abreviada se conserva únicamente para mostrar símbolos al usuario.

## Qué se mide

Para estudiar el efecto de aumentar `N`, el comparador muestra:

- total de símbolos;
- símbolos distintos;
- entropía;
- longitud media Huffman;
- payload;
- tamaño del codebook;
- metadata total;
- tamaño final `.bitlab`;
- tiempo observado.

Esto permite distinguir el beneficio de reducir el número de símbolos del costo de almacenar símbolos mucho más grandes dentro del codebook.

## Caso de un solo símbolo

Si `N` es mayor o comparable con el tamaño del archivo, la segmentación puede producir un único símbolo.

En ese caso:

```text
H(X) = 0
```

porque la distribución observada contiene un solo resultado con probabilidad 1.

El resultado es matemáticamente válido, pero no debe presentarse como evidencia de que un `N` enorme sea mejor. El contenedor todavía debe almacenar el símbolo en el codebook y la muestra estadística deja de ser útil para una comparación rica.
