namespace ERP.Aplicacion.Comun.Excepciones
{
    /// <summary>
    /// Raíz de las excepciones de negocio. Todo error previsible se expresa con una subclase
    /// de este tipo y lleva un <see cref="CodigoError"/> del catálogo (docs/codigos-error.md).
    /// El middleware <c>IntermediarioExcepcion</c> es el único punto del sistema que las traduce
    /// a una respuesta HTTP: ningún controlador captura excepciones para armar su propio error.
    /// </summary>
    public abstract class ExcepcionAplicacion : Exception
    {
        protected ExcepcionAplicacion(string mensaje, string? codigoError = null, object? detalles = null)
            : base(mensaje)
        {
            CodigoError = codigoError;
            Detalles = detalles;
        }

        /// <summary>Código estable del catálogo, con formato <c>MODULO_###</c>.</summary>
        public string? CodigoError { get; }

        /// <summary>Datos adicionales que el cliente puede usar para reaccionar (nunca información sensible).</summary>
        public object? Detalles { get; }
    }
}
