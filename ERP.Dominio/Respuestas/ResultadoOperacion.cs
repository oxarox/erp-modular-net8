namespace ERP.Dominio.Respuestas
{
    /// <summary>
    /// Respuesta mínima de una operación de dominio que puede fallar sin ser excepcional
    /// (por ejemplo, una validación de negocio esperable). Para los errores que sí son
    /// excepcionales, la capa de aplicación usa <c>ExcepcionAplicacion</c>.
    /// </summary>
    public readonly record struct ResultadoOperacion(bool Exitoso, string? Mensaje = null)
    {
        public static ResultadoOperacion Ok() => new(true);

        public static ResultadoOperacion Fallo(string mensaje) => new(false, mensaje);
    }
}
