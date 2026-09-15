using ERP.Api.Contracts.Marcas;
using ERP.Aplicacion.Comun.CodigosError;
using FluentValidation;

namespace ERP.Api.Validadores.Marcas
{
    /// <summary>
    /// Validación de entrada del alta de marca.
    /// <para>
    /// Cada regla lleva su <c>WithErrorCode</c>: el cliente reacciona al código, no al texto,
    /// de modo que reformular un mensaje en español nunca rompe al front. Ver docs/codigos-error.md.
    /// </para>
    /// <para>
    /// Aquí solo viven reglas de FORMA (requerido, largo, rango). Las reglas que necesitan
    /// consultar el estado del sistema (nombre duplicado) son del caso de uso, no del validador.
    /// </para>
    /// </summary>
    public sealed class ValidadorSolicitudCrearMarca : AbstractValidator<SolicitudCrearMarca>
    {
        public ValidadorSolicitudCrearMarca()
        {
            RuleFor(s => s.Nombre)
                .NotEmpty().WithErrorCode(CodigosErrorMarcas.Requerido).WithMessage("El nombre es obligatorio.")
                .Must(n => !string.IsNullOrWhiteSpace(n)).WithErrorCode(CodigosErrorMarcas.NoSoloEspacios).WithMessage("El nombre no puede ser solo espacios.")
                .MinimumLength(2).WithErrorCode(CodigosErrorMarcas.LongitudMinima).WithMessage("El nombre debe tener al menos 2 caracteres.")
                .MaximumLength(120).WithErrorCode(CodigosErrorMarcas.LongitudMaxima).WithMessage("El nombre no puede superar los 120 caracteres.");

            RuleFor(s => s.Descripcion)
                .MaximumLength(500).WithErrorCode(CodigosErrorMarcas.LongitudMaxima).WithMessage("La descripción no puede superar los 500 caracteres.");
        }
    }
}
