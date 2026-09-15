using ERP.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERP.Infraestructura.Persistencia.Configuraciones
{
    public sealed class ConfiguracionVentaDetalleLinea : IEntityTypeConfiguration<VentaDetalleLinea>
    {
        public void Configure(EntityTypeBuilder<VentaDetalleLinea> constructor)
        {
            constructor.ToTable("ventas_detalle");
            constructor.HasKey(d => d.Id);

            constructor.Property(d => d.DescripcionProducto).IsRequired().HasMaxLength(200);
            constructor.Property(d => d.PrecioUnitario).HasColumnType("decimal(18,2)");
            constructor.Property(d => d.Subtotal).HasColumnType("decimal(18,2)");
            constructor.Property(d => d.DescuentoLinea).HasColumnType("decimal(18,2)");
            constructor.Property(d => d.ImpuestoLinea).HasColumnType("decimal(18,2)");
            constructor.Property(d => d.TotalLinea).HasColumnType("decimal(18,2)");

            constructor.HasIndex(d => d.VentaId).HasDatabaseName("IX_ventas_detalle_venta");

            constructor.HasOne(d => d.Producto)
                .WithMany()
                .HasForeignKey(d => d.ProductoId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
