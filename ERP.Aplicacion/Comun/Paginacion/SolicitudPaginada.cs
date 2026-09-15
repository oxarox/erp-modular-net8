namespace ERP.Aplicacion.Comun.Paginacion
{
    /// <summary>
    /// Parámetros de paginación normalizados. La normalización vive aquí y no en cada manejador
    /// para que 33 módulos no inventen 33 defaults distintos.
    /// </summary>
    public sealed record SolicitudPaginada(int Pagina, int TamanoPagina)
    {
        public const int PaginaPorDefecto = 1;
        public const int TamanoPorDefecto = 25;
        public const int TamanoMaximo = 200;

        public static SolicitudPaginada Normalizar(int? pagina, int? tamanoPagina)
        {
            int paginaNormalizada = pagina is null or < 1 ? PaginaPorDefecto : pagina.Value;
            int tamanoNormalizado = tamanoPagina is null or < 1 ? TamanoPorDefecto : tamanoPagina.Value;

            if (tamanoNormalizado > TamanoMaximo)
            {
                tamanoNormalizado = TamanoMaximo;
            }

            return new SolicitudPaginada(paginaNormalizada, tamanoNormalizado);
        }

        public int Saltar() => (Pagina - 1) * TamanoPagina;
    }
}
