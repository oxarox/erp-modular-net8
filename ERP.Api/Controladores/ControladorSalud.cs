using System.Reflection;
using ERP.Api.Contracts.Salud;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controladores
{
    /// <summary>
    /// Sonda de vida para el orquestador de contenedores y para el monitoreo.
    /// <para>
    /// Es de los pocos endpoints sin token, y no revela nada del estado interno más allá de
    /// que el proceso responde. Tampoco lleva <c>[action]</c> en la ruta: la sonda vive en
    /// <c>/api/salud</c>, porque la URL la configura un orquestador y conviene que sea corta.
    /// </para>
    /// </summary>
    [AllowAnonymous]
    public sealed class ControladorSalud : ControladorBase
    {
        [HttpGet]
        [ProducesResponseType(typeof(RespuestaSalud), StatusCodes.Status200OK)]
        public ActionResult<RespuestaSalud> Obtener([FromServices] IHostEnvironment entorno)
        {
            string version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "desconocida";

            return Ok(new RespuestaSalud("ok", version, entorno.EnvironmentName, DateTime.UtcNow));
        }
    }
}
