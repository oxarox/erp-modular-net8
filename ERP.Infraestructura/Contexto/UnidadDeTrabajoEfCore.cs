using ERP.Aplicacion.Abstracciones.Entidades;
using Microsoft.EntityFrameworkCore.Storage;

namespace ERP.Infraestructura.Contexto
{
    /// <summary>
    /// Transacción explícita sobre el <see cref="ContextoErp"/>.
    /// Si el proveedor no soporta transacciones (por ejemplo el proveedor en memoria de las pruebas),
    /// degrada a una transacción nula en vez de fallar: el caso de uso no necesita saberlo.
    /// </summary>
    public sealed class UnidadDeTrabajoEfCore : IUnidadDeTrabajo
    {
        private readonly ContextoErp _contexto;
        private IDbContextTransaction? _transaccion;

        public UnidadDeTrabajoEfCore(ContextoErp contexto)
        {
            _contexto = contexto;
        }

        public async Task<IAsyncDisposable> IniciarTransaccionAsync(CancellationToken ct)
        {
            if (_contexto.Database.CurrentTransaction is not null)
            {
                return new TransaccionNula();
            }

            try
            {
                _transaccion = await _contexto.Database.BeginTransactionAsync(ct);
                return _transaccion;
            }
            catch (InvalidOperationException)
            {
                return new TransaccionNula();
            }
        }

        public async Task ConfirmarAsync(CancellationToken ct)
        {
            if (_transaccion is not null)
            {
                await _transaccion.CommitAsync(ct);
            }
        }

        public async Task RevertirAsync(CancellationToken ct)
        {
            if (_transaccion is not null)
            {
                await _transaccion.RollbackAsync(ct);
            }
        }

        public Task<int> GuardarCambiosAsync(CancellationToken ct) => _contexto.SaveChangesAsync(ct);

        private sealed class TransaccionNula : IAsyncDisposable
        {
            public ValueTask DisposeAsync() => ValueTask.CompletedTask;
        }
    }
}
