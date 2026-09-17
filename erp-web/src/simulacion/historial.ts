import type { EstadoVenta, MetodoPago } from '@/nucleo/api/contratos'
import { configuracion } from '@/nucleo/configuracion'
import { calcularTotales } from '@/nucleo/dominio/totales'
import type { LineaCalculo } from '@/nucleo/dominio/totales'
import type { Aleatorio, OpcionPonderada } from '@/simulacion/aleatorio'
import type { ProductoDemo } from '@/simulacion/catalogo'
import { aIsoSinZ } from '@/simulacion/sobre'

/**
 * Ventas históricas: lo que el tablero y el listado tienen que poder mostrar
 * antes de que nadie registre nada.
 *
 * Tres decisiones gobiernan el resultado:
 *
 *  - **los totales los calcula `calcularTotales`**, el mismo espejo del dominio
 *    que usa la pantalla de nueva venta. Inventar montos redondos aquí haría que
 *    el histórico no cuadrara con lo que el propio simulador devuelve al
 *    registrar una venta, y la incoherencia saltaría a la vista en el tablero;
 *  - **el reparto por día imita una semana de trabajo**: de lunes a viernes se
 *    vende, el sábado bastante menos y el domingo casi nada. Un histórico plano
 *    produce un gráfico plano, que no se parece a ningún negocio;
 *  - **el folio se arma como `SiguienteNumeroAsync`**, contando los documentos
 *    ya emitidos por esa empresa ese día. Es la misma función que usa la venta
 *    nueva, de modo que el correlativo sigue donde el histórico lo dejó.
 */

export interface VentaDemo {
  id: number
  empresaId: number
  numero: string
  /** ISO sin sufijo `Z`, como sale de SQL Server. Ver `aIsoSinZ`. */
  fechaUtc: string
  estado: EstadoVenta
  metodoPago: MetodoPago
  total: number
}

/**
 * Peso relativo por día de la semana, indexado como `Date.getDay()`
 * (0 = domingo). Un mostrador de insumos vive de lunes a viernes.
 */
const PESO_POR_DIA = [0.18, 1, 1.05, 1, 1.1, 1.15, 0.45]

/**
 * Distribución de métodos de pago. Desigual a propósito: cuatro rebanadas
 * iguales delatan al generador, y el desglose del tablero deja de decir nada.
 */
const METODOS: OpcionPonderada<MetodoPago>[] = [
  { valor: 'DEBITO', peso: 38 },
  { valor: 'EFECTIVO', peso: 29 },
  { valor: 'CREDITO', peso: 22 },
  { valor: 'TRANSFERENCIA', peso: 11 },
]

/** La mayoría de los documentos son de una o dos unidades por línea. */
const CANTIDADES: OpcionPonderada<number>[] = [
  { valor: 1, peso: 52 },
  { valor: 2, peso: 24 },
  { valor: 3, peso: 12 },
  { valor: 4, peso: 7 },
  { valor: 6, peso: 3 },
  { valor: 12, peso: 2 },
]

/** Proporción de documentos revertidos. El tablero tiene un indicador propio para ellos. */
const FRACCION_ANULADAS = 0.06

/** Horario de atención, en hora local de quien mira la demo. */
const HORA_APERTURA = 9
const HORA_CIERRE = 19

export interface ParametrosHistorial {
  empresaId: number
  productos: readonly ProductoDemo[]
  /** Documentos que se quieren en total a lo largo de la ventana. */
  objetivo: number
  dias: number
  hoy: Date
  azar: Aleatorio
  /** Los identificadores son globales y crecientes, como una identidad de base de datos. */
  siguienteId: () => number
}

/** `yyyyMMdd` del instante en UTC, que es el que el backend usa para el prefijo del folio. */
function aAaaaMmDd(fecha: Date): string {
  return fecha.toISOString().slice(0, 10).replaceAll('-', '')
}

/**
 * Espejo de `RepositorioVentaEfCore.SiguienteNumeroAsync`: cuenta los documentos
 * que esa empresa ya emitió ese día y devuelve el siguiente.
 *
 * Se cuenta sobre la lista en vez de llevar un contador aparte para que el
 * histórico y las ventas que se registren durante la demo compartan exactamente
 * la misma regla; un contador paralelo se desincroniza el primer día que alguien
 * registre dos ventas seguidas.
 */
export function siguienteNumeroVenta(
  ventas: readonly VentaDemo[],
  empresaId: number,
  fechaUtc: Date,
): string {
  const prefijo = `V-${aAaaaMmDd(fechaUtc)}-`

  const emitidas = ventas.filter(
    venta => venta.empresaId === empresaId && venta.numero.startsWith(prefijo),
  ).length

  return `${prefijo}${String(emitidas + 1).padStart(4, '0')}`
}

function armarLineas(
  vendibles: readonly ProductoDemo[],
  azar: Aleatorio,
  respaldo: ProductoDemo,
): LineaCalculo[] {
  const cuantas = azar.ponderado(
    [
      { valor: 1, peso: 46 },
      { valor: 2, peso: 28 },
      { valor: 3, peso: 16 },
      { valor: 4, peso: 10 },
    ],
    1,
  )

  const lineas: LineaCalculo[] = []

  for (let indice = 0; indice < cuantas; indice += 1) {
    const producto = azar.elegir(vendibles, respaldo)
    const cantidad = azar.ponderado(CANTIDADES, 1)
    const bruto = producto.precioVenta * cantidad

    // Un descuento ocasional y siempre por debajo del bruto: superarlo no es un
    // error de validación sino una caída del cálculo, y esto es un histórico,
    // no un caso de prueba. Ver la nota de `VentaTipos.revisarLinea`.
    const descuentoLinea = azar.decision(0.14)
      ? Math.round(bruto * azar.elegir([0.05, 0.1, 0.15], 0.05))
      : 0

    lineas.push({ cantidad, precioUnitario: producto.precioVenta, descuentoLinea })
  }

  return lineas
}

export function generarHistorial(parametros: ParametrosHistorial): VentaDemo[] {
  const { empresaId, objetivo, dias, hoy, azar, siguienteId } = parametros

  // Un producto inactivo no se puede vender (`VENTA_003`), así que tampoco
  // aparece en el histórico: el pasado del simulador respeta sus propias reglas.
  const vendibles = parametros.productos.filter(producto => producto.activo)
  const primero = vendibles[0]

  if (primero === undefined) {
    return []
  }

  const jornadas = Array.from({ length: dias }, (_, indice) => {
    const desplazamiento = dias - 1 - indice

    return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - desplazamiento)
  })

  const pesoTotal = jornadas.reduce((suma, dia) => suma + (PESO_POR_DIA[dia.getDay()] ?? 1), 0)
  const base = pesoTotal === 0 ? 0 : objetivo / pesoTotal

  const ventas: VentaDemo[] = []

  for (const [indiceDia, dia] of jornadas.entries()) {
    const esHoy = indiceDia === jornadas.length - 1

    // El día en curso está a medias: emitir sus ventas de la tarde a las nueve de
    // la mañana dejaría documentos fechados en el futuro, que en un ERP se leen
    // como un error y no como una demo.
    const horaTope = esHoy ? Math.min(HORA_CIERRE, hoy.getHours()) : HORA_CIERRE
    const fraccionDelDia = esHoy
      ? Math.max(0, horaTope - HORA_APERTURA + 1) / (HORA_CIERRE - HORA_APERTURA + 1)
      : 1

    const esperado = base * (PESO_POR_DIA[dia.getDay()] ?? 1) * fraccionDelDia

    // La parte fraccionaria se sortea en vez de truncarse: con 0,55 documentos
    // por día, truncar dejaría a la empresa chica sin una sola venta.
    const cantidad = Math.floor(esperado) + (azar.siguiente() < esperado % 1 ? 1 : 0)

    for (let indice = 0; indice < cantidad; indice += 1) {
      // El tope se aplica hora a hora, minuto a minuto y segundo a segundo.
      // Acotar solo la hora no basta: si la sorteada coincide con la actual, un
      // minuto libre deja el documento hasta 59 minutos adelantado, y eso se ve
      // —el listado ordena por fecha, así que una venta registrada en vivo
      // aparecería debajo de un documento histórico con folio mayor—.
      const hora = azar.entero(HORA_APERTURA, Math.max(HORA_APERTURA, horaTope))
      const enLaHoraEnCurso = esHoy && hora === hoy.getHours()

      const minuto = azar.entero(0, enLaHoraEnCurso ? hoy.getMinutes() : 59)
      const enElMinutoEnCurso = enLaHoraEnCurso && minuto === hoy.getMinutes()

      const segundo = azar.entero(0, enElMinutoEnCurso ? hoy.getSeconds() : 59)

      const fecha = new Date(
        dia.getFullYear(),
        dia.getMonth(),
        dia.getDate(),
        hora,
        minuto,
        segundo,
      )

      const totales = calcularTotales(
        armarLineas(vendibles, azar, primero),
        configuracion.impuesto.tasa,
        configuracion.impuesto.precioIncluyeImpuesto,
      )

      ventas.push({
        id: siguienteId(),
        empresaId,
        numero: siguienteNumeroVenta(ventas, empresaId, fecha),
        fechaUtc: aIsoSinZ(fecha),
        estado: azar.decision(FRACCION_ANULADAS) ? 'ANULADA' : 'COMPLETADA',
        metodoPago: azar.ponderado(METODOS, 'EFECTIVO'),
        total: totales.total,
      })
    }
  }

  return ventas
}
