using ERP.Api.Contracts.Comun;
using ERP.Aplicacion.Comun.Paginacion;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controladores
{
    /// <summary>
    /// Base de todos los controladores del sistema.
    /// <para>
    /// Aporta los códigos de respuesta transversales (para que Swagger los documente sin
    /// repetirlos en 36 controladores) y la conversión de un resultado paginado de aplicación
    /// al contrato HTTP.
    /// </para>
    /// <para>
    /// Deliberadamente NO contiene helpers de manejo de errores: los errores los produce
    /// <see cref="Intermediarios.IntermediarioExcepcion"/>, no el controlador.
    /// </para>
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status500InternalServerError)]
    public abstract class ControladorBase : ControllerBase
    {
        protected static RespuestaPaginada<TDestino> ARespuesta<TOrigen, TDestino>(
            ResultadoPaginado<TOrigen> resultado,
            Func<TOrigen, TDestino> proyectar) =>
            new(
                resultado.Pagina,
                resultado.TamanoPagina,
                resultado.Total,
                resultado.TotalPaginas,
                resultado.Items.Select(proyectar).ToList());
    }
}
