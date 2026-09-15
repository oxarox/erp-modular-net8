namespace ERP.Aplicacion.CasosDeUso.Ventas
{
    public sealed record ConsultaBuscarVentas(
        DateTime? DesdeUtc,
        DateTime? HastaUtc,
        string? Estado,
        int? Pagina,
        int? TamanoPagina);
}
