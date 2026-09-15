using ERP.Api.Contracts.Comun;
using ERP.Aplicacion.Comun.CodigosError;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace ERP.Api.Filtros
{
    /// <summary>
    /// Ejecuta el validador FluentValidation del cuerpo antes de entrar a la acción.
    /// <para>
    /// Con este filtro, ningún controlador empieza con quince líneas de comprobaciones:
    /// si la entrada no es válida, la acción sencillamente no se ejecuta, y el cliente
    /// recibe la lista completa de campos erróneos en una sola respuesta.
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
                contexto.Result = new BadRequestObjectResult(new RespuestaError(
                    CodigosErrorApi.CuerpoInvalido,
                    "La solicitud contiene campos inválidos.",
                    contexto.HttpContext.TraceIdentifier,
                    errores));

                return;
            }

            await siguiente();
        }
    }
}
