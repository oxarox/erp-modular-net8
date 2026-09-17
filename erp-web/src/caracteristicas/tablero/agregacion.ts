import { METODOS_PAGO } from '@/nucleo/api/contratos'
import type { RespuestaVenta } from '@/nucleo/api/contratos'
import { aValorInputFecha, fechaUtcDesdeApi } from '@/nucleo/formato/formato'

/**
 * Agregación del tablero.
 *
 * Vive fuera de los componentes y sin una sola referencia a React porque es la
 * única parte de esta pantalla que puede estar mal sin que se note: un promedio
 * que incluye documentos anulados se ve exactamente igual que uno correcto.
 * Aislada, se lee de arriba abajo y se prueba sin montar un árbol.
 *
 * Que esta agregación exista en el cliente es una limitación conocida de la API,
 * no un atajo de la interfaz. Está explicada en la cabecera de `PaginaTablero.tsx`
 * y declarada en la propia pantalla.
 */

/** Estado con el que el dominio marca una venta revertida (`Venta.Estado`). */
const ESTADO_ANULADA = 'ANULADA'

export interface Periodo {
  /** Medianoche local del primer día incluido. */
  inicio: Date
  /** Medianoche local del último día incluido. */
  fin: Date
  /** Un `Date` por día del período, en orden cronológico. */
  dias: Date[]
}

/**
 * Ventana de N días que termina hoy.
 *
 * Los días se construyen en hora **local** y no en UTC: el gráfico lo lee una
 * persona que cerró su caja a las 21:00 de su propio huso, y una venta de esa
 * hora en Chile es del día siguiente en UTC. Bucketear por UTC movería esa venta
 * a la barra equivocada —la que la persona ve como «mañana»—.
 */
export function calcularPeriodo(cantidadDeDias: number, hoy: Date = new Date()): Periodo {
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth()
  const dia = hoy.getDate()

  // `new Date(anio, mes, dia - 29)` resuelve solo el cambio de mes y de año.
  const dias = Array.from(
    { length: cantidadDeDias },
    (_, indice) => new Date(anio, mes, dia - (cantidadDeDias - 1 - indice)),
  )

  // Los extremos se calculan igual que los elementos en vez de leerse del
  // arreglo: con `noUncheckedIndexedAccess`, `dias[0]` es `Date | undefined` y
  // afirmar lo contrario con `!` sería mentirle al compilador por comodidad.
  return {
    inicio: new Date(anio, mes, dia - (cantidadDeDias - 1)),
    fin: new Date(anio, mes, dia),
    dias,
  }
}

export interface PuntoDia {
  /** `2026-09-15` en hora local: el día que la persona ve, no el día UTC. */
  clave: string
  fecha: Date
  monto: number
  documentos: number
}

export interface DesgloseMetodo {
  metodo: string
  monto: number
  documentos: number
  /** Participación en el monto del período, entre 0 y 1. */
  participacionMonto: number
  /** Participación en la cantidad de documentos, entre 0 y 1. */
  participacionDocumentos: number
}

export interface ResumenVentas {
  /** Documentos de la muestra, anulados incluidos. */
  documentos: number
  /** Documentos que efectivamente vendieron algo. */
  vigentes: number
  anulados: number
  fraccionAnulados: number
  montoTotal: number
  ticketPromedio: number
  serie: PuntoDia[]
  maximoDiario: number
  /** Día más alto del período; `null` si no hubo ninguna venta. */
  diaPico: PuntoDia | null
  metodos: DesgloseMetodo[]
  /** Método con más documentos; `null` si no hubo ninguna venta. */
  metodoPrincipal: DesgloseMetodo | null
}

interface AcumuladoMetodo {
  monto: number
  documentos: number
}

/**
 * Convierte la muestra de ventas en todo lo que el tablero necesita, en una sola
 * pasada sobre el arreglo.
 *
 * La decisión que gobierna el resto: **una venta anulada no vendió nada**. No
 * suma al monto, no aparece en el gráfico, no participa del desglose por método
 * y no arrastra el ticket promedio. Se cuenta aparte porque su indicador propio
 * —cuántas se anularon y qué proporción representan— sí importa.
 */
export function resumirVentas(ventas: RespuestaVenta[], periodo: Periodo): ResumenVentas {
  const serie: PuntoDia[] = periodo.dias.map(fecha => ({
    clave: aValorInputFecha(fecha),
    fecha,
    monto: 0,
    documentos: 0,
  }))

  const porDia = new Map<string, PuntoDia>()

  for (const punto of serie) {
    porDia.set(punto.clave, punto)
  }

  // Los cuatro métodos se siembran en cero para que el desglose muestre siempre
  // los cuatro, incluido el que nadie usó: un método ausente de la lista se lee
  // como «no existe», no como «cero».
  const porMetodo = new Map<string, AcumuladoMetodo>()

  for (const metodo of METODOS_PAGO) {
    porMetodo.set(metodo, { monto: 0, documentos: 0 })
  }

  let anulados = 0
  let montoTotal = 0

  for (const venta of ventas) {
    if (venta.estado === ESTADO_ANULADA) {
      anulados += 1
      continue
    }

    montoTotal += venta.total

    // Un método fuera del espejo de `appsettings.json` se acumula igual: la lista
    // de métodos permitidos es configuración del servidor y puede crecer sin que
    // este archivo se entere. Perder plata en silencio sería peor que mostrar un
    // nombre desconocido.
    const acumulado = porMetodo.get(venta.metodoPago) ?? { monto: 0, documentos: 0 }

    acumulado.monto += venta.total
    acumulado.documentos += 1
    porMetodo.set(venta.metodoPago, acumulado)

    const fecha = fechaUtcDesdeApi(venta.fechaUtc)
    const punto = fecha ? porDia.get(aValorInputFecha(fecha)) : undefined

    // Sin `punto` la venta cae fuera de la ventana pedida. No debería ocurrir
    // —el filtro es del servidor— pero descartarla es más honesto que forzarla
    // dentro de la primera o la última barra.
    if (punto) {
      punto.monto += venta.total
      punto.documentos += 1
    }
  }

  const vigentes = ventas.length - anulados

  const metodos: DesgloseMetodo[] = []

  for (const [metodo, acumulado] of porMetodo) {
    metodos.push({
      metodo,
      monto: acumulado.monto,
      documentos: acumulado.documentos,
      participacionMonto: montoTotal > 0 ? acumulado.monto / montoTotal : 0,
      participacionDocumentos: vigentes > 0 ? acumulado.documentos / vigentes : 0,
    })
  }

  return {
    documentos: ventas.length,
    vigentes,
    anulados,
    fraccionAnulados: ventas.length > 0 ? anulados / ventas.length : 0,
    montoTotal,
    ticketPromedio: vigentes > 0 ? montoTotal / vigentes : 0,
    serie,
    maximoDiario: serie.reduce((maximo, punto) => Math.max(maximo, punto.monto), 0),
    diaPico: elegirDiaPico(serie),
    metodos,
    metodoPrincipal: elegirMetodoPrincipal(metodos),
  }
}

function elegirDiaPico(serie: PuntoDia[]): PuntoDia | null {
  return serie.reduce<PuntoDia | null>(
    (pico, punto) => (punto.monto > 0 && (pico === null || punto.monto > pico.monto) ? punto : pico),
    null,
  )
}

/**
 * «Más frecuente» se mide en documentos, no en monto: el método principal
 * describe cómo paga la gente, no dónde está la plata —una sola transferencia
 * grande no convierte a la transferencia en el método habitual del local—.
 * El empate lo rompe el monto para que el resultado no dependa del orden del
 * arreglo, que es un detalle de esta implementación y no un criterio.
 */
function elegirMetodoPrincipal(metodos: DesgloseMetodo[]): DesgloseMetodo | null {
  return metodos.reduce<DesgloseMetodo | null>((principal, candidato) => {
    if (candidato.documentos === 0) {
      return principal
    }

    if (principal === null || candidato.documentos > principal.documentos) {
      return candidato
    }

    if (candidato.documentos === principal.documentos && candidato.monto > principal.monto) {
      return candidato
    }

    return principal
  }, null)
}

/** Texto único para el tooltip, el `aria-label` de la barra y la tabla alterna. */
export function describirDia(punto: PuntoDia): string {
  if (punto.documentos === 0) {
    return 'sin ventas'
  }

  return punto.documentos === 1 ? '1 documento' : `${punto.documentos} documentos`
}
