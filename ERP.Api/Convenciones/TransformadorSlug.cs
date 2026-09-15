using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Routing;

namespace ERP.Api.Convenciones
{
    /// <summary>
    /// Convierte los tokens <c>[controller]</c> y <c>[action]</c> de PascalCase a kebab-case.
    /// <para>
    /// <c>IniciarSesion</c> → <c>iniciar-sesion</c>, <c>MovimientosInventario</c> →
    /// <c>movimientos-inventario</c>.
    /// </para>
    /// <para>
    /// Es lo que hace que las ~185 rutas del sistema sean consistentes sin que nadie tenga que
    /// acordarse de la convención: renombrar un método renombra la ruta, y no hay forma de que
    /// una quede en PascalCase por descuido.
    /// </para>
    /// </summary>
    public sealed class TransformadorSlug : IOutboundParameterTransformer
    {
        private static readonly TimeSpan TiempoMaximo = TimeSpan.FromMilliseconds(100);

        public string? TransformOutbound(object? valor)
        {
            if (valor is null)
            {
                return null;
            }

            return Regex.Replace(
                    valor.ToString()!,
                    "([a-z0-9])([A-Z])",
                    "$1-$2",
                    RegexOptions.CultureInvariant,
                    TiempoMaximo)
                .ToLowerInvariant();
        }
    }
}
