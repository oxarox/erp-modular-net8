namespace ERP.Api.Intermediarios
{
    /// <summary>
    /// Asigna (o respeta) un identificador de correlación por request y lo devuelve en la cabecera.
    /// Con él, un usuario que reporta un error trae consigo la llave exacta para encontrar
    /// ese request en los logs, sin tener que adivinar por hora aproximada.
    /// </summary>
    public sealed class IntermediarioCorrelacionRequest
    {
        public const string Cabecera = "X-Correlacion-Id";

        private readonly RequestDelegate _siguiente;

        public IntermediarioCorrelacionRequest(RequestDelegate siguiente)
        {
            _siguiente = siguiente;
        }

        public async Task InvokeAsync(HttpContext contexto, ILogger<IntermediarioCorrelacionRequest> log)
        {
            string correlacion = contexto.Request.Headers.TryGetValue(Cabecera, out Microsoft.Extensions.Primitives.StringValues entrante)
                && !string.IsNullOrWhiteSpace(entrante)
                    ? entrante.ToString()
                    : Guid.NewGuid().ToString("N");

            contexto.TraceIdentifier = correlacion;
            contexto.Response.Headers[Cabecera] = correlacion;

            using (log.BeginScope(new Dictionary<string, object> { ["CorrelacionId"] = correlacion }))
            {
                await _siguiente(contexto);
            }
        }
    }
}
