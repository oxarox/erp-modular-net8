namespace ERP.Aplicacion.Abstracciones.Consultas
{
    public sealed record FilaResumenVentas(DateOnly Fecha, int Documentos, decimal Neto, decimal Impuesto, decimal Total);

    /// <summary>
    /// Read model. Los reportes NO pasan por los repositorios de escritura: leen proyecciones
    /// dedicadas, de solo lectura, que pueden agregarse en SQL sin cargar agregados completos
    /// en memoria. Es la separación lectura/escritura que justifica tener
    /// <c>Abstracciones/Consultas</c> aparte de <c>Abstracciones/Entidades</c>.
    /// </summary>
    public interface IConsultaVentasReporte
    {
        Task<IReadOnlyList<FilaResumenVentas>> ResumenDiarioAsync(
            long empresaId,
            DateOnly desde,
            DateOnly hasta,
            CancellationToken ct);
    }
}
