using ERP.Aplicacion.Abstracciones.Contexto;

namespace ERP.Tests.Comun
{
    /// <summary>
    /// Reloj determinista para pruebas. Existe porque ninguna capa llama a DateTime.UtcNow
    /// directamente: el tiempo es una dependencia inyectada, y por eso se puede fijar.
    /// </summary>
    public sealed class RelojFijo : IRelojSistema
    {
        public RelojFijo(DateTime ahoraUtc)
        {
            AhoraUtc = ahoraUtc;
        }

        public DateTime AhoraUtc { get; set; }

        public static RelojFijo EnPrimeroDeEnero() => new(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
    }
}
