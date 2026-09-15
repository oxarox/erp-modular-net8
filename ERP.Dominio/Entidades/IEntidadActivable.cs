namespace ERP.Dominio.Entidades
{
    /// <summary>
    /// Entidad con baja lógica: nunca se borra físicamente, se desactiva.
    /// Ver docs/BD/convenciones-bd.md (sección "Baja lógica").
    /// </summary>
    public interface IEntidadActivable
    {
        long Id { get; }
        bool Activo { get; }
    }
}
