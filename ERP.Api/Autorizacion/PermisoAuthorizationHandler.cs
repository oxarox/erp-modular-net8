using ERP.Infraestructura.Seguridad;
using Microsoft.AspNetCore.Authorization;

namespace ERP.Api.Autorizacion
{
    /// <summary>
    /// Verifica el permiso contra los claims del token.
    /// No consulta la base de datos: los permisos viajan firmados dentro del JWT, y el costo
    /// de esa decisión (revocación diferida) se compensa con una expiración de acceso corta.
    /// Ver docs/decisiones/ADR-0003-rbac-por-permisos.md.
    /// </summary>
    public sealed class PermisoAuthorizationHandler : AuthorizationHandler<PermisoRequirement>
    {
        protected override Task HandleRequirementAsync(AuthorizationHandlerContext contexto, PermisoRequirement requisito)
        {
            bool tienePermiso = contexto.User
                .FindAll(ClaimsErp.Permiso)
                .Any(c => string.Equals(c.Value, requisito.Permiso, StringComparison.OrdinalIgnoreCase));

            if (tienePermiso)
            {
                contexto.Succeed(requisito);
            }

            return Task.CompletedTask;
        }
    }
}
