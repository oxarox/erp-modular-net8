namespace ERP.Dominio.ValueObjects
{
    /// <summary>
    /// Identificador de producto fuertemente tipado. Mismo patrón que <see cref="EmpresaId"/>.
    /// </summary>
    public readonly record struct ProductoId(long Valor)
    {
        public static ProductoId Crear(long valor)
        {
            if (valor <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(valor), "El identificador de producto debe ser mayor a cero.");
            }

            return new ProductoId(valor);
        }

        public override string ToString() => Valor.ToString();
    }
}
