using System.Text.Json;
using ERP.Api.Contracts.Comun;
using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Aplicacion.Comun.CodigosError;
using ERP.Dominio.Entidades;
using ERP.Infraestructura.Seguridad;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace ERP.Api.Autorizacion
{
    /// <summary>
    /// Eventos del esquema JWT. Cubren dos cosas distintas:
    /// <list type="number">
    ///   <item>
    ///     <b>Validación de la versión de credenciales.</b> Es el contrapeso de haber puesto
    ///     los permisos dentro del token: cuando alguien cambia su contraseña o un
    ///     administrador revoca sus sesiones, el contador <c>auth_version</c> sube y todos los
    ///     accesos vivos dejan de validar, sin mantener una lista negra de tokens.
    ///   </item>
    ///   <item>
    ///     <b>Forma del 401 y del 403.</b> El middleware de autenticación corta el request
    ///     ANTES de llegar a <see cref="Intermediarios.IntermediarioExcepcion"/>, así que por
    ///     defecto esos dos códigos salen con el cuerpo vacío. Eso rompería el contrato de que
    ///     todo error de la API tiene la misma forma, y obligaría al cliente a tratar 401 y 403
    ///     como casos especiales. Aquí se escribe el mismo sobre que el resto del sistema.
    ///   </item>
    /// </list>
    /// </summary>
    public static class EventosJwtVersionAutenticacion
    {
        private static readonly JsonSerializerOptions OpcionesJson = new(JsonSerializerDefaults.Web);

        public static JwtBearerEvents Crear() => new()
        {
            OnTokenValidated = async contexto =>
            {
                string? versionEnToken = contexto.Principal?.FindFirst(ClaimsErp.VersionAutenticacion)?.Value;
                string? usuarioEnToken = contexto.Principal?.FindFirst(ClaimsErp.UsuarioId)?.Value;
                string? empresaEnToken = contexto.Principal?.FindFirst(ClaimsErp.EmpresaId)?.Value;

                if (!long.TryParse(usuarioEnToken, out long usuarioId)
                    || !long.TryParse(empresaEnToken, out long empresaId)
                    || !int.TryParse(versionEnToken, out int version))
                {
                    contexto.Fail("El token no contiene los claims requeridos.");
                    return;
                }

                IRepositorioUsuario repositorio = contexto.HttpContext.RequestServices.GetRequiredService<IRepositorioUsuario>();
                Usuario? usuario = await repositorio.ObtenerPorIdAsync(empresaId, usuarioId, contexto.HttpContext.RequestAborted);

                if (usuario is null || !usuario.Activo || usuario.VersionAutenticacion != version)
                {
                    contexto.Fail("La sesión ya no es válida.");
                }
            },

            OnChallenge = async contexto =>
            {
                // Evita que ASP.NET escriba su respuesta vacía por defecto.
                contexto.HandleResponse();

                await EscribirAsync(
                    contexto.HttpContext,
                    StatusCodes.Status401Unauthorized,
                    RespuestaError.NoAutenticado(
                        contexto.HttpContext.TraceIdentifier,
                        "Se requiere un token de acceso válido.",
                        CodigosErrorApi.NoAutenticado));
            },

            OnForbidden = async contexto =>
                await EscribirAsync(
                    contexto.HttpContext,
                    StatusCodes.Status403Forbidden,
                    RespuestaError.Prohibido(
                        contexto.HttpContext.TraceIdentifier,
                        "No cuenta con el permiso requerido para esta operación.",
                        CodigosErrorApi.SinPermiso)),
        };

        private static async Task EscribirAsync(HttpContext contexto, int estado, RespuestaError cuerpo)
        {
            if (contexto.Response.HasStarted)
            {
                return;
            }

            contexto.Response.StatusCode = estado;
            contexto.Response.ContentType = "application/json; charset=utf-8";

            await contexto.Response.WriteAsync(JsonSerializer.Serialize(cuerpo, OpcionesJson));
        }
    }
}
