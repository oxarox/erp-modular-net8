using ERP.Api.Contracts.Comun;
using ERP.Aplicacion.Comun.CodigosError;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace ERP.Api.Filtros
{
    /// <summary>
    /// Ejecuta el validador FluentValidation de cada argumento antes de entrar a la acción.
    /// <para>
    /// Se registra de forma GLOBAL, no por controlador: así ningún endpoint puede olvidarse de
    /// validar. Con este filtro, ninguna acción empieza con quince líneas de comprobaciones.
    /// </para>
    /// <para>
    /// Devuelve <b>todos</b> los campos inválidos de una vez, no el primero: obligar a corregir
    /// de a uno es una mala experiencia y multiplica los viajes al servidor.
    /// </para>
    /// </summary>
    public sealed class FiltroValidacionFluent : IAsyncActionFilter
    {
        private readonly IServiceProvider _proveedor;

        public FiltroValidacionFluent(IServiceProvider proveedor)
        {
            _proveedor = proveedor;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext contexto, ActionExecutionDelegate siguiente)
        {
            List<ErrorCampo> errores = [];

            foreach (object? argumento in contexto.ActionArguments.Values)
            {
                if (argumento is null)
                {
                    continue;
                }

                // El validador se resuelve por reflexión sobre el tipo real del argumento:
                // agregar un validador nuevo no obliga a tocar este filtro ni el arranque.
                Type tipoValidador = typeof(IValidator<>).MakeGenericType(argumento.GetType());

                if (_proveedor.GetService(tipoValidador) is not IValidator validador)
                {
                    continue;
                }

                ValidationResult resultado = await validador.ValidateAsync(
                    new ValidationContext<object>(argumento),
                    contexto.HttpContext.RequestAborted);

                if (resultado.IsValid)
                {
                    continue;
                }

                errores.AddRange(resultado.Errors.Select(e => new ErrorCampo(
                    e.PropertyName,
                    string.IsNullOrWhiteSpace(e.ErrorCode) ? CodigosErrorValidacion.FormatoInvalido : e.ErrorCode,
                    e.ErrorMessage)));
            }

            if (errores.Count > 0)
            {
                contexto.Result = new BadRequestObjectResult(
                    RespuestaError.Validacion(contexto.HttpContext.TraceIdentifier, [.. errores]));

                return;
            }

            await siguiente();
        }
    }
}
