using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Dominio.Entidades;
using ERP.Infraestructura.Contexto;
using Microsoft.EntityFrameworkCore;

namespace ERP.Infraestructura.Repositorios
{
    /// <summary>
    /// Implementación EF Core del repositorio de marcas.
    /// <para>
    /// Tres detalles que se repiten en los 33 módulos del sistema real:
    /// </para>
    /// <list type="bullet">
    ///   <item><c>AsNoTracking</c> en toda lectura que no va a modificarse;</item>
    ///   <item><c>empresaId</c> explícito en cada consulta, además del filtro global del contexto;</item>
    ///   <item>la comparación de nombres se hace sobre la forma normalizada, no sobre el texto original.</item>
    /// </list>
    /// </summary>
    public sealed class RepositorioMarcaEfCore : IRepositorioMarca
    {
        private readonly ContextoErp _contexto;

        public RepositorioMarcaEfCore(ContextoErp contexto)
        {
            _contexto = contexto;
        }

        public async Task<IReadOnlyList<Marca>> BuscarAsync(long empresaId, string? criterio, bool? soloActivas, CancellationToken ct)
        {
            IQueryable<Marca> consulta = _contexto.Marcas
                .AsNoTracking()
                .Where(m => m.EmpresaId == empresaId);

            if (soloActivas == true)
            {
                consulta = consulta.Where(m => m.Activo);
            }

            if (!string.IsNullOrWhiteSpace(criterio))
            {
                string patron = $"%{criterio.Trim()}%";
                consulta = consulta.Where(m => EF.Functions.Like(m.Nombre, patron));
            }

            return await consulta.OrderBy(m => m.Nombre).ToListAsync(ct);
        }

        public Task<Marca?> ObtenerPorIdAsync(long empresaId, long id, CancellationToken ct) =>
            _contexto.Marcas
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.EmpresaId == empresaId && m.Id == id, ct);

        public Task<bool> ExisteNombreNormalizadoAsync(long empresaId, string nombreNormalizado, long? excluirId, CancellationToken ct) =>
            _contexto.Marcas
                .AsNoTracking()
                .Where(m => m.EmpresaId == empresaId)
                .Where(m => excluirId == null || m.Id != excluirId)
                .AnyAsync(m => m.Nombre.ToUpper() == nombreNormalizado, ct);

        public async Task<Marca> CrearAsync(long empresaId, Marca marca, CancellationToken ct)
        {
            _contexto.Marcas.Add(marca);
            await _contexto.SaveChangesAsync(ct);

            return marca;
        }

        public async Task<Marca?> ActualizarAsync(long empresaId, Marca marca, CancellationToken ct)
        {
            Marca? existente = await _contexto.Marcas
                .FirstOrDefaultAsync(m => m.EmpresaId == empresaId && m.Id == marca.Id, ct);

            if (existente is null)
            {
                return null;
            }

            // Las entidades usan propiedades init: se actualiza por el rastreador de cambios,
            // no reasignando el objeto, para que EF genere un UPDATE de las columnas que cambiaron.
            _contexto.Entry(existente).CurrentValues.SetValues(new
            {
                marca.Nombre,
                marca.Descripcion,
                marca.Activo,
            });

            await _contexto.SaveChangesAsync(ct);

            return existente;
        }

        public async Task<bool> DesactivarAsync(long empresaId, long id, CancellationToken ct)
        {
            Marca? existente = await _contexto.Marcas
                .FirstOrDefaultAsync(m => m.EmpresaId == empresaId && m.Id == id, ct);

            if (existente is null)
            {
                return false;
            }

            _contexto.Entry(existente).Property(m => m.Activo).CurrentValue = false;

            return await _contexto.SaveChangesAsync(ct) > 0;
        }
    }
}
