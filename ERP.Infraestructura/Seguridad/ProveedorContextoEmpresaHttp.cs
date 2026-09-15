using System.Security.Claims;
using ERP.Aplicacion.Abstracciones.Contexto;
using ERP.Aplicacion.Comun.CodigosError;
using ERP.Aplicacion.Comun.Excepciones;
using Microsoft.AspNetCore.Http;

namespace ERP.Infraestructura.Seguridad
{
    /// <summary>
    /// Resuelve la empresa del request desde el claim del token.
    /// Este es el punto exacto donde se cierra el aislamiento multiempresa: no hay ningún
    /// camino por el que el cliente pueda proponer su propio empresaId.
    /// </summary>
    public sealed class ProveedorContextoEmpresaHttp : IProveedorContextoEmpresa
    {
        private readonly IHttpContextAccessor _accesor;

        public ProveedorContextoEmpresaHttp(IHttpContextAccessor accesor)
        {
            _accesor = accesor;
        }

        public long ObtenerEmpresaIdActual()
        {
            ClaimsPrincipal? usuario = _accesor.HttpContext?.User;

            if (usuario?.Identity?.IsAuthenticated != true)
            {
                return 0L;
            }

            string? valor = usuario.FindFirst(ClaimsErp.EmpresaId)?.Value;

            if (!long.TryParse(valor, out long empresaId) || empresaId <= 0)
            {
                throw new ExcepcionNoAutorizada(
                    "El token no identifica una empresa válida.",
                    CodigosErrorApi.EmpresaNoResuelta);
            }

            return empresaId;
        }
    }
}
