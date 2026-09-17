using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Dominio.Entidades;
using ERP.Infraestructura.Contexto;
using Microsoft.EntityFrameworkCore;

namespace ERP.Infraestructura.Repositorios
{
    /// <summary>
    /// Implementación EF Core del repositorio de almacenes.
    /// <para>
    /// No pagina: son unidades pocas y estables por empresa —una bodega central y un puñado de
    /// sucursales— y quien las consume es un selector que necesita la lista completa. Ordena en
    /// la base, apoyado en <c>UQ_almacenes_empresa_nombre</c>, aunque el caso de uso reafirme
    /// después el mismo orden.
    /// </para>
    /// </summary>
    public sealed class RepositorioAlmacenEfCore : IRepositorioAlmacen
    {
        private readonly ContextoErp _contexto;

        public RepositorioAlmacenEfCore(ContextoErp contexto)
        {
            _contexto = contexto;
        }

        public async Task<IReadOnlyList<Almacen>> ListarAsync(long empresaId, bool? soloActivos, CancellationToken ct)
        {
            IQueryable<Almacen> consulta = _contexto.Almacenes
                .AsNoTracking()
                .Where(a => a.EmpresaId == empresaId);

            if (soloActivos == true)
            {
                consulta = consulta.Where(a => a.Activo);
            }

            return await consulta
                .OrderByDescending(a => a.EsPredeterminado)
                .ThenBy(a => a.Nombre)
                .ToListAsync(ct);
        }

        /// <summary>
        /// No mira <c>Activo</c> a propósito: una bodega dada de baja sigue teniendo saldo real
        /// y consultarlo es legítimo. Lo que esta comprobación impide es afirmar algo sobre un
        /// almacén que no es de la empresa.
        /// </summary>
        public Task<bool> ExisteAsync(long empresaId, long almacenId, CancellationToken ct) =>
            _contexto.Almacenes
                .AsNoTracking()
                .AnyAsync(a => a.EmpresaId == empresaId && a.Id == almacenId, ct);
    }
}
