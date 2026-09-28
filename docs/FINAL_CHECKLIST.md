# Checklist final

## Correctitud

- [ ] `pnpm test` termina sin errores.
- [ ] `pnpm build` termina sin errores.
- [ ] `git diff --check` no reporta whitespace inválido.
- [ ] RAW puede crear y recuperar un `.bitlab`.
- [ ] Huffman puede crear y recuperar un `.bitlab`.
- [ ] SHA-256 coincide después de una recuperación correcta.
- [ ] Un digest alterado se reporta como discrepancia.

## Tamaños de palabra

- [ ] Se prueban tamaños múltiplos y no múltiplos de 8.
- [ ] Se prueba el límite de 2048 bits.
- [ ] El padding se elimina correctamente al reconstruir.
- [ ] El comparador usa exactamente el mismo archivo para todos los valores de `N`.

## Métricas

- [ ] Entropía se expresa en bit/símbolo.
- [ ] Redundancia `N - H(X)` no se presenta como compresión real.
- [ ] Longitud media se distingue de entropía.
- [ ] Payload se distingue del tamaño completo `.bitlab`.
- [ ] El costo de codebook y metadata permanece visible.

## Formatos

- [ ] `.bitlab` se valida por estructura y no por extensión.
- [ ] Los ejemplos BMP, PNG, JPEG, PDF y ZIP son formatos binarios válidos.
- [ ] La UI no afirma que un tipo de archivo comprime bien o mal solo por su extensión.

## Integridad

- [ ] La documentación explica qué verifica SHA-256.
- [ ] No se presenta SHA-256 como certificación de seguridad, autenticidad o ausencia de malware.
- [ ] Se mantiene compatibilidad con contenedores anteriores sin digest almacenado.

## UX y rendimiento

- [ ] Las operaciones pesadas no bloquean deliberadamente el hilo principal.
- [ ] Progreso y cancelación funcionan en las operaciones que usan Worker.
- [ ] La documentación reconoce que el archivo completo se materializa en memoria.
- [ ] Las fuentes reproducibles generan siempre los mismos bytes.

## Documentación

- [ ] README describe las funcionalidades actuales.
- [ ] No quedan documentos históricos con nombres `PHASE_*`.
- [ ] No queda el roadmap interno en la entrega.
- [ ] La guía de sustentación coincide con la implementación.
- [ ] No se usan afirmaciones como “100% seguro” o “compresión garantizada”.

## Despliegue

- [ ] La versión desplegada corresponde al commit que se entrega.
- [ ] La página carga sin errores de consola relevantes.
- [ ] La codificación y recuperación se prueban en producción.
- [ ] Las demostraciones y el comparador funcionan en producción.
