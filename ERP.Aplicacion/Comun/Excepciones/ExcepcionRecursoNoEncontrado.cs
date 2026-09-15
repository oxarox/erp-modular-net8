namespace ERP.Aplicacion.Comun.Excepciones
{
    /// <summary>
    /// Se traduce a HTTP 404. Se usa también cuando el recurso existe pero pertenece a otra empresa:
    /// devolver 403 en ese caso filtraría la existencia de datos de otro tenant.
    /// </summary>
    public sealed class ExcepcionRecursoNoEncontrado : ExcepcionAplicacion
    {
        public ExcepcionRecursoNoEncontrado(string mensaje, string? codigoError = null, object? detalles = null)
            : base(mensaje, codigoError, detalles)
        {
        }

        public static ExcepcionRecursoNoEncontrado Para(string recurso, long id, string codigoError) =>
            new($"No se encontró {recurso} con identificador {id}.", codigoError);
    }
}
