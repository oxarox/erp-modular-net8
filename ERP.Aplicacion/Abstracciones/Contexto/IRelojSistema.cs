namespace ERP.Aplicacion.Abstracciones.Contexto
{
    /// <summary>
    /// Abstracción del reloj. Nada en las capas de dominio y aplicación llama a
    /// <c>DateTime.UtcNow</c> directamente: con el reloj inyectado, las reglas que dependen
    /// del tiempo (expiración de sesiones, cortes de período) se pueden probar sin esperar.
    /// </summary>
    public interface IRelojSistema
    {
        DateTime AhoraUtc { get; }
    }
}
