using ERP.Api.Contracts.Ventas;
using ERP.Aplicacion.Comun.CodigosError;
using FluentValidation;

namespace ERP.Api.Validadores.Ventas
{
    public sealed class ValidadorSolicitudRegistrarVenta : AbstractValidator<SolicitudRegistrarVenta>
    {
        public ValidadorSolicitudRegistrarVenta()
        {
            RuleFor(s => s.AlmacenId)
                .GreaterThan(0).WithErrorCode(CodigosErrorVentas.AlmacenNoEncontrado).WithMessage("Debe indicar un almacén válido.");

            RuleFor(s => s.MetodoPago)
                .NotEmpty().WithErrorCode(CodigosErrorVentas.MetodoPagoInvalido).WithMessage("El método de pago es obligatorio.");

            RuleFor(s => s.Lineas)
                .NotNull().WithErrorCode(CodigosErrorVentas.SinLineas).WithMessage("La venta debe tener al menos una línea.")
                .Must(l => l is { Count: > 0 }).WithErrorCode(CodigosErrorVentas.SinLineas).WithMessage("La venta debe tener al menos una línea.");

            RuleForEach(s => s.Lineas).SetValidator(new ValidadorSolicitudLineaVenta());
        }
    }

    public sealed class ValidadorSolicitudLineaVenta : AbstractValidator<SolicitudLineaVenta>
    {
        public ValidadorSolicitudLineaVenta()
        {
            RuleFor(l => l.ProductoId)
                .GreaterThan(0).WithErrorCode(CodigosErrorVentas.ProductoNoEncontrado).WithMessage("Debe indicar un producto válido.");

            RuleFor(l => l.Cantidad)
                .GreaterThan(0).WithErrorCode(CodigosErrorVentas.CantidadInvalida).WithMessage("La cantidad debe ser mayor a cero.");

            RuleFor(l => l.DescuentoLinea)
                .GreaterThanOrEqualTo(0m).When(l => l.DescuentoLinea.HasValue)
                .WithErrorCode(CodigosErrorVentas.DescuentoInvalido).WithMessage("El descuento no puede ser negativo.");
        }
    }
}
