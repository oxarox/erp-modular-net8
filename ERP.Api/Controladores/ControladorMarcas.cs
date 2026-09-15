using ERP.Api.Autorizacion;
using ERP.Api.Contracts.Comun;
using ERP.Api.Contracts.Marcas;
using ERP.Aplicacion.CasosDeUso.Marcas;
using ERP.Aplicacion.Comun.Paginacion;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controladores
{
    /// <summary>
    /// Módulo de marcas. Es el ejemplo canónico de un CRUD del sistema y sirve de plantilla
    /// para los demás módulos.
    /// <para>
    /// La ruta se arma sola: <c>ControladorMarcas</c> pierde el prefijo por
    /// <see cref="Convenciones.ConvencionNombreControlador"/> y cada token pasa a kebab-case
    /// por <see cref="Convenciones.TransformadorSlug"/>. <c>CrearMarca</c> queda como
    /// <c>POST /api/marcas/crear-marca</c> sin escribir la ruta a mano.
    /// </para>
    /// <para>
    /// Obsérvese lo que NO hay: ni try/catch, ni validaciones manuales, ni consultas, ni
    /// constructor. El manejador llega por <c>[FromServices]</c>, un caso de uso por acción.
    /// </para>
    /// </summary>
    [Authorize]
    public sealed class ControladorMarcas : ControladorBase
    {
        [HttpGet("[action]")]
        [AutorizarPermiso(Permisos.Marcas.Ver)]
        [ProducesResponseType(typeof(RespuestaPaginada<RespuestaMarca>), StatusCodes.Status200OK)]
        public async Task<ActionResult<RespuestaPaginada<RespuestaMarca>>> BuscarMarcas(
            [FromQuery] SolicitudBuscarMarcas solicitud,
            [FromServices] ManejadorBuscarMarcas manejador,
            CancellationToken ct)
        {
            long empresaId = this.ObtenerEmpresaIdDesdeToken();

            ResultadoPaginado<ItemMarca> resultado = await manejador.ManejarAsync(
                empresaId,
                new ConsultaBuscarMarcas(solicitud.Criterio, solicitud.SoloActivas, solicitud.Pagina, solicitud.TamanoPagina),
                ct);

            return Ok(ARespuesta(resultado, Proyectar));
        }

        [HttpGet("[action]/{id:long}")]
        [AutorizarPermiso(Permisos.Marcas.Ver)]
        [ProducesResponseType(typeof(RespuestaMarca), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<RespuestaMarca>> ObtenerMarcaPorId(
            long id,
            [FromServices] ManejadorObtenerMarca manejador,
            CancellationToken ct)
        {
            long empresaId = this.ObtenerEmpresaIdDesdeToken();
            ResultadoMarca resultado = await manejador.ManejarAsync(empresaId, id, ct);

            return Ok(Proyectar(resultado.Marca));
        }

        [HttpPost("[action]")]
        [AutorizarPermiso(Permisos.Marcas.Gestionar)]
        [ProducesResponseType(typeof(RespuestaOperacionMarca), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status409Conflict)]
        public async Task<ActionResult<RespuestaOperacionMarca>> CrearMarca(
            [FromBody] SolicitudCrearMarca solicitud,
            [FromServices] ManejadorCrearMarca manejador,
            CancellationToken ct)
        {
            long empresaId = this.ObtenerEmpresaIdDesdeToken();

            ResultadoCrearMarca resultado = await manejador.ManejarAsync(
                empresaId,
                new ComandoCrearMarca(solicitud.Nombre, solicitud.Descripcion, solicitud.Activo),
                ct);

            RespuestaOperacionMarca respuesta = new(resultado.Exitoso, resultado.Mensaje, resultado.Id);

            return CreatedAtAction(nameof(ObtenerMarcaPorId), new { id = resultado.Id }, respuesta);
        }

        [HttpPut("[action]/{id:long}")]
        [AutorizarPermiso(Permisos.Marcas.Gestionar)]
        [ProducesResponseType(typeof(RespuestaOperacionMarca), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status409Conflict)]
        public async Task<ActionResult<RespuestaOperacionMarca>> ActualizarMarca(
            long id,
            [FromBody] SolicitudActualizarMarca solicitud,
            [FromServices] ManejadorActualizarMarca manejador,
            CancellationToken ct)
        {
            long empresaId = this.ObtenerEmpresaIdDesdeToken();

            ResultadoActualizarMarca resultado = await manejador.ManejarAsync(
                empresaId,
                new ComandoActualizarMarca(id, solicitud.Nombre, solicitud.Descripcion, solicitud.Activo),
                ct);

            return Ok(new RespuestaOperacionMarca(resultado.Exitoso, resultado.Mensaje, resultado.Id));
        }

        /// <summary>
        /// Baja lógica. No existe borrado físico en el sistema: hay documentos históricos que
        /// siguen apuntando a la marca y deben poder leerse. Ver docs/decisiones/ADR-0007.
        /// </summary>
        [HttpPatch("[action]/{id:long}")]
        [AutorizarPermiso(Permisos.Marcas.Gestionar)]
        [ProducesResponseType(typeof(RespuestaOperacionMarca), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status409Conflict)]
        public async Task<ActionResult<RespuestaOperacionMarca>> DesactivarMarca(
            long id,
            [FromServices] ManejadorDesactivarMarca manejador,
            CancellationToken ct)
        {
            long empresaId = this.ObtenerEmpresaIdDesdeToken();
            ResultadoDesactivarMarca resultado = await manejador.ManejarAsync(empresaId, id, ct);

            return Ok(new RespuestaOperacionMarca(resultado.Exitoso, resultado.Mensaje, resultado.Id));
        }

        private static RespuestaMarca Proyectar(ItemMarca item) =>
            new(item.Id, item.Nombre, item.Descripcion, item.Activo);
    }
}
