using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Aplicacion.CasosDeUso.Almacenes;
using ERP.Dominio.Entidades;
using ERP.Tests.Comun;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace ERP.Tests.Almacenes
{
    /// <summary>
    /// Pruebas del caso de uso de listado de almacenes.
    /// El repositorio es un doble y devuelve las filas desordenadas a propósito: el orden es
    /// parte del contrato del caso de uso, no una cortesía de la persistencia.
    /// </summary>
    public class ManejadorListarAlmacenesTests
    {
        private readonly IRepositorioAlmacen _repositorio = Substitute.For<IRepositorioAlmacen>();
        private readonly ManejadorListarAlmacenes _manejador;

        public ManejadorListarAlmacenesTests()
        {
            _manejador = new ManejadorListarAlmacenes(_repositorio);
        }

        [Fact]
        public async Task ManejarAsync_VariosAlmacenes_DevuelveElPredeterminadoPrimero()
        {
            _repositorio
                .ListarAsync(ConstructorDeDatos.EmpresaId, Arg.Any<bool?>(), Arg.Any<CancellationToken>())
                .Returns(new List<Almacen>
                {
                    ConstructorDeDatos.Almacen(id: 101L, nombre: "Sucursal Zeta", esPredeterminado: false),
                    ConstructorDeDatos.Almacen(id: 102L, nombre: "Sucursal Alfa", esPredeterminado: false),
                    ConstructorDeDatos.Almacen(id: 100L, nombre: "Bodega central", esPredeterminado: true),
                });

            IReadOnlyList<ItemAlmacen> almacenes = await _manejador.ManejarAsync(
                ConstructorDeDatos.EmpresaId,
                null,
                CancellationToken.None);

            // Quien abre el selector espera encontrar arriba la bodega en la que trabaja todos
            // los días; el resto va alfabético.
            almacenes.Select(a => a.Nombre).Should().ContainInOrder("Bodega central", "Sucursal Alfa", "Sucursal Zeta");
            almacenes[0].EsPredeterminado.Should().BeTrue();
        }

        [Fact]
        public async Task ManejarAsync_SoloActivos_SeTrasladaAlRepositorio()
        {
            _repositorio
                .ListarAsync(Arg.Any<long>(), Arg.Any<bool?>(), Arg.Any<CancellationToken>())
                .Returns(new List<Almacen> { ConstructorDeDatos.Almacen() });

            await _manejador.ManejarAsync(ConstructorDeDatos.EmpresaId, true, CancellationToken.None);

            // El recorte lo hace la base de datos y no el manejador: filtrar en memoria
            // obligaría a traer las bodegas dadas de baja solo para descartarlas después.
            await _repositorio.Received(1).ListarAsync(
                ConstructorDeDatos.EmpresaId,
                true,
                Arg.Any<CancellationToken>());
        }
    }
}
