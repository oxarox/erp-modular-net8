namespace ERP.Dominio.Entidades
{
    public sealed class VentaDetalleLinea
    {
        public long Id { get; set; }
        public long VentaId { get; set; }
        public long ProductoId { get; set; }

        /// <summary>Descripción congelada al momento de la venta: si el producto se renombra, el documento histórico no cambia.</summary>
        public string DescripcionProducto { get; set; } = string.Empty;

        public int Cantidad { get; set; }
        public decimal PrecioUnitario { get; set; }

        // Totales por línea. El descuento se aplica a nivel de línea (no de documento)
        // porque una misma boleta puede mezclar líneas con y sin promoción, y el
        // desglose por producto de los reportes se calcula desde aquí.
        public decimal Subtotal { get; set; }
        public decimal DescuentoLinea { get; set; }
        public decimal ImpuestoLinea { get; set; }
        public decimal TotalLinea { get; set; }

        public Venta Venta { get; set; } = null!;
        public Producto? Producto { get; set; }
    }
}
