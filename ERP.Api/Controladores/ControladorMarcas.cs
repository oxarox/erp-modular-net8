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
    /// para los demás módulos: rutas en kebab-case, un permiso por acción, un manejador por
    /// endpoint y contratos propios de la API que nunca exponen la entidad de dominio.
    /// <para>
    /// Obsérvese lo que NO hay: ni try/catch, ni validaciones manuales, ni consultas.
    /// Un controlador traduce HTTP a un caso de uso y de vuelta; todo lo demás está delegado.
    /// </para>
    /// </summary>
    [Authorize]
    [Route("api/marcas")]
    public sealed class ControladorMarcas : ControladorBase
    {
        [HttpGet]
        [AutorizarPermiso(Permisos.Marcas.Ver)]
        [ProducesResponseType(typeof(RespuestaPaginada<RespuestaMarca>), StatusCodes.Status200OK)]
        public async Task<ActionResult<RespuestaPaginada<RespuestaMarca>>> Buscar(
            [FromServices] ManejadorBuscarMarcas manejador,
            [FromQuery] string? criterio,
            [FromQuery] bool? soloActivas,
            [FromQuery] int? pagina,
            [FromQuery] int? tamanoPagina,
            CancellationToken ct)
        {
            ResultadoPaginado<ItemMarca> resultado = await manejador.ManejarAsync(
                EmpresaId,
                new ConsultaBuscarMarcas(criterio, soloActivas, pagina, tamanoPagina),
                ct);

            return Ok(ARespuesta(resultado, Proyectar));
        }

        [HttpGet("{id:long}")]
        [AutorizarPermiso(Permisos.Marcas.Ver)]
        [ProducesResponseType(typeof(RespuestaMarca), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<RespuestaMarca>> Obtener(
            [FromServices] ManejadorObtenerMarca manejador,
            long id,
            CancellationToken ct)
        {
            ResultadoMarca resultado = await manejador.ManejarAsync(EmpresaId, id, ct);

            return Ok(Proyectar(resultado.Marca));
        }

        [HttpPost]
        [AutorizarPermiso(Permisos.Marcas.Gestionar)]
        [ProducesResponseType(typeof(RespuestaOperacionMarca), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status409Conflict)]
        public async Task<ActionResult<RespuestaOperacionMarca>> Crear(
            [FromServices] ManejadorCrearMarca manejador,
            [FromBody] SolicitudCrearMarca solicitud,
            CancellationToken ct)
        {
            ResultadoCrearMarca resultado = await manejador.ManejarAsync(
                EmpresaId,
                new ComandoCrearMarca(solicitud.Nombre, solicitud.Descripcion, solicitud.Activo),
                ct);

            RespuestaOperacionMarca cuerpo = new(resultado.Exitoso, resultado.Mensaje, resultado.Id);

            return CreatedAtAction(nameof(Obtener), new { id = resultado.Id }, cuerpo);
        }

        [HttpPut("{id:long}")]
        [AutorizarPermiso(Permisos.Marcas.Gestionar)]
        [ProducesResponseType(typeof(RespuestaOperacionMarca), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status409Conflict)]
        public async Task<ActionResult<RespuestaOperacionMarca>> Actualizar(
            [FromServices] ManejadorActualizarMarca manejador,
            long id,
            [FromBody] SolicitudActualizarMarca solicitud,
            CancellationToken ct)
        {
            ResultadoActualizarMarca resultado = await manejador.ManejarAsync(
                EmpresaId,
                new ComandoActualizarMarca(id, solicitud.Nombre, solicitud.Descripcion, solicitud.Activo),
                ct);

            return Ok(new RespuestaOperacionMarca(resultado.Exitoso, resultado.Mensaje, resultado.Id));
        }

        /// <summary>
        /// Baja lógica. No existe DELETE físico en el sistema: hay documentos históricos
        /// que siguen apuntando a la marca y deben poder leerse.
        /// </summary>
        [HttpPatch("{id:long}/desactivar")]
        [AutorizarPermiso(Permisos.Marcas.Gestionar)]
        [ProducesResponseType(typeof(RespuestaOperacionMarca), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<RespuestaOperacionMarca>> Desactivar(
            [FromServices] ManejadorDesactivarMarca manejador,
            long id,
            CancellationToken ct)
        {
            ResultadoDesactivarMarca resultado = await manejador.ManejarAsync(EmpresaId, id, ct);

            return Ok(new RespuestaOperacionMarca(resultado.Exitoso, resultado.Mensaje, resultado.Id));
        }

        private static RespuestaMarca Proyectar(ItemMarca item) =>
            new(item.Id, item.Nombre, item.Descripcion, item.Activo);
    }
}
