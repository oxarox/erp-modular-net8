namespace ERP.Api.Contracts.Productos
{
    public sealed record SolicitudBuscarProductos(
        string? Criterio,
        bool? SoloActivos,
        long? AlmacenId,
        int? Pagina,
        int? TamanoPagina);

    public sealed record RespuestaProducto(
        long Id,
        string Sku,
        string Nombre,
        string? Marca,
        string? Categoria,
        decimal PrecioVenta,
        bool ControlaInventario,
        bool Activo,
        decimal? StockDisponible);
}
