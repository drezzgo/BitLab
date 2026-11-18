# Control de errores en BitLab

Abre **Control de errores** en la página principal. Elige texto UTF-8, el archivo original cargado o el contenedor `.bitlab` producido por el compresor. El campo de texto admite hasta 8.192 unidades UTF-16. La simulación usa la entrada completa y admite archivos de hasta 1 MiB. Si todos los bytes del contenedor recibido coinciden, el panel permite abrirlo en el recuperador existente y verificar el archivo original.

## Algoritmos disponibles

| Algoritmo | Trama del laboratorio | Comportamiento del receptor |
| --- | --- | --- |
| Paridad par | Hasta 32 bytes y un bit de paridad | Detecta una cantidad impar de inversiones. Una cantidad par pasa la comprobación. |
| CRC-16/XMODEM | Hasta 32 bytes y 16 bits de CRC | Comprueba el resto con el polinomio `x¹⁶ + x¹² + x⁵ + 1`. Detecta errores sin corregirlos. |
| Hamming (7,4) | Cuatro bits de datos y tres de comprobación | Usa el síndrome para corregir un bit. Si cambian dos bits, identifica un síndrome distinto de cero pero lo interpreta como un error simple y aplica una corrección equivocada. Algunos patrones de tres o más inversiones tienen síndrome cero. |

Cada trama pasa por un canal binario simétrico. Se invierte cada bit, incluso los de redundancia, con probabilidad independiente `p`. La semilla reproduce la secuencia de inversiones cuando se mantienen los demás parámetros. El modelo no incluye modulación, ráfagas de ruido ni retransmisiones.

## Lectura de resultados

| Métrica | Cálculo |
| --- | --- |
| BER y FER del canal | Bits invertidos sobre bits codificados enviados. Tramas con alguna inversión sobre tramas enviadas. |
| BER y FER residuales | Bits de datos recuperados distintos sobre bits de datos originales. Tramas con algún bit de datos distinto sobre tramas enviadas. |
| Tasa de código | Bits de datos originales sobre bits codificados enviados. |
| Redundancia | Diferencia entre bits enviados y bits originales. Se muestra también como fracción de los bits enviados. |
| Detecciones y correcciones | Se cuentan tramas con comprobación fallida, con inversiones no detectadas, con una corrección Hamming verificada o con una corrección Hamming equivocada. |

El receptor se basa solo en los bits recibidos. El simulador conserva el original para comparar y reconocer inversiones no detectadas. Una trama señalada puede tener todos sus datos correctos si los errores afectaron solo a la redundancia. Para medir la BER y la FER residuales, se comparan los datos de todas las tramas, incluidas las señaladas.

## Demostración reproducible

1. Elige **Texto UTF-8**, escribe `Z` y selecciona **Hamming (7,4)**. Con probabilidad **10 %** y semilla **1**, BitLab muestra **1 bit invertido de 14**, **1 trama corregida de 2** y **BER residual de 0 %**.
2. Mantén el texto y la probabilidad, y cambia la semilla a **3**. Uno de los bloques sufre dos inversiones y el receptor aplica una corrección equivocada. Abre la primera trama en **Comparación bit a bit**.
3. Comprime un archivo pequeño, selecciona **Contenedor .bitlab** y simula con **0 %**. Usa **Abrir .bitlab recibido en recuperación** para entregarlo al recuperador y verifica SHA-256.

## Relación con 5G y 6G

- **5G NR.** 3GPP TS 38.212 Release 19 describe, entre otros mecanismos, CRC, LDPC para UL-SCH y DL-SCH y Polar para BCH, DCI y determinados casos de UCI. El CRC-16 del laboratorio comparte su polinomio con la especificación. Las tramas y las tasas aquí pertenecen al experimento. Una implementación NR comprobable de LDPC y Polar requiere las cadenas de segmentación, codificación y ajuste de tasa correspondientes y vectores de referencia. BitLab los presenta como contexto técnico. [ETSI TS 138 212 V19.2.0, secciones 5.1 y 5.3](https://www.etsi.org/deliver/etsi_ts/138200_138299/138212/19.02.00_60/ts_138212v190200p.pdf)
- **6G.** ITU-R M.2160 es el marco de objetivos para IMT-2030. Las propuestas de interfaz de radio siguen su propio proceso de evaluación. En paralelo, el grupo RAN1 de 3GPP informó avances en el estudio de codificación de enlace ascendente, incluida una tercera gráfica base (BG3). Ese trabajo corresponde al estudio de radio de Release 20. [ITU-R M.2160](https://www.itu.int/rec/R-REC-M.2160-0-202311-I) · [Proceso de evaluación IMT-2030](https://www.itu.int/en/ITU-R/study-groups/rsg5/rwp5d/IMT-2030/Pages/submission-eval.aspx) · [Informe RAN #113 de 3GPP](https://www.3gpp.org/news-events/3gpp-news/ran113-reports)
