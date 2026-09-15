using Microsoft.AspNetCore.Mvc.ApplicationModels;

namespace ERP.Api.Convenciones
{
    /// <summary>
    /// Recorta el prefijo <c>Controlador</c> del nombre de la clase para generar la ruta.
    /// <para>
    /// <c>ControladorAutenticacion</c> → <c>Autenticacion</c> → <c>api/autenticacion</c>.
    /// </para>
    /// <para>
    /// Sin esta convención habría que escribir la ruta literal en cada controlador
    /// (<c>[Route("api/autenticacion")]</c>), y con 36 controladores es cuestión de tiempo que
    /// una quede mal escrita o desalineada del nombre de la clase.
    /// </para>
    /// </summary>
    public sealed class ConvencionNombreControlador : IControllerModelConvention
    {
        private const string Prefijo = "Controlador";

        public void Apply(ControllerModel controlador)
        {
            if (controlador.ControllerName.StartsWith(Prefijo, StringComparison.OrdinalIgnoreCase))
            {
                controlador.ControllerName = controlador.ControllerName[Prefijo.Length..];
            }
        }
    }
}
