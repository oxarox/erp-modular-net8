namespace ERP.Aplicacion.Comun.Excepciones
{
    /// <summary>Se traduce a HTTP 409. Choca con el estado actual: duplicados, transiciones no permitidas.</summary>
    public sealed class ExcepcionConflicto : ExcepcionAplicacion
    {
        public ExcepcionConflicto(string mensaje, string? codigoError = null, object? detalles = null)
            : base(mensaje, codigoError, detalles)
        {
        }
    }
}
