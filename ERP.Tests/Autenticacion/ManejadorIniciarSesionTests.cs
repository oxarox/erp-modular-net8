using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Aplicacion.Abstracciones.Servicios;
using ERP.Aplicacion.CasosDeUso.Autenticacion;
using ERP.Aplicacion.Comun.CodigosError;
using ERP.Aplicacion.Comun.Excepciones;
using ERP.Dominio.Entidades;
using ERP.Tests.Comun;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace ERP.Tests.Autenticacion
{
    public class ManejadorIniciarSesionTests
    {
        private const string Hash = "$2a$12$hashdeejemplo";

        private readonly IRepositorioUsuario _usuarios = Substitute.For<IRepositorioUsuario>();
        private readonly IRepositorioSesionUsuario _sesiones = Substitute.For<IRepositorioSesionUsuario>();
        private readonly IServicioHashContrasenas _hash = Substitute.For<IServicioHashContrasenas>();
        private readonly IServicioTokens _tokens = Substitute.For<IServicioTokens>();
        private readonly RelojFijo _reloj = RelojFijo.EnPrimeroDeEnero();
        private readonly ManejadorIniciarSesion _manejador;

        public ManejadorIniciarSesionTests()
        {
            _tokens.Emitir(Arg.Any<Usuario>(), Arg.Any<IReadOnlyCollection<string>>()).Returns(
                new ParTokens(
                    new TokenEmitido("acceso", _reloj.AhoraUtc.AddMinutes(30)),
                    new TokenEmitido("refresco", _reloj.AhoraUtc.AddDays(7))));

            _tokens.CalcularHashRefresco(Arg.Any<string>()).Returns("hash-refresco");

            _manejador = new ManejadorIniciarSesion(_usuarios, _sesiones, _hash, _tokens, _reloj);
        }

        [Fact]
        public async Task ManejarAsync_CredencialesCorrectas_EmiteParDeTokensYPersisteLaSesion()
        {
            _usuarios.ObtenerPorCorreoAsync("persona@ejemplo.cl", Arg.Any<CancellationToken>())
                .Returns(ConstructorDeDatos.Usuario(Hash));
            _usuarios.ObtenerPermisosAsync(ConstructorDeDatos.UsuarioId, Arg.Any<CancellationToken>())
                .Returns(new[] { "marcas.ver" });
            _hash.Verificar("clave-correcta", Hash).Returns(true);

            ResultadoSesion sesion = await _manejador.ManejarAsync(
                new ComandoIniciarSesion("  Persona@Ejemplo.CL  ", "clave-correcta", "127.0.0.1"),
                CancellationToken.None);

            sesion.TokenAcceso.Should().Be("acceso");
            sesion.Permisos.Should().ContainSingle().Which.Should().Be("marcas.ver");

            // Solo se guarda el HASH del token de refresco, nunca el token.
            await _sesiones.Received(1).CrearAsync(
                Arg.Is<SesionUsuario>(s => s.HashTokenRefresco == "hash-refresco"),
                Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task ManejarAsync_CorreoInexistente_DevuelveElMismoErrorQueUnaClaveMala()
        {
            _usuarios.ObtenerPorCorreoAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
                .Returns((Usuario?)null);

            Func<Task> accion = () => _manejador.ManejarAsync(
                new ComandoIniciarSesion("nadie@ejemplo.cl", "loquesea", null),
                CancellationToken.None);

            ExcepcionNoAutorizada excepcion = (await accion.Should().ThrowAsync<ExcepcionNoAutorizada>()).Which;

            // Mismo código y mismo mensaje que con contraseña incorrecta: distinguirlos
            // permitiría enumerar qué correos existen en el sistema.
            excepcion.CodigoError.Should().Be(CodigosErrorAutenticacion.CredencialesInvalidas);
        }

        [Fact]
        public async Task ManejarAsync_ContrasenaIncorrecta_DevuelveCredencialesInvalidas()
        {
            _usuarios.ObtenerPorCorreoAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
                .Returns(ConstructorDeDatos.Usuario(Hash));
            _hash.Verificar(Arg.Any<string>(), Hash).Returns(false);

            Func<Task> accion = () => _manejador.ManejarAsync(
                new ComandoIniciarSesion("persona@ejemplo.cl", "clave-mala", null),
                CancellationToken.None);

            ExcepcionNoAutorizada excepcion = (await accion.Should().ThrowAsync<ExcepcionNoAutorizada>()).Which;
            excepcion.CodigoError.Should().Be(CodigosErrorAutenticacion.CredencialesInvalidas);

            await _sesiones.DidNotReceive().CrearAsync(Arg.Any<SesionUsuario>(), Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task ManejarAsync_UsuarioInactivo_DevuelveProhibido()
        {
            _usuarios.ObtenerPorCorreoAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
                .Returns(ConstructorDeDatos.Usuario(Hash, activo: false));
            _hash.Verificar(Arg.Any<string>(), Hash).Returns(true);

            Func<Task> accion = () => _manejador.ManejarAsync(
                new ComandoIniciarSesion("persona@ejemplo.cl", "clave-correcta", null),
                CancellationToken.None);

            ExcepcionNoAutorizada excepcion = (await accion.Should().ThrowAsync<ExcepcionNoAutorizada>()).Which;
            excepcion.CodigoError.Should().Be(CodigosErrorAutenticacion.UsuarioInactivo);
            excepcion.EsProhibido.Should().BeTrue();
        }
    }
}
