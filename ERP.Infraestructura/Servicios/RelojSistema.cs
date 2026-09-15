using ERP.Aplicacion.Abstracciones.Contexto;

namespace ERP.Infraestructura.Servicios
{
    /// <summary>Única implementación que toca el reloj real del sistema.</summary>
    public sealed class RelojSistema : IRelojSistema
    {
        public DateTime AhoraUtc => DateTime.UtcNow;
    }
}
