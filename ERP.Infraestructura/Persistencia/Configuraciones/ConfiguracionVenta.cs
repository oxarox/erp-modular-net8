using ERP.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERP.Infraestructura.Persistencia.Configuraciones
{
    public sealed class ConfiguracionVenta : IEntityTypeConfiguration<Venta>
    {
        public void Configure(EntityTypeBuilder<Venta> constructor)
        {
            constructor.ToTable("ventas");
            constructor.HasKey(v => v.Id);

            constructor.Property(v => v.Numero).IsRequired().HasMaxLength(32);
            constructor.Property(v => v.MetodoPago).IsRequired().HasMaxLength(32);
            constructor.Property(v => v.Estado).IsRequired().HasMaxLength(16);

            constructor.Property(v => v.Subtotal).HasColumnType("decimal(18,2)");
            constructor.Property(v => v.Descuento).HasColumnType("decimal(18,2)");
            constructor.Property(v => v.Impuesto).HasColumnType("decimal(18,2)");
            constructor.Property(v => v.Total).HasColumnType("decimal(18,2)");

            constructor.HasIndex(v => new { v.EmpresaId, v.Numero })
                .HasDatabaseName("UQ_ventas_empresa_numero")
                .IsUnique();

            // Índice de trabajo de los reportes: filtran por empresa y rango de fechas.
            constructor.HasIndex(v => new { v.EmpresaId, v.FechaUtc })
                .HasDatabaseName("IX_ventas_empresa_fecha");

            constructor.HasMany(v => v.Detalles)
                .WithOne(d => d.Venta)
                .HasForeignKey(d => d.VentaId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
