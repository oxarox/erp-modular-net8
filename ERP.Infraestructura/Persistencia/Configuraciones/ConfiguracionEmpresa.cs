using ERP.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERP.Infraestructura.Persistencia.Configuraciones
{
    public sealed class ConfiguracionEmpresa : IEntityTypeConfiguration<Empresa>
    {
        public void Configure(EntityTypeBuilder<Empresa> constructor)
        {
            constructor.ToTable("empresas");
            constructor.HasKey(e => e.Id);

            constructor.Property(e => e.RazonSocial).IsRequired().HasMaxLength(200);
            constructor.Property(e => e.IdentificadorTributario).IsRequired().HasMaxLength(32);
            constructor.Property(e => e.NombreFantasia).HasMaxLength(200);
            constructor.Property(e => e.Activo).HasDefaultValue(true);

            constructor.HasIndex(e => e.IdentificadorTributario)
                .HasDatabaseName("UQ_empresas_identificador_tributario")
                .IsUnique();
        }
    }
}
