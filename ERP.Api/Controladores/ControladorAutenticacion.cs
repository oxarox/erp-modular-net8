using ERP.Api.Contracts.Auth;
using ERP.Api.Contracts.Comun;
using ERP.Aplicacion.CasosDeUso.Autenticacion;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controladores
{
    /// <summary>
    /// Emisión y renovación de sesiones. Es el único controlador anónimo junto con el de salud.
    /// </summary>
    [AllowAnonymous]
    [Route("api/autenticacion")]
    public sealed class ControladorAutenticacion : ControladorBase
    {
        [HttpPost("iniciar-sesion")]
        [ProducesResponseType(typeof(RespuestaSesion), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<RespuestaSesion>> IniciarSesion(
            [FromServices] ManejadorIniciarSesion manejador,
            [FromBody] SolicitudIniciarSesion solicitud,
            CancellationToken ct)
        {
            ResultadoSesion sesion = await manejador.ManejarAsync(
                new ComandoIniciarSesion(solicitud.Correo, solicitud.Contrasena, DireccionIpDelCliente()),
                ct);

            return Ok(Proyectar(sesion));
        }

        [HttpPost("refrescar")]
        [ProducesResponseType(typeof(RespuestaSesion), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<RespuestaSesion>> Refrescar(
            [FromServices] ManejadorRefrescarSesion manejador,
            [FromBody] SolicitudRefrescarSesion solicitud,
            CancellationToken ct)
        {
            ResultadoSesion sesion = await manejador.ManejarAsync(
                new ComandoRefrescarSesion(solicitud.TokenRefresco, DireccionIpDelCliente()),
                ct);

            return Ok(Proyectar(sesion));
        }

        private string? DireccionIpDelCliente() => HttpContext.Connection.RemoteIpAddress?.ToString();

        private static RespuestaSesion Proyectar(ResultadoSesion sesion) =>
            new(
                sesion.TokenAcceso,
                sesion.AccesoExpiraUtc,
                sesion.TokenRefresco,
                sesion.RefrescoExpiraUtc,
                sesion.UsuarioId,
                sesion.NombreCompleto,
                sesion.EmpresaId,
                sesion.Permisos);
    }
}
