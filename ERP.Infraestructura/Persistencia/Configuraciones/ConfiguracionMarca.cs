using ERP.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERP.Infraestructura.Persistencia.Configuraciones
{
    /// <summary>
    /// Mapeo de <see cref="Marca"/>.
    /// Convenciones del proyecto (docs/BD/convenciones-bd.md): tabla en snake_case y plural,
    /// índices con prefijo IX_ o UQ_ seguidos de tabla y columnas.
    /// </summary>
    public sealed class ConfiguracionMarca : IEntityTypeConfiguration<Marca>
    {
        public void Configure(EntityTypeBuilder<Marca> constructor)
        {
            constructor.ToTable("marcas");
            constructor.HasKey(m => m.Id);

            constructor.Property(m => m.Nombre).IsRequired().HasMaxLength(120);
            constructor.Property(m => m.Descripcion).HasMaxLength(500);
            constructor.Property(m => m.Activo).HasDefaultValue(true);

            // La unicidad del nombre por empresa se garantiza en la base, no solo en el caso de uso:
            // dos requests simultáneos pueden pasar ambos la validación previa.
            constructor.HasIndex(m => new { m.EmpresaId, m.Nombre })
                .HasDatabaseName("UQ_marcas_empresa_nombre")
                .IsUnique();

            constructor.HasOne(m => m.Empresa)
                .WithMany()
                .HasForeignKey(m => m.EmpresaId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
