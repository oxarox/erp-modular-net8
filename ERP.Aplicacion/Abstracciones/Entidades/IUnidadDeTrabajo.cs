namespace ERP.Aplicacion.Abstracciones.Entidades
{
    /// <summary>
    /// Límite transaccional para los casos de uso que escriben en más de un agregado
    /// (registrar una venta toca venta, detalle, movimientos de inventario y existencias).
    /// <para>
    /// La operación se entrega como delegado y no como un par abrir/confirmar por una razón
    /// concreta: la conexión tiene reintentos ante fallos transitorios habilitados, y una
    /// estrategia de reintento necesita poder <b>volver a ejecutar la unidad completa</b>. Con
    /// transacciones abiertas a mano, EF Core rechaza la combinación en tiempo de ejecución.
    /// </para>
    /// <para>
    /// La capa de aplicación decide QUÉ es atómico; la infraestructura decide CÓMO se garantiza.
    /// </para>
    /// </summary>
    public interface IUnidadDeTrabajo
    {
        Task<T> EjecutarEnTransaccionAsync<T>(Func<CancellationToken, Task<T>> operacion, CancellationToken ct);

        Task<int> GuardarCambiosAsync(CancellationToken ct);
    }
}
