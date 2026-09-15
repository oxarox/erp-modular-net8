namespace ERP.Api.Autorizacion
{
    /// <summary>
    /// Catálogo de permisos del sistema, con el formato canónico <c>modulo.accion</c>.
    /// <para>
    /// Está en constantes y no en cadenas sueltas por un motivo práctico: un permiso mal
    /// escrito en un atributo no falla al compilar, falla en producción como un 403 que
    /// nadie entiende. Aquí, además, el catálogo completo se puede listar y comparar contra
    /// lo que la base de datos tiene asignado a los roles.
    /// </para>
    /// </summary>
    public static class Permisos
    {
        public static class Marcas
        {
            public const string Ver = "marcas.ver";
            public const string Gestionar = "marcas.gestionar";
        }

        public static class Ventas
        {
            public const string Ver = "ventas.ver";
            public const string Registrar = "ventas.registrar";
            public const string Anular = "ventas.anular";
        }

        public static class Reportes
        {
            public const string Ver = "reportes.ver";
        }

        public static IReadOnlyCollection<string> Todos { get; } =
        [
            Marcas.Ver,
            Marcas.Gestionar,
            Ventas.Ver,
            Ventas.Registrar,
            Ventas.Anular,
            Reportes.Ver,
        ];
    }
}
