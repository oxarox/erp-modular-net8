namespace ERP.Aplicacion.CasosDeUso.Productos
{
    public sealed record ConsultaBuscarProductos(
        string? Criterio,
        bool? SoloActivos,
        long? AlmacenId,
        int? Pagina,
        int? TamanoPagina);
}
