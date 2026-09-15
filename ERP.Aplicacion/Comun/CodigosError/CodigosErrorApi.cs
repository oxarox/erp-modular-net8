namespace ERP.Aplicacion.Comun.CodigosError
{
    /// <summary>
    /// Códigos transversales del borde HTTP. Ver el catálogo completo en docs/codigos-error.md.
    /// Regla: el correlativo es GLOBAL por módulo y NUNCA se reutiliza, aunque el código quede obsoleto.
    /// </summary>
    public static class CodigosErrorApi
    {
        public const string NoAutenticado = "API_001";
        public const string SinPermiso = "API_002";
        public const string RecursoNoEncontrado = "API_003";
        public const string ErrorInterno = "API_004";
        public const string EmpresaNoResuelta = "API_005";
        public const string CuerpoInvalido = "API_006";
        public const string ParametroInvalido = "API_007";
        public const string ConflictoDeEstado = "API_008";

        /// <summary>La base de datos u otra dependencia no responde. Es 503, no 500: el sistema no tiene un fallo, tiene una dependencia caída.</summary>
        public const string ServicioDatosNoDisponible = "API_009";
    }
}
