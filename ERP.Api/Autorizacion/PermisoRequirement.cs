using Microsoft.AspNetCore.Authorization;

namespace ERP.Api.Autorizacion
{
    public sealed class PermisoRequirement : IAuthorizationRequirement
    {
        public PermisoRequirement(string permiso)
        {
            Permiso = permiso;
        }

        public string Permiso { get; }
    }
}
