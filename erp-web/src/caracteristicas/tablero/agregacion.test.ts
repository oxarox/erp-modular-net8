import { describe, expect, it } from 'vitest'
import type { RespuestaVenta } from '@/nucleo/api/contratos'
import { calcularPeriodo, resumirVentas } from '@/caracteristicas/tablero/agregacion'

/**
 * Pruebas de la agregación del tablero.
 *
 * Es la única parte de esa pantalla que puede estar mal sin que se note: un
 * promedio que incluye documentos anulados se ve exactamente igual que uno
 * correcto, y una venta bucketeada en el día equivocado solo se descubre cuando
 * alguien cuadra la caja a mano.
 */

/** Fecha fija para que las pruebas no dependan del día en que se ejecuten. */
const HOY = new Date(2026, 8, 15, 12, 0, 0)

function venta(parcial: Partial<RespuestaVenta> & { fechaUtc: string }): RespuestaVenta {
  return {
    id: 1,
    numero: 'V-20260915-0001',
    estado: 'COMPLETADA',
    metodoPago: 'EFECTIVO',
    total: 1000,
    ...parcial,
  }
}

describe('calcularPeriodo', () => {
  it('devuelve una ventana de N días que termina hoy', () => {
    const periodo = calcularPeriodo(30, HOY)

    expect(periodo.dias).toHaveLength(30)
    expect(periodo.fin.getDate()).toBe(15)
    expect(periodo.inicio.getMonth()).toBe(7) // agosto: cruza el cambio de mes
    expect(periodo.inicio.getDate()).toBe(17)
  })

  it('cruza el cambio de año sin aritmética especial', () => {
    const periodo = calcularPeriodo(10, new Date(2026, 0, 5, 12, 0, 0))

    expect(periodo.inicio.getFullYear()).toBe(2025)
    expect(periodo.inicio.getMonth()).toBe(11)
    expect(periodo.inicio.getDate()).toBe(27)
  })
})

describe('resumirVentas', () => {
  const periodo = calcularPeriodo(7, HOY)

  it('deja los días sin ventas como barra en cero, no como hueco', () => {
    // Una serie que omite los días vacíos comprime el tiempo: tres ventas en
    // tres días seguidos y tres repartidas en una semana se verían igual.
    const resumen = resumirVentas([], periodo)

    expect(resumen.serie).toHaveLength(7)
    expect(resumen.serie.every(punto => punto.monto === 0)).toBe(true)
  })

  it('una venta anulada no vendió nada', () => {
    const resumen = resumirVentas(
      [
        venta({ id: 1, fechaUtc: '2026-09-15T10:00:00', total: 1000 }),
        venta({ id: 2, fechaUtc: '2026-09-15T11:00:00', total: 5000, estado: 'ANULADA' }),
      ],
      periodo,
    )

    // No suma al monto, no arrastra el promedio y no entra en el gráfico…
    expect(resumen.montoTotal).toBe(1000)
    expect(resumen.ticketPromedio).toBe(1000)
    expect(resumen.serie.at(-1)?.monto).toBe(1000)

    // …pero sí se cuenta aparte, porque su propio indicador importa.
    expect(resumen.anulados).toBe(1)
    expect(resumen.documentos).toBe(2)
    expect(resumen.fraccionAnulados).toBeCloseTo(0.5)
  })

  it('agrupa por el día local, no por el día UTC', () => {
    // Una venta de las 23:00 en Chile es del día siguiente en UTC. Bucketear por
    // UTC la movería a la barra que la persona lee como «mañana».
    const local = new Date(2026, 8, 14, 23, 0, 0)

    // Así viaja la fecha desde el backend: el instante en UTC, sin sufijo Z.
    const comoLaMandaLaApi = local.toISOString().replace('Z', '')

    const resumen = resumirVentas([venta({ fechaUtc: comoLaMandaLaApi, total: 2500 })], periodo)

    expect(resumen.serie.find(punto => punto.fecha.getDate() === 14)?.monto).toBe(2500)
  })

  it('siembra los cuatro métodos aunque nadie use alguno', () => {
    // Un método ausente de la lista se lee como «el sistema no lo acepta»,
    // que es distinto de «nadie pagó así».
    const resumen = resumirVentas([venta({ fechaUtc: '2026-09-15T10:00:00' })], periodo)

    expect(resumen.metodos.map(m => m.metodo)).toEqual(
      expect.arrayContaining(['EFECTIVO', 'DEBITO', 'CREDITO', 'TRANSFERENCIA']),
    )
    expect(resumen.metodos.find(m => m.metodo === 'DEBITO')?.documentos).toBe(0)
  })

  it('elige el método principal por documentos y no por monto', () => {
    // Una sola transferencia grande no convierte a la transferencia en la forma
    // habitual de pagar del local.
    const resumen = resumirVentas(
      [
        venta({ id: 1, fechaUtc: '2026-09-15T09:00:00', metodoPago: 'EFECTIVO', total: 1000 }),
        venta({ id: 2, fechaUtc: '2026-09-15T10:00:00', metodoPago: 'EFECTIVO', total: 1000 }),
        venta({ id: 3, fechaUtc: '2026-09-15T11:00:00', metodoPago: 'TRANSFERENCIA', total: 90000 }),
      ],
      periodo,
    )

    expect(resumen.metodoPrincipal?.metodo).toBe('EFECTIVO')
  })

  it('acumula un método desconocido en vez de perderlo', () => {
    // La lista de métodos permitidos es configuración del servidor y puede
    // crecer sin que el espejo del cliente se entere. Perder el monto en
    // silencio sería peor que mostrar un nombre que no se reconoce.
    const resumen = resumirVentas(
      [venta({ fechaUtc: '2026-09-15T10:00:00', metodoPago: 'CHEQUE', total: 7000 })],
      periodo,
    )

    expect(resumen.montoTotal).toBe(7000)
    expect(resumen.metodos.find(m => m.metodo === 'CHEQUE')?.monto).toBe(7000)
  })

  it('no divide por cero cuando no hay ventas', () => {
    const resumen = resumirVentas([], periodo)

    expect(resumen.ticketPromedio).toBe(0)
    expect(resumen.fraccionAnulados).toBe(0)
    expect(resumen.diaPico).toBeNull()
    expect(resumen.metodoPrincipal).toBeNull()
  })

  it('descarta una venta fuera de la ventana en vez de forzarla a un extremo', () => {
    const resumen = resumirVentas(
      [venta({ fechaUtc: '2026-01-01T10:00:00', total: 4000 })],
      periodo,
    )

    // Cuenta para el monto —el servidor la devolvió dentro del filtro— pero no
    // se pinta en una barra que no le corresponde.
    expect(resumen.serie.every(punto => punto.monto === 0)).toBe(true)
  })
})
