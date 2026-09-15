using ERP.Dominio.ValueObjects;

namespace ERP.Dominio.Servicios
{
    /// <summary>Una línea tal como entra al cálculo: cantidad, precio unitario y descuento ya resuelto.</summary>
    public sealed record LineaVentaCalculo(int Cantidad, decimal PrecioUnitario, decimal DescuentoLinea = 0m);

    /// <summary>Totales de una línea, todos redondeados a 2 decimales.</summary>
    public sealed record TotalesLinea(decimal Subtotal, decimal Descuento, decimal Impuesto, decimal Total);

    /// <summary>Totales del documento más el detalle por línea.</summary>
    public sealed record TotalesVenta(
        IReadOnlyList<TotalesLinea> Lineas,
        decimal Subtotal,
        decimal Descuento,
        decimal Impuesto,
        decimal Total);

    /// <summary>
    /// Servicio de dominio puro: calcula los totales de una venta.
    /// <para>
    /// Es el único lugar del sistema autorizado a decidir cómo se componen subtotal, descuento,
    /// impuesto y total. Ni el caso de uso ni el repositorio ni el reporte recalculan por su cuenta:
    /// cuando dos capas calculan lo mismo con criterios distintos, el histórico deja de cuadrar.
    /// Ver docs/decisiones/ADR-0005-totales-de-venta.md.
    /// </para>
    /// <para>
    /// Invariantes que garantiza:
    /// <list type="bullet">
    ///   <item>el total del documento es la suma de los totales de línea (no se recalcula sobre la suma, para no redondear dos veces);</item>
    ///   <item>el impuesto se aplica sobre la base ya descontada, nunca sobre el subtotal bruto;</item>
    ///   <item>el descuento nunca puede superar el subtotal de su línea.</item>
    /// </list>
    /// </para>
    /// </summary>
    public static class CalculadoraTotalesVenta
    {
        public static TotalesVenta Calcular(
            IReadOnlyCollection<LineaVentaCalculo> lineas,
            decimal tasaImpuesto,
            bool precioIncluyeImpuesto = false)
        {
            ArgumentNullException.ThrowIfNull(lineas);

            if (lineas.Count == 0)
            {
                throw new ArgumentException("Una venta debe tener al menos una línea.", nameof(lineas));
            }

            if (tasaImpuesto < 0m || tasaImpuesto > 1m)
            {
                throw new ArgumentOutOfRangeException(nameof(tasaImpuesto), "La tasa de impuesto se expresa como fracción entre 0 y 1.");
            }

            List<TotalesLinea> calculadas = new(lineas.Count);

            foreach (LineaVentaCalculo linea in lineas)
            {
                calculadas.Add(CalcularLinea(linea, tasaImpuesto, precioIncluyeImpuesto));
            }

            return new TotalesVenta(
                calculadas,
                Dinero.Redondear(calculadas.Sum(l => l.Subtotal)),
                Dinero.Redondear(calculadas.Sum(l => l.Descuento)),
                Dinero.Redondear(calculadas.Sum(l => l.Impuesto)),
                Dinero.Redondear(calculadas.Sum(l => l.Total)));
        }

        private static TotalesLinea CalcularLinea(LineaVentaCalculo linea, decimal tasaImpuesto, bool precioIncluyeImpuesto)
        {
            if (linea.Cantidad <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(linea), "La cantidad de una línea debe ser mayor a cero.");
            }

            if (linea.PrecioUnitario < 0m)
            {
                throw new ArgumentOutOfRangeException(nameof(linea), "El precio unitario no puede ser negativo.");
            }

            if (linea.DescuentoLinea < 0m)
            {
                throw new ArgumentOutOfRangeException(nameof(linea), "El descuento no puede ser negativo.");
            }

            decimal bruto = Dinero.Redondear(linea.PrecioUnitario * linea.Cantidad);

            if (linea.DescuentoLinea > bruto)
            {
                throw new ArgumentOutOfRangeException(nameof(linea), "El descuento no puede superar el subtotal de la línea.");
            }

            decimal descuento = Dinero.Redondear(linea.DescuentoLinea);

            if (precioIncluyeImpuesto)
            {
                // El precio de lista ya trae el impuesto dentro: se desagrega hacia atrás.
                decimal total = Dinero.Redondear(bruto - descuento);
                decimal neto = Dinero.Redondear(total / (1m + tasaImpuesto));
                decimal impuesto = Dinero.Redondear(total - neto);

                // El subtotal declarado es neto, para que el desglose sume exactamente el total.
                return new TotalesLinea(Dinero.Redondear(neto + descuento), descuento, impuesto, total);
            }

            decimal baseImponible = Dinero.Redondear(bruto - descuento);
            decimal impuestoLinea = Dinero.Redondear(baseImponible * tasaImpuesto);

            return new TotalesLinea(bruto, descuento, impuestoLinea, Dinero.Redondear(baseImponible + impuestoLinea));
        }
    }
}
