namespace ERP.Dominio.Entidades
{
    /// <summary>
    /// Permiso concedido a un rol, con el formato canónico "modulo.accion"
    /// (por ejemplo "marcas.gestionar" o "ventas.registrar").
    /// Ver docs/seguridad-y-rbac.md.
    /// </summary>
    public sealed class RolPermiso
    {
        public long Id { get; init; }
        public long RolId { get; init; }
        public string Permiso { get; init; } = string.Empty;

        public Rol? Rol { get; init; }
    }
}
