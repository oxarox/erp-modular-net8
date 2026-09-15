namespace ERP.Api.Contracts.Ventas
{
    public sealed record SolicitudLineaVenta(long ProductoId, int Cantidad, decimal? DescuentoLinea);

    public sealed record SolicitudRegistrarVenta(
        long? ClienteId,
        long AlmacenId,
        string MetodoPago,
        IReadOnlyList<SolicitudLineaVenta> Lineas);

    public sealed record RespuestaVentaRegistrada(
        long Id,
        string Numero,
        decimal Subtotal,
        decimal Descuento,
        decimal Impuesto,
        decimal Total);

    public sealed record RespuestaVenta(
        long Id,
        string Numero,
        DateTime FechaUtc,
        string Estado,
        string MetodoPago,
        decimal Total);
}
