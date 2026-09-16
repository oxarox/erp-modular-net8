using ERP.Api.Autorizacion;
using ERP.Api.Contracts.Almacenes;
using ERP.Aplicacion.CasosDeUso.Almacenes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controladores
{
    /// <summary>
    /// Módulo de almacenes. Por ahora expone solo el listado que alimenta los selectores de la
    /// operación; el alta y la edición de bodegas llegan con su propio módulo.
    /// </summary>
    [Authorize]
    public sealed class ControladorAlmacenes : ControladorBase
    {
        /// <summary>
        /// Lista los almacenes de la empresa, con el predeterminado primero.
        /// <para>
        /// Es la única lista del sistema que NO devuelve <c>RespuestaPaginada</c>. La excepción
        /// está justificada: son unidades pocas y estables —una bodega central y un puñado de
        /// sucursales— y quien la consume es un selector que necesita el listado completo para
        /// poder mostrarse. Paginarla obligaría al cliente a recorrer páginas para pintar un
        /// desplegable. Cualquier lista que pueda crecer con la operación sí se pagina.
        /// </para>
        /// <para>
        /// El límite de la excepción —y por qué no es "mi lista también es chica"— está escrito
        /// en ADR-0009, en el checklist de endpoint y en las convenciones, que es donde alguien
        /// lo va a buscar antes de escribir el módulo siguiente.
        /// </para>
        /// </summary>
        [HttpGet("[action]")]
        [AutorizarPermiso(Permisos.Almacenes.Ver)]
        [ProducesResponseType(typeof(IReadOnlyList<RespuestaAlmacen>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IReadOnlyList<RespuestaAlmacen>>> ListarAlmacenes(
            [FromQuery] SolicitudListarAlmacenes solicitud,
            [FromServices] ManejadorListarAlmacenes manejador,
            CancellationToken ct)
        {
            long empresaId = this.ObtenerEmpresaIdDesdeToken();

            IReadOnlyList<ItemAlmacen> almacenes = await manejador.ManejarAsync(empresaId, solicitud.SoloActivos, ct);

            return Ok(almacenes.Select(Proyectar).ToList());
        }

        private static RespuestaAlmacen Proyectar(ItemAlmacen item) =>
            new(item.Id, item.Nombre, item.Ubicacion, item.EsPredeterminado, item.Activo);
    }
}
