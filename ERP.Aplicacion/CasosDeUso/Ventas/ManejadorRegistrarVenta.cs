using ERP.Aplicacion.Abstracciones.Contexto;
using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Aplicacion.Abstracciones.Servicios;
using ERP.Aplicacion.Comun.CodigosError;
using ERP.Aplicacion.Comun.Excepciones;
using ERP.Aplicacion.Comun.Opciones;
using ERP.Dominio.Entidades;
using ERP.Dominio.Servicios;
using Microsoft.Extensions.Options;

namespace ERP.Aplicacion.CasosDeUso.Ventas
{
    /// <summary>
    /// Caso de uso: registrar una venta.
    /// <para>
    /// Es el ejemplo difícil del repositorio, y muestra cuatro decisiones de diseño:
    /// </para>
    /// <list type="number">
    ///   <item>los productos se leen en UNA consulta por lote, no uno por uno dentro del bucle;</item>
    ///   <item>los totales los calcula el dominio (<see cref="CalculadoraTotalesVenta"/>), no el manejador;</item>
    ///   <item>venta, detalle y movimientos de inventario se escriben dentro de una sola transacción;</item>
    ///   <item>el stock se valida antes de escribir, pero la garantía real es la restricción de la base de
    ///         datos: la validación previa existe para dar un mensaje útil, no para excluir concurrencia.</item>
    /// </list>
    /// </summary>
    public sealed class ManejadorRegistrarVenta
    {
        private readonly IRepositorioVenta _repositorioVenta;
        private readonly IRepositorioProducto _repositorioProducto;
        private readonly IServicioStockProducto _stock;
        private readonly IUnidadDeTrabajo _unidadDeTrabajo;
        private readonly IProveedorContextoUsuario _usuario;
        private readonly IRelojSistema _reloj;
        private readonly IRegistroLogAcciones _bitacora;
        private readonly OpcionesVentas _opciones;

        public ManejadorRegistrarVenta(
            IRepositorioVenta repositorioVenta,
            IRepositorioProducto repositorioProducto,
            IServicioStockProducto stock,
            IUnidadDeTrabajo unidadDeTrabajo,
            IProveedorContextoUsuario usuario,
            IRelojSistema reloj,
            IRegistroLogAcciones bitacora,
            IOptions<OpcionesVentas> opciones)
        {
            _repositorioVenta = repositorioVenta;
            _repositorioProducto = repositorioProducto;
            _stock = stock;
            _unidadDeTrabajo = unidadDeTrabajo;
            _usuario = usuario;
            _reloj = reloj;
            _bitacora = bitacora;
            _opciones = opciones.Value;
        }

        public async Task<ResultadoRegistrarVenta> ManejarAsync(long empresaId, ComandoRegistrarVenta comando, CancellationToken ct)
        {
            if (comando.Lineas is null || comando.Lineas.Count == 0)
            {
                throw new ExcepcionSolicitudInvalida("La venta debe tener al menos una línea.", CodigosErrorVentas.SinLineas);
            }

            string metodoPago = comando.MetodoPago.Trim().ToUpperInvariant();

            if (!_opciones.MetodosPagoPermitidos.Contains(metodoPago))
            {
                throw new ExcepcionSolicitudInvalida(
                    $"El método de pago {comando.MetodoPago} no está habilitado.",
                    CodigosErrorVentas.MetodoPagoInvalido);
            }

            IReadOnlyList<long> idsProducto = comando.Lineas.Select(l => l.ProductoId).Distinct().ToList();
            IReadOnlyList<Producto> productos = await _repositorioProducto.ObtenerPorIdsAsync(empresaId, idsProducto, ct);
            Dictionary<long, Producto> porId = productos.ToDictionary(p => p.Id);

            List<LineaVentaCalculo> paraCalcular = new(comando.Lineas.Count);

            foreach (LineaComandoVenta linea in comando.Lineas)
            {
                if (!porId.TryGetValue(linea.ProductoId, out Producto? producto))
                {
                    throw ExcepcionRecursoNoEncontrado.Para("el producto", linea.ProductoId, CodigosErrorVentas.ProductoNoEncontrado);
                }

                if (!producto.Activo)
                {
                    throw new ExcepcionSolicitudInvalida(
                        $"El producto {producto.Nombre} está inactivo y no puede venderse.",
                        CodigosErrorVentas.ProductoInactivo);
                }

                if (linea.Cantidad <= 0)
                {
                    throw new ExcepcionSolicitudInvalida(
                        $"La cantidad del producto {producto.Nombre} debe ser mayor a cero.",
                        CodigosErrorVentas.CantidadInvalida);
                }

                if (producto.ControlaInventario)
                {
                    decimal disponible = await _stock.ObtenerDisponibleAsync(empresaId, producto.Id, comando.AlmacenId, ct);

                    if (disponible < linea.Cantidad)
                    {
                        throw new ExcepcionSolicitudInvalida(
                            $"Stock insuficiente para {producto.Nombre}: disponible {disponible:0.##}, solicitado {linea.Cantidad}.",
                            CodigosErrorVentas.StockInsuficiente,
                            new { producto.Id, Disponible = disponible, Solicitado = linea.Cantidad });
                    }
                }

                paraCalcular.Add(new LineaVentaCalculo(linea.Cantidad, producto.PrecioVenta, linea.DescuentoLinea ?? 0m));
            }

            TotalesVenta totales = CalculadoraTotalesVenta.Calcular(
                paraCalcular,
                _opciones.TasaImpuesto,
                _opciones.PrecioIncluyeImpuesto);

            DateTime ahora = _reloj.AhoraUtc;
            string numero = await _repositorioVenta.SiguienteNumeroAsync(empresaId, ahora, ct);

            Venta venta = new()
            {
                EmpresaId = empresaId,
                Numero = numero,
                ClienteId = comando.ClienteId,
                AlmacenId = comando.AlmacenId,
                UsuarioId = _usuario.ObtenerUsuarioIdActual(),
                MetodoPago = metodoPago,
                Subtotal = totales.Subtotal,
                Descuento = totales.Descuento,
                Impuesto = totales.Impuesto,
                Total = totales.Total,
                Estado = EstadosVenta.Completada,
                FechaUtc = ahora,
                FechaCreacionUtc = ahora,
                FechaActualizacionUtc = ahora,
            };

            for (int i = 0; i < comando.Lineas.Count; i++)
            {
                LineaComandoVenta linea = comando.Lineas[i];
                TotalesLinea calculada = totales.Lineas[i];
                Producto producto = porId[linea.ProductoId];

                venta.Detalles.Add(new VentaDetalleLinea
                {
                    ProductoId = producto.Id,
                    DescripcionProducto = producto.Nombre,
                    Cantidad = linea.Cantidad,
                    PrecioUnitario = producto.PrecioVenta,
                    Subtotal = calculada.Subtotal,
                    DescuentoLinea = calculada.Descuento,
                    ImpuestoLinea = calculada.Impuesto,
                    TotalLinea = calculada.Total,
                });
            }

            ResultadoRegistrarVenta resultado;

            try
            {
                // Todo lo que sigue es atómico. La reversión la garantiza la unidad de trabajo:
                // el caso de uso decide QUÉ es indivisible, no cómo se implementa.
                resultado = await _unidadDeTrabajo.EjecutarEnTransaccionAsync(
                    async cancelacion =>
                    {
                        Venta registrada = await _repositorioVenta.RegistrarAsync(empresaId, venta, cancelacion);

                        // Se guarda aquí, dentro de la transacción, porque los movimientos de
                        // inventario necesitan el folio real de la venta para apuntar a ella.
                        // Sin este guardado intermedio, OrigenId quedaría en cero y el rastro
                        // entre el movimiento y el documento que lo originó se perdería.
                        await _unidadDeTrabajo.GuardarCambiosAsync(cancelacion);

                        foreach (VentaDetalleLinea detalle in registrada.Detalles)
                        {
                            Producto producto = porId[detalle.ProductoId];

                            if (!producto.ControlaInventario)
                            {
                                continue;
                            }

                            MovimientoInventario movimiento = new()
                            {
                                EmpresaId = empresaId,
                                ProductoId = detalle.ProductoId,
                                AlmacenId = comando.AlmacenId,
                                Tipo = TipoMovimientoInventario.Egreso,
                                Cantidad = detalle.Cantidad,
                                CostoUnitario = producto.CostoPromedio,
                                FechaUtc = ahora,
                                OrigenTipo = nameof(Venta),
                                OrigenId = registrada.Id,
                                UsuarioId = venta.UsuarioId,
                            };

                            PoliticaInmutabilidadMovimientoInventario.AsegurarQuePuedeRegistrarse(movimiento);
                            await _stock.AplicarMovimientoAsync(movimiento, cancelacion);
                        }

                        return new ResultadoRegistrarVenta(
                            true,
                            "Venta registrada.",
                            registrada.Id,
                            registrada.Numero,
                            totales.Subtotal,
                            totales.Descuento,
                            totales.Impuesto,
                            totales.Total);
                    },
                    ct);
            }
            catch (ExcepcionAplicacion)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new ExcepcionInternaAplicacion(
                    "No se pudo registrar la venta.",
                    CodigosErrorVentas.RegistroFallido,
                    ex);
            }

            // La bitácora queda FUERA de la transacción: un fallo al registrar el historial no
            // debe deshacer una venta que el cliente ya pagó.
            await _bitacora.RegistrarAsync("Ventas", "Registrar", nameof(Venta), resultado.Id, ct: ct);

            return resultado;
        }
    }
}
