namespace ERP.Aplicacion.CasosDeUso.Marcas
{
    public sealed record ConsultaBuscarMarcas(string? Criterio, bool? SoloActivas, int? Pagina, int? TamanoPagina);
}
