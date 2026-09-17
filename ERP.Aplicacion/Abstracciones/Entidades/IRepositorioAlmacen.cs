using ERP.Dominio.Entidades;

namespace ERP.Aplicacion.Abstracciones.Entidades
{
    /// <summary>
    /// Contrato de persistencia de almacenes. Hoy expone la lectura del listado y la
    /// comprobación de existencia, que es lo único que consume el sistema; el alta y la edición
    /// llegarán con su propio caso de uso y no antes, para que la interfaz no declare métodos
    /// que nadie implementa de verdad.
    /// </summary>
    public interface IRepositorioAlmacen
    {
        Task<IReadOnlyList<Almacen>> ListarAsync(long empresaId, bool? soloActivos, CancellationToken ct);

        /// <summary>
        /// Confirma que el almacén existe dentro de la empresa. Quien filtra por almacén
        /// necesita saberlo ANTES de consultar: un identificador ajeno no devuelve filas de
        /// existencias, y esa ausencia es indistinguible de un saldo en cero.
        /// </summary>
        Task<bool> ExisteAsync(long empresaId, long almacenId, CancellationToken ct);
    }
}
