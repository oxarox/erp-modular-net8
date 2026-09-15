namespace ERP.Aplicacion.Comun.Excepciones
{
    /// <summary>Se traduce a HTTP 401 o 403 según el caso: credenciales inválidas o permiso ausente.</summary>
    public sealed class ExcepcionNoAutorizada : ExcepcionAplicacion
    {
        public ExcepcionNoAutorizada(string mensaje, string? codigoError = null, bool esProhibido = false)
            : base(mensaje, codigoError)
        {
            EsProhibido = esProhibido;
        }

        /// <summary><c>true</c> cuando el usuario está autenticado pero le falta el permiso (403).</summary>
        public bool EsProhibido { get; }
    }
}
