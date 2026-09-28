# Integridad del archivo recuperado

Los contenedores nuevos guardan el digest SHA-256 del archivo original dentro de una envoltura
de metadata. El digest ocupa 32 bytes.

La envoltura utiliza una firma interna `BIMD` para distinguirla de metadata antigua.

Estructura lógica:

```text
BIMD
versión
algoritmo
longitud del digest
longitud de metadata del codec
SHA-256 original
metadata propia del codec
```

El contenedor principal continúa usando la firma `BTLB`.

Al recuperar un archivo:

1. se interpreta el contenedor;
2. se decodifica RAW o Huffman;
3. se calcula SHA-256 sobre los bytes restaurados;
4. se compara con el digest guardado.

Una coincidencia demuestra que ambos conjuntos de bytes producen el mismo SHA-256. No debe
presentarse como una certificación de seguridad, autenticidad del autor ni ausencia de malware.

La envoltura es compatible con contenedores anteriores: si `BIMD` no está presente, la metadata
se interpreta como metadata legacy del codec y la UI reporta que la verificación SHA-256 no está
disponible.
