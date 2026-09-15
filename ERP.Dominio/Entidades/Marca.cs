using ERP.Dominio.Abstracciones;

namespace ERP.Dominio.Entidades
{
    public sealed class Marca : IEntidadActivable, IEntidadMultiEmpresa
    {
        public long Id { get; init; }
        public long EmpresaId { get; init; }
        public string Nombre { get; init; } = string.Empty;
        public string? Descripcion { get; init; }
        public bool Activo { get; init; } = true;

        public Empresa? Empresa { get; init; }
    }
}
