using ERP.Dominio.Abstracciones;

namespace ERP.Dominio.Entidades
{
    public sealed class Cliente : IEntidadActivable, IEntidadMultiEmpresa
    {
        public long Id { get; init; }
        public long EmpresaId { get; init; }
        public string Nombre { get; init; } = string.Empty;
        public string? IdentificadorTributario { get; init; }
        public string? Correo { get; init; }
        public string? Telefono { get; init; }
        public bool Activo { get; init; } = true;
    }
}
