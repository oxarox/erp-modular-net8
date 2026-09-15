namespace ERP.Api.Contracts.Comun
{
    /// <summary>Forma única de las respuestas de lista. Ver docs/convenciones-endpoints.md.</summary>
    public sealed record RespuestaPaginada<T>(
        int Pagina,
        int TamanoPagina,
        int Total,
        int TotalPaginas,
        IReadOnlyList<T> Items);
}
