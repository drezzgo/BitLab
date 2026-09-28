# Fase 2B — Auditoría visual con Blendy

## Propósito

La aplicación ya calculaba correctamente bits, palabras y padding. Esta iteración hace que esos
resultados sean auditables desde la UI sin convertir la página en un documento largo.

Cada resultado se presenta como una tarjeta compacta. Al abrirla, Blendy transforma visualmente
la tarjeta en un diálogo con:

- fórmula;
- sustitución usando el archivo actual;
- explicación breve;
- cuando aplica, una forma externa de comprobar el dato.

## Qué se explica

1. Tamaño original en bytes (`File.size`).
2. Bits originales (`bytes × 8`).
3. Palabras (`ceil(bits / N)`).
4. Padding (`palabras × N - bits`).
5. En `/codificar`, después de generar el contenedor, composición exacta del tamaño `.bitlab` RAW.

## Nota sobre editores de texto

Un `.bitlab` es binario. El contador de caracteres de un editor de texto no equivale a:

- bytes del archivo;
- palabras lógicas de BitLab;
- símbolos de N bits.

Para comparar tamaños se debe consultar el tamaño en bytes del archivo.

## Blendy

Se usa la librería `blendy` únicamente para la transición entre la tarjeta compacta y el diálogo
expandido. La lógica matemática sigue estando en el core TypeScript; Blendy no participa en los
cálculos.
