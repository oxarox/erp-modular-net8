using ERP.Dominio.Entidades;

namespace ERP.Aplicacion.Abstracciones.Entidades
{
    /// <summary>
    /// Contrato de persistencia de marcas. Nótese que el <c>empresaId</c> es un parámetro explícito
    /// de cada método: el filtro global del DbContext es la segunda barrera, no la única.
    /// </summary>
    public interface IRepositorioMarca
    {
        Task<IReadOnlyList<Marca>> BuscarAsync(long empresaId, string? criterio, bool? soloActivas, CancellationToken ct);

        Task<Marca?> ObtenerPorIdAsync(long empresaId, long id, CancellationToken ct);

        Task<bool> ExisteNombreNormalizadoAsync(long empresaId, string nombreNormalizado, long? excluirId, CancellationToken ct);

        Task<Marca> CrearAsync(long empresaId, Marca marca, CancellationToken ct);

        Task<Marca?> ActualizarAsync(long empresaId, Marca marca, CancellationToken ct);

        Task<bool> DesactivarAsync(long empresaId, long id, CancellationToken ct);
    }
}
