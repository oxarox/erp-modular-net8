using ERP.Dominio.Abstracciones;

namespace ERP.Dominio.Entidades
{
    /// <summary>
    /// Sesión emitida en el login. Guarda el hash del token de refresco (nunca el token en claro),
    /// de modo que una filtración de la tabla no permita refrescar sesiones ajenas.
    /// </summary>
    public sealed class SesionUsuario : IEntidadMultiEmpresa
    {
        public long Id { get; init; }
        public long EmpresaId { get; init; }
        public long UsuarioId { get; init; }
        public string HashTokenRefresco { get; init; } = string.Empty;
        public DateTime FechaEmisionUtc { get; init; }
        public DateTime FechaExpiracionUtc { get; init; }
        public DateTime? FechaRevocacionUtc { get; set; }
        public string? DireccionIp { get; init; }

        public bool EstaVigente(DateTime ahoraUtc) =>
            FechaRevocacionUtc is null && FechaExpiracionUtc > ahoraUtc;

        public Usuario? Usuario { get; init; }
    }
}
