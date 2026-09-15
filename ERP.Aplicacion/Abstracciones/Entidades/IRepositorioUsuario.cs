using ERP.Dominio.Entidades;

namespace ERP.Aplicacion.Abstracciones.Entidades
{
    public interface IRepositorioUsuario
    {
        /// <summary>Busca por correo en TODAS las empresas: en el login todavía no hay tenant resuelto.</summary>
        Task<Usuario?> ObtenerPorCorreoAsync(string correo, CancellationToken ct);

        Task<Usuario?> ObtenerPorIdAsync(long empresaId, long id, CancellationToken ct);

        Task<IReadOnlyCollection<string>> ObtenerPermisosAsync(long usuarioId, CancellationToken ct);
    }
}
