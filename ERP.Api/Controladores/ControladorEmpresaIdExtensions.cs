using ERP.Aplicacion.Comun.CodigosError;
using ERP.Aplicacion.Comun.Excepciones;
using ERP.Infraestructura.Seguridad;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controladores
{
    /// <summary>
    /// Acceso al contexto del request desde un controlador.
    /// <para>
    /// La primera línea de casi toda acción es <c>this.ObtenerEmpresaIdDesdeToken()</c>. Es
    /// una extensión y no un parámetro de acción a propósito: si el <c>empresaId</c> pudiera
    /// llegar por ruta, query o cuerpo, bastaría cambiar un número en el JSON para operar
    /// sobre otra empresa. Ver docs/multiempresa.md.
    /// </para>
    /// </summary>
    public static class ControladorEmpresaIdExtensions
    {
        public static long ObtenerEmpresaIdDesdeToken(this ControllerBase controlador)
        {
            string? claim = controlador.User.FindFirst(ClaimsErp.EmpresaId)?.Value;

            if (string.IsNullOrWhiteSpace(claim) || !long.TryParse(claim, out long empresaId) || empresaId <= 0)
            {
                throw new ExcepcionNoAutorizada(
                    "No se encontró el identificador de empresa en el token.",
                    CodigosErrorApi.EmpresaNoResuelta);
            }

            return empresaId;
        }

        public static long ObtenerUsuarioIdDesdeToken(this ControllerBase controlador)
        {
            string? claim = controlador.User.FindFirst(ClaimsErp.UsuarioId)?.Value;

            if (string.IsNullOrWhiteSpace(claim) || !long.TryParse(claim, out long usuarioId) || usuarioId <= 0)
            {
                throw new ExcepcionNoAutorizada(
                    "No se encontró el identificador de usuario en el token.",
                    CodigosErrorApi.NoAutenticado);
            }

            return usuarioId;
        }
    }
}
