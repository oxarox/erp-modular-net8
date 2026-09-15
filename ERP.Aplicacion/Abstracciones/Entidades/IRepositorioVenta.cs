using ERP.Aplicacion.Comun.Paginacion;
using ERP.Dominio.Entidades;

namespace ERP.Aplicacion.Abstracciones.Entidades
{
    public interface IRepositorioVenta
    {
        Task<Venta> RegistrarAsync(long empresaId, Venta venta, CancellationToken ct);

        Task<Venta?> ObtenerConDetalleAsync(long empresaId, long id, CancellationToken ct);

        Task<ResultadoPaginado<Venta>> BuscarAsync(
            long empresaId,
            DateTime? desdeUtc,
            DateTime? hastaUtc,
            string? estado,
            SolicitudPaginada paginacion,
            CancellationToken ct);

        Task<string> SiguienteNumeroAsync(long empresaId, DateTime fechaUtc, CancellationToken ct);
    }
}
