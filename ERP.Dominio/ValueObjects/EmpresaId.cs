namespace ERP.Dominio.ValueObjects
{
    /// <summary>
    /// Identificador de empresa fuertemente tipado.
    /// Evita que un <c>long</c> cualquiera se cuele donde se espera un tenant válido:
    /// el invariante "mayor a cero" se verifica una sola vez, en el borde.
    /// </summary>
    public readonly record struct EmpresaId(long Valor)
    {
        public static EmpresaId Crear(long valor)
        {
            if (valor <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(valor), "El identificador de empresa debe ser mayor a cero.");
            }

            return new EmpresaId(valor);
        }

        public override string ToString() => Valor.ToString();
    }
}
