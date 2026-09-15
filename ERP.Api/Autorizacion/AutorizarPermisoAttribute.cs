using Microsoft.AspNetCore.Authorization;

namespace ERP.Api.Autorizacion
{
    /// <summary>
    /// Exige un permiso concreto sobre una acción: <c>[AutorizarPermiso(Permisos.Marcas.Gestionar)]</c>.
    /// <para>
    /// Se apoya en un nombre de política sintético (<c>permiso:marcas.gestionar</c>) que
    /// <see cref="PermisoPolicyProvider"/> materializa al vuelo. Así no hay que registrar
    /// a mano una política por permiso en el arranque: agregar un permiso nuevo es agregar
    /// una constante, no tocar Program.cs.
    /// </para>
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
    public sealed class AutorizarPermisoAttribute : AuthorizeAttribute
    {
        public const string PrefijoPolitica = "permiso:";

        public AutorizarPermisoAttribute(string permiso)
        {
            Permiso = permiso;
            Policy = PrefijoPolitica + permiso;
        }

        public string Permiso { get; }
    }
}
