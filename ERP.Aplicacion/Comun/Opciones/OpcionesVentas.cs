namespace ERP.Aplicacion.Comun.Opciones
{
    /// <summary>
    /// Parámetros tributarios y comerciales que cambian por país o por cliente,
    /// y que por lo tanto no pueden estar escritos a mano en el dominio.
    /// Se enlazan desde la sección <c>Ventas</c> de la configuración.
    /// </summary>
    public sealed class OpcionesVentas
    {
        public const string Seccion = "Ventas";

        /// <summary>Tasa de impuesto expresada como fracción: 0.19 = 19 %.</summary>
        public decimal TasaImpuesto { get; set; } = 0.19m;

        /// <summary>Indica si los precios de lista ya incluyen el impuesto.</summary>
        public bool PrecioIncluyeImpuesto { get; set; }

        public string[] MetodosPagoPermitidos { get; set; } =
            ["EFECTIVO", "DEBITO", "CREDITO", "TRANSFERENCIA"];
    }
}
