using ERP.Dominio.Entidades;

namespace ERP.Dominio.Servicios
{
    /// <summary>
    /// Contrato de dominio para consultar y afectar existencias.
    /// El dominio define QUÉ se necesita; la infraestructura decide CÓMO se resuelve
    /// (una consulta EF Core, una proyección cacheada, etc.).
    /// </summary>
    public interface IServicioStockProducto
    {
        Task<decimal> ObtenerDisponibleAsync(long empresaId, long productoId, long almacenId, CancellationToken cancelacion);

        Task AplicarMovimientoAsync(MovimientoInventario movimiento, CancellationToken cancelacion);
    }
}
