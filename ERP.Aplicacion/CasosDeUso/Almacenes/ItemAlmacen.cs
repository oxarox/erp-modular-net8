namespace ERP.Aplicacion.CasosDeUso.Almacenes
{
    /// <summary>Proyección de un almacén hacia el exterior. La entidad de dominio nunca sale de la aplicación.</summary>
    public sealed record ItemAlmacen(long Id, string Nombre, string? Ubicacion, bool EsPredeterminado, bool Activo);
}
