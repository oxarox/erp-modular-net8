namespace ERP.Infraestructura.Seguridad
{
    /// <summary>
    /// Parámetros del emisor de tokens. La clave de firma NO vive en appsettings.json:
    /// se inyecta por variable de entorno (Jwt__ClaveFirma) y el arranque falla si falta
    /// o si es demasiado corta. Ver docs/seguridad-y-rbac.md.
    /// </summary>
    public sealed class OpcionesJwt
    {
        public const string Seccion = "Jwt";

        /// <summary>Largo mínimo de la clave HMAC-SHA256, en caracteres.</summary>
        public const int LargoMinimoClave = 32;

        public string Emisor { get; set; } = string.Empty;

        public string Audiencia { get; set; } = string.Empty;

        public string ClaveFirma { get; set; } = string.Empty;

        public int MinutosTokenAcceso { get; set; } = 30;

        public int DiasTokenRefresco { get; set; } = 7;

        public void Validar()
        {
            if (string.IsNullOrWhiteSpace(Emisor))
            {
                throw new InvalidOperationException("Falta la configuración Jwt:Emisor.");
            }

            if (string.IsNullOrWhiteSpace(Audiencia))
            {
                throw new InvalidOperationException("Falta la configuración Jwt:Audiencia.");
            }

            if (string.IsNullOrWhiteSpace(ClaveFirma) || ClaveFirma.Length < LargoMinimoClave)
            {
                throw new InvalidOperationException(
                    $"Jwt:ClaveFirma debe tener al menos {LargoMinimoClave} caracteres. Defínala por variable de entorno Jwt__ClaveFirma.");
            }

            if (MinutosTokenAcceso <= 0 || DiasTokenRefresco <= 0)
            {
                throw new InvalidOperationException("Las expiraciones de token deben ser mayores a cero.");
            }
        }
    }
}
