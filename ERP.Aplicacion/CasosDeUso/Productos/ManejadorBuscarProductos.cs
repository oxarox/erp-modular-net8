using ERP.Aplicacion.Abstracciones.Consultas;
using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Aplicacion.Comun.CodigosError;
using ERP.Aplicacion.Comun.Excepciones;
using ERP.Aplicacion.Comun.Paginacion;

namespace ERP.Aplicacion.CasosDeUso.Productos
{
    /// <summary>
    /// Búsqueda del catálogo para armar una venta.
    /// <para>
    /// El manejador no consulta ni ordena en memoria —el catálogo crece, en el sistema real son
    /// decenas de miles de SKU, y traerlo entero para quedarse con veinticinco filas es un
    /// problema que aparece recién en producción—, pero sí toma las dos decisiones del caso de
    /// uso: que el almacén recibido sea de la empresa, y qué significa la existencia que el read
    /// model devuelve en crudo.
    /// </para>
    /// </summary>
    public sealed class ManejadorBuscarProductos
    {
        private readonly IConsultaCatalogoProductos _consulta;
        private readonly IRepositorioAlmacen _almacenes;

        public ManejadorBuscarProductos(IConsultaCatalogoProductos consulta, IRepositorioAlmacen almacenes)
        {
            _consulta = consulta;
            _almacenes = almacenes;
        }

        public async Task<ResultadoPaginado<ItemProducto>> ManejarAsync(long empresaId, ConsultaBuscarProductos consulta, CancellationToken ct)
        {
            // El almacén llega del query string y el front lo recuerda entre sesiones: puede
            // venir de una bodega dada de baja, de otra empresa, o ser un cero. Sin esta
            // comprobación la consulta no encuentra existencias y el catálogo entero viajaría
            // con saldo cero —"no queda"— sobre un almacén del que no se sabe nada.
            if (consulta.AlmacenId is long almacenId && !await _almacenes.ExisteAsync(empresaId, almacenId, ct))
            {
                throw ExcepcionRecursoNoEncontrado.Para("el almacén", almacenId, CodigosErrorAlmacenes.NoEncontrado);
            }

            SolicitudPaginada paginacion = SolicitudPaginada.Normalizar(consulta.Pagina, consulta.TamanoPagina);

            ResultadoPaginado<FilaCatalogoProducto> encontrados = await _consulta.BuscarAsync(
                empresaId,
                string.IsNullOrWhiteSpace(consulta.Criterio) ? null : consulta.Criterio.Trim(),
                consulta.SoloActivos,
                consulta.AlmacenId,
                paginacion,
                ct);

            IReadOnlyList<ItemProducto> items = encontrados.Items
                .Select(fila => Proyectar(fila, consulta.AlmacenId))
                .ToList();

            return new ResultadoPaginado<ItemProducto>(encontrados.Pagina, encontrados.TamanoPagina, encontrados.Total, items);
        }

        internal static ItemProducto Proyectar(FilaCatalogoProducto fila, long? almacenId) =>
            new(
                fila.Id,
                fila.Sku,
                fila.Nombre,
                fila.Marca,
                fila.Categoria,
                fila.PrecioVenta,
                fila.ControlaInventario,
                fila.Activo,
                StockDe(fila, almacenId));

        /// <summary>
        /// Un servicio no tiene existencias y una consulta sin almacén no sabe de cuál hablar:
        /// en ambos casos el saldo es desconocido, y viaja nulo para que el front no pinte la
        /// línea como agotada. La ausencia de fila en <c>existencias</c>, en cambio, sí es un
        /// cero: el producto se maneja en ese almacén —que ya se verificó que es de la empresa—
        /// y no queda ninguno.
        /// </summary>
        private static decimal? StockDe(FilaCatalogoProducto fila, long? almacenId)
        {
            if (almacenId is null || !fila.ControlaInventario)
            {
                return null;
            }

            return fila.Existencia ?? 0m;
        }
    }
}
