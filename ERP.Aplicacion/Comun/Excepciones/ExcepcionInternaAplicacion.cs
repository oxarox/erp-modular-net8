namespace ERP.Aplicacion.Comun.Excepciones
{
    /// <summary>
    /// Se traduce a HTTP 500. Representa un fallo que el usuario no puede corregir;
    /// el mensaje que sale al cliente es genérico y el detalle queda en el log con el id de correlación.
    /// </summary>
    public sealed class ExcepcionInternaAplicacion : ExcepcionAplicacion
    {
        public ExcepcionInternaAplicacion(string mensaje, string? codigoError = null, Exception? interna = null)
            : base(mensaje, codigoError)
        {
            Interna = interna;
        }

        public Exception? Interna { get; }
    }
}
