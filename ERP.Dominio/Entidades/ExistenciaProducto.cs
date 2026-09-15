using ERP.Dominio.Abstracciones;

namespace ERP.Dominio.Entidades
{
    /// <summary>
    /// Saldo de un producto en un almacén. Es una proyección: solo cambia como consecuencia
    /// de un <see cref="MovimientoInventario"/>, nunca por escritura directa desde un caso de uso.
    /// </summary>
    public sealed class ExistenciaProducto : IEntidadMultiEmpresa
    {
        public long Id { get; init; }
        public long EmpresaId { get; init; }
        public long ProductoId { get; init; }
        public long AlmacenId { get; init; }
        public decimal Cantidad { get; set; }

        public Producto? Producto { get; init; }
        public Almacen? Almacen { get; init; }
    }
}
