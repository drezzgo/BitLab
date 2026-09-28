# Procesamiento en el navegador

La interfaz Astro/React no ejecuta directamente las operaciones intensivas de análisis, Huffman
y restauración. Estas operaciones se despachan a un Web Worker.

Flujo:

```text
React
  ↓
File.arrayBuffer()
  ↓ transferencia
Web Worker
  ├─ SHA-256
  ├─ estadística
  ├─ Huffman
  ├─ contenedor
  └─ restauración
  ↓
resultado
  ↓
React
```

Transferir el `ArrayBuffer` evita conservar una segunda copia innecesaria durante el cálculo.

El usuario puede cancelar una operación terminando el Worker.

## Límite actual

La aplicación sigue necesitando cargar el archivo completo en memoria mediante `File.arrayBuffer()`
y el contenedor de salida también se materializa en memoria para poder descargarlo desde el navegador.

Por tanto, mover el cálculo a un Worker mejora la capacidad de respuesta de la UI, pero no convierte
BitLab en un procesador ilimitado de archivos de varios gigabytes.

Un procesamiento verdaderamente streaming requeriría rediseñar el codec, la escritura del contenedor
y posiblemente utilizar APIs de almacenamiento que no son uniformes en todos los navegadores. Para el
alcance académico actual se prefiere mantener un flujo reproducible, portable y completamente local.
