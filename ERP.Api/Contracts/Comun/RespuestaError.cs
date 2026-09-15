using ERP.Aplicacion.Comun.CodigosError;

namespace ERP.Api.Contracts.Comun
{
    /// <summary>
    /// Sobre único de error de la API. Todos los errores del sistema salen con esta forma:
    /// el cliente escribe UN manejador de errores, no uno por endpoint.
    /// </summary>
    /// <param name="TraceId">Identificador del request, para cruzar con los logs del servidor.</param>
    /// <param name="Code">Familia del error, legible y estable: <c>validation_error</c>, <c>not_found</c>…</param>
    /// <param name="Message">Texto en español, apto para mostrar al usuario final.</param>
    /// <param name="Details">Datos estructurados. Nunca trazas, SQL ni datos de terceros.</param>
    /// <param name="ErrorCode">
    /// Código del catálogo (<c>MODULO_###</c>). <b>Contrato duro: nunca viaja null.</b> Cada
    /// factory aplica el fallback de su familia, porque un cliente que recibe <c>null</c> no
    /// puede decidir nada y termina comparando el texto del mensaje.
    /// </param>
    public sealed record RespuestaError(
        string TraceId,
        string Code,
        string Message,
        object? Details,
        string ErrorCode)
    {
        public static RespuestaError Validacion(string traceId, ErrorCampo[] errores, string? codigoError = null) =>
            Crear(traceId, "validation_error", "La solicitud contiene campos inválidos.", codigoError, errores, CodigosErrorApi.CuerpoInvalido);

        public static RespuestaError NoAutenticado(string traceId, string mensaje, string? codigoError = null) =>
            Crear(traceId, "unauthorized", mensaje, codigoError, null, CodigosErrorApi.NoAutenticado);

        public static RespuestaError Prohibido(string traceId, string mensaje, string? codigoError = null) =>
            Crear(traceId, "forbidden", mensaje, codigoError, null, CodigosErrorApi.SinPermiso);

        public static RespuestaError SolicitudInvalida(string traceId, string mensaje, string? codigoError = null, object? detalles = null) =>
            Crear(traceId, "bad_request", mensaje, codigoError, detalles, CodigosErrorApi.ParametroInvalido);

        public static RespuestaError NoEncontrado(string traceId, string mensaje, string? codigoError = null) =>
            Crear(traceId, "not_found", mensaje, codigoError, null, CodigosErrorApi.RecursoNoEncontrado);

        public static RespuestaError Conflicto(string traceId, string mensaje, string? codigoError = null, object? detalles = null) =>
            Crear(traceId, "conflict", mensaje, codigoError, detalles, CodigosErrorApi.ConflictoDeEstado);

        public static RespuestaError NoDisponible(string traceId, string? codigoError = null) =>
            Crear(
                traceId,
                "service_unavailable",
                "El servicio no está disponible en este momento. Vuelva a intentarlo en unos instantes.",
                codigoError,
                null,
                CodigosErrorApi.ServicioDatosNoDisponible);

        public static RespuestaError Interno(string traceId, string? codigoError = null) =>
            Crear(
                traceId,
                "internal_error",
                "Ocurrió un error inesperado. Si el problema persiste, informe el identificador de correlación.",
                codigoError,
                null,
                CodigosErrorApi.ErrorInterno);

        private static RespuestaError Crear(
            string traceId,
            string code,
            string mensaje,
            string? codigoError,
            object? detalles,
            string codigoPorDefecto)
        {
            string codigoFinal = string.IsNullOrWhiteSpace(codigoError) ? codigoPorDefecto : codigoError;

            object? detallesNormalizados = detalles switch
            {
                ErrorCampo[] campos => new { errors = NormalizarCampos(campos, codigoFinal) },
                null => null,
                _ => detalles,
            };

            return new RespuestaError(traceId, code, mensaje, detallesNormalizados, codigoFinal);
        }

        /// <summary>Un campo sin código propio hereda el código del sobre, para que nunca quede vacío.</summary>
        private static ErrorCampo[] NormalizarCampos(ErrorCampo[] campos, string codigoPorDefecto) =>
            campos
                .Select(c => string.IsNullOrWhiteSpace(c.Codigo) ? c with { Codigo = codigoPorDefecto } : c)
                .ToArray();
    }

    /// <summary>Un error de validación asociado a un campo concreto de la solicitud.</summary>
    public sealed record ErrorCampo(string Campo, string Codigo, string Mensaje);
}
