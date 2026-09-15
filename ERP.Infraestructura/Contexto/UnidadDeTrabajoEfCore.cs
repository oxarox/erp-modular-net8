using ERP.Aplicacion.Abstracciones.Entidades;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace ERP.Infraestructura.Contexto
{
    /// <summary>
    /// Transacción sobre el <see cref="ContextoErp"/>, ejecutada dentro de la estrategia de
    /// reintentos de EF Core.
    /// <para>
    /// El detalle que importa: la conexión declara <c>EnableRetryOnFailure</c> para sobrevivir a
    /// caídas transitorias de red y a los failover del servidor. Esa estrategia y una
    /// transacción abierta a mano son incompatibles —EF lanza
    /// <c>InvalidOperationException</c>— porque al reintentar tendría que repetir la unidad
    /// entera, no la última sentencia. Por eso la operación llega como delegado: se ejecuta
    /// DENTRO de la estrategia, y un reintento repite todo el bloque desde cero.
    /// </para>
    /// <para>
    /// Si el proveedor no soporta transacciones (el proveedor en memoria de las pruebas), la
    /// operación se ejecuta igual, sin transacción. El caso de uso no necesita saberlo.
    /// </para>
    /// </summary>
    public sealed class UnidadDeTrabajoEfCore : IUnidadDeTrabajo
    {
        private readonly ContextoErp _contexto;

        public UnidadDeTrabajoEfCore(ContextoErp contexto)
        {
            _contexto = contexto;
        }

        public async Task<T> EjecutarEnTransaccionAsync<T>(Func<CancellationToken, Task<T>> operacion, CancellationToken ct)
        {
            ArgumentNullException.ThrowIfNull(operacion);

            IExecutionStrategy estrategia = _contexto.Database.CreateExecutionStrategy();

            return await estrategia.ExecuteAsync(async () =>
            {
                if (!_contexto.Database.IsRelational())
                {
                    return await operacion(ct);
                }

                await using IDbContextTransaction transaccion = await _contexto.Database.BeginTransactionAsync(ct);

                try
                {
                    T resultado = await operacion(ct);

                    await _contexto.SaveChangesAsync(ct);
                    await transaccion.CommitAsync(ct);

                    return resultado;
                }
                catch
                {
                    await transaccion.RollbackAsync(ct);
                    throw;
                }
            });
        }

        public Task<int> GuardarCambiosAsync(CancellationToken ct) => _contexto.SaveChangesAsync(ct);
    }
}
