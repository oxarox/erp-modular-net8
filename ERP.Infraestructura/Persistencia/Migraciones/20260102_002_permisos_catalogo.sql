/* =============================================================================
   20260102_002_permisos_catalogo.sql
   Incorpora al rol Administrador los permisos de lectura del catálogo que el
   front necesita para armar una venta: productos.ver y almacenes.ver.

   Sin esta migración los endpoints existen, el token se emite y la respuesta es
   un 403: el permiso está en ERP.Api/Autorizacion/Permisos.cs pero en ninguna
   fila de dbo.roles_permisos. Ver docs/seguridad-y-rbac.md.

   Se asignan solo al rol Administrador. Los perfiles que cada cliente arme son
   datos suyos y no los toca una migración.
   ============================================================================= */

SET XACT_ABORT ON;
SET NOCOUNT ON;

BEGIN TRANSACTION;

/* Catálogo incremental. Debe coincidir con ERP.Api/Autorizacion/Permisos.cs:
   un permiso que existe en el código y no aquí se traduce en un 403 inexplicable. */
DECLARE @PermisosCatalogo TABLE (Permiso NVARCHAR(64));
INSERT @PermisosCatalogo (Permiso) VALUES
    (N'productos.ver'),
    (N'almacenes.ver');

INSERT dbo.roles_permisos (RolId, Permiso)
SELECT r.Id, p.Permiso
FROM dbo.roles r
CROSS JOIN @PermisosCatalogo p
WHERE r.Nombre = N'Administrador'
  AND NOT EXISTS (SELECT 1 FROM dbo.roles_permisos rp WHERE rp.RolId = r.Id AND rp.Permiso = p.Permiso);

IF NOT EXISTS (SELECT 1 FROM dbo.migraciones_aplicadas WHERE Archivo = N'20260102_002_permisos_catalogo.sql')
BEGIN
    INSERT dbo.migraciones_aplicadas (Archivo) VALUES (N'20260102_002_permisos_catalogo.sql');
END;

COMMIT TRANSACTION;
GO
