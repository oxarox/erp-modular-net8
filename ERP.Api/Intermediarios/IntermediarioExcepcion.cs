using System.Text.Json;
using ERP.Api.Contracts.Comun;
using ERP.Aplicacion.Comun.CodigosError;
using ERP.Aplicacion.Comun.Excepciones;

namespace ERP.Api.Intermediarios
{
    /// <summary>
    /// Único traductor de excepciones a respuestas HTTP de toda la solución.
    /// <para>
    /// Que sea único es la decisión importante: ningún controlador envuelve su cuerpo en
    /// try/catch para armar su propio error. Los casos de uso lanzan excepciones de negocio
    /// tipadas y este middleware las convierte, siempre con la misma forma y con el
    /// identificador de correlación incluido.
    /// </para>
    /// <para>
    /// Una excepción no prevista nunca sale al cliente: se registra completa en el log del
    /// servidor y al cliente le llega un mensaje genérico con el id de correlación.
    /// </para>
    /// </summary>
    public sealed class IntermediarioExcepcion
    {
        private static readonly JsonSerializerOptions OpcionesJson = new(JsonSerializerDefaults.Web);

        private readonly RequestDelegate _siguiente;
        private readonly ILogger<IntermediarioExcepcion> _log;

        public IntermediarioExcepcion(RequestDelegate siguiente, ILogger<IntermediarioExcepcion> log)
        {
            _siguiente = siguiente;
            _log = log;
        }

        public async Task InvokeAsync(HttpContext contexto)
        {
            try
            {
                await _siguiente(contexto);
            }
            catch (ExcepcionAplicacion ex)
            {
                await EscribirAsync(contexto, MapearEstado(ex), ex.CodigoError ?? CodigosErrorApi.ErrorInterno, ex.Message, ex.Detalles);
            }
            catch (OperationCanceledException) when (contexto.RequestAborted.IsCancellationRequested)
            {
                // El cliente cortó la conexión: no es un error del servidor y no se registra como tal.
                _log.LogDebug("Request {Ruta} cancelado por el cliente.", contexto.Request.Path);
            }
            catch (Exception ex)
            {
                _log.LogError(
                    ex,
                    "Error no controlado en {Metodo} {Ruta}. Correlación: {Correlacion}",
                    contexto.Request.Method,
                    contexto.Request.Path,
                    contexto.TraceIdentifier);

                await EscribirAsync(
                    contexto,
                    StatusCodes.Status500InternalServerError,
                    CodigosErrorApi.ErrorInterno,
                    "Ocurrió un error inesperado. Si el problema persiste, informe el identificador de correlación.",
                    detalles: null);
            }
        }

        private static int MapearEstado(ExcepcionAplicacion excepcion) => excepcion switch
        {
            ExcepcionSolicitudInvalida => StatusCodes.Status400BadRequest,
            ExcepcionNoAutorizada no => no.EsProhibido ? StatusCodes.Status403Forbidden : StatusCodes.Status401Unauthorized,
            ExcepcionRecursoNoEncontrado => StatusCodes.Status404NotFound,
            ExcepcionConflicto => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status500InternalServerError,
        };

        private static async Task EscribirAsync(HttpContext contexto, int estado, string codigo, string mensaje, object? detalles)
        {
            if (contexto.Response.HasStarted)
            {
                // La respuesta ya empezó a escribirse: no se puede reemplazar el cuerpo.
                return;
            }

            contexto.Response.Clear();
            contexto.Response.StatusCode = estado;
            contexto.Response.ContentType = "application/json; charset=utf-8";

            RespuestaError cuerpo = new(codigo, mensaje, contexto.TraceIdentifier, detalles);

            await contexto.Response.WriteAsync(JsonSerializer.Serialize(cuerpo, OpcionesJson));
        }
    }
}
