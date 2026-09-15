namespace ERP.Aplicacion.CasosDeUso.Ventas
{
    public sealed record LineaComandoVenta(long ProductoId, int Cantidad, decimal? DescuentoLinea);

    public sealed record ComandoRegistrarVenta(
        long? ClienteId,
        long AlmacenId,
        string MetodoPago,
        IReadOnlyList<LineaComandoVenta> Lineas);
}
