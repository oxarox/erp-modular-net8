using ERP.Aplicacion.Abstracciones.Consultas;
using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Aplicacion.CasosDeUso.Productos;
using ERP.Aplicacion.Comun.CodigosError;
using ERP.Aplicacion.Comun.Excepciones;
using ERP.Aplicacion.Comun.Paginacion;
using ERP.Tests.Comun;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace ERP.Tests.Productos
{
    /// <summary>
    /// Pruebas del caso de uso de búsqueda del catálogo.
    /// El read model es un doble y devuelve la existencia CRUDA: lo que se prueba es qué
    /// normaliza el manejador antes de consultar, qué rechaza, y cómo traduce esa existencia a
    /// un saldo —que es la regla que el módulo entero existe para no equivocar—, no que EF Core
    /// sepa resolver un LEFT JOIN.
    /// </summary>
    public class ManejadorBuscarProductosTests
    {
        private readonly IConsultaCatalogoProductos _consulta = Substitute.For<IConsultaCatalogoProductos>();
        private readonly IRepositorioAlmacen _almacenes = Substitute.For<IRepositorioAlmacen>();
        private readonly ManejadorBuscarProductos _manejador;

        public ManejadorBuscarProductosTests()
        {
            // Por defecto el read model devuelve una página vacía que respeta la paginación
            // recibida, y el almacén consultado es de la empresa, para que cada prueba declare
            // solo lo suyo.
            _consulta
                .BuscarAsync(
                    Arg.Any<long>(),
                    Arg.Any<string?>(),
                    Arg.Any<bool?>(),
                    Arg.Any<long?>(),
                    Arg.Any<SolicitudPaginada>(),
                    Arg.Any<CancellationToken>())
                .Returns(ci => ResultadoPaginado<FilaCatalogoProducto>.Vacio(ci.ArgAt<SolicitudPaginada>(4)));

            _almacenes
                .ExisteAsync(ConstructorDeDatos.EmpresaId, ConstructorDeDatos.AlmacenId, Arg.Any<CancellationToken>())
                .Returns(true);

            _manejador = new ManejadorBuscarProductos(_consulta, _almacenes);
        }

        [Fact]
        public async Task ManejarAsync_PaginacionFueraDeRango_SeNormalizaAntesDeConsultar()
        {
            ResultadoPaginado<ItemProducto> resultado = await _manejador.ManejarAsync(
                ConstructorDeDatos.EmpresaId,
                new ConsultaBuscarProductos(null, null, null, 0, 5000),
                CancellationToken.None);

            // Los valores fuera de rango se normalizan, no se rechazan: pedir la página cero
            // devuelve la primera y pedir cinco mil filas devuelve el máximo.
            // Ver docs/convenciones-endpoints.md.
            await _consulta.Received(1).BuscarAsync(
                ConstructorDeDatos.EmpresaId,
                Arg.Any<string?>(),
                Arg.Any<bool?>(),
                Arg.Any<long?>(),
                Arg.Is<SolicitudPaginada>(p => p.Pagina == 1 && p.TamanoPagina == SolicitudPaginada.TamanoMaximo),
                Arg.Any<CancellationToken>());

            resultado.Pagina.Should().Be(1);
            resultado.TamanoPagina.Should().Be(SolicitudPaginada.TamanoMaximo);
        }

        [Fact]
        public async Task ManejarAsync_CriterioEnBlanco_ConsultaSinCriterio()
        {
            await _manejador.ManejarAsync(
                ConstructorDeDatos.EmpresaId,
                new ConsultaBuscarProductos("   ", null, null, null, null),
                CancellationToken.None);

            // Un criterio compuesto solo de espacios no es un filtro. Si llegara tal cual,
            // el LIKE buscaría por esos espacios y el catálogo volvería vacío sin motivo visible.
            await _consulta.Received(1).BuscarAsync(
                ConstructorDeDatos.EmpresaId,
                null,
                Arg.Any<bool?>(),
                Arg.Any<long?>(),
                Arg.Any<SolicitudPaginada>(),
                Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task ManejarAsync_ProductoQueNoControlaInventario_ProyectaStockNulo()
        {
            DevolverFilas(
                Fila(9L, controlaInventario: false, existencia: null),
                Fila(1L, controlaInventario: true, existencia: 12m));

            ResultadoPaginado<ItemProducto> resultado = await _manejador.ManejarAsync(
                ConstructorDeDatos.EmpresaId,
                new ConsultaBuscarProductos(null, null, ConstructorDeDatos.AlmacenId, null, null),
                CancellationToken.None);

            // Un servicio no tiene existencias: el saldo viaja nulo y no cero, para que el
            // front no lo pinte como agotado y bloquee la línea.
            resultado.Items[0].StockDisponible.Should().BeNull();
            resultado.Items[1].StockDisponible.Should().Be(12m);
        }

        [Fact]
        public async Task ManejarAsync_ArticuloSinFilaDeExistencia_ProyectaStockCero()
        {
            DevolverFilas(Fila(1L, controlaInventario: true, existencia: null));

            ResultadoPaginado<ItemProducto> resultado = await _manejador.ManejarAsync(
                ConstructorDeDatos.EmpresaId,
                new ConsultaBuscarProductos(null, null, ConstructorDeDatos.AlmacenId, null, null),
                CancellationToken.None);

            // Es la otra mitad de la regla, y la que se rompe en silencio: el producto se maneja
            // en un almacén que existe y que es de la empresa, y no hay fila de existencias.
            // Eso no es "no se sabe", es "no queda".
            resultado.Items[0].StockDisponible.Should().Be(0m);
        }

        [Fact]
        public async Task ManejarAsync_SinAlmacen_ProyectaStockNuloAunqueElProductoControleInventario()
        {
            DevolverFilas(Fila(1L, controlaInventario: true, existencia: null));

            ResultadoPaginado<ItemProducto> resultado = await _manejador.ManejarAsync(
                ConstructorDeDatos.EmpresaId,
                new ConsultaBuscarProductos(null, null, null, null, null),
                CancellationToken.None);

            // Sin almacén no hay saldo del que hablar. Si la regla se resolviera solo con la
            // existencia, esta misma fila daría cero y el catálogo completo se vería agotado.
            resultado.Items[0].StockDisponible.Should().BeNull();
        }

        [Fact]
        public async Task ManejarAsync_AlmacenDeOtraEmpresa_DevuelveNoEncontradoYNoConsultaElCatalogo()
        {
            const long almacenAjeno = 41L;

            _almacenes
                .ExisteAsync(ConstructorDeDatos.EmpresaId, almacenAjeno, Arg.Any<CancellationToken>())
                .Returns(false);

            ExcepcionRecursoNoEncontrado excepcion = await Assert.ThrowsAsync<ExcepcionRecursoNoEncontrado>(
                () => _manejador.ManejarAsync(
                    ConstructorDeDatos.EmpresaId,
                    new ConsultaBuscarProductos(null, null, almacenAjeno, null, null),
                    CancellationToken.None));

            // El código es el contrato, no el mensaje (docs/testing.md, regla 2).
            excepcion.CodigoError.Should().Be(CodigosErrorAlmacenes.NoEncontrado);

            // Y se corta antes de consultar: un 200 con todo el catálogo en cero es la
            // respuesta que este caso de uso existe para no dar.
            await _consulta.DidNotReceiveWithAnyArgs().BuscarAsync(
                default,
                default,
                default,
                default,
                default!,
                default);
        }

        [Fact]
        public async Task ManejarAsync_AlmacenCero_DevuelveNoEncontrado()
        {
            _almacenes
                .ExisteAsync(ConstructorDeDatos.EmpresaId, 0L, Arg.Any<CancellationToken>())
                .Returns(false);

            // El cero esquiva el caso "sin almacén" —no es nulo— y sin esta comprobación el
            // saldo de cada artículo viajaría en cero por no encontrar fila.
            ExcepcionRecursoNoEncontrado excepcion = await Assert.ThrowsAsync<ExcepcionRecursoNoEncontrado>(
                () => _manejador.ManejarAsync(
                    ConstructorDeDatos.EmpresaId,
                    new ConsultaBuscarProductos(null, null, 0L, null, null),
                    CancellationToken.None));

            excepcion.CodigoError.Should().Be(CodigosErrorAlmacenes.NoEncontrado);
        }

        private void DevolverFilas(params FilaCatalogoProducto[] filas) =>
            _consulta
                .BuscarAsync(
                    Arg.Any<long>(),
                    Arg.Any<string?>(),
                    Arg.Any<bool?>(),
                    Arg.Any<long?>(),
                    Arg.Any<SolicitudPaginada>(),
                    Arg.Any<CancellationToken>())
                .Returns(new ResultadoPaginado<FilaCatalogoProducto>(
                    1,
                    SolicitudPaginada.TamanoPorDefecto,
                    filas.Length,
                    filas.ToList()));

        private static FilaCatalogoProducto Fila(long id, bool controlaInventario, decimal? existencia) =>
            new(
                id,
                $"SKU-{id:D4}",
                $"Producto {id}",
                "Acme",
                "Insumos",
                1990m,
                controlaInventario,
                true,
                existencia);
    }
}
