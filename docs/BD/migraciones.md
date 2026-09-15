# Migraciones de base de datos

Decisión de fondo: [ADR-0006](../decisiones/ADR-0006-migraciones-sql-versionadas.md).

**La aplicación nunca migra al arrancar.** Las migraciones son un paso explícito, revisable y
auditable.

## Convención

Los archivos viven en
[`ERP.Infraestructura/Persistencia/Migraciones/`](../../ERP.Infraestructura/Persistencia/Migraciones/)
y se llaman:

```
AAAAMMDD_NNN_descripcion_en_snake_case.sql
```

| Parte | Significado |
|---|---|
| `AAAAMMDD` | Fecha de creación |
| `NNN` | Correlativo dentro del día, para ordenar sin ambigüedad |
| `descripcion` | Qué hace, en pocas palabras |

Se aplican **en orden alfabético**, que con este formato es el orden cronológico.

## Reglas

Toda migración cumple las cuatro:

1. **Idempotente.** Volver a correrla no hace daño: `IF NOT EXISTS`, `IF COL_LENGTH(...) IS NULL`.
   En algún momento alguien la va a correr dos veces.
2. **Transaccional.** `SET XACT_ABORT ON` más `BEGIN/COMMIT TRANSACTION`: o se aplica completa,
   o no se aplica nada. Una migración a medias es peor que una que falló.
3. **Registrada.** Deja su rastro en `dbo.migraciones_aplicadas`.
4. **Compatible hacia atrás cuando se pueda.** Entre aplicar la migración y desplegar el código
   hay una ventana en la que la versión vieja convive con el esquema nuevo.

## Plantilla

```sql
/* =============================================================================
   AAAAMMDD_NNN_descripcion.sql
   Qué cambia y por qué. Si hay migración de datos, qué criterio se usó.
   ============================================================================= */

SET XACT_ABORT ON;
SET NOCOUNT ON;

BEGIN TRANSACTION;

IF COL_LENGTH(N'dbo.productos', N'ColumnaNueva') IS NULL
BEGIN
    ALTER TABLE dbo.productos ADD ColumnaNueva NVARCHAR(64) NULL;
END;

/* Relleno de datos existentes: la columna nace NULL y se puebla aquí,
   no con un DEFAULT, para dejar explícito el criterio. */
UPDATE dbo.productos
SET ColumnaNueva = N'valor-por-defecto'
WHERE ColumnaNueva IS NULL;

IF NOT EXISTS (SELECT 1 FROM dbo.migraciones_aplicadas WHERE Archivo = N'AAAAMMDD_NNN_descripcion.sql')
BEGIN
    INSERT dbo.migraciones_aplicadas (Archivo) VALUES (N'AAAAMMDD_NNN_descripcion.sql');
END;

COMMIT TRANSACTION;
GO
```

## Cambios que necesitan dos pasos

Renombrar o eliminar una columna con la aplicación corriendo rompe la versión anterior del
código. Se hace en dos entregas:

| Entrega | Migración | Código |
|---|---|---|
| 1 | Agregar la columna nueva y copiar los datos | Escribe en ambas, lee de la nueva |
| 2 | Eliminar la columna vieja | Solo usa la nueva |

Es más lento y es la única forma de desplegar sin ventana de caída.

## Aplicar

**Local**

```bash
sqlcmd -S localhost,1433 -U sa -P 'ClaveLocal_Dev123' -C -d ErpModular \
  -i ERP.Infraestructura/Persistencia/Migraciones/20260101_000_esquema_inicial.sql -b
```

El `-b` hace que `sqlcmd` devuelva código de error distinto de cero si el script falla. Sin él,
un fallo pasa desapercibido en un pipeline.

**Ambientes superiores**

Por el pipeline [`pipelines/migraciones-bd.yml`](../../pipelines/migraciones-bd.yml), que es
manual, elige ambiente y toma la cadena de conexión de los secretos del entorno protegido.

## Sincronía con EF Core

Las configuraciones de `Persistencia/Configuraciones/` y los scripts SQL describen el mismo
esquema desde dos lados. Mantenerlos sincronizados es manual y es el punto débil de esta
decisión; está asumido en el ADR.

Regla práctica: **el script y la configuración se escriben en el mismo commit**. Si al revisar
un pull request hay un `ALTER TABLE` sin su `IEntityTypeConfiguration` actualizado (o al revés),
está incompleto.

## Migraciones aplicadas

| Archivo | Qué hace |
|---|---|
| `20260101_000_esquema_inicial.sql` | Esquema completo: seguridad, catálogo, inventario, ventas y bitácora |
| `20260101_001_datos_semilla.sql` | Dos empresas, rol administrador con el catálogo de permisos, usuarios de ejemplo y stock inicial |
