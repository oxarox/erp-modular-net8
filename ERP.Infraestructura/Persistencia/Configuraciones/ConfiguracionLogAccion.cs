using ERP.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERP.Infraestructura.Persistencia.Configuraciones
{
    public sealed class ConfiguracionLogAccion : IEntityTypeConfiguration<LogAccion>
    {
        public void Configure(EntityTypeBuilder<LogAccion> constructor)
        {
            constructor.ToTable("log_acciones");
            constructor.HasKey(l => l.Id);

            constructor.Property(l => l.UsuarioNombre).IsRequired().HasMaxLength(200);
            constructor.Property(l => l.Modulo).IsRequired().HasMaxLength(64);
            constructor.Property(l => l.Accion).IsRequired().HasMaxLength(64);
            constructor.Property(l => l.EntidadTipo).HasMaxLength(64);
            constructor.Property(l => l.Detalle).HasMaxLength(2000);
            constructor.Property(l => l.CorrelacionId).HasMaxLength(64);
            constructor.Property(l => l.Severidad).HasConversion<int>();

            constructor.HasIndex(l => new { l.EmpresaId, l.FechaUtc })
                .HasDatabaseName("IX_log_acciones_empresa_fecha");

            constructor.HasIndex(l => new { l.EmpresaId, l.Modulo, l.Accion })
                .HasDatabaseName("IX_log_acciones_empresa_modulo_accion");
        }
    }

    public sealed class ConfiguracionCliente : IEntityTypeConfiguration<Cliente>
    {
        public void Configure(EntityTypeBuilder<Cliente> constructor)
        {
            constructor.ToTable("clientes");
            constructor.HasKey(c => c.Id);
            constructor.Property(c => c.Nombre).IsRequired().HasMaxLength(200);
            constructor.Property(c => c.IdentificadorTributario).HasMaxLength(32);
            constructor.Property(c => c.Correo).HasMaxLength(256);
            constructor.Property(c => c.Telefono).HasMaxLength(32);
            constructor.Property(c => c.Activo).HasDefaultValue(true);

            constructor.HasIndex(c => new { c.EmpresaId, c.IdentificadorTributario })
                .HasDatabaseName("IX_clientes_empresa_identificador");
        }
    }
}
