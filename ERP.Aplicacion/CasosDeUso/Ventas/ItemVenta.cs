namespace ERP.Aplicacion.CasosDeUso.Ventas
{
    public sealed record ItemVenta(
        long Id,
        string Numero,
        DateTime FechaUtc,
        string Estado,
        string MetodoPago,
        decimal Total);
}
