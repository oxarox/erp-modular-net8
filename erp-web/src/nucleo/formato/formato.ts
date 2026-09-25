/**
 * Formato de fechas, montos y números.
 *
 * Un solo módulo para que la misma cifra se vea igual en el tablero, en la tabla
 * y en el comprobante. Los `Intl.*Format` se construyen una vez y se reutilizan:
 * crearlos en cada celda de una tabla de 200 filas se nota.
 */

const LOCALE = 'es-CL'

// ── Fechas ──────────────────────────────────────────────────────────────────

/**
 * Convierte una fecha UTC de la API en un `Date` correcto.
 *
 * Hay una trampa concreta aquí. El backend expone `DateTime` y, cuando el valor
 * viene de SQL Server (`datetime2`), su `Kind` es `Unspecified`, así que
 * `System.Text.Json` lo escribe **sin sufijo Z**: `"2026-09-15T14:30:00"`. El
 * estándar de ECMAScript dice que una fecha-hora sin desfase se interpreta como
 * hora **local**, de modo que `new Date(...)` directo desplazaría cada venta
 * según la zona horaria del navegador —en Chile, tres o cuatro horas—. Por eso
 * se agrega la Z cuando falta: el campo se llama `fechaUtc` y hay que creerle.
 */
export function fechaUtcDesdeApi(valor: string | null | undefined): Date | null {
  if (!valor) {
    return null
  }

  const tieneZona = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(valor)
  const fecha = new Date(tieneZona ? valor : `${valor}Z`)

  return Number.isNaN(fecha.getTime()) ? null : fecha
}

const formatoFecha = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const formatoFechaHora = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const formatoFechaLarga = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const formatoDiaMes = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short' })

export function formatearFecha(valor: string | Date | null | undefined): string {
  const fecha = valor instanceof Date ? valor : fechaUtcDesdeApi(valor)

  return fecha ? formatoFecha.format(fecha) : '—'
}

export function formatearFechaHora(valor: string | Date | null | undefined): string {
  const fecha = valor instanceof Date ? valor : fechaUtcDesdeApi(valor)

  return fecha ? formatoFechaHora.format(fecha) : '—'
}

export function formatearFechaLarga(valor: string | Date | null | undefined): string {
  const fecha = valor instanceof Date ? valor : fechaUtcDesdeApi(valor)

  return fecha ? formatoFechaLarga.format(fecha) : '—'
}

export function formatearDiaMes(valor: string | Date | null | undefined): string {
  const fecha = valor instanceof Date ? valor : fechaUtcDesdeApi(valor)

  return fecha ? formatoDiaMes.format(fecha) : '—'
}

/** `2026-09-15`, el formato que esperan los `<input type="date">`. */
export function aValorInputFecha(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

/**
 * Lleva el valor de un `<input type="date">` al instante UTC que espera la API.
 *
 * `desde` toma el comienzo del día y `hasta` el final; el backend además
 * extiende `hasta` al último tick del día, de modo que un rango de un solo día
 * incluye la jornada completa.
 */
export function aParametroFecha(valor: string, limite: 'inicio' | 'fin'): string | undefined {
  if (!valor) {
    return undefined
  }

  return limite === 'inicio' ? `${valor}T00:00:00` : `${valor}T23:59:59`
}

/** Tiempo relativo corto: «hace 3 min», «en 28 min». Para el reloj de la sesión. */
const formatoRelativo = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto', style: 'short' })

export function formatearRelativo(desde: Date, hasta: Date = new Date()): string {
  const segundos = Math.round((desde.getTime() - hasta.getTime()) / 1000)
  const absoluto = Math.abs(segundos)

  if (absoluto < 60) {
    return formatoRelativo.format(segundos, 'second')
  }

  if (absoluto < 3600) {
    return formatoRelativo.format(Math.round(segundos / 60), 'minute')
  }

  if (absoluto < 86400) {
    return formatoRelativo.format(Math.round(segundos / 3600), 'hour')
  }

  return formatoRelativo.format(Math.round(segundos / 86400), 'day')
}

// ── Montos ──────────────────────────────────────────────────────────────────

const formatoMoneda = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const formatoMonedaExacta = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const formatoEntero = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })

const formatoDecimal = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const formatoPorcentaje = new Intl.NumberFormat(LOCALE, {
  style: 'percent',
  maximumFractionDigits: 1,
})

/**
 * Quita el signo cuando el valor **se muestra** como cero.
 *
 * `Intl.NumberFormat` respeta el signo del número que recibe, así que un
 * descuento de `-0` o un desfase de reloj de `-0,2 s` redondeado a cero salen
 * como «$ -0» y «-0 s». Menos cero no existe como cantidad y la primera lectura
 * es siempre «esto está mal calculado». Se normaliza a la precisión con la que
 * cada formateador va a imprimir, no a cero absoluto: `-0,4` es cero en pesos y
 * NO lo es cuando se muestran dos decimales.
 */
function sinCeroNegativo(valor: number, decimales: number): number {
  const factor = 10 ** decimales

  return Math.round(valor * factor) === 0 ? 0 : valor
}

/**
 * Monto en pesos. Se redondea a entero porque el peso chileno no tiene
 * fracción circulante; cuando el decimal importa —el desglose de un
 * comprobante— existe `formatearMontoExacto`.
 */
export function formatearMonto(valor: number | null | undefined): string {
  return typeof valor === 'number' && Number.isFinite(valor)
    ? formatoMoneda.format(sinCeroNegativo(valor, 0))
    : '—'
}

export function formatearMontoExacto(valor: number | null | undefined): string {
  return typeof valor === 'number' && Number.isFinite(valor)
    ? formatoMonedaExacta.format(sinCeroNegativo(valor, 2))
    : '—'
}

export function formatearEntero(valor: number | null | undefined): string {
  return typeof valor === 'number' && Number.isFinite(valor)
    ? formatoEntero.format(sinCeroNegativo(valor, 0))
    : '—'
}

export function formatearDecimal(valor: number | null | undefined): string {
  return typeof valor === 'number' && Number.isFinite(valor)
    ? formatoDecimal.format(sinCeroNegativo(valor, 2))
    : '—'
}

export function formatearPorcentaje(fraccion: number): string {
  return formatoPorcentaje.format(fraccion)
}

// ── Texto ───────────────────────────────────────────────────────────────────

/** `COMPLETADA` → `Completada`. Los estados viajan en mayúsculas desde el dominio. */
export function capitalizar(valor: string): string {
  return valor.charAt(0).toUpperCase() + valor.slice(1).toLowerCase()
}

/** Iniciales para el avatar del encabezado: «Administración Norte» → «AN». */
export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(parte => parte.charAt(0).toUpperCase())
    .join('')
}
