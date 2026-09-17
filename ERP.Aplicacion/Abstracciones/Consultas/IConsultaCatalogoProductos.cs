using ERP.Aplicacion.Comun.Paginacion;

namespace ERP.Aplicacion.Abstracciones.Consultas
{
    /// <summary>
    /// Fila del catálogo tal como sale de la base: el producto, los nombres de su marca y su
    /// categoría, y la existencia del almacén consultado.
    /// <para>
    /// <c>Existencia</c> es el saldo crudo, sin interpretar: nulo significa que no hay fila en
    /// <c>existencias</c>, no que el saldo sea desconocido ni que sea cero. Traducir esa
    /// ausencia a lo que el mostrador debe ver es una decisión de negocio y la toma
    /// <c>ManejadorBuscarProductos</c>; aquí quedaría fuera del alcance de las pruebas
    /// (docs/testing.md) y cada implementación nueva tendría que reinventarla.
    /// </para>
    /// </summary>
    public sealed record FilaCatalogoProducto(
        long Id,
        string Sku,
        string Nombre,
        string? Marca,
        string? Categoria,
        decimal PrecioVenta,
        bool ControlaInventario,
        bool Activo,
        decimal? Existencia);

    /// <summary>
    /// Read model del catálogo de productos, hermano de <see cref="IConsultaVentasReporte"/>.
    /// <para>
    /// No es un <c>IRepositorioProducto</c> con un método más: la pantalla de venta pide una
    /// fila plana que cruza cuatro tablas, y resolverla con el repositorio de escritura
    /// obligaría a cargar el agregado completo y a preguntar el saldo producto por producto.
    /// Esa consulta por fila es justo el N+1 que este contrato existe para evitar: la
    /// implementación resuelve la página entera en una sola ida a la base.
    /// </para>
    /// </summary>
    public interface IConsultaCatalogoProductos
    {
        /// <summary>
        /// Busca una página del catálogo. <paramref name="almacenId"/> viene ya validado contra
        /// la empresa: la consulta lo usa para cruzar existencias, no para comprobar nada.
        /// </summary>
        Task<ResultadoPaginado<FilaCatalogoProducto>> BuscarAsync(
            long empresaId,
            string? criterio,
            bool? soloActivos,
            long? almacenId,
            SolicitudPaginada paginacion,
            CancellationToken ct);
    }
}
