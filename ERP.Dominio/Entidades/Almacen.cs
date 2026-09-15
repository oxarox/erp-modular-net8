using ERP.Dominio.Abstracciones;

namespace ERP.Dominio.Entidades
{
    public sealed class Almacen : IEntidadActivable, IEntidadMultiEmpresa
    {
        public long Id { get; init; }
        public long EmpresaId { get; init; }
        public string Nombre { get; init; } = string.Empty;
        public string? Ubicacion { get; init; }

        /// <summary>Almacén al que se imputan los movimientos cuando la operación no indica uno.</summary>
        public bool EsPredeterminado { get; init; }

        public bool Activo { get; init; } = true;
    }
}
