# Auditoría UI/UX de BitLab — 18 de noviembre de 2026

## Alcance y resultado

Se revisó el recorrido de cargar archivo, comprimir, interpretar el resultado, simular el envío 5G/6G y abrir las herramientas académicas. Se conservó la identidad visual actual.

| Dimensión | Puntuación | Evidencia y límite |
| --- | ---: | --- |
| Accesibilidad | 3/4 | Controles etiquetados y estados visibles; los diálogos retienen el foco y permiten Escape. Falta una prueba con lector de pantalla real. |
| Rendimiento | 3/4 | El motor pesado permanece en Worker y la página evita mostrar de entrada once candidatos. No se perfiló un dispositivo físico de gama baja. |
| Tema visual | 3/4 | Las nuevas secciones usan las variables de color existentes. Persisten algunos colores directos en CSS heredado. |
| Adaptación | 3/4 | Vista móvil emulada a 390 px sin desbordamiento del documento; navegación horizontal accesible. No se probó un dispositivo táctil físico. |
| Integridad del diseño | 3/4 | El orden de navegación coincide con el del contenido y la simulación distingue datos calculados de supuestos hipotéticos. |
| **Total** | **15/20** | **Bueno, con validación física pendiente.** |

## Hallazgos y correcciones

| Prioridad | Hallazgo | Impacto | Corrección |
| --- | --- | --- | --- |
| P1 | Los enlaces de secciones desaparecían en móvil. | Análisis, benchmark, mejoras y formato quedaban difíciles de encontrar. | El menú permanece visible como fila desplazable de enlaces táctiles. |
| P1 | Los diálogos no retenían el foco ni lo devolvían al botón que los abrió. | La navegación con teclado podía escapar del diálogo o perder su posición al cerrarlo. | Se añadió una gestión compartida de foco, Tab y Escape para los diálogos del proyecto. |
| P2 | El simulador antecedía al resultado de compresión. | El resultado y la descarga quedaban lejos de la acción principal. | El resultado aparece primero, seguido de la explicación del optimizador y la comparación de envío. |
| P2 | El simulador mostraba todos sus controles aunque no hubiera archivo. | El estado inicial era largo y repetitivo. | Se sustituyó por una invitación compacta a cargar o elegir un ejemplo. |
| P2 | El optimizador mostraba once candidatos y dos tarjetas históricas en el flujo principal. | Las herramientas restantes quedaban demasiado abajo, especialmente en móvil. | Se conservó el resumen ganador y se dejó la lista completa en un desplegable. |
| P2 | El menú y el contenido seguían órdenes distintos. | Los enlaces no anticipaban el recorrido de la página. | Ambos siguen compresor → 5G/6G → análisis → benchmark → mejoras → formato. |
| P2 | Los enlaces a simulación y análisis no tenían destino en el modo de recuperación. | Un enlace del encabezado podía no hacer nada. | Al seguirlo se activa el modo de compresión y se conserva el ancla elegida. |
| P2 | El simulador usaba un nivel de título paralelo al del compresor. | La jerarquía semántica resultaba confusa. | Se ajustaron los niveles de títulos del laboratorio y sus subsecciones. |

## Verificación

- Se inspeccionaron las vistas renderizadas de escritorio (1280 px) y móvil (390 px) en Edge.
- En móvil se comprobó `documentWidth = viewport = 390 px`, la visibilidad del menú y el orden de anclas.
- Se cargó el ejemplo de texto, se ejecutó la compresión automática y se confirmó que el resultado precede al simulador y que este calcula el ahorro con el tamaño real del `.bitlab`.
- Se abrió un diálogo desde teclado, se comprobó el foco interno y se verificó que Escape lo cierra y devuelve el foco al botón de origen.
- Desde recuperación se abrió el enlace 5G/6G y se verificó el cambio a compresión, el ancla y la URL.
- `pnpm.cmd exec tsc --noEmit`, pruebas y compilación forman parte del cierre técnico.

La revisión no constituye una certificación WCAG ni una medición de redes 5G o 6G reales.
