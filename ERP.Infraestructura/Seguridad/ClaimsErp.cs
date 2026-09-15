namespace ERP.Infraestructura.Seguridad
{
    /// <summary>Nombres de los claims propios del sistema. Centralizados para que emisor y lector no se desincronicen.</summary>
    public static class ClaimsErp
    {
        public const string EmpresaId = "empresa_id";
        public const string UsuarioId = "usuario_id";
        public const string NombreCompleto = "nombre";
        public const string Permiso = "permiso";
        public const string VersionAutenticacion = "auth_version";
    }
}
