namespace ERP.Aplicacion.CasosDeUso.Productos
{
    /// <summary>Proyección de un producto del catálogo hacia el exterior. La entidad de dominio nunca sale de la aplicación.</summary>
    public sealed record ItemProducto(
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
