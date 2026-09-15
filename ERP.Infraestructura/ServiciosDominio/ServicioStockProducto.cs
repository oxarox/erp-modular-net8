using ERP.Dominio.Entidades;
using ERP.Dominio.Servicios;
using ERP.Infraestructura.Contexto;
using Microsoft.EntityFrameworkCore;

namespace ERP.Infraestructura.ServiciosDominio
{
    /// <summary>
    /// Implementación del contrato de stock que define el dominio.
    /// <para>
    /// Vive en <c>ServiciosDominio</c> y no en <c>Repositorios</c> por una razón concreta:
    /// no es acceso a datos de una entidad, es una regla del negocio (el saldo es la proyección
    /// de los movimientos) que necesita la base de datos para resolverse. La regla la dicta el
    /// dominio; aquí solo se elige cómo se ejecuta.
    /// </para>
    /// </summary>
    public sealed class ServicioStockProducto : IServicioStockProducto
    {
        private readonly ContextoErp _contexto;

        public ServicioStockProducto(ContextoErp contexto)
        {
            _contexto = contexto;
        }

        public async Task<decimal> ObtenerDisponibleAsync(long empresaId, long productoId, long almacenId, CancellationToken cancelacion)
        {
            ExistenciaProducto? existencia = await _contexto.Existencias
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    e => e.EmpresaId == empresaId && e.ProductoId == productoId && e.AlmacenId == almacenId,
                    cancelacion);

            return existencia?.Cantidad ?? 0m;
        }

        public async Task AplicarMovimientoAsync(MovimientoInventario movimiento, CancellationToken cancelacion)
        {
            PoliticaInmutabilidadMovimientoInventario.AsegurarQuePuedeRegistrarse(movimiento);

            _contexto.MovimientosInventario.Add(movimiento);

            ExistenciaProducto? existencia = await _contexto.Existencias
                .FirstOrDefaultAsync(
                    e => e.EmpresaId == movimiento.EmpresaId
                        && e.ProductoId == movimiento.ProductoId
                        && e.AlmacenId == movimiento.AlmacenId,
                    cancelacion);

            if (existencia is null)
            {
                existencia = new ExistenciaProducto
                {
                    EmpresaId = movimiento.EmpresaId,
                    ProductoId = movimiento.ProductoId,
                    AlmacenId = movimiento.AlmacenId,
                    Cantidad = 0m,
                };

                _contexto.Existencias.Add(existencia);
            }

            existencia.Cantidad += SignoDe(movimiento.Tipo) * movimiento.Cantidad;

            if (existencia.Cantidad < 0m)
            {
                // Cinturón y tirantes: el caso de uso ya validó el stock, pero entre esa
                // validación y este punto pudo entrar otra venta. Aquí se aborta la transacción.
                throw new InvalidOperationException(
                    $"El movimiento dejaría el stock del producto {movimiento.ProductoId} en negativo.");
            }
        }

        private static int SignoDe(TipoMovimientoInventario tipo) => tipo switch
        {
            TipoMovimientoInventario.Ingreso => 1,
            TipoMovimientoInventario.Egreso => -1,
            TipoMovimientoInventario.Ajuste => 1,
            TipoMovimientoInventario.Traslado => -1,
            _ => throw new ArgumentOutOfRangeException(nameof(tipo), tipo, "Tipo de movimiento no soportado."),
        };
    }
}
