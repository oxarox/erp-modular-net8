using ERP.Api.Contracts.Auth;
using ERP.Aplicacion.Comun.CodigosError;
using FluentValidation;

namespace ERP.Api.Validadores.Auth
{
    public sealed class ValidadorSolicitudIniciarSesion : AbstractValidator<SolicitudIniciarSesion>
    {
        public ValidadorSolicitudIniciarSesion()
        {
            RuleFor(s => s.Correo)
                .Cascade(CascadeMode.Stop)
                .NotEmpty().WithErrorCode(CodigosErrorAutenticacion.CorreoRequerido).WithMessage("El correo es obligatorio.")
                .EmailAddress().WithErrorCode(CodigosErrorValidacion.FormatoInvalido).WithMessage("El correo no tiene un formato válido.");

            RuleFor(s => s.Contrasena)
                .Cascade(CascadeMode.Stop)
                .NotEmpty().WithErrorCode(CodigosErrorAutenticacion.ContrasenaRequerida).WithMessage("La contraseña es obligatoria.");
        }
    }

    public sealed class ValidadorSolicitudRefrescarSesion : AbstractValidator<SolicitudRefrescarSesion>
    {
        public ValidadorSolicitudRefrescarSesion()
        {
            RuleFor(s => s.TokenRefresco)
                .Cascade(CascadeMode.Stop)
                .NotEmpty().WithErrorCode(CodigosErrorAutenticacion.TokenRefrescoInvalido).WithMessage("El token de refresco es obligatorio.");
        }
    }
}
