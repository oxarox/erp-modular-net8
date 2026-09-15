using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace ERP.Api.Autorizacion
{
    /// <summary>
    /// Crea al vuelo una política por cada permiso solicitado.
    /// Sin esto habría que registrar manualmente una política por permiso en el arranque:
    /// con 33 módulos y varias acciones cada uno, ese registro se desincroniza el mismo día.
    /// </summary>
    public sealed class PermisoPolicyProvider : IAuthorizationPolicyProvider
    {
        private readonly DefaultAuthorizationPolicyProvider _respaldo;

        public PermisoPolicyProvider(IOptions<AuthorizationOptions> opciones)
        {
            _respaldo = new DefaultAuthorizationPolicyProvider(opciones);
        }

        public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => _respaldo.GetDefaultPolicyAsync();

        public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => _respaldo.GetFallbackPolicyAsync();

        public Task<AuthorizationPolicy?> GetPolicyAsync(string nombrePolitica)
        {
            if (!nombrePolitica.StartsWith(AutorizarPermisoAttribute.PrefijoPolitica, StringComparison.OrdinalIgnoreCase))
            {
                return _respaldo.GetPolicyAsync(nombrePolitica);
            }

            string permiso = nombrePolitica[AutorizarPermisoAttribute.PrefijoPolitica.Length..];

            AuthorizationPolicy politica = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .AddRequirements(new PermisoRequirement(permiso))
                .Build();

            return Task.FromResult<AuthorizationPolicy?>(politica);
        }
    }
}
