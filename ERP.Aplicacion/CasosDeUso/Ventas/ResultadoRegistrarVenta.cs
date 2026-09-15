namespace ERP.Aplicacion.CasosDeUso.Ventas
{
    public sealed record ResultadoRegistrarVenta(
        bool Exitoso,
        string Mensaje,
        long Id,
        string Numero,
        decimal Subtotal,
        decimal Descuento,
        decimal Impuesto,
        decimal Total);
}
