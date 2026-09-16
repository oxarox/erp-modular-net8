using ERP.Api.Autorizacion;
using ERP.Api.Contracts.Comun;
using ERP.Api.Contracts.Productos;
using ERP.Aplicacion.CasosDeUso.Productos;
using ERP.Aplicacion.Comun.Paginacion;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controladores
{
    /// <summary>
    /// Módulo de productos. Por ahora expone solo la lectura del catálogo: es lo que necesita
    /// el front para armar una venta, y la ficha de producto llega con su propio módulo.
    /// </summary>
    [Authorize]
    public sealed class ControladorProductos : ControladorBase
    {
        /// <summary>
        /// Busca en el catálogo por SKU o nombre. Si se indica <c>almacenId</c>, cada producto
        /// que controle inventario viaja con su saldo en ese almacén: es lo que permite que el
        /// mostrador vea el stock sin una llamada por línea.
        /// <para>
        /// Un <c>almacenId</c> que no sea de la empresa responde 404 (<c>ALMA_001</c>) en vez de
        /// un catálogo con todo en cero: el cliente —que suele recordar la bodega elegida entre
        /// sesiones— necesita saber que su parámetro dejó de servir.
        /// </para>
        /// </summary>
        [HttpGet("[action]")]
        [AutorizarPermiso(Permisos.Productos.Ver)]
        [ProducesResponseType(typeof(RespuestaPaginada<RespuestaProducto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(RespuestaError), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<RespuestaPaginada<RespuestaProducto>>> BuscarProductos(
            [FromQuery] SolicitudBuscarProductos solicitud,
            [FromServices] ManejadorBuscarProductos manejador,
            CancellationToken ct)
        {
            long empresaId = this.ObtenerEmpresaIdDesdeToken();

            ResultadoPaginado<ItemProducto> resultado = await manejador.ManejarAsync(
                empresaId,
                new ConsultaBuscarProductos(
                    solicitud.Criterio,
                    solicitud.SoloActivos,
                    solicitud.AlmacenId,
                    solicitud.Pagina,
                    solicitud.TamanoPagina),
                ct);

            return Ok(ARespuesta(resultado, Proyectar));
        }

        private static RespuestaProducto Proyectar(ItemProducto item) =>
            new(
                item.Id,
                item.Sku,
                item.Nombre,
                item.Marca,
                item.Categoria,
                item.PrecioVenta,
                item.ControlaInventario,
                item.Activo,
                item.StockDisponible);
    }
}
