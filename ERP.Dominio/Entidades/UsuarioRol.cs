namespace ERP.Dominio.Entidades
{
    public sealed class UsuarioRol
    {
        public long Id { get; init; }
        public long UsuarioId { get; init; }
        public long RolId { get; init; }

        public Usuario? Usuario { get; init; }
        public Rol? Rol { get; init; }
    }
}
