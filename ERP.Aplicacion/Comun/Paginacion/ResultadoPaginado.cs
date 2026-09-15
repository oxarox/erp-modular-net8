namespace ERP.Aplicacion.Comun.Paginacion
{
    /// <summary>
    /// Forma única de toda respuesta de lista paginada del sistema.
    /// El front puede escribir un solo componente de tabla para los 33 módulos.
    /// </summary>
    public sealed record ResultadoPaginado<T>(
        int Pagina,
        int TamanoPagina,
        int Total,
        IReadOnlyList<T> Items)
    {
        public int TotalPaginas => TamanoPagina <= 0 ? 0 : (int)Math.Ceiling(Total / (double)TamanoPagina);

        public static ResultadoPaginado<T> Vacio(SolicitudPaginada solicitud) =>
            new(solicitud.Pagina, solicitud.TamanoPagina, 0, Array.Empty<T>());
    }
}
