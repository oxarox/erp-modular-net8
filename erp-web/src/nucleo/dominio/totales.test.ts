import { describe, expect, it } from 'vitest'
import {
  calcularTotales,
  calcularTotalesSeguro,
  ErrorCalculoVenta,
  redondear,
} from '@/nucleo/dominio/totales'

/**
 * Pruebas del espejo de `CalculadoraTotalesVenta`.
 *
 * Son una traducción caso por caso de
 * `ERP.Tests/Ventas/CalculadoraTotalesVentaTests.cs`, con los mismos números
 * exactos. Ese paralelismo es el punto de estas pruebas y no una coincidencia:
 * duplicar una regla de negocio en el cliente es una deuda, y lo único que la
 * hace sostenible es que el día que el dominio cambie, esta suite se ponga roja.
 *
 * Si vienes a modificar un número de aquí, el archivo que hay que mirar primero
 * es el de C#, no este.
 */
describe('calcularTotales — paridad con el dominio', () => {
  const TASA = 0.19

  it('aplica el impuesto sobre el neto en una línea sin descuento', () => {
    const totales = calcularTotales([{ cantidad: 2, precioUnitario: 1000 }], TASA)

    expect(totales.subtotal).toBe(2000)
    expect(totales.descuento).toBe(0)
    expect(totales.impuesto).toBe(380)
    expect(totales.total).toBe(2380)
  })

  it('descuenta antes de aplicar el impuesto', () => {
    // El caso que se rompe cuando alguien calcula el impuesto sobre el bruto:
    // lo correcto es 19 % de (2000 - 200), no 19 % de 2000.
    const totales = calcularTotales(
      [{ cantidad: 2, precioUnitario: 1000, descuentoLinea: 200 }],
      TASA,
    )

    expect(totales.descuento).toBe(200)
    expect(totales.impuesto).toBe(342)
    expect(totales.total).toBe(2142)
  })

  it('el total del documento es la suma de los totales de línea', () => {
    const totales = calcularTotales(
      [
        { cantidad: 1, precioUnitario: 1990 },
        { cantidad: 3, precioUnitario: 4990, descuentoLinea: 1000 },
        { cantidad: 2, precioUnitario: 15 },
      ],
      TASA,
    )

    // La invariante que protege el histórico: sumar las líneas y mirar el total
    // del documento tiene que dar exactamente lo mismo, sin céntimos de diferencia.
    const sumaTotales = redondear(totales.lineas.reduce((a, l) => a + l.total, 0))
    const sumaImpuestos = redondear(totales.lineas.reduce((a, l) => a + l.impuesto, 0))

    expect(totales.total).toBe(sumaTotales)
    expect(totales.impuesto).toBe(sumaImpuestos)
  })

  it('desagrega sin alterar el total cuando el precio ya incluye impuesto', () => {
    // Con precios que ya traen impuesto, el total es el precio de lista: lo que
    // cambia es cómo se reparte entre neto e impuesto, no cuánto paga el cliente.
    const totales = calcularTotales([{ cantidad: 1, precioUnitario: 11900 }], TASA, true)

    expect(totales.total).toBe(11900)
    expect(totales.impuesto).toBe(1900)
  })

  it.each([0, -3])('rechaza la cantidad no positiva %i', cantidad => {
    expect(() => calcularTotales([{ cantidad, precioUnitario: 1000 }], TASA)).toThrow(
      ErrorCalculoVenta,
    )
  })

  it('rechaza un descuento mayor que el subtotal de la línea', () => {
    expect(() =>
      calcularTotales([{ cantidad: 1, precioUnitario: 1000, descuentoLinea: 1500 }], TASA),
    ).toThrow(/no puede superar el subtotal/)
  })

  it('rechaza una venta sin líneas', () => {
    expect(() => calcularTotales([], TASA)).toThrow(ErrorCalculoVenta)
  })

  it('rechaza una tasa fuera del rango 0–1', () => {
    // La tasa se expresa como fracción: 0,19 y no 19.
    expect(() => calcularTotales([{ cantidad: 1, precioUnitario: 1000 }], 19)).toThrow(
      ErrorCalculoVenta,
    )
  })

  it('señala en qué línea está el problema', () => {
    // Sin el índice, la pantalla de venta solo podría decir «hay un error» y
    // dejar a la persona buscándolo entre veinte líneas.
    try {
      calcularTotales(
        [
          { cantidad: 1, precioUnitario: 1000 },
          { cantidad: 0, precioUnitario: 500 },
        ],
        TASA,
      )
      expect.unreachable('debía lanzar')
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorCalculoVenta)
      expect((error as ErrorCalculoVenta).indiceLinea).toBe(1)
    }
  })
})

describe('redondear', () => {
  it('redondea a dos decimales con la media hacia arriba', () => {
    expect(redondear(2.345)).toBe(2.35)
    expect(redondear(2.344)).toBe(2.34)
  })

  it('sobrevive al error binario de la coma flotante', () => {
    // 1.005 * 100 da 100.49999999999999 en coma flotante: redondear eso
    // directamente devolvería 1.00 y el desglose dejaría de cuadrar.
    expect(redondear(1.005)).toBe(1.01)
    expect(redondear(8.165)).toBe(8.17)
  })

  it('devuelve cero ante un valor no finito en vez de propagar NaN', () => {
    expect(redondear(Number.NaN)).toBe(0)
    expect(redondear(Number.POSITIVE_INFINITY)).toBe(0)
  })
})

describe('calcularTotalesSeguro', () => {
  it('devuelve los totales cuando la venta es válida', () => {
    const { totales, error } = calcularTotalesSeguro([{ cantidad: 1, precioUnitario: 1000 }], 0.19)

    expect(error).toBeNull()
    expect(totales?.total).toBe(1190)
  })

  it('no lanza mientras la línea está a medio escribir', () => {
    // Una cantidad en cero es un estado transitorio normal de un formulario:
    // debe producir un error consultable, no hacer estallar el render.
    const { totales, error } = calcularTotalesSeguro([{ cantidad: 0, precioUnitario: 1000 }], 0.19)

    expect(totales).toBeNull()
    expect(error).toBeInstanceOf(ErrorCalculoVenta)
    expect(error?.indiceLinea).toBe(0)
  })
})
