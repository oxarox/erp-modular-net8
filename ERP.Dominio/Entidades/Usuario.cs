using ERP.Dominio.Abstracciones;

namespace ERP.Dominio.Entidades
{
    public sealed class Usuario : IEntidadActivable, IEntidadMultiEmpresa
    {
        public long Id { get; init; }
        public long EmpresaId { get; init; }
        public string Correo { get; init; } = string.Empty;
        public string NombreCompleto { get; init; } = string.Empty;

        /// <summary>Hash BCrypt. La contraseña en claro no sobrevive al request de login.</summary>
        public string HashContrasena { get; init; } = string.Empty;

        /// <summary>
        /// Versión de credenciales. Se incrementa al cambiar la contraseña o al revocar sesiones:
        /// los JWT emitidos con una versión anterior dejan de ser válidos sin necesidad de lista negra.
        /// </summary>
        public int VersionAutenticacion { get; init; } = 1;

        public bool Activo { get; init; } = true;
        public DateTime FechaCreacion { get; init; }

        public Empresa? Empresa { get; init; }
        public ICollection<UsuarioRol> Roles { get; init; } = new List<UsuarioRol>();
    }
}
