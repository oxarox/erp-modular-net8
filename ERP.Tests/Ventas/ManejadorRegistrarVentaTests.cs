using ERP.Aplicacion.Abstracciones.Contexto;
using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Aplicacion.Abstracciones.Servicios;
using ERP.Aplicacion.CasosDeUso.Ventas;
using ERP.Aplicacion.Comun.CodigosError;
using ERP.Aplicacion.Comun.Excepciones;
using ERP.Aplicacion.Comun.Opciones;
using ERP.Dominio.Entidades;
using ERP.Dominio.Servicios;
using ERP.Tests.Comun;
using FluentAssertions;
using Microsoft.Extensions.Options;
using NSubstitute;
using Xunit;

namespace ERP.Tests.Ventas
{
    /// <summary>
    /// Pruebas del caso de uso complejo. Verifican la orquestación —qué se valida, en qué
    /// orden, qué se escribe y qué se revierte— sin tocar una base de datos real.
    /// </summary>
    public class ManejadorRegistrarVentaTests
    {
        private readonly IRepositorioVenta _repositorioVenta = Substitute.For<IRepositorioVenta>();
        private readonly IRepositorioProducto _repositorioProducto = Substitute.For<IRepositorioProducto>();
        private readonly IServicioStockProducto _stock = Substitute.For<IServicioStockProducto>();
        private readonly IUnidadDeTrabajo _unidadDeTrabajo = Substitute.For<IUnidadDeTrabajo>();
        private readonly IProveedorContextoUsuario _usuario = Substitute.For<IProveedorContextoUsuario>();
        private readonly IRegistroLogAcciones _bitacora = Substitute.For<IRegistroLogAcciones>();
        private readonly RelojFijo _reloj = RelojFijo.EnPrimeroDeEnero();
        private readonly ManejadorRegistrarVenta _manejador;

        public ManejadorRegistrarVentaTests()
        {
            _usuario.ObtenerUsuarioIdActual().Returns(ConstructorDeDatos.UsuarioId);

            // El doble ejecuta el delegado tal cual: lo que se prueba es la orquestación
            // del caso de uso, no que EF Core sepa abrir una transacción.
            _unidadDeTrabajo
                .EjecutarEnTransaccionAsync(
                    Arg.Any<Func<CancellationToken, Task<ResultadoRegistrarVenta>>>(),
                    Arg.Any<CancellationToken>())
                .Returns(ci => ci.ArgAt<Func<CancellationToken, Task<ResultadoRegistrarVenta>>>(0)(CancellationToken.None));

            _repositorioVenta
                .SiguienteNumeroAsync(Arg.Any<long>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
                .Returns("V-20260101-0001");

            _repositorioVenta
                .RegistrarAsync(Arg.Any<long>(), Arg.Any<Venta>(), Arg.Any<CancellationToken>())
                .Returns(ci =>
                {
                    Venta venta = ci.ArgAt<Venta>(1);
                    venta.Id = 42L;
                    return venta;
                });

            OpcionesVentas opciones = new() { TasaImpuesto = 0.19m, PrecioIncluyeImpuesto = false };

            _manejador = new ManejadorRegistrarVenta(
                _repositorioVenta,
                _repositorioProducto,
                _stock,
                _unidadDeTrabajo,
                _usuario,
                _reloj,
                _bitacora,
                Options.Create(opciones));
        }

        [Fact]
        public async Task ManejarAsync_VentaValida_CalculaTotalesYDescuentaInventario()
        {
            ConfigurarProductos(ConstructorDeDatos.Producto(id: 1L, precio: 1000m));
            ConfigurarStock(disponible: 10m);

            ResultadoRegistrarVenta resultado = await _manejador.ManejarAsync(
                ConstructorDeDatos.EmpresaId,
                ComandoCon(new LineaComandoVenta(1L, 2, null)),
                CancellationToken.None);

            resultado.Total.Should().Be(2380m);
            resultado.Numero.Should().Be("V-20260101-0001");

            await _stock.Received(1).AplicarMovimientoAsync(
                Arg.Is<MovimientoInventario>(m =>
                    m.Tipo == TipoMovimientoInventario.Egreso
                    && m.Cantidad == 2m
                    && m.OrigenTipo == nameof(Venta)
                    && m.OrigenId == 42L),
                Arg.Any<CancellationToken>());

            // La escritura ocurrió dentro de la unidad de trabajo, no suelta.
            await _unidadDeTrabajo.Received(1).EjecutarEnTransaccionAsync(
                Arg.Any<Func<CancellationToken, Task<ResultadoRegistrarVenta>>>(),
                Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task ManejarAsync_StockInsuficiente_FallaAntesDeAbrirLaTransaccion()
        {
            ConfigurarProductos(ConstructorDeDatos.Producto(id: 1L));
            ConfigurarStock(disponible: 1m);

            Func<Task> accion = () => _manejador.ManejarAsync(
                ConstructorDeDatos.EmpresaId,
                ComandoCon(new LineaComandoVenta(1L, 5, null)),
                CancellationToken.None);

            ExcepcionSolicitudInvalida excepcion = (await accion.Should().ThrowAsync<ExcepcionSolicitudInvalida>()).Which;
            excepcion.CodigoError.Should().Be(CodigosErrorVentas.StockInsuficiente);

            // Nada se escribió: la validación ocurre antes de abrir la transacción.
            await _unidadDeTrabajo.DidNotReceive().EjecutarEnTransaccionAsync(
                Arg.Any<Func<CancellationToken, Task<ResultadoRegistrarVenta>>>(),
                Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task ManejarAsync_ProductoDeOtraEmpresa_DevuelveNoEncontrado()
        {
            // El repositorio filtra por empresa, así que un id ajeno simplemente no aparece.
            ConfigurarProductos();

            Func<Task> accion = () => _manejador.ManejarAsync(
                ConstructorDeDatos.EmpresaId,
                ComandoCon(new LineaComandoVenta(999L, 1, null)),
                CancellationToken.None);

            ExcepcionRecursoNoEncontrado excepcion = (await accion.Should().ThrowAsync<ExcepcionRecursoNoEncontrado>()).Which;
            excepcion.CodigoError.Should().Be(CodigosErrorVentas.ProductoNoEncontrado);
        }

        [Fact]
        public async Task ManejarAsync_ProductoInactivo_NoSePuedeVender()
        {
            ConfigurarProductos(ConstructorDeDatos.Producto(id: 1L, activo: false));

            Func<Task> accion = () => _manejador.ManejarAsync(
                ConstructorDeDatos.EmpresaId,
                ComandoCon(new LineaComandoVenta(1L, 1, null)),
                CancellationToken.None);

            ExcepcionSolicitudInvalida excepcion = (await accion.Should().ThrowAsync<ExcepcionSolicitudInvalida>()).Which;
            excepcion.CodigoError.Should().Be(CodigosErrorVentas.ProductoInactivo);
        }

        [Fact]
        public async Task ManejarAsync_ServicioSinControlDeInventario_NoGeneraMovimiento()
        {
            ConfigurarProductos(ConstructorDeDatos.Producto(id: 1L, controlaInventario: false));

            await _manejador.ManejarAsync(
                ConstructorDeDatos.EmpresaId,
                ComandoCon(new LineaComandoVenta(1L, 3, null)),
                CancellationToken.None);

            await _stock.DidNotReceive().AplicarMovimientoAsync(
                Arg.Any<MovimientoInventario>(),
                Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task ManejarAsync_MetodoDePagoNoHabilitado_Falla()
        {
            ConfigurarProductos(ConstructorDeDatos.Producto(id: 1L));

            Func<Task> accion = () => _manejador.ManejarAsync(
                ConstructorDeDatos.EmpresaId,
                new ComandoRegistrarVenta(null, ConstructorDeDatos.AlmacenId, "CHEQUE", [new LineaComandoVenta(1L, 1, null)]),
                CancellationToken.None);

            ExcepcionSolicitudInvalida excepcion = (await accion.Should().ThrowAsync<ExcepcionSolicitudInvalida>()).Which;
            excepcion.CodigoError.Should().Be(CodigosErrorVentas.MetodoPagoInvalido);
        }

        [Fact]
        public async Task ManejarAsync_FalloAlEscribir_SeTraduceAErrorInternoConSuCodigo()
        {
            ConfigurarProductos(ConstructorDeDatos.Producto(id: 1L));
            ConfigurarStock(disponible: 10m);

            _stock
                .AplicarMovimientoAsync(Arg.Any<MovimientoInventario>(), Arg.Any<CancellationToken>())
                .Returns<Task>(_ => throw new InvalidOperationException("stock negativo"));

            Func<Task> accion = () => _manejador.ManejarAsync(
                ConstructorDeDatos.EmpresaId,
                ComandoCon(new LineaComandoVenta(1L, 1, null)),
                CancellationToken.None);

            // El fallo técnico no escapa crudo: se traduce al código del catálogo. La
            // reversión es responsabilidad de la unidad de trabajo, no del caso de uso.
            ExcepcionInternaAplicacion excepcion = (await accion.Should().ThrowAsync<ExcepcionInternaAplicacion>()).Which;
            excepcion.CodigoError.Should().Be(CodigosErrorVentas.RegistroFallido);
        }

        private static ComandoRegistrarVenta ComandoCon(params LineaComandoVenta[] lineas) =>
            new(null, ConstructorDeDatos.AlmacenId, "EFECTIVO", lineas);

        private void ConfigurarProductos(params Producto[] productos) =>
            _repositorioProducto
                .ObtenerPorIdsAsync(Arg.Any<long>(), Arg.Any<IReadOnlyCollection<long>>(), Arg.Any<CancellationToken>())
                .Returns(productos);

        private void ConfigurarStock(decimal disponible) =>
            _stock
                .ObtenerDisponibleAsync(Arg.Any<long>(), Arg.Any<long>(), Arg.Any<long>(), Arg.Any<CancellationToken>())
                .Returns(disponible);
    }
}
