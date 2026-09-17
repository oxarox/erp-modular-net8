import { describe, expect, it } from 'vitest'
import {
  aParametroFecha,
  aValorInputFecha,
  capitalizar,
  fechaUtcDesdeApi,
  formatearDecimal,
  formatearEntero,
  formatearMonto,
  iniciales,
} from '@/nucleo/formato/formato'

describe('fechaUtcDesdeApi', () => {
  /**
   * Esta es la prueba que justifica que exista la función.
   *
   * El backend expone `DateTime` y, cuando el valor viene de SQL Server, su
   * `Kind` es `Unspecified`: System.Text.Json lo escribe SIN sufijo Z. El
   * estándar de ECMAScript manda interpretar una fecha-hora sin desfase como
   * hora LOCAL, así que `new Date(venta.fechaUtc)` desplazaría cada venta según
   * la zona del navegador. El campo se llama `fechaUtc` y hay que creerle.
   */
  it('interpreta como UTC una fecha sin sufijo, que es como la manda el backend', () => {
    const fecha = fechaUtcDesdeApi('2026-09-15T14:30:00')

    expect(fecha?.toISOString()).toBe('2026-09-15T14:30:00.000Z')
  })

  it('no altera una fecha que ya trae zona horaria', () => {
    expect(fechaUtcDesdeApi('2026-09-15T14:30:00Z')?.toISOString()).toBe(
      '2026-09-15T14:30:00.000Z',
    )
    expect(fechaUtcDesdeApi('2026-09-15T10:30:00-04:00')?.toISOString()).toBe(
      '2026-09-15T14:30:00.000Z',
    )
  })

  it('conserva los milisegundos que emite .NET', () => {
    expect(fechaUtcDesdeApi('2026-09-15T14:30:00.1234567')?.getUTCMilliseconds()).toBe(123)
  })

  it('devuelve null ante ausencia o basura, en vez de un Invalid Date', () => {
    // Un `Invalid Date` se propaga silencioso hasta que alguien lo formatea y
    // aparece un «NaN/NaN/NaN» en pantalla.
    expect(fechaUtcDesdeApi(null)).toBeNull()
    expect(fechaUtcDesdeApi(undefined)).toBeNull()
    expect(fechaUtcDesdeApi('')).toBeNull()
    expect(fechaUtcDesdeApi('ayer')).toBeNull()
  })
})

describe('parámetros de fecha', () => {
  it('lleva el valor de un input date a los extremos del día', () => {
    expect(aParametroFecha('2026-09-15', 'inicio')).toBe('2026-09-15T00:00:00')
    expect(aParametroFecha('2026-09-15', 'fin')).toBe('2026-09-15T23:59:59')
  })

  it('omite el parámetro cuando el campo está vacío', () => {
    // El cliente HTTP descarta los `undefined`, de modo que el filtro
    // simplemente no viaja en vez de mandar una fecha vacía que el modelo
    // binder rechazaría.
    expect(aParametroFecha('', 'inicio')).toBeUndefined()
  })

  it('formatea una fecha local para un input date sin desplazarla', () => {
    // toISOString() aquí sería un error: convierte a UTC y, en Chile, el día 1
    // a las 00:00 locales se convierte en el día anterior.
    const fecha = new Date(2026, 8, 5, 0, 0, 0)

    expect(aValorInputFecha(fecha)).toBe('2026-09-05')
  })
})

describe('formatearMonto', () => {
  it('formatea en pesos sin decimales', () => {
    // El peso chileno no tiene fracción circulante; mostrarla sería ruido.
    const resultado = formatearMonto(1234567)

    expect(resultado).toContain('$')
    expect(resultado).toContain('1.234.567')
  })

  it('devuelve un guión ante un valor ausente o no finito', () => {
    expect(formatearMonto(null)).toBe('—')
    expect(formatearMonto(undefined)).toBe('—')
    expect(formatearMonto(Number.NaN)).toBe('—')
  })

  it('nunca escribe menos cero', () => {
    // El panel de totales muestra el descuento en negativo (`-totales.descuento`)
    // y un descuento de cero llegaba como `-0`, que `Intl` imprime como «$ -0».
    // Menos cero no existe como cantidad y se lee como un error de cálculo.
    expect(formatearMonto(-0)).toBe(formatearMonto(0))
    expect(formatearMonto(-0.4)).toBe(formatearMonto(0))
    expect(formatearEntero(-0)).toBe(formatearEntero(0))
    expect(formatearDecimal(-0.001)).toBe(formatearDecimal(0))
  })

  it('conserva el signo cuando el valor sí es negativo a la precisión mostrada', () => {
    // La corrección anterior no puede tragarse un negativo de verdad: un
    // descuento aplicado tiene que verse como resta.
    expect(formatearMonto(-1)).toContain('-')
    expect(formatearDecimal(-0.05)).toContain('-')
  })

  it('distingue el cero de la ausencia', () => {
    // Un total de cero es un dato; la ausencia de dato no lo es. Confundirlos
    // en una tabla de montos es cómo se reportan cifras que no existen.
    expect(formatearMonto(0)).not.toBe('—')
  })
})

describe('texto', () => {
  it('capitaliza los estados que el dominio emite en mayúsculas', () => {
    expect(capitalizar('COMPLETADA')).toBe('Completada')
    expect(capitalizar('TRANSFERENCIA')).toBe('Transferencia')
  })

  it('arma las iniciales con las dos primeras palabras', () => {
    expect(iniciales('Administración Norte')).toBe('AN')
    expect(iniciales('  ana   maría  pérez ')).toBe('AM')
    expect(iniciales('Soporte')).toBe('S')
  })
})
