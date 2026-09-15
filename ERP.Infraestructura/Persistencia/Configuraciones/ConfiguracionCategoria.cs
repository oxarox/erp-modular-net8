using ERP.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERP.Infraestructura.Persistencia.Configuraciones
{
    public sealed class ConfiguracionCategoria : IEntityTypeConfiguration<Categoria>
    {
        public void Configure(EntityTypeBuilder<Categoria> constructor)
        {
            constructor.ToTable("categorias");
            constructor.HasKey(c => c.Id);

            constructor.Property(c => c.Nombre).IsRequired().HasMaxLength(120);
            constructor.Property(c => c.Descripcion).HasMaxLength(500);
            constructor.Property(c => c.Activo).HasDefaultValue(true);

            constructor.HasIndex(c => new { c.EmpresaId, c.Nombre })
                .HasDatabaseName("UQ_categorias_empresa_nombre")
                .IsUnique();
        }
    }
}
