using ERP.Dominio.Servicios;
using FluentAssertions;
using Xunit;

namespace ERP.Tests.Ventas
{
    /// <summary>
    /// Pruebas del servicio de dominio de totales.
    /// <para>
    /// Son las pruebas más baratas y más valiosas del repositorio: cálculo puro, sin dobles,
    /// sin base de datos, sin HTTP. Cubren exactamente los casos donde un ERP pierde plata
    /// en silencio —impuesto aplicado dos veces, descuento ignorado, redondeo que no cuadra—
    /// y corren en milisegundos.
    /// </para>
    /// </summary>
    public class CalculadoraTotalesVentaTests
    {
        private const decimal TasaImpuesto = 0.19m;

        [Fact]
        public void Calcular_LineaSimpleSinDescuento_AplicaImpuestoSobreElNeto()
        {
            TotalesVenta totales = CalculadoraTotalesVenta.Calcular(
                [new LineaVentaCalculo(Cantidad: 2, PrecioUnitario: 1000m)],
                TasaImpuesto);

            totales.Subtotal.Should().Be(2000m);
            totales.Descuento.Should().Be(0m);
            totales.Impuesto.Should().Be(380m);
            totales.Total.Should().Be(2380m);
        }

        [Fact]
        public void Calcular_ConDescuentoDeLinea_DescuentaAntesDeAplicarElImpuesto()
        {
            // Este es el caso que se rompe cuando alguien calcula el impuesto sobre el bruto:
            // el impuesto correcto es 19 % de (2000 - 200), no 19 % de 2000.
            TotalesVenta totales = CalculadoraTotalesVenta.Calcular(
                [new LineaVentaCalculo(Cantidad: 2, PrecioUnitario: 1000m, DescuentoLinea: 200m)],
                TasaImpuesto);

            totales.Descuento.Should().Be(200m);
            totales.Impuesto.Should().Be(342m);
            totales.Total.Should().Be(2142m);
        }

        [Fact]
        public void Calcular_VariasLineas_ElTotalEsLaSumaDeLosTotalesDeLinea()
        {
            TotalesVenta totales = CalculadoraTotalesVenta.Calcular(
                [
                    new LineaVentaCalculo(1, 1990m),
                    new LineaVentaCalculo(3, 4990m, 1000m),
                    new LineaVentaCalculo(2, 15m),
                ],
                TasaImpuesto);

            // La invariante que protege el histórico: sumar los totales de línea y mirar el
            // total del documento debe dar exactamente lo mismo, sin céntimos de diferencia.
            totales.Total.Should().Be(totales.Lineas.Sum(l => l.Total));
            totales.Impuesto.Should().Be(totales.Lineas.Sum(l => l.Impuesto));
        }

        [Fact]
        public void Calcular_ConPrecioQueIncluyeImpuesto_DesagregaSinAlterarElTotal()
        {
            // Con precios que ya traen impuesto, el total es el precio de lista: lo que cambia
            // es cómo se reparte entre neto e impuesto, no cuánto paga el cliente.
            TotalesVenta totales = CalculadoraTotalesVenta.Calcular(
                [new LineaVentaCalculo(Cantidad: 1, PrecioUnitario: 11900m)],
                TasaImpuesto,
                precioIncluyeImpuesto: true);

            totales.Total.Should().Be(11900m);
            totales.Impuesto.Should().Be(1900m);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-3)]
        public void Calcular_CantidadNoPositiva_Falla(int cantidad)
        {
            Action accion = () => CalculadoraTotalesVenta.Calcular(
                [new LineaVentaCalculo(cantidad, 1000m)],
                TasaImpuesto);

            accion.Should().Throw<ArgumentOutOfRangeException>();
        }

        [Fact]
        public void Calcular_DescuentoMayorQueLaLinea_Falla()
        {
            Action accion = () => CalculadoraTotalesVenta.Calcular(
                [new LineaVentaCalculo(1, 1000m, DescuentoLinea: 1500m)],
                TasaImpuesto);

            accion.Should().Throw<ArgumentOutOfRangeException>()
                .WithMessage("*no puede superar el subtotal*");
        }

        [Fact]
        public void Calcular_SinLineas_Falla()
        {
            Action accion = () => CalculadoraTotalesVenta.Calcular([], TasaImpuesto);

            accion.Should().Throw<ArgumentException>();
        }

        [Fact]
        public void Calcular_TasaFueraDeRango_Falla()
        {
            Action accion = () => CalculadoraTotalesVenta.Calcular(
                [new LineaVentaCalculo(1, 1000m)],
                tasaImpuesto: 19m);

            accion.Should().Throw<ArgumentOutOfRangeException>();
        }
    }
}
