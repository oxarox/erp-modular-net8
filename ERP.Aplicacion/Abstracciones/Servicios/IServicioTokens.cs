using ERP.Dominio.Entidades;

namespace ERP.Aplicacion.Abstracciones.Servicios
{
    public sealed record TokenEmitido(string Valor, DateTime ExpiraUtc);

    public sealed record ParTokens(TokenEmitido Acceso, TokenEmitido Refresco);

    /// <summary>
    /// Emisión de tokens. La aplicación sabe que necesita un par acceso/refresco;
    /// que por debajo sea JWT firmado con HMAC es una decisión de infraestructura.
    /// </summary>
    public interface IServicioTokens
    {
        ParTokens Emitir(Usuario usuario, IReadOnlyCollection<string> permisos);

        /// <summary>Hash del token de refresco, para guardarlo sin poder reconstruirlo.</summary>
        string CalcularHashRefresco(string tokenRefresco);
    }
}
