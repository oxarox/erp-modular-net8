# ADR-0007 — Baja lógica en todo el sistema

- **Estado:** aceptada
- **Ámbito:** modelo de datos

## Contexto

En un ERP casi nada es realmente borrable. Una marca que se deja de vender sigue apareciendo en
ventas de hace dos años; borrarla deja documentos históricos ilegibles o, peor, rompe la
integridad referencial en mitad de un reporte.

## Decisión

- Ninguna entidad de negocio se borra físicamente. Las que pueden darse de baja implementan
  `IEntidadActivable` y tienen una columna `Activo`.
- La operación se expone como `PATCH /api/{recurso}/{id}/desactivar`, no como `DELETE`: el
  verbo describe lo que realmente ocurre.
- Las claves foráneas usan `ON DELETE NO ACTION`. La única excepción es el detalle de un
  documento respecto de su cabecera (`ventas_detalle` → `ventas`), donde la cascada sí
  corresponde porque la línea no tiene existencia propia.
- Desactivar una entidad ya inactiva devuelve 409, no un éxito silencioso: el cliente pidió un
  cambio de estado que no ocurrió.

## Consecuencias

**A favor**

- El histórico siempre es legible.
- Una baja es reversible; un `DELETE` no.

**Costo asumido**

- **Toda consulta de catálogo debe decidir explícitamente si filtra por `Activo`.** Olvidarlo
  hace que aparezcan registros dados de baja en un desplegable. Por eso los repositorios
  exponen el parámetro `soloActivas` en lugar de decidir por su cuenta.
- Las claves únicas incluyen registros inactivos: no se puede crear una marca con el nombre de
  una desactivada sin reactivar la anterior. Es deliberado, y evita duplicados encubiertos.

## Alternativas descartadas

- **Borrado físico con tabla de auditoría.** Preserva el rastro, pero rompe las referencias de
  los documentos históricos.
- **Archivado a tablas espejo.** Duplica el esquema y complica cada consulta que necesite mirar
  atrás.
