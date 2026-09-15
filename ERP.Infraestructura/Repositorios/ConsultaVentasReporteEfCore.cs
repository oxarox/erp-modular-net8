using ERP.Aplicacion.Abstracciones.Consultas;
using ERP.Infraestructura.Contexto;
using Microsoft.EntityFrameworkCore;

namespace ERP.Infraestructura.Repositorios
{
    /// <summary>
    /// Read model de reportes. No hereda ni comparte nada con los repositorios de escritura:
    /// agrega en la base de datos y proyecta directamente al record que el reporte necesita,
    /// sin materializar entidades de dominio.
    /// </summary>
    public sealed class ConsultaVentasReporteEfCore : IConsultaVentasReporte
    {
        private readonly ContextoErp _contexto;

        public ConsultaVentasReporteEfCore(ContextoErp contexto)
        {
            _contexto = contexto;
        }

        public async Task<IReadOnlyList<FilaResumenVentas>> ResumenDiarioAsync(
            long empresaId,
            DateOnly desde,
            DateOnly hasta,
            CancellationToken ct)
        {
            DateTime inicio = desde.ToDateTime(TimeOnly.MinValue);
            DateTime fin = hasta.ToDateTime(TimeOnly.MaxValue);

            var filas = await _contexto.Ventas
                .AsNoTracking()
                .Where(v => v.EmpresaId == empresaId)
                .Where(v => v.FechaUtc >= inicio && v.FechaUtc <= fin)
                .Where(v => v.Estado == Dominio.Entidades.EstadosVenta.Completada)
                .GroupBy(v => v.FechaUtc.Date)
                .Select(g => new
                {
                    Fecha = g.Key,
                    Documentos = g.Count(),
                    Neto = g.Sum(v => v.Subtotal - v.Descuento),
                    Impuesto = g.Sum(v => v.Impuesto),
                    Total = g.Sum(v => v.Total),
                })
                .OrderBy(f => f.Fecha)
                .ToListAsync(ct);

            return filas
                .Select(f => new FilaResumenVentas(
                    DateOnly.FromDateTime(f.Fecha),
                    f.Documentos,
                    f.Neto,
                    f.Impuesto,
                    f.Total))
                .ToList();
        }
    }
}
