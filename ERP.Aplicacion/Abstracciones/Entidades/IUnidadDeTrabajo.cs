namespace ERP.Aplicacion.Abstracciones.Entidades
{
    /// <summary>
    /// Transacción explícita para los casos de uso que escriben en más de un agregado
    /// (registrar una venta toca venta, detalle, movimientos de inventario y existencias).
    /// La capa de aplicación decide el límite transaccional; la infraestructura lo implementa.
    /// </summary>
    public interface IUnidadDeTrabajo
    {
        Task<IAsyncDisposable> IniciarTransaccionAsync(CancellationToken ct);

        Task ConfirmarAsync(CancellationToken ct);

        Task RevertirAsync(CancellationToken ct);

        Task<int> GuardarCambiosAsync(CancellationToken ct);
    }
}
