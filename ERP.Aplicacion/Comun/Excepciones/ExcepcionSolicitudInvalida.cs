namespace ERP.Aplicacion.Comun.Excepciones
{
    /// <summary>Se traduce a HTTP 400. La solicitud es sintácticamente válida pero viola una regla de negocio.</summary>
    public sealed class ExcepcionSolicitudInvalida : ExcepcionAplicacion
    {
        public ExcepcionSolicitudInvalida(string mensaje, string? codigoError = null, object? detalles = null)
            : base(mensaje, codigoError, detalles)
        {
        }
    }
}
