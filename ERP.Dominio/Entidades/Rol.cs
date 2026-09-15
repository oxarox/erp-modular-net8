using ERP.Dominio.Abstracciones;

namespace ERP.Dominio.Entidades
{
    public sealed class Rol : IEntidadActivable, IEntidadMultiEmpresa
    {
        public long Id { get; init; }
        public long EmpresaId { get; init; }
        public string Nombre { get; init; } = string.Empty;
        public string? Descripcion { get; init; }
        public bool Activo { get; init; } = true;

        public ICollection<RolPermiso> Permisos { get; init; } = new List<RolPermiso>();
    }
}
