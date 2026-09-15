using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Dominio.Entidades;
using ERP.Infraestructura.Contexto;
using Microsoft.EntityFrameworkCore;

namespace ERP.Infraestructura.Repositorios
{
    public sealed class RepositorioProductoEfCore : IRepositorioProducto
    {
        private readonly ContextoErp _contexto;

        public RepositorioProductoEfCore(ContextoErp contexto)
        {
            _contexto = contexto;
        }

        public Task<Producto?> ObtenerPorIdAsync(long empresaId, long id, CancellationToken ct) =>
            _contexto.Productos
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.EmpresaId == empresaId && p.Id == id, ct);

        /// <summary>
        /// Lectura por lote. Registrar una venta de 20 líneas hace UNA consulta, no 20:
        /// el problema N+1 no se resuelve en el manejador, se evita en el contrato del repositorio.
        /// </summary>
        public async Task<IReadOnlyList<Producto>> ObtenerPorIdsAsync(long empresaId, IReadOnlyCollection<long> ids, CancellationToken ct)
        {
            if (ids.Count == 0)
            {
                return Array.Empty<Producto>();
            }

            return await _contexto.Productos
                .AsNoTracking()
                .Where(p => p.EmpresaId == empresaId && ids.Contains(p.Id))
                .ToListAsync(ct);
        }

        public Task<bool> ExisteSkuAsync(long empresaId, string sku, long? excluirId, CancellationToken ct) =>
            _contexto.Productos
                .AsNoTracking()
                .Where(p => p.EmpresaId == empresaId)
                .Where(p => excluirId == null || p.Id != excluirId)
                .AnyAsync(p => p.Sku == sku, ct);
    }
}
