using ERP.Dominio.Entidades;

namespace ERP.Aplicacion.Abstracciones.Entidades
{
    public interface IRepositorioProducto
    {
        Task<Producto?> ObtenerPorIdAsync(long empresaId, long id, CancellationToken ct);

        Task<IReadOnlyList<Producto>> ObtenerPorIdsAsync(long empresaId, IReadOnlyCollection<long> ids, CancellationToken ct);

        Task<bool> ExisteSkuAsync(long empresaId, string sku, long? excluirId, CancellationToken ct);
    }
}
