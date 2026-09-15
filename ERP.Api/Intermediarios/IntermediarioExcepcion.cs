using System.Text.Json;
using ERP.Api.Contracts.Comun;
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
                (int estado, RespuestaError cuerpo) = Traducir(ex, contexto.TraceIdentifier);
                await EscribirAsync(contexto, estado, cuerpo);
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
                    RespuestaError.Interno(contexto.TraceIdentifier));
            }
        }

        private static (int Estado, RespuestaError Cuerpo) Traducir(ExcepcionAplicacion excepcion, string traceId) =>
            excepcion switch
            {
                ExcepcionSolicitudInvalida =>
                    (StatusCodes.Status400BadRequest,
                     RespuestaError.SolicitudInvalida(traceId, excepcion.Message, excepcion.CodigoError, excepcion.Detalles)),

                ExcepcionNoAutorizada { EsProhibido: true } =>
                    (StatusCodes.Status403Forbidden,
                     RespuestaError.Prohibido(traceId, excepcion.Message, excepcion.CodigoError)),

                ExcepcionNoAutorizada =>
                    (StatusCodes.Status401Unauthorized,
                     RespuestaError.NoAutenticado(traceId, excepcion.Message, excepcion.CodigoError)),

                // Un recurso de otra empresa también cae aquí: devolver 403 confirmaría
                // que existe, que es justo lo que no se quiere filtrar.
                ExcepcionRecursoNoEncontrado =>
                    (StatusCodes.Status404NotFound,
                     RespuestaError.NoEncontrado(traceId, excepcion.Message, excepcion.CodigoError)),

                ExcepcionConflicto =>
                    (StatusCodes.Status409Conflict,
                     RespuestaError.Conflicto(traceId, excepcion.Message, excepcion.CodigoError, excepcion.Detalles)),

                _ => (StatusCodes.Status500InternalServerError, RespuestaError.Interno(traceId, excepcion.CodigoError)),
            };

        private static async Task EscribirAsync(HttpContext contexto, int estado, RespuestaError cuerpo)
        {
            if (contexto.Response.HasStarted)
            {
                // La respuesta ya empezó a escribirse: no se puede reemplazar el cuerpo.
                return;
            }

            contexto.Response.Clear();
            contexto.Response.StatusCode = estado;
            contexto.Response.ContentType = "application/json; charset=utf-8";

            await contexto.Response.WriteAsync(JsonSerializer.Serialize(cuerpo, OpcionesJson));
        }
    }
}
