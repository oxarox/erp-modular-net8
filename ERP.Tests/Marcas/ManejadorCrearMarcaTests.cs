using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Aplicacion.Abstracciones.Servicios;
using ERP.Aplicacion.CasosDeUso.Marcas;
using ERP.Aplicacion.Comun.CodigosError;
using ERP.Aplicacion.Comun.Excepciones;
using ERP.Dominio.Entidades;
using ERP.Tests.Comun;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace ERP.Tests.Marcas
{
    /// <summary>
    /// Pruebas del caso de uso de alta de marca.
    /// El repositorio y la bitácora son dobles: lo que se prueba es la DECISIÓN del manejador,
    /// no que EF Core sepa insertar una fila.
    /// </summary>
    public class ManejadorCrearMarcaTests
    {
        private readonly IRepositorioMarca _repositorio = Substitute.For<IRepositorioMarca>();
        private readonly IRegistroLogAcciones _bitacora = Substitute.For<IRegistroLogAcciones>();
        private readonly ManejadorCrearMarca _manejador;

        public ManejadorCrearMarcaTests()
        {
            _manejador = new ManejadorCrearMarca(_repositorio, _bitacora);
        }

        [Fact]
        public async Task ManejarAsync_NombreDisponible_CreaLaMarcaYDevuelveElId()
        {
            _repositorio
                .ExisteNombreNormalizadoAsync(ConstructorDeDatos.EmpresaId, "ACME", null, Arg.Any<CancellationToken>())
                .Returns(false);

            _repositorio
                .CrearAsync(ConstructorDeDatos.EmpresaId, Arg.Any<Marca>(), Arg.Any<CancellationToken>())
                .Returns(ci => ConstructorDeDatos.Marca(id: 7L, nombre: ci.ArgAt<Marca>(1).Nombre));

            ResultadoCrearMarca resultado = await _manejador.ManejarAsync(
                ConstructorDeDatos.EmpresaId,
                new ComandoCrearMarca("  Acme  ", "  Equipamiento  ", null),
                CancellationToken.None);

            resultado.Exitoso.Should().BeTrue();
            resultado.Id.Should().Be(7L);

            // El manejador normaliza la entrada antes de persistir: el espacio en blanco
            // del formulario no debe llegar a la base de datos.
            await _repositorio.Received(1).CrearAsync(
                ConstructorDeDatos.EmpresaId,
                Arg.Is<Marca>(m => m.Nombre == "Acme" && m.Descripcion == "Equipamiento" && m.Activo),
                Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task ManejarAsync_NombreDuplicado_LanzaConflictoConCodigoDelCatalogo()
        {
            _repositorio
                .ExisteNombreNormalizadoAsync(ConstructorDeDatos.EmpresaId, "ACME", null, Arg.Any<CancellationToken>())
                .Returns(true);

            Func<Task> accion = () => _manejador.ManejarAsync(
                ConstructorDeDatos.EmpresaId,
                new ComandoCrearMarca("Acme", null, null),
                CancellationToken.None);

            ExcepcionConflicto excepcion = (await accion.Should().ThrowAsync<ExcepcionConflicto>()).Which;
            excepcion.CodigoError.Should().Be(CodigosErrorMarcas.Duplicado);

            await _repositorio.DidNotReceive().CrearAsync(
                Arg.Any<long>(),
                Arg.Any<Marca>(),
                Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task ManejarAsync_DescripcionEnBlanco_SePersisteComoNula()
        {
            _repositorio
                .ExisteNombreNormalizadoAsync(Arg.Any<long>(), Arg.Any<string>(), null, Arg.Any<CancellationToken>())
                .Returns(false);

            _repositorio
                .CrearAsync(Arg.Any<long>(), Arg.Any<Marca>(), Arg.Any<CancellationToken>())
                .Returns(ConstructorDeDatos.Marca(id: 3L));

            await _manejador.ManejarAsync(
                ConstructorDeDatos.EmpresaId,
                new ComandoCrearMarca("Acme", "   ", null),
                CancellationToken.None);

            await _repositorio.Received(1).CrearAsync(
                Arg.Any<long>(),
                Arg.Is<Marca>(m => m.Descripcion == null),
                Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task ManejarAsync_CreacionExitosa_RegistraEnLaBitacora()
        {
            _repositorio
                .ExisteNombreNormalizadoAsync(Arg.Any<long>(), Arg.Any<string>(), null, Arg.Any<CancellationToken>())
                .Returns(false);

            _repositorio
                .CrearAsync(Arg.Any<long>(), Arg.Any<Marca>(), Arg.Any<CancellationToken>())
                .Returns(ConstructorDeDatos.Marca(id: 11L));

            await _manejador.ManejarAsync(
                ConstructorDeDatos.EmpresaId,
                new ComandoCrearMarca("Acme", null, null),
                CancellationToken.None);

            await _bitacora.Received(1).RegistrarAsync(
                "Marcas",
                "Crear",
                nameof(Marca),
                11L,
                Arg.Any<SeveridadLog>(),
                Arg.Any<string?>(),
                Arg.Any<CancellationToken>());
        }
    }
}
