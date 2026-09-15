using ERP.Dominio.Abstracciones;

namespace ERP.Dominio.Entidades
{
    public enum TipoMovimientoInventario
    {
        Ingreso = 1,
        Egreso = 2,
        Ajuste = 3,
        Traslado = 4,
    }

    /// <summary>
    /// Asiento de inventario: la fuente de verdad del stock.
    /// Nunca se modifica ni se borra; una corrección se expresa como un movimiento nuevo.
    /// </summary>
    public sealed class MovimientoInventario : IEntidadMultiEmpresa
    {
        public long Id { get; init; }
        public long EmpresaId { get; init; }
        public long ProductoId { get; init; }
        public long AlmacenId { get; init; }
        public TipoMovimientoInventario Tipo { get; init; }
        public decimal Cantidad { get; init; }
        public decimal CostoUnitario { get; init; }
        public DateTime FechaUtc { get; init; }

        /// <summary>Documento que originó el movimiento, por ejemplo "Venta" o "Compra".</summary>
        public string? OrigenTipo { get; init; }
        public long? OrigenId { get; init; }

        public long UsuarioId { get; init; }

        public Producto? Producto { get; init; }
        public Almacen? Almacen { get; init; }
    }
}
