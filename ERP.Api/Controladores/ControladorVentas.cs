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
    public sealed class ControladorVentas : ControladorBase
    {
        [HttpGet("[action]")]
        [AutorizarPermiso(Permisos.Ventas.Ver)]
        [ProducesResponseType(typeof(RespuestaPaginada<RespuestaVenta>), StatusCodes.Status200OK)]
        public async Task<ActionResult<RespuestaPaginada<RespuestaVenta>>> BuscarVentas(
            [FromQuery] SolicitudBuscarVentas solicitud,
            [FromServices] ManejadorBuscarVentas manejador,
            CancellationToken ct)
        {
            long empresaId = this.ObtenerEmpresaIdDesdeToken();

            ResultadoPaginado<ItemVenta> resultado = await manejador.ManejarAsync(
                empresaId,
                new ConsultaBuscarVentas(solicitud.Desde, solicitud.Hasta, solicitud.Estado, solicitud.Pagina, solicitud.TamanoPagina),
                ct);

            return Ok(ARespuesta(
                resultado,
                v => new RespuestaVenta(v.Id, v.Numero, v.FechaUtc, v.Estado, v.MetodoPago, v.Total)));
        }

        [HttpPost("[action]")]
        [AutorizarPermiso(Permisos.Ventas.Registrar)]
        [ProducesResponseType(typeof(RespuestaVentaRegistrada), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<RespuestaVentaRegistrada>> RegistrarVenta(
            [FromBody] SolicitudRegistrarVenta solicitud,
            [FromServices] ManejadorRegistrarVenta manejador,
            CancellationToken ct)
        {
            long empresaId = this.ObtenerEmpresaIdDesdeToken();

            ComandoRegistrarVenta comando = new(
                solicitud.ClienteId,
                solicitud.AlmacenId,
                solicitud.MetodoPago,
                solicitud.Lineas.Select(l => new LineaComandoVenta(l.ProductoId, l.Cantidad, l.DescuentoLinea)).ToList());

            ResultadoRegistrarVenta resultado = await manejador.ManejarAsync(empresaId, comando, ct);

            return StatusCode(
                StatusCodes.Status201Created,
                new RespuestaVentaRegistrada(
                    resultado.Id,
                    resultado.Numero,
                    resultado.Subtotal,
                    resultado.Descuento,
                    resultado.Impuesto,
                    resultado.Total));
        }
    }
}
