using ERP.Dominio.Abstracciones;

namespace ERP.Dominio.Entidades
{
    public sealed class Producto : IEntidadActivable, IEntidadMultiEmpresa
    {
        public long Id { get; init; }
        public long EmpresaId { get; init; }
        public string Sku { get; init; } = string.Empty;
        public string Nombre { get; init; } = string.Empty;
        public string? Descripcion { get; init; }

        public long? MarcaId { get; init; }
        public long? CategoriaId { get; init; }

        public decimal PrecioVenta { get; init; }
        public decimal CostoPromedio { get; init; }

        /// <summary>Un servicio no descuenta inventario al venderse; un artículo sí.</summary>
        public bool ControlaInventario { get; init; } = true;

        public bool Activo { get; init; } = true;

        public Marca? Marca { get; init; }
        public Categoria? Categoria { get; init; }
    }
}
