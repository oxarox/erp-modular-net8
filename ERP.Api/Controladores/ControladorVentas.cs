using ERP.Api.Autorizacion;
using ERP.Api.Contracts.Comun;
using ERP.Api.Contracts.Ventas;
using ERP.Aplicacion.CasosDeUso.Ventas;
using ERP.Aplicacion.Comun.Paginacion;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controladores
{
    [Authorize]
    [Route("api/ventas")]
    public sealed class ControladorVentas : ControladorBase
    {
        [HttpGet]
        [AutorizarPermiso(Permisos.Ventas.Ver)]
        [ProducesResponseType(typeof(RespuestaPaginada<RespuestaVenta>), StatusCodes.Status200OK)]
        public async Task<ActionResult<RespuestaPaginada<RespuestaVenta>>> Buscar(
            [FromServices] ManejadorBuscarVentas manejador,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta,
            [FromQuery] string? estado,
            [FromQuery] int? pagina,
            [FromQuery] int? tamanoPagina,
            CancellationToken ct)
        {
            ResultadoPaginado<ItemVenta> resultado = await manejador.ManejarAsync(
                EmpresaId,
                new ConsultaBuscarVentas(desde, hasta, estado, pagina, tamanoPagina),
                ct);

            return Ok(ARespuesta(resultado, v => new RespuestaVenta(v.Id, v.Numero, v.FechaUtc, v.Estado, v.MetodoPago, v.Total)));
        }

        [HttpPost]
        [AutorizarPermiso(Permisos.Ventas.Registrar)]
        [ProducesResponseType(typeof(RespuestaVentaRegistrada), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<RespuestaVentaRegistrada>> Registrar(
            [FromServices] ManejadorRegistrarVenta manejador,
            [FromBody] SolicitudRegistrarVenta solicitud,
            CancellationToken ct)
        {
            ComandoRegistrarVenta comando = new(
                solicitud.ClienteId,
                solicitud.AlmacenId,
                solicitud.MetodoPago,
                solicitud.Lineas.Select(l => new LineaComandoVenta(l.ProductoId, l.Cantidad, l.DescuentoLinea)).ToList());

            ResultadoRegistrarVenta resultado = await manejador.ManejarAsync(EmpresaId, comando, ct);

            RespuestaVentaRegistrada cuerpo = new(
                resultado.Id,
                resultado.Numero,
                resultado.Subtotal,
                resultado.Descuento,
                resultado.Impuesto,
                resultado.Total);

            return CreatedAtAction(nameof(Buscar), new { }, cuerpo);
        }
    }
}
