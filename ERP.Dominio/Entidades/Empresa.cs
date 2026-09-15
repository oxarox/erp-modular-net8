namespace ERP.Dominio.Entidades
{
    /// <summary>
    /// Tenant del sistema. Toda entidad de negocio cuelga de una empresa.
    /// </summary>
    public sealed class Empresa : IEntidadActivable
    {
        public long Id { get; init; }
        public string RazonSocial { get; init; } = string.Empty;
        public string IdentificadorTributario { get; init; } = string.Empty;
        public string? NombreFantasia { get; init; }
        public bool Activo { get; init; } = true;
        public DateTime FechaCreacion { get; init; }
    }
}
