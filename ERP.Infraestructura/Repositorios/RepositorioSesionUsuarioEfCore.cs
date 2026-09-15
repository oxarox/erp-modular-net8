using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Dominio.Entidades;
using ERP.Infraestructura.Contexto;
using Microsoft.EntityFrameworkCore;

namespace ERP.Infraestructura.Repositorios
{
    public sealed class RepositorioSesionUsuarioEfCore : IRepositorioSesionUsuario
    {
        private readonly ContextoErp _contexto;

        public RepositorioSesionUsuarioEfCore(ContextoErp contexto)
        {
            _contexto = contexto;
        }

        public async Task<SesionUsuario> CrearAsync(SesionUsuario sesion, CancellationToken ct)
        {
            _contexto.SesionesUsuario.Add(sesion);
            await _contexto.SaveChangesAsync(ct);

            return sesion;
        }

        public Task<SesionUsuario?> ObtenerPorHashAsync(string hashTokenRefresco, CancellationToken ct) =>
            _contexto.SesionesUsuario
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.HashTokenRefresco == hashTokenRefresco, ct);

        public async Task RevocarAsync(long sesionId, DateTime fechaRevocacionUtc, CancellationToken ct)
        {
            SesionUsuario? sesion = await _contexto.SesionesUsuario
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.Id == sesionId, ct);

            if (sesion is null)
            {
                return;
            }

            sesion.FechaRevocacionUtc = fechaRevocacionUtc;
            await _contexto.SaveChangesAsync(ct);
        }
    }
}
