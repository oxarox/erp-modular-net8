using ERP.Aplicacion.Abstracciones.Contexto;
using ERP.Api.Contracts.Comun;
using ERP.Aplicacion.Comun.Paginacion;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controladores
{
    /// <summary>
    /// Base de todos los controladores del sistema.
    /// <para>
    /// Aporta dos cosas y nada más: el <see cref="EmpresaId"/> del request y la conversión
    /// de un resultado paginado de aplicación al contrato HTTP. Deliberadamente NO contiene
    /// helpers de manejo de errores: los errores los produce el middleware, no el controlador.
    /// </para>
    /// </summary>
    [ApiController]
    [Produces("application/json")]
    [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status500InternalServerError)]
    public abstract class ControladorBase : ControllerBase
    {
        /// <summary>
        /// Empresa del request, resuelta desde el token. Es la única fuente: ninguna acción
        /// acepta un empresaId por ruta, query o cuerpo.
        /// </summary>
        protected long EmpresaId =>
            HttpContext.RequestServices.GetRequiredService<IProveedorContextoEmpresa>().ObtenerEmpresaIdActual();

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
