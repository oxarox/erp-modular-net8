using ERP.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ERP.Infraestructura.Persistencia.Configuraciones
{
    public sealed class ConfiguracionUsuario : IEntityTypeConfiguration<Usuario>
    {
        public void Configure(EntityTypeBuilder<Usuario> constructor)
        {
            constructor.ToTable("usuarios");
            constructor.HasKey(u => u.Id);

            constructor.Property(u => u.Correo).IsRequired().HasMaxLength(256);
            constructor.Property(u => u.NombreCompleto).IsRequired().HasMaxLength(200);
            constructor.Property(u => u.HashContrasena).IsRequired().HasMaxLength(255);
            constructor.Property(u => u.VersionAutenticacion).HasDefaultValue(1);
            constructor.Property(u => u.Activo).HasDefaultValue(true);

            // El correo es único global, no por empresa: es el identificador del login,
            // y en el login todavía no hay tenant resuelto.
            constructor.HasIndex(u => u.Correo).HasDatabaseName("UQ_usuarios_correo").IsUnique();

            constructor.HasMany(u => u.Roles).WithOne(r => r.Usuario).HasForeignKey(r => r.UsuarioId);
        }
    }

    public sealed class ConfiguracionRol : IEntityTypeConfiguration<Rol>
    {
        public void Configure(EntityTypeBuilder<Rol> constructor)
        {
            constructor.ToTable("roles");
            constructor.HasKey(r => r.Id);
            constructor.Property(r => r.Nombre).IsRequired().HasMaxLength(120);
            constructor.Property(r => r.Descripcion).HasMaxLength(500);
            constructor.Property(r => r.Activo).HasDefaultValue(true);

            constructor.HasIndex(r => new { r.EmpresaId, r.Nombre })
                .HasDatabaseName("UQ_roles_empresa_nombre")
                .IsUnique();

            constructor.HasMany(r => r.Permisos).WithOne(p => p.Rol).HasForeignKey(p => p.RolId);
        }
    }

    public sealed class ConfiguracionUsuarioRol : IEntityTypeConfiguration<UsuarioRol>
    {
        public void Configure(EntityTypeBuilder<UsuarioRol> constructor)
        {
            constructor.ToTable("usuarios_roles");
            constructor.HasKey(ur => ur.Id);

            constructor.HasIndex(ur => new { ur.UsuarioId, ur.RolId })
                .HasDatabaseName("UQ_usuarios_roles")
                .IsUnique();
        }
    }

    public sealed class ConfiguracionRolPermiso : IEntityTypeConfiguration<RolPermiso>
    {
        public void Configure(EntityTypeBuilder<RolPermiso> constructor)
        {
            constructor.ToTable("roles_permisos");
            constructor.HasKey(rp => rp.Id);
            constructor.Property(rp => rp.Permiso).IsRequired().HasMaxLength(64);

            constructor.HasIndex(rp => new { rp.RolId, rp.Permiso })
                .HasDatabaseName("UQ_roles_permisos")
                .IsUnique();
        }
    }

    public sealed class ConfiguracionSesionUsuario : IEntityTypeConfiguration<SesionUsuario>
    {
        public void Configure(EntityTypeBuilder<SesionUsuario> constructor)
        {
            constructor.ToTable("sesiones_usuario");
            constructor.HasKey(s => s.Id);

            constructor.Property(s => s.HashTokenRefresco).IsRequired().HasMaxLength(128);
            constructor.Property(s => s.DireccionIp).HasMaxLength(64);

            constructor.HasIndex(s => s.HashTokenRefresco)
                .HasDatabaseName("UQ_sesiones_usuario_hash")
                .IsUnique();

            constructor.HasIndex(s => new { s.UsuarioId, s.FechaExpiracionUtc })
                .HasDatabaseName("IX_sesiones_usuario_usuario_expiracion");
        }
    }
}
