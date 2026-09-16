# Migraciones

Scripts SQL versionados que definen el esquema. Se aplican **en orden alfabético**, que con la
convención de nombres es el orden cronológico.

| Archivo | Qué hace |
|---|---|
| `20260101_000_esquema_inicial.sql` | Esquema completo: seguridad, catálogo, inventario, ventas y bitácora |
| `20260101_001_datos_semilla.sql` | Dos empresas, rol administrador, usuarios de ejemplo y stock inicial |
| `20260102_002_permisos_catalogo.sql` | Suma `productos.ver` y `almacenes.ver` al rol administrador |

Cómo se escribe una migración nueva, la plantilla y las cuatro reglas que debe cumplir:
[`docs/BD/migraciones.md`](../../../docs/BD/migraciones.md).

**La aplicación no migra al arrancar.** El porqué está en
[ADR-0006](../../../docs/decisiones/ADR-0006-migraciones-sql-versionadas.md).
