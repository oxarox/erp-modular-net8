using ERP.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERP.Infraestructura.Persistencia.Configuraciones
{
    public sealed class ConfiguracionAlmacen : IEntityTypeConfiguration<Almacen>
    {
        public void Configure(EntityTypeBuilder<Almacen> constructor)
        {
            constructor.ToTable("almacenes");
            constructor.HasKey(a => a.Id);
            constructor.Property(a => a.Nombre).IsRequired().HasMaxLength(120);
            constructor.Property(a => a.Ubicacion).HasMaxLength(200);
            constructor.Property(a => a.Activo).HasDefaultValue(true);

            constructor.HasIndex(a => new { a.EmpresaId, a.Nombre })
                .HasDatabaseName("UQ_almacenes_empresa_nombre")
                .IsUnique();
        }
    }

    public sealed class ConfiguracionExistenciaProducto : IEntityTypeConfiguration<ExistenciaProducto>
    {
        public void Configure(EntityTypeBuilder<ExistenciaProducto> constructor)
        {
            constructor.ToTable("existencias");
            constructor.HasKey(e => e.Id);
            constructor.Property(e => e.Cantidad).HasColumnType("decimal(18,4)");

            // Un solo saldo por producto y almacén: la clave única evita filas duplicadas
            // si dos procesos crean la existencia a la vez.
            constructor.HasIndex(e => new { e.EmpresaId, e.ProductoId, e.AlmacenId })
                .HasDatabaseName("UQ_existencias_empresa_producto_almacen")
                .IsUnique();
        }
    }

    public sealed class ConfiguracionMovimientoInventario : IEntityTypeConfiguration<MovimientoInventario>
    {
        public void Configure(EntityTypeBuilder<MovimientoInventario> constructor)
        {
            constructor.ToTable("movimientos_inventario");
            constructor.HasKey(m => m.Id);

            constructor.Property(m => m.Tipo).HasConversion<int>();
            constructor.Property(m => m.Cantidad).HasColumnType("decimal(18,4)");
            constructor.Property(m => m.CostoUnitario).HasColumnType("decimal(18,4)");
            constructor.Property(m => m.OrigenTipo).HasMaxLength(32);

            constructor.HasIndex(m => new { m.EmpresaId, m.ProductoId, m.FechaUtc })
                .HasDatabaseName("IX_movimientos_inventario_empresa_producto_fecha");

            constructor.HasIndex(m => new { m.OrigenTipo, m.OrigenId })
                .HasDatabaseName("IX_movimientos_inventario_origen");
        }
    }
}
