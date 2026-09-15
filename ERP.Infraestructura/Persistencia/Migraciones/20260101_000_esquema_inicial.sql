/* =============================================================================
   20260101_000_esquema_inicial.sql
   Esquema base del ERP modular.

   Convenciones (docs/BD/convenciones-bd.md):
     - tablas en snake_case y plural;
     - toda tabla de negocio lleva EmpresaId y un índice que empieza por esa columna;
     - baja lógica con la columna Activo: no hay DELETE físico;
     - claves foráneas con ON DELETE NO ACTION: borrar en cascada un catálogo
       arrastraría documentos históricos;
     - el script es idempotente y transaccional: se puede volver a correr sin daño.
   ============================================================================= */

SET XACT_ABORT ON;
SET NOCOUNT ON;

BEGIN TRANSACTION;

/* ---------------------------------------------------------------- empresas */
IF OBJECT_ID(N'dbo.empresas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.empresas
    (
        Id                      BIGINT        IDENTITY(1,1) NOT NULL,
        RazonSocial             NVARCHAR(200) NOT NULL,
        IdentificadorTributario NVARCHAR(32)  NOT NULL,
        NombreFantasia          NVARCHAR(200) NULL,
        Activo                  BIT           NOT NULL CONSTRAINT DF_empresas_activo DEFAULT (1),
        FechaCreacion           DATETIME2(3)  NOT NULL CONSTRAINT DF_empresas_fecha DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_empresas PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_empresas_identificador_tributario UNIQUE (IdentificadorTributario)
    );
END;

/* --------------------------------------------------------------- seguridad */
IF OBJECT_ID(N'dbo.usuarios', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.usuarios
    (
        Id                   BIGINT        IDENTITY(1,1) NOT NULL,
        EmpresaId            BIGINT        NOT NULL,
        Correo               NVARCHAR(256) NOT NULL,
        NombreCompleto       NVARCHAR(200) NOT NULL,
        HashContrasena       NVARCHAR(255) NOT NULL,
        VersionAutenticacion INT           NOT NULL CONSTRAINT DF_usuarios_version DEFAULT (1),
        Activo               BIT           NOT NULL CONSTRAINT DF_usuarios_activo DEFAULT (1),
        FechaCreacion        DATETIME2(3)  NOT NULL CONSTRAINT DF_usuarios_fecha DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_usuarios PRIMARY KEY CLUSTERED (Id),
        /* El correo es único GLOBAL, no por empresa: es el identificador del login,
           y en el login todavía no se sabe a qué empresa pertenece quien escribe. */
        CONSTRAINT UQ_usuarios_correo UNIQUE (Correo),
        CONSTRAINT FK_usuarios_empresas FOREIGN KEY (EmpresaId) REFERENCES dbo.empresas (Id)
    );
END;

IF OBJECT_ID(N'dbo.roles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.roles
    (
        Id          BIGINT        IDENTITY(1,1) NOT NULL,
        EmpresaId   BIGINT        NOT NULL,
        Nombre      NVARCHAR(120) NOT NULL,
        Descripcion NVARCHAR(500) NULL,
        Activo      BIT           NOT NULL CONSTRAINT DF_roles_activo DEFAULT (1),
        CONSTRAINT PK_roles PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_roles_empresa_nombre UNIQUE (EmpresaId, Nombre),
        CONSTRAINT FK_roles_empresas FOREIGN KEY (EmpresaId) REFERENCES dbo.empresas (Id)
    );
END;

IF OBJECT_ID(N'dbo.usuarios_roles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.usuarios_roles
    (
        Id        BIGINT IDENTITY(1,1) NOT NULL,
        UsuarioId BIGINT NOT NULL,
        RolId     BIGINT NOT NULL,
        CONSTRAINT PK_usuarios_roles PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_usuarios_roles UNIQUE (UsuarioId, RolId),
        CONSTRAINT FK_usuarios_roles_usuarios FOREIGN KEY (UsuarioId) REFERENCES dbo.usuarios (Id),
        CONSTRAINT FK_usuarios_roles_roles FOREIGN KEY (RolId) REFERENCES dbo.roles (Id)
    );
END;

IF OBJECT_ID(N'dbo.roles_permisos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.roles_permisos
    (
        Id      BIGINT       IDENTITY(1,1) NOT NULL,
        RolId   BIGINT       NOT NULL,
        /* Formato canónico modulo.accion, por ejemplo ventas.registrar. */
        Permiso NVARCHAR(64) NOT NULL,
        CONSTRAINT PK_roles_permisos PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_roles_permisos UNIQUE (RolId, Permiso),
        CONSTRAINT FK_roles_permisos_roles FOREIGN KEY (RolId) REFERENCES dbo.roles (Id)
    );
END;

IF OBJECT_ID(N'dbo.sesiones_usuario', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.sesiones_usuario
    (
        Id                 BIGINT        IDENTITY(1,1) NOT NULL,
        EmpresaId          BIGINT        NOT NULL,
        UsuarioId          BIGINT        NOT NULL,
        /* Se guarda el HASH del token de refresco, nunca el token. */
        HashTokenRefresco  NVARCHAR(128) NOT NULL,
        FechaEmisionUtc    DATETIME2(3)  NOT NULL,
        FechaExpiracionUtc DATETIME2(3)  NOT NULL,
        FechaRevocacionUtc DATETIME2(3)  NULL,
        DireccionIp        NVARCHAR(64)  NULL,
        CONSTRAINT PK_sesiones_usuario PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_sesiones_usuario_hash UNIQUE (HashTokenRefresco),
        CONSTRAINT FK_sesiones_usuario_usuarios FOREIGN KEY (UsuarioId) REFERENCES dbo.usuarios (Id)
    );

    CREATE INDEX IX_sesiones_usuario_usuario_expiracion
        ON dbo.sesiones_usuario (UsuarioId, FechaExpiracionUtc);
END;

/* ---------------------------------------------------------------- catálogo */
IF OBJECT_ID(N'dbo.marcas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.marcas
    (
        Id          BIGINT        IDENTITY(1,1) NOT NULL,
        EmpresaId   BIGINT        NOT NULL,
        Nombre      NVARCHAR(120) NOT NULL,
        Descripcion NVARCHAR(500) NULL,
        Activo      BIT           NOT NULL CONSTRAINT DF_marcas_activo DEFAULT (1),
        CONSTRAINT PK_marcas PRIMARY KEY CLUSTERED (Id),
        /* La unicidad vive aquí, no solo en el caso de uso: dos requests simultáneos
           pueden pasar ambos la validación previa y solo la base los frena. */
        CONSTRAINT UQ_marcas_empresa_nombre UNIQUE (EmpresaId, Nombre),
        CONSTRAINT FK_marcas_empresas FOREIGN KEY (EmpresaId) REFERENCES dbo.empresas (Id)
    );
END;

IF OBJECT_ID(N'dbo.categorias', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.categorias
    (
        Id          BIGINT        IDENTITY(1,1) NOT NULL,
        EmpresaId   BIGINT        NOT NULL,
        Nombre      NVARCHAR(120) NOT NULL,
        Descripcion NVARCHAR(500) NULL,
        Activo      BIT           NOT NULL CONSTRAINT DF_categorias_activo DEFAULT (1),
        CONSTRAINT PK_categorias PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_categorias_empresa_nombre UNIQUE (EmpresaId, Nombre),
        CONSTRAINT FK_categorias_empresas FOREIGN KEY (EmpresaId) REFERENCES dbo.empresas (Id)
    );
END;

IF OBJECT_ID(N'dbo.productos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.productos
    (
        Id                 BIGINT         IDENTITY(1,1) NOT NULL,
        EmpresaId          BIGINT         NOT NULL,
        Sku                NVARCHAR(64)   NOT NULL,
        Nombre             NVARCHAR(200)  NOT NULL,
        Descripcion        NVARCHAR(1000) NULL,
        MarcaId            BIGINT         NULL,
        CategoriaId        BIGINT         NULL,
        PrecioVenta        DECIMAL(18,2)  NOT NULL,
        /* Cuatro decimales en el costo: el costo promedio se recalcula con cada
           ingreso y redondearlo a dos arrastra error en inventarios grandes. */
        CostoPromedio      DECIMAL(18,4)  NOT NULL CONSTRAINT DF_productos_costo DEFAULT (0),
        ControlaInventario BIT            NOT NULL CONSTRAINT DF_productos_controla DEFAULT (1),
        Activo             BIT            NOT NULL CONSTRAINT DF_productos_activo DEFAULT (1),
        CONSTRAINT PK_productos PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_productos_empresa_sku UNIQUE (EmpresaId, Sku),
        CONSTRAINT FK_productos_empresas FOREIGN KEY (EmpresaId) REFERENCES dbo.empresas (Id),
        CONSTRAINT FK_productos_marcas FOREIGN KEY (MarcaId) REFERENCES dbo.marcas (Id),
        CONSTRAINT FK_productos_categorias FOREIGN KEY (CategoriaId) REFERENCES dbo.categorias (Id),
        CONSTRAINT CK_productos_precio_no_negativo CHECK (PrecioVenta >= 0)
    );

    CREATE INDEX IX_productos_empresa_nombre ON dbo.productos (EmpresaId, Nombre);
END;

IF OBJECT_ID(N'dbo.clientes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.clientes
    (
        Id                      BIGINT        IDENTITY(1,1) NOT NULL,
        EmpresaId               BIGINT        NOT NULL,
        Nombre                  NVARCHAR(200) NOT NULL,
        IdentificadorTributario NVARCHAR(32)  NULL,
        Correo                  NVARCHAR(256) NULL,
        Telefono                NVARCHAR(32)  NULL,
        Activo                  BIT           NOT NULL CONSTRAINT DF_clientes_activo DEFAULT (1),
        CONSTRAINT PK_clientes PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_clientes_empresas FOREIGN KEY (EmpresaId) REFERENCES dbo.empresas (Id)
    );

    CREATE INDEX IX_clientes_empresa_identificador ON dbo.clientes (EmpresaId, IdentificadorTributario);
END;

/* -------------------------------------------------------------- inventario */
IF OBJECT_ID(N'dbo.almacenes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.almacenes
    (
        Id               BIGINT        IDENTITY(1,1) NOT NULL,
        EmpresaId        BIGINT        NOT NULL,
        Nombre           NVARCHAR(120) NOT NULL,
        Ubicacion        NVARCHAR(200) NULL,
        EsPredeterminado BIT           NOT NULL CONSTRAINT DF_almacenes_predeterminado DEFAULT (0),
        Activo           BIT           NOT NULL CONSTRAINT DF_almacenes_activo DEFAULT (1),
        CONSTRAINT PK_almacenes PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_almacenes_empresa_nombre UNIQUE (EmpresaId, Nombre),
        CONSTRAINT FK_almacenes_empresas FOREIGN KEY (EmpresaId) REFERENCES dbo.empresas (Id)
    );
END;

IF OBJECT_ID(N'dbo.existencias', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.existencias
    (
        Id         BIGINT        IDENTITY(1,1) NOT NULL,
        EmpresaId  BIGINT        NOT NULL,
        ProductoId BIGINT        NOT NULL,
        AlmacenId  BIGINT        NOT NULL,
        Cantidad   DECIMAL(18,4) NOT NULL CONSTRAINT DF_existencias_cantidad DEFAULT (0),
        CONSTRAINT PK_existencias PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_existencias_empresa_producto_almacen UNIQUE (EmpresaId, ProductoId, AlmacenId),
        CONSTRAINT FK_existencias_productos FOREIGN KEY (ProductoId) REFERENCES dbo.productos (Id),
        CONSTRAINT FK_existencias_almacenes FOREIGN KEY (AlmacenId) REFERENCES dbo.almacenes (Id),
        /* Última línea de defensa contra el stock negativo, por debajo de la
           validación del caso de uso y del servicio de dominio. */
        CONSTRAINT CK_existencias_no_negativa CHECK (Cantidad >= 0)
    );
END;

IF OBJECT_ID(N'dbo.movimientos_inventario', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.movimientos_inventario
    (
        Id            BIGINT        IDENTITY(1,1) NOT NULL,
        EmpresaId     BIGINT        NOT NULL,
        ProductoId    BIGINT        NOT NULL,
        AlmacenId     BIGINT        NOT NULL,
        Tipo          INT           NOT NULL,
        Cantidad      DECIMAL(18,4) NOT NULL,
        CostoUnitario DECIMAL(18,4) NOT NULL CONSTRAINT DF_movimientos_costo DEFAULT (0),
        FechaUtc      DATETIME2(3)  NOT NULL,
        OrigenTipo    NVARCHAR(32)  NULL,
        OrigenId      BIGINT        NULL,
        UsuarioId     BIGINT        NOT NULL,
        CONSTRAINT PK_movimientos_inventario PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_movimientos_inventario_productos FOREIGN KEY (ProductoId) REFERENCES dbo.productos (Id),
        CONSTRAINT FK_movimientos_inventario_almacenes FOREIGN KEY (AlmacenId) REFERENCES dbo.almacenes (Id),
        CONSTRAINT CK_movimientos_inventario_cantidad CHECK (Cantidad > 0)
    );

    CREATE INDEX IX_movimientos_inventario_empresa_producto_fecha
        ON dbo.movimientos_inventario (EmpresaId, ProductoId, FechaUtc);

    CREATE INDEX IX_movimientos_inventario_origen
        ON dbo.movimientos_inventario (OrigenTipo, OrigenId);
END;

/* ------------------------------------------------------------------ ventas */
IF OBJECT_ID(N'dbo.ventas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ventas
    (
        Id                     BIGINT        IDENTITY(1,1) NOT NULL,
        EmpresaId              BIGINT        NOT NULL,
        Numero                 NVARCHAR(32)  NOT NULL,
        ClienteId              BIGINT        NULL,
        UsuarioId              BIGINT        NOT NULL,
        AlmacenId              BIGINT        NOT NULL,
        MetodoPago             NVARCHAR(32)  NOT NULL,
        /* Totales denormalizados: congelan el resultado del cálculo del dominio.
           Los reportes leen estas columnas; si mañana cambia la tasa de impuesto,
           el histórico no se mueve. Ver docs/decisiones/ADR-0005. */
        Subtotal               DECIMAL(18,2) NOT NULL,
        Descuento              DECIMAL(18,2) NOT NULL CONSTRAINT DF_ventas_descuento DEFAULT (0),
        Impuesto               DECIMAL(18,2) NOT NULL,
        Total                  DECIMAL(18,2) NOT NULL,
        Estado                 NVARCHAR(16)  NOT NULL,
        FechaUtc               DATETIME2(3)  NOT NULL,
        FechaCreacionUtc       DATETIME2(3)  NOT NULL,
        FechaActualizacionUtc  DATETIME2(3)  NOT NULL,
        Activo                 BIT           NOT NULL CONSTRAINT DF_ventas_activo DEFAULT (1),
        CONSTRAINT PK_ventas PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_ventas_empresa_numero UNIQUE (EmpresaId, Numero),
        CONSTRAINT FK_ventas_empresas FOREIGN KEY (EmpresaId) REFERENCES dbo.empresas (Id),
        CONSTRAINT FK_ventas_clientes FOREIGN KEY (ClienteId) REFERENCES dbo.clientes (Id),
        CONSTRAINT FK_ventas_almacenes FOREIGN KEY (AlmacenId) REFERENCES dbo.almacenes (Id),
        CONSTRAINT CK_ventas_estado CHECK (Estado IN (N'COMPLETADA', N'ANULADA'))
    );

    CREATE INDEX IX_ventas_empresa_fecha ON dbo.ventas (EmpresaId, FechaUtc);
END;

IF OBJECT_ID(N'dbo.ventas_detalle', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ventas_detalle
    (
        Id                  BIGINT        IDENTITY(1,1) NOT NULL,
        VentaId             BIGINT        NOT NULL,
        ProductoId          BIGINT        NOT NULL,
        /* Descripción congelada: si el producto se renombra, el documento no cambia. */
        DescripcionProducto NVARCHAR(200) NOT NULL,
        Cantidad            INT           NOT NULL,
        PrecioUnitario      DECIMAL(18,2) NOT NULL,
        Subtotal            DECIMAL(18,2) NOT NULL,
        DescuentoLinea      DECIMAL(18,2) NOT NULL CONSTRAINT DF_ventas_detalle_descuento DEFAULT (0),
        ImpuestoLinea       DECIMAL(18,2) NOT NULL,
        TotalLinea          DECIMAL(18,2) NOT NULL,
        CONSTRAINT PK_ventas_detalle PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_ventas_detalle_ventas FOREIGN KEY (VentaId) REFERENCES dbo.ventas (Id) ON DELETE CASCADE,
        CONSTRAINT FK_ventas_detalle_productos FOREIGN KEY (ProductoId) REFERENCES dbo.productos (Id),
        CONSTRAINT CK_ventas_detalle_cantidad CHECK (Cantidad > 0)
    );

    CREATE INDEX IX_ventas_detalle_venta ON dbo.ventas_detalle (VentaId);
END;

/* --------------------------------------------------------------- bitácora */
IF OBJECT_ID(N'dbo.log_acciones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.log_acciones
    (
        Id            BIGINT         IDENTITY(1,1) NOT NULL,
        EmpresaId     BIGINT         NOT NULL,
        UsuarioId     BIGINT         NULL,
        /* Nombre denormalizado a propósito: el log debe seguir siendo legible
           aunque el usuario se renombre o se desactive después. */
        UsuarioNombre NVARCHAR(200)  NOT NULL,
        Modulo        NVARCHAR(64)   NOT NULL,
        Accion        NVARCHAR(64)   NOT NULL,
        EntidadTipo   NVARCHAR(64)   NULL,
        EntidadId     BIGINT         NULL,
        Severidad     INT            NOT NULL CONSTRAINT DF_log_acciones_severidad DEFAULT (1),
        Detalle       NVARCHAR(2000) NULL,
        CorrelacionId NVARCHAR(64)   NULL,
        FechaUtc      DATETIME2(3)   NOT NULL,
        CONSTRAINT PK_log_acciones PRIMARY KEY CLUSTERED (Id)
    );

    CREATE INDEX IX_log_acciones_empresa_fecha ON dbo.log_acciones (EmpresaId, FechaUtc);
    CREATE INDEX IX_log_acciones_empresa_modulo_accion ON dbo.log_acciones (EmpresaId, Modulo, Accion);
END;

/* ------------------------------------------------ registro de migraciones */
IF OBJECT_ID(N'dbo.migraciones_aplicadas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.migraciones_aplicadas
    (
        Archivo    NVARCHAR(200) NOT NULL,
        FechaUtc   DATETIME2(3)  NOT NULL CONSTRAINT DF_migraciones_fecha DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_migraciones_aplicadas PRIMARY KEY CLUSTERED (Archivo)
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.migraciones_aplicadas WHERE Archivo = N'20260101_000_esquema_inicial.sql')
BEGIN
    INSERT dbo.migraciones_aplicadas (Archivo) VALUES (N'20260101_000_esquema_inicial.sql');
END;

COMMIT TRANSACTION;
GO
