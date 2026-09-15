using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Aplicacion.Comun.Paginacion;
using ERP.Dominio.Entidades;
using ERP.Infraestructura.Contexto;
using Microsoft.EntityFrameworkCore;

namespace ERP.Infraestructura.Repositorios
{
    public sealed class RepositorioVentaEfCore : IRepositorioVenta
    {
        private readonly ContextoErp _contexto;

        public RepositorioVentaEfCore(ContextoErp contexto)
        {
            _contexto = contexto;
        }

        public async Task<Venta> RegistrarAsync(long empresaId, Venta venta, CancellationToken ct)
        {
            _contexto.Ventas.Add(venta);

            // No se llama a SaveChanges aquí: quien decide el límite de la transacción
            // es el caso de uso, a través de IUnidadDeTrabajo. Si el repositorio guardara
            // por su cuenta, la venta quedaría escrita aunque fallara el descuento de stock.
            await Task.CompletedTask;

            return venta;
        }

        public Task<Venta?> ObtenerConDetalleAsync(long empresaId, long id, CancellationToken ct) =>
            _contexto.Ventas
                .AsNoTracking()
                .Include(v => v.Detalles)
                .FirstOrDefaultAsync(v => v.EmpresaId == empresaId && v.Id == id, ct);

        public async Task<ResultadoPaginado<Venta>> BuscarAsync(
            long empresaId,
            DateTime? desdeUtc,
            DateTime? hastaUtc,
            string? estado,
            SolicitudPaginada paginacion,
            CancellationToken ct)
        {
            IQueryable<Venta> consulta = _contexto.Ventas
                .AsNoTracking()
                .Where(v => v.EmpresaId == empresaId);

            if (desdeUtc is not null)
            {
                consulta = consulta.Where(v => v.FechaUtc >= desdeUtc.Value);
            }

            if (hastaUtc is not null)
            {
                // El filtro "hasta" es inclusivo del día completo: quien pide el 15 espera
                // ver las ventas de las 23:59 del 15. Ver docs/convenciones-endpoints.md.
                DateTime finDeDia = hastaUtc.Value.Date.AddDays(1).AddTicks(-1);
                consulta = consulta.Where(v => v.FechaUtc <= finDeDia);
            }

            if (!string.IsNullOrWhiteSpace(estado))
            {
                consulta = consulta.Where(v => v.Estado == estado);
            }

            // Se cuenta y se pagina en la base de datos: nunca se materializa la tabla completa
            // para contar en memoria.
            int total = await consulta.CountAsync(ct);

            List<Venta> pagina = await consulta
                .OrderByDescending(v => v.FechaUtc)
                .ThenByDescending(v => v.Id)
                .Skip(paginacion.Saltar())
                .Take(paginacion.TamanoPagina)
                .ToListAsync(ct);

            return new ResultadoPaginado<Venta>(paginacion.Pagina, paginacion.TamanoPagina, total, pagina);
        }

        /// <summary>
        /// Folio correlativo por empresa y día. En producción esto se resuelve con una tabla
        /// de correlativos bloqueada por la transacción; aquí se deja la versión legible,
        /// documentando explícitamente el límite.
        /// </summary>
        public async Task<string> SiguienteNumeroAsync(long empresaId, DateTime fechaUtc, CancellationToken ct)
        {
            string prefijo = $"V-{fechaUtc:yyyyMMdd}-";

            int emitidasHoy = await _contexto.Ventas
                .IgnoreQueryFilters()
                .Where(v => v.EmpresaId == empresaId && v.Numero.StartsWith(prefijo))
                .CountAsync(ct);

            return $"{prefijo}{emitidasHoy + 1:D4}";
        }
    }
}
