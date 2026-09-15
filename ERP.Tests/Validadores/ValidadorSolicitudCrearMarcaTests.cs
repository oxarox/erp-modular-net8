using ERP.Api.Contracts.Marcas;
using ERP.Api.Validadores.Marcas;
using ERP.Aplicacion.Comun.CodigosError;
using FluentAssertions;
using FluentValidation.Results;
using Xunit;

namespace ERP.Tests.Validadores
{
    /// <summary>
    /// Pruebas del validador de entrada.
    /// Verifican tanto que rechaza lo inválido como que devuelve el CÓDIGO correcto:
    /// el front reacciona al código, así que un código equivocado es un contrato roto
    /// aunque el mensaje en español se lea bien.
    /// </summary>
    public class ValidadorSolicitudCrearMarcaTests
    {
        private readonly ValidadorSolicitudCrearMarca _validador = new();

        [Fact]
        public void Validar_SolicitudCompleta_EsValida()
        {
            ValidationResult resultado = _validador.Validate(new SolicitudCrearMarca("Acme", "Equipamiento", true));

            resultado.IsValid.Should().BeTrue();
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void Validar_NombreVacio_DevuelveErrorConCodigoDelCatalogo(string nombre)
        {
            ValidationResult resultado = _validador.Validate(new SolicitudCrearMarca(nombre, null, null));

            resultado.IsValid.Should().BeFalse();
            resultado.Errors.Should().Contain(e =>
                e.ErrorCode == CodigosErrorMarcas.Requerido || e.ErrorCode == CodigosErrorMarcas.NoSoloEspacios);
        }

        [Fact]
        public void Validar_NombreDemasiadoCorto_DevuelveLongitudMinima()
        {
            ValidationResult resultado = _validador.Validate(new SolicitudCrearMarca("A", null, null));

            resultado.Errors.Should().ContainSingle(e => e.ErrorCode == CodigosErrorMarcas.LongitudMinima);
        }

        [Fact]
        public void Validar_NombreDemasiadoLargo_DevuelveLongitudMaxima()
        {
            ValidationResult resultado = _validador.Validate(new SolicitudCrearMarca(new string('A', 121), null, null));

            resultado.Errors.Should().Contain(e => e.ErrorCode == CodigosErrorMarcas.LongitudMaxima);
        }
    }
}
