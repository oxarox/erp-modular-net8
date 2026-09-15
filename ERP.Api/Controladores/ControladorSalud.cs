using System.Reflection;
using ERP.Api.Contracts.Salud;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controladores
{
    /// <summary>
    /// Sonda de vida para el orquestador de contenedores y para el monitoreo.
    /// Es el único endpoint anónimo además del login, y no revela nada del estado interno
    /// más allá de que el proceso responde.
    /// </summary>
    [AllowAnonymous]
    [Route("api/salud")]
    public sealed class ControladorSalud : ControladorBase
    {
        private readonly IHostEnvironment _entorno;

        public ControladorSalud(IHostEnvironment entorno)
        {
            _entorno = entorno;
        }

        [HttpGet]
        [ProducesResponseType(typeof(RespuestaSalud), StatusCodes.Status200OK)]
        public ActionResult<RespuestaSalud> Obtener()
        {
            string version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "desconocida";

            return Ok(new RespuestaSalud("ok", version, _entorno.EnvironmentName, DateTime.UtcNow));
        }
    }
}
