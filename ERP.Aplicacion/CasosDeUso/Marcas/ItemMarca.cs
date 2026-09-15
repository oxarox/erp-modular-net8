namespace ERP.Aplicacion.CasosDeUso.Marcas
{
    /// <summary>Proyección de una marca hacia el exterior. La entidad de dominio nunca sale de la aplicación.</summary>
    public sealed record ItemMarca(long Id, string Nombre, string? Descripcion, bool Activo);
}
