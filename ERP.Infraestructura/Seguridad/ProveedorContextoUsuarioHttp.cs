using System.Security.Claims;
using ERP.Aplicacion.Abstracciones.Contexto;
using ERP.Aplicacion.Comun.CodigosError;
using ERP.Aplicacion.Comun.Excepciones;
using Microsoft.AspNetCore.Http;

namespace ERP.Infraestructura.Seguridad
{
    public sealed class ProveedorContextoUsuarioHttp : IProveedorContextoUsuario
    {
        private readonly IHttpContextAccessor _accesor;

        public ProveedorContextoUsuarioHttp(IHttpContextAccessor accesor)
        {
            _accesor = accesor;
        }

        public long ObtenerUsuarioIdActual()
        {
            string? valor = Principal?.FindFirst(ClaimsErp.UsuarioId)?.Value;

            if (!long.TryParse(valor, out long usuarioId) || usuarioId <= 0)
            {
                throw new ExcepcionNoAutorizada(
                    "El token no identifica un usuario válido.",
                    CodigosErrorApi.NoAutenticado);
            }

            return usuarioId;
        }

        public string ObtenerNombreUsuarioActual() =>
            Principal?.FindFirst(ClaimsErp.NombreCompleto)?.Value ?? "desconocido";

        public IReadOnlyCollection<string> ObtenerPermisos() =>
            Principal?.FindAll(ClaimsErp.Permiso).Select(c => c.Value).ToArray() ?? [];

        private ClaimsPrincipal? Principal => _accesor.HttpContext?.User;
    }
}
