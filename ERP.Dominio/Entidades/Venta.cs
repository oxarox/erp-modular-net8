using ERP.Dominio.Abstracciones;

namespace ERP.Dominio.Entidades
{
    /// <summary>Estados posibles de una venta. No se borra una venta: se anula.</summary>
    public static class EstadosVenta
    {
        public const string Completada = "COMPLETADA";
        public const string Anulada = "ANULADA";
    }

    public sealed class Venta : IEntidadActivable, IEntidadMultiEmpresa
    {
        public long Id { get; set; }

        /// <summary>Folio legible, generado por el sistema: V-20260915-0001.</summary>
        public string Numero { get; set; } = string.Empty;

        public long EmpresaId { get; set; }
        public long? ClienteId { get; set; }
        public long UsuarioId { get; set; }
        public long AlmacenId { get; set; }
        public string MetodoPago { get; set; } = string.Empty;

        // Totales denormalizados: se calculan una sola vez, en el dominio
        // (CalculadoraTotalesVenta), y se persisten con la venta. Los reportes leen
        // estas columnas en vez de recalcular, para que el histórico no cambie si
        // mañana cambia la tasa de impuesto. Ver docs/decisiones/ADR-0005.
        public decimal Subtotal { get; set; }
        public decimal Descuento { get; set; }
        public decimal Impuesto { get; set; }
        public decimal Total { get; set; }

        public string Estado { get; set; } = EstadosVenta.Completada;
        public DateTime FechaUtc { get; set; }
        public DateTime FechaCreacionUtc { get; set; }
        public DateTime FechaActualizacionUtc { get; set; }
        public bool Activo { get; set; } = true;

        public ICollection<VentaDetalleLinea> Detalles { get; set; } = new List<VentaDetalleLinea>();
    }
}
