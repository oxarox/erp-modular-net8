namespace ERP.Dominio.ValueObjects
{
    /// <summary>
    /// Monto monetario en la moneda base del sistema.
    /// Encapsula la regla de redondeo (2 decimales, <see cref="MidpointRounding.AwayFromZero"/>)
    /// para que el mismo criterio se use en cálculo, persistencia y presentación.
    /// </summary>
    public readonly record struct Dinero(decimal Valor)
    {
        public const int Decimales = 2;

        public static readonly Dinero Cero = new(0m);

        public static Dinero Crear(decimal valor)
        {
            if (valor < 0m)
            {
                throw new ArgumentOutOfRangeException(nameof(valor), "El monto no puede ser negativo.");
            }

            return new Dinero(Redondear(valor));
        }

        public static decimal Redondear(decimal valor) =>
            Math.Round(valor, Decimales, MidpointRounding.AwayFromZero);

        public static Dinero operator +(Dinero izquierda, Dinero derecha) =>
            new(Redondear(izquierda.Valor + derecha.Valor));

        public static Dinero operator -(Dinero izquierda, Dinero derecha) =>
            new(Redondear(izquierda.Valor - derecha.Valor));

        public static Dinero operator *(Dinero monto, int cantidad) =>
            new(Redondear(monto.Valor * cantidad));

        public override string ToString() => Valor.ToString("F2");
    }
}
