using ERP.Dominio.Entidades;

namespace ERP.Aplicacion.Abstracciones.Entidades
{
    public interface IRepositorioSesionUsuario
    {
        Task<SesionUsuario> CrearAsync(SesionUsuario sesion, CancellationToken ct);

        Task<SesionUsuario?> ObtenerPorHashAsync(string hashTokenRefresco, CancellationToken ct);

        Task RevocarAsync(long sesionId, DateTime fechaRevocacionUtc, CancellationToken ct);
    }
}
