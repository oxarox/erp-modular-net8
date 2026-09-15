# ADR-0006 — Migraciones SQL versionadas, aplicadas como paso explícito

- **Estado:** aceptada
- **Ámbito:** base de datos y despliegue

## Contexto

EF Core puede generar y aplicar migraciones solo. Es cómodo mientras el proyecto es pequeño.
Deja de serlo cuando hay que revisar exactamente qué se va a ejecutar en una base con datos de
clientes, cuando la aplicación corre en varias réplicas que arrancan a la vez, o cuando el
cambio necesita un `UPDATE` de datos que ningún generador va a inventar.

## Decisión

- Las migraciones son **archivos SQL versionados** en
  `ERP.Infraestructura/Persistencia/Migraciones/`, con nombre `AAAAMMDD_NNN_descripcion.sql`.
- Cada archivo es **idempotente** (`IF NOT EXISTS`) y **transaccional** (`SET XACT_ABORT ON`
  más `BEGIN/COMMIT TRANSACTION`): o se aplica completo, o no se aplica nada.
- Cada archivo registra su propia ejecución en `dbo.migraciones_aplicadas`.
- **La aplicación nunca migra al arrancar.** Se aplican con un pipeline manual y auditable
  ([`pipelines/migraciones-bd.yml`](../../pipelines/migraciones-bd.yml)).

## Consecuencias

**A favor**

- El SQL que se va a ejecutar en producción es exactamente el que se revisó en el pull request.
- Se pueden expresar cambios que un generador no cubre: rellenar una columna nueva a partir de
  datos existentes, renombrar respetando índices, migrar en dos pasos para no bloquear.
- Tres réplicas arrancando simultáneamente no compiten por migrar la misma base.

**Costo asumido**

- Hay que escribir el SQL a mano y mantenerlo sincronizado con las configuraciones de EF Core.
  Es trabajo real y es donde se cometen errores si nadie revisa.
- No existe `Update-Database` mágico en desarrollo: hay que correr los scripts.

## Alternativas descartadas

- **`context.Database.Migrate()` en el arranque.** Cómodo en desarrollo, peligroso en
  producción: nadie revisa lo que se ejecuta y varias réplicas pueden pisarse.
- **EF Core migrations generando SQL para revisión.** Mejor que lo anterior, pero el SQL
  generado es difícil de leer en un pull request y sigue sin resolver las migraciones de datos.
