/* =============================================================================
   20260101_001_datos_semilla.sql
   Datos mínimos para levantar el sistema en local: dos empresas (para poder ver
   el aislamiento multiempresa funcionando de verdad), un rol administrador con
   todos los permisos y un usuario por empresa.

   La contraseña de ambos usuarios es  Demo.1234  y su hash BCrypt está escrito
   aquí a propósito: es una semilla de DESARROLLO. En cualquier ambiente real el
   primer usuario se crea por el flujo de alta, nunca por script.
   ============================================================================= */

SET XACT_ABORT ON;
SET NOCOUNT ON;

BEGIN TRANSACTION;

DECLARE @HashDemo NVARCHAR(255) = N'$2a$12$FiL3EKsl2yetQkHXVZXJxO9xb96dHzQpIpeaf2q1cGJfYE8f/4KUi';

/* ------------------------------------------------------------- empresas */
IF NOT EXISTS (SELECT 1 FROM dbo.empresas WHERE IdentificadorTributario = N'76.000.001-K')
BEGIN
    INSERT dbo.empresas (RazonSocial, IdentificadorTributario, NombreFantasia)
    VALUES (N'Comercial Norte SpA', N'76.000.001-K', N'Norte');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.empresas WHERE IdentificadorTributario = N'77.000.002-3')
BEGIN
    INSERT dbo.empresas (RazonSocial, IdentificadorTributario, NombreFantasia)
    VALUES (N'Distribuidora Sur Ltda', N'77.000.002-3', N'Sur');
END;

DECLARE @EmpresaNorte BIGINT = (SELECT Id FROM dbo.empresas WHERE IdentificadorTributario = N'76.000.001-K');
DECLARE @EmpresaSur   BIGINT = (SELECT Id FROM dbo.empresas WHERE IdentificadorTributario = N'77.000.002-3');

/* ---------------------------------------------------------------- roles */
DECLARE @Empresas TABLE (EmpresaId BIGINT);
INSERT @Empresas (EmpresaId) VALUES (@EmpresaNorte), (@EmpresaSur);

INSERT dbo.roles (EmpresaId, Nombre, Descripcion)
SELECT e.EmpresaId, N'Administrador', N'Acceso completo a los módulos habilitados.'
FROM @Empresas e
WHERE NOT EXISTS (SELECT 1 FROM dbo.roles r WHERE r.EmpresaId = e.EmpresaId AND r.Nombre = N'Administrador');

/* Catálogo de permisos. Debe coincidir con ERP.Api/Autorizacion/Permisos.cs:
   un permiso que existe en el código y no aquí se traduce en un 403 inexplicable. */
DECLARE @Permisos TABLE (Permiso NVARCHAR(64));
INSERT @Permisos (Permiso) VALUES
    (N'marcas.ver'), (N'marcas.gestionar'),
    (N'ventas.ver'), (N'ventas.registrar'), (N'ventas.anular'),
    (N'reportes.ver');

INSERT dbo.roles_permisos (RolId, Permiso)
SELECT r.Id, p.Permiso
FROM dbo.roles r
CROSS JOIN @Permisos p
WHERE r.Nombre = N'Administrador'
  AND NOT EXISTS (SELECT 1 FROM dbo.roles_permisos rp WHERE rp.RolId = r.Id AND rp.Permiso = p.Permiso);

/* -------------------------------------------------------------- usuarios */
IF NOT EXISTS (SELECT 1 FROM dbo.usuarios WHERE Correo = N'admin@norte.cl')
BEGIN
    INSERT dbo.usuarios (EmpresaId, Correo, NombreCompleto, HashContrasena)
    VALUES (@EmpresaNorte, N'admin@norte.cl', N'Administración Norte', @HashDemo);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.usuarios WHERE Correo = N'admin@sur.cl')
BEGIN
    INSERT dbo.usuarios (EmpresaId, Correo, NombreCompleto, HashContrasena)
    VALUES (@EmpresaSur, N'admin@sur.cl', N'Administración Sur', @HashDemo);
END;

INSERT dbo.usuarios_roles (UsuarioId, RolId)
SELECT u.Id, r.Id
FROM dbo.usuarios u
JOIN dbo.roles r ON r.EmpresaId = u.EmpresaId AND r.Nombre = N'Administrador'
WHERE NOT EXISTS (SELECT 1 FROM dbo.usuarios_roles ur WHERE ur.UsuarioId = u.Id AND ur.RolId = r.Id);

/* -------------------------------------------------- catálogo e inventario */
INSERT dbo.almacenes (EmpresaId, Nombre, EsPredeterminado)
SELECT e.EmpresaId, N'Bodega central', 1
FROM @Empresas e
WHERE NOT EXISTS (SELECT 1 FROM dbo.almacenes a WHERE a.EmpresaId = e.EmpresaId AND a.Nombre = N'Bodega central');

INSERT dbo.marcas (EmpresaId, Nombre, Descripcion)
SELECT @EmpresaNorte, v.Nombre, v.Descripcion
FROM (VALUES
    (N'Genérica', N'Marca por defecto del catálogo.'),
    (N'Acme', N'Marca de ejemplo.')) AS v (Nombre, Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM dbo.marcas m WHERE m.EmpresaId = @EmpresaNorte AND m.Nombre = v.Nombre);

INSERT dbo.categorias (EmpresaId, Nombre)
SELECT @EmpresaNorte, v.Nombre
FROM (VALUES (N'Insumos'), (N'Herramientas')) AS v (Nombre)
WHERE NOT EXISTS (SELECT 1 FROM dbo.categorias c WHERE c.EmpresaId = @EmpresaNorte AND c.Nombre = v.Nombre);

INSERT dbo.productos (EmpresaId, Sku, Nombre, MarcaId, CategoriaId, PrecioVenta, CostoPromedio, ControlaInventario)
SELECT
    @EmpresaNorte,
    v.Sku,
    v.Nombre,
    (SELECT Id FROM dbo.marcas WHERE EmpresaId = @EmpresaNorte AND Nombre = N'Acme'),
    (SELECT Id FROM dbo.categorias WHERE EmpresaId = @EmpresaNorte AND Nombre = N'Insumos'),
    v.PrecioVenta,
    v.Costo,
    v.ControlaInventario
FROM (VALUES
    (N'SKU-0001', N'Insumo de ejemplo A', CAST(1990 AS DECIMAL(18,2)), CAST(1200 AS DECIMAL(18,4)), CAST(1 AS BIT)),
    (N'SKU-0002', N'Insumo de ejemplo B', CAST(4990 AS DECIMAL(18,2)), CAST(3100 AS DECIMAL(18,4)), CAST(1 AS BIT)),
    (N'SKU-9000', N'Servicio de instalación', CAST(25000 AS DECIMAL(18,2)), CAST(0 AS DECIMAL(18,4)), CAST(0 AS BIT))
) AS v (Sku, Nombre, PrecioVenta, Costo, ControlaInventario)
WHERE NOT EXISTS (SELECT 1 FROM dbo.productos p WHERE p.EmpresaId = @EmpresaNorte AND p.Sku = v.Sku);

/* Stock inicial para poder registrar una venta apenas levanta el sistema. */
INSERT dbo.existencias (EmpresaId, ProductoId, AlmacenId, Cantidad)
SELECT p.EmpresaId, p.Id, a.Id, 100
FROM dbo.productos p
JOIN dbo.almacenes a ON a.EmpresaId = p.EmpresaId AND a.EsPredeterminado = 1
WHERE p.ControlaInventario = 1
  AND NOT EXISTS (
      SELECT 1 FROM dbo.existencias e
      WHERE e.EmpresaId = p.EmpresaId AND e.ProductoId = p.Id AND e.AlmacenId = a.Id);

IF NOT EXISTS (SELECT 1 FROM dbo.migraciones_aplicadas WHERE Archivo = N'20260101_001_datos_semilla.sql')
BEGIN
    INSERT dbo.migraciones_aplicadas (Archivo) VALUES (N'20260101_001_datos_semilla.sql');
END;

COMMIT TRANSACTION;
GO
