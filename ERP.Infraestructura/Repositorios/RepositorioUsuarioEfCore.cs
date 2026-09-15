using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Dominio.Entidades;
using ERP.Infraestructura.Contexto;
using Microsoft.EntityFrameworkCore;

namespace ERP.Infraestructura.Repositorios
{
    public sealed class RepositorioUsuarioEfCore : IRepositorioUsuario
    {
        private readonly ContextoErp _contexto;

        public RepositorioUsuarioEfCore(ContextoErp contexto)
        {
            _contexto = contexto;
        }

        /// <summary>
        /// En el login todavía no hay empresa resuelta, así que esta consulta ignora
        /// deliberadamente el filtro global con <c>IgnoreQueryFilters</c>.
        /// Es la única lectura del sistema autorizada a hacerlo.
        /// </summary>
        public Task<Usuario?> ObtenerPorCorreoAsync(string correo, CancellationToken ct) =>
            _contexto.Usuarios
                .IgnoreQueryFilters()
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Correo == correo, ct);

        public Task<Usuario?> ObtenerPorIdAsync(long empresaId, long id, CancellationToken ct) =>
            _contexto.Usuarios
                .IgnoreQueryFilters()
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.EmpresaId == empresaId && u.Id == id, ct);

        public async Task<IReadOnlyCollection<string>> ObtenerPermisosAsync(long usuarioId, CancellationToken ct)
        {
            return await _contexto.UsuariosRoles
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(ur => ur.UsuarioId == usuarioId)
                .Join(
                    _contexto.RolesPermisos.IgnoreQueryFilters(),
                    ur => ur.RolId,
                    rp => rp.RolId,
                    (ur, rp) => rp.Permiso)
                .Distinct()
                .ToListAsync(ct);
        }
    }
}
