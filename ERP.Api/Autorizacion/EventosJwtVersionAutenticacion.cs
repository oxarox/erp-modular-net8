using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Dominio.Entidades;
using ERP.Infraestructura.Seguridad;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace ERP.Api.Autorizacion
{
    /// <summary>
    /// Rechaza tokens emitidos antes del último cambio de credenciales del usuario.
    /// <para>
    /// Es el contrapeso de haber puesto los permisos dentro del token: cuando alguien cambia
    /// su contraseña o un administrador revoca sus sesiones, el contador
    /// <c>VersionAutenticacion</c> sube y todos los accesos vivos dejan de validar,
    /// sin necesidad de mantener una lista negra de tokens.
    /// </para>
    /// </summary>
    public static class EventosJwtVersionAutenticacion
    {
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
        };
    }
}
