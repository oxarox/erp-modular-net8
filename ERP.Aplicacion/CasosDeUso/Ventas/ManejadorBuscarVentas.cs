using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Aplicacion.Comun.Paginacion;
using ERP.Dominio.Entidades;

namespace ERP.Aplicacion.CasosDeUso.Ventas
{
    public sealed class ManejadorBuscarVentas
    {
        private readonly IRepositorioVenta _repositorio;

        public ManejadorBuscarVentas(IRepositorioVenta repositorio)
        {
            _repositorio = repositorio;
        }

        public async Task<ResultadoPaginado<ItemVenta>> ManejarAsync(long empresaId, ConsultaBuscarVentas consulta, CancellationToken ct)
        {
            SolicitudPaginada paginacion = SolicitudPaginada.Normalizar(consulta.Pagina, consulta.TamanoPagina);

            ResultadoPaginado<Venta> ventas = await _repositorio.BuscarAsync(
                empresaId,
                consulta.DesdeUtc,
                consulta.HastaUtc,
                string.IsNullOrWhiteSpace(consulta.Estado) ? null : consulta.Estado.Trim().ToUpperInvariant(),
                paginacion,
                ct);

            IReadOnlyList<ItemVenta> items = ventas.Items
                .Select(v => new ItemVenta(v.Id, v.Numero, v.FechaUtc, v.Estado, v.MetodoPago, v.Total))
                .ToList();

            return new ResultadoPaginado<ItemVenta>(ventas.Pagina, ventas.TamanoPagina, ventas.Total, items);
        }
    }
}
