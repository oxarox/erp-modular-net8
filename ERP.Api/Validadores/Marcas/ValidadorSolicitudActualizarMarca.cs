using ERP.Api.Contracts.Marcas;
using ERP.Aplicacion.Comun.CodigosError;
using FluentValidation;

namespace ERP.Api.Validadores.Marcas
{
    public sealed class ValidadorSolicitudActualizarMarca : AbstractValidator<SolicitudActualizarMarca>
    {
        public ValidadorSolicitudActualizarMarca()
        {
            RuleFor(s => s.Nombre)
                .Cascade(CascadeMode.Stop)
                .NotEmpty().WithErrorCode(CodigosErrorMarcas.Requerido).WithMessage("El nombre es obligatorio.")
                .Must(n => !string.IsNullOrWhiteSpace(n)).WithErrorCode(CodigosErrorMarcas.NoSoloEspacios).WithMessage("El nombre no puede ser solo espacios.")
                .MinimumLength(2).WithErrorCode(CodigosErrorMarcas.LongitudMinima).WithMessage("El nombre debe tener al menos 2 caracteres.")
                .MaximumLength(120).WithErrorCode(CodigosErrorMarcas.LongitudMaxima).WithMessage("El nombre no puede superar los 120 caracteres.");

            RuleFor(s => s.Descripcion)
                .Cascade(CascadeMode.Stop)
                .MaximumLength(500).WithErrorCode(CodigosErrorMarcas.LongitudMaxima).WithMessage("La descripción no puede superar los 500 caracteres.");
        }
    }
}
