namespace ERP.Api.Contracts.Comun
{
    /// <summary>
    /// Sobre único de error de la API. Todos los errores del sistema, sin excepción,
    /// salen con esta forma: el cliente escribe UN manejador de errores, no uno por endpoint.
    /// </summary>
    /// <param name="Codigo">Código estable del catálogo, con formato MODULO_###.</param>
    /// <param name="Mensaje">Texto en español, apto para mostrar al usuario final.</param>
    /// <param name="CorrelacionId">Identificador del request, para cruzar con los logs del servidor.</param>
    /// <param name="Detalles">Datos adicionales estructurados. Nunca incluye trazas ni SQL.</param>
    public sealed record RespuestaError(
        string Codigo,
        string Mensaje,
        string? CorrelacionId = null,
        object? Detalles = null);

    /// <summary>Error de validación de entrada: un mensaje por campo.</summary>
    public sealed record ErrorCampo(string Campo, string Codigo, string Mensaje);
}
