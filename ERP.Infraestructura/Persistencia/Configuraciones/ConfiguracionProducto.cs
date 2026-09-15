using ERP.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERP.Infraestructura.Persistencia.Configuraciones
{
    public sealed class ConfiguracionProducto : IEntityTypeConfiguration<Producto>
    {
        public void Configure(EntityTypeBuilder<Producto> constructor)
        {
            constructor.ToTable("productos");
            constructor.HasKey(p => p.Id);

            constructor.Property(p => p.Sku).IsRequired().HasMaxLength(64);
            constructor.Property(p => p.Nombre).IsRequired().HasMaxLength(200);
            constructor.Property(p => p.Descripcion).HasMaxLength(1000);
            constructor.Property(p => p.PrecioVenta).HasColumnType("decimal(18,2)");
            constructor.Property(p => p.CostoPromedio).HasColumnType("decimal(18,4)");
            constructor.Property(p => p.Activo).HasDefaultValue(true);

            constructor.HasIndex(p => new { p.EmpresaId, p.Sku })
                .HasDatabaseName("UQ_productos_empresa_sku")
                .IsUnique();

            constructor.HasIndex(p => new { p.EmpresaId, p.Nombre })
                .HasDatabaseName("IX_productos_empresa_nombre");

            constructor.HasOne(p => p.Marca).WithMany().HasForeignKey(p => p.MarcaId).OnDelete(DeleteBehavior.Restrict);
            constructor.HasOne(p => p.Categoria).WithMany().HasForeignKey(p => p.CategoriaId).OnDelete(DeleteBehavior.Restrict);
        }
    }
}
