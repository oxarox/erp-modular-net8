import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { claves } from '@/app/clienteConsultas'
import { Boton } from '@/componentes/Boton'
import { Campo, Seleccion } from '@/componentes/Formulario'
import { IconoCarrito, IconoCheque, IconoFlechaDerecha, IconoMas } from '@/componentes/Iconos'
import {
  AvisoError,
  CabeceraTarjeta,
  EncabezadoPagina,
  Esqueleto,
  Insignia,
  Pila,
  Tarjeta,
} from '@/componentes/Superficie'
import { useNotificaciones } from '@/componentes/Notificaciones'
import type {
  MetodoPago,
  RespuestaProducto,
  RespuestaVentaRegistrada,
  SolicitudRegistrarVenta,
} from '@/nucleo/api/contratos'
import { api } from '@/nucleo/api/endpoints'
import { CODIGOS_VENTAS, ErrorApi, erroresPorCampo } from '@/nucleo/api/errores'
import { configuracion } from '@/nucleo/configuracion'
import { calcularTotalesSeguro } from '@/nucleo/dominio/totales'
import { formatearMonto } from '@/nucleo/formato/formato'
import type { LineaVenta, ProblemaLinea } from '@/caracteristicas/ventas/VentaTipos'
import { lineaDesdeProducto, revisarLinea } from '@/caracteristicas/ventas/VentaTipos'
import { VentaLineas } from '@/caracteristicas/ventas/VentaLineas'
import { VentaResumenTotales } from '@/caracteristicas/ventas/VentaResumenTotales'
import { VentaSelectorProducto } from '@/caracteristicas/ventas/VentaSelectorProducto'

/**
 * Registro de una venta.
 *
 * Es la contraparte del caso de uso difícil del backend
 * (`ManejadorRegistrarVenta`), y comparte con él la misma división de
 * responsabilidades: aquí se arma la solicitud y se adelantan las
 * comprobaciones que evitan un viaje inútil; allá se decide.
 *
 * Tres cosas que esta pantalla hace a propósito:
 *
 * 1. **Los totales de la izquierda son una previsualización.** El cálculo
 *    autoritativo lo hace el dominio en el servidor (ADR-0005). Lo que se
 *    muestra en el comprobante, una vez registrada, son los totales que devolvió
 *    la API —no los previsualizados—, aunque coincidan.
 * 2. **La mutación no se reintenta.** Está configurado así en
 *    `clienteConsultas.ts` para todas las mutaciones, y aquí es donde importa:
 *    un reintento automático de `registrar-venta` duplica una venta que el
 *    cliente ya pagó.
 * 3. **Al terminar se invalida también el catálogo de productos.** La venta
 *    descontó inventario dentro de la transacción del servidor, así que el stock
 *    que TanStack Query tiene en caché quedó viejo: si no se invalidara, el
 *    selector seguiría ofreciendo unidades que ya no existen.
 */

/** Espejo de `Ventas:MetodosPagoPermitidos`; el servidor manda y valida con VENTA_007. */
const METODO_POR_DEFECTO: MetodoPago = 'EFECTIVO'

interface Comprobante {
  venta: RespuestaVentaRegistrada
  metodoPago: MetodoPago
  almacen: string
}

export default function PaginaNuevaVenta() {
  const navegar = useNavigate()
  const clienteConsultas = useQueryClient()
  const { avisarExito } = useNotificaciones()

  const [almacenElegido, setAlmacenElegido] = useState<number | null>(null)
  const [lineas, setLineas] = useState<LineaVenta[]>([])
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(METODO_POR_DEFECTO)
  const [erroresDeCampo, setErroresDeCampo] = useState<Record<string, string>>({})
  const [comprobante, setComprobante] = useState<Comprobante | null>(null)

  const almacenes = useQuery({
    queryKey: claves.almacenes.lista(),
    queryFn: ({ signal }) => api.almacenes.listar(true, signal),
  })

  // El almacén efectivo se DERIVA en el render en vez de fijarse con un efecto:
  // un `setState` dentro de un `useEffect` provoca un segundo render y, sobre
  // todo, deja dos fuentes de verdad mientras la lista todavía viaja.
  const predeterminado = almacenes.data?.find(a => a.esPredeterminado) ?? almacenes.data?.[0]
  const almacenId = almacenElegido ?? predeterminado?.id ?? null
  const almacen = almacenes.data?.find(a => a.id === almacenId)

  const problemas = useMemo(() => {
    const mapa = new Map<number, ProblemaLinea>()

    for (const linea of lineas) {
      const problema = revisarLinea(linea)

      if (problema) {
        mapa.set(linea.productoId, problema)
      }
    }

    return mapa
  }, [lineas])

  const { totales, error: errorCalculo } = useMemo(
    () =>
      calcularTotalesSeguro(
        lineas.map(linea => ({
          cantidad: linea.cantidad,
          precioUnitario: linea.precioUnitario,
          descuentoLinea: linea.descuentoLinea,
        })),
        configuracion.impuesto.tasa,
        configuracion.impuesto.precioIncluyeImpuesto,
      ),
    [lineas],
  )

  const cantidadesEnVenta = useMemo(
    () => new Map(lineas.map(linea => [linea.productoId, linea.cantidad])),
    [lineas],
  )

  // ── Edición de las líneas ─────────────────────────────────────────────────

  const agregar = useCallback((producto: RespuestaProducto) => {
    // Agregar un producto que ya está en la venta suma a su línea en vez de
    // abrir una segunda: dos líneas del mismo SKU obligan a la persona a llevar
    // la cuenta a mano de cuántas lleva en total.
    setLineas(actuales => {
      const existente = actuales.find(linea => linea.productoId === producto.id)

      if (!existente) {
        return [...actuales, lineaDesdeProducto(producto)]
      }

      return actuales.map(linea =>
        linea.productoId === producto.id ? { ...linea, cantidad: linea.cantidad + 1 } : linea,
      )
    })
  }, [])

  const cambiarCantidad = useCallback((productoId: number, cantidad: number) => {
    setLineas(actuales =>
      actuales.map(linea => (linea.productoId === productoId ? { ...linea, cantidad } : linea)),
    )
  }, [])

  const cambiarDescuento = useCallback((productoId: number, descuentoLinea: number) => {
    setLineas(actuales =>
      actuales.map(linea =>
        linea.productoId === productoId ? { ...linea, descuentoLinea } : linea,
      ),
    )
  }, [])

  const quitar = useCallback((productoId: number) => {
    setLineas(actuales => actuales.filter(linea => linea.productoId !== productoId))
  }, [])

  const limpiar = useCallback(() => {
    setLineas([])
    setErroresDeCampo({})
    setComprobante(null)
    setMetodoPago(METODO_POR_DEFECTO)
  }, [])

  // ── Registro ──────────────────────────────────────────────────────────────

  const registro = useMutation({
    mutationFn: (solicitud: SolicitudRegistrarVenta) => api.ventas.registrar(solicitud),

    onMutate: () => {
      setErroresDeCampo({})
    },

    onSuccess: async venta => {
      setComprobante({ venta, metodoPago, almacen: almacen?.nombre ?? '—' })
      avisarExito(`Venta ${venta.numero} registrada.`, formatearMonto(venta.total))

      await Promise.all([
        clienteConsultas.invalidateQueries({ queryKey: claves.ventas.todas() }),
        // La venta descontó stock dentro de la transacción del servidor: el
        // catálogo en caché ya no dice la verdad.
        clienteConsultas.invalidateQueries({ queryKey: claves.productos.todos() }),
      ])
    },

    onError: error => {
      if (!(error instanceof ErrorApi)) {
        return
      }

      // Los 400 de forma llegan por campo, con las claves de FluentValidation ya
      // normalizadas (`lineas[0].cantidad`). Las tablas de líneas las leen tal cual.
      setErroresDeCampo(erroresPorCampo(error))

      // VENTA_004 trae el disponible REAL que vio el servidor. Se escribe sobre la
      // línea y se marca como confirmado: hasta aquí el faltante era una foto del
      // catálogo y valía dudar de ella; una vez que el servidor dijo el número,
      // reenviar lo mismo solo repite el rechazo.
      const detalle = error.detalleStock

      if (detalle) {
        setLineas(actuales =>
          actuales.map(linea =>
            linea.productoId === detalle.id
              ? { ...linea, stockDisponible: detalle.disponible, stockConfirmado: true }
              : linea,
          ),
        )
      }
    },
  })

  const errorApi = registro.error instanceof ErrorApi ? registro.error : null

  /** El motivo se muestra en el botón: «deshabilitado y sin explicación» es un callejón. */
  const motivoBloqueo = ((): string | null => {
    if (almacenes.isPending) {
      return 'Cargando los almacenes…'
    }

    if (almacenId === null) {
      return 'Seleccione un almacén.'
    }

    if (lineas.length === 0) {
      return 'Agregue al menos un producto.'
    }

    const bloqueada = [...problemas.values()].some(problema => problema.severidad === 'bloqueo')

    if (bloqueada) {
      return 'Corrija las líneas marcadas.'
    }

    if (errorCalculo) {
      return errorCalculo.message
    }

    return null
  })()

  const registrar = () => {
    if (almacenId === null || motivoBloqueo !== null) {
      return
    }

    registro.mutate({
      // El módulo de clientes no está implementado en este repositorio y el
      // contrato acepta la venta sin cliente: `ClienteId` es `long?`.
      clienteId: null,
      almacenId,
      metodoPago,
      lineas: lineas.map(linea => ({
        productoId: linea.productoId,
        cantidad: linea.cantidad,
        descuentoLinea: linea.descuentoLinea > 0 ? linea.descuentoLinea : null,
      })),
    })
  }

  if (comprobante) {
    return (
      <ComprobanteVenta
        comprobante={comprobante}
        alRegistrarOtra={limpiar}
        alVerListado={() => navegar('/ventas')}
      />
    )
  }

  return (
    <Pila>
      <EncabezadoPagina
        titulo="Nueva venta"
        descripcion="Elija el almacén, agregue productos y registre. Los totales de la derecha son una previsualización: los definitivos los calcula el dominio en el servidor."
        acciones={
          <Boton icono={<IconoFlechaDerecha className="size-4" />} onClick={() => navegar('/ventas')}>
            Ver ventas
          </Boton>
        }
      />

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="flex flex-col gap-4 xl:col-span-3">
          <Tarjeta>
            <CabeceraTarjeta
              titulo="Origen y productos"
              descripcion="El almacén decide qué stock se consulta y de dónde se descuenta."
            />

            <div className="flex flex-col gap-4 p-4 sm:p-5">
              {almacenes.isError ? (
                <AvisoError
                  error={almacenes.error}
                  alReintentar={() => void almacenes.refetch()}
                />
              ) : almacenes.isPending ? (
                <Esqueleto className="h-9.5 w-full max-w-sm" />
              ) : (
                <Campo
                  etiqueta="Almacén"
                  requerido
                  ayuda={
                    almacenes.data.length === 1
                      ? 'La empresa tiene un solo almacén habilitado.'
                      : 'Cambiarlo vuelve a consultar el stock de los productos.'
                  }
                  className="max-w-sm"
                >
                  {atributos => (
                    <Seleccion
                      {...atributos}
                      value={almacenId ?? ''}
                      onChange={evento => setAlmacenElegido(Number(evento.target.value))}
                      disabled={registro.isPending}
                    >
                      {almacenes.data.map(opcion => (
                        <option key={opcion.id} value={opcion.id}>
                          {opcion.nombre}
                          {opcion.esPredeterminado ? ' (predeterminado)' : ''}
                        </option>
                      ))}
                    </Seleccion>
                  )}
                </Campo>
              )}

              {almacenId !== null && (
                <VentaSelectorProducto
                  almacenId={almacenId}
                  cantidadesEnVenta={cantidadesEnVenta}
                  alAgregar={agregar}
                  deshabilitado={registro.isPending}
                />
              )}
            </div>
          </Tarjeta>

          <Tarjeta>
            <CabeceraTarjeta
              titulo="Líneas"
              descripcion={
                lineas.length === 0
                  ? 'Todavía no hay productos en esta venta.'
                  : `${lineas.length} ${lineas.length === 1 ? 'producto' : 'productos'} en la venta`
              }
              acciones={
                lineas.length > 0 ? (
                  <Boton tamano="sm" onClick={limpiar} disabled={registro.isPending}>
                    Vaciar
                  </Boton>
                ) : undefined
              }
            />

            <VentaLineas
              lineas={lineas}
              problemas={problemas}
              erroresDeCampo={erroresDeCampo}
              alCambiarCantidad={cambiarCantidad}
              alCambiarDescuento={cambiarDescuento}
              alQuitar={quitar}
              deshabilitado={registro.isPending}
            />
          </Tarjeta>
        </div>

        {/* El resumen queda a la vista mientras se recorren las líneas: el total
            es el dato que se mira antes de cobrar. */}
        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-[4.5rem]">
            <VentaResumenTotales
              totales={totales}
              errorCalculo={errorCalculo}
              tasaImpuesto={configuracion.impuesto.tasa}
              metodoPago={metodoPago}
              alCambiarMetodoPago={setMetodoPago}
              errorMetodoPago={
                errorApi?.codigo === CODIGOS_VENTAS.metodoPagoInvalido
                  ? errorApi.message
                  : undefined
              }
              fallo={registro.error ?? undefined}
              alRegistrar={registrar}
              registrando={registro.isPending}
              motivoBloqueo={motivoBloqueo}
            />
          </div>
        </div>
      </div>
    </Pila>
  )
}

/**
 * Comprobante de la venta registrada.
 *
 * Todas las cifras vienen de la respuesta del servidor. Es una distinción que
 * parece pedante mientras los números coinciden y deja de serlo el día que no:
 * el documento guardado tiene los totales del dominio, y esto es ese documento.
 */
function ComprobanteVenta({
  comprobante,
  alRegistrarOtra,
  alVerListado,
}: {
  comprobante: Comprobante
  alRegistrarOtra: () => void
  alVerListado: () => void
}) {
  const { venta, metodoPago, almacen } = comprobante

  return (
    <Pila className="mx-auto max-w-2xl">
      <div className="flex flex-col items-center gap-3 pt-4 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-exito-suave text-exito">
          <IconoCheque className="size-6" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-texto">Venta registrada</h1>
          <p className="mt-1 text-sm text-texto-suave">
            El folio lo generó el servidor y el inventario ya quedó descontado.
          </p>
        </div>
      </div>

      <Tarjeta>
        <CabeceraTarjeta
          titulo={<span className="font-mono">{venta.numero}</span>}
          descripcion="Totales calculados por el dominio, tal como quedaron guardados"
          acciones={
            <Insignia tono="exito" punto>
              Completada
            </Insignia>
          }
        />

        <dl className="flex flex-col divide-y divide-borde">
          <Fila etiqueta="Almacén" valor={almacen} />
          <Fila etiqueta="Método de pago" valor={<span className="capitalize">{metodoPago.toLowerCase()}</span>} />
          <Fila etiqueta="Subtotal" valor={formatearMonto(venta.subtotal)} cifra />
          <Fila etiqueta="Descuento" valor={formatearMonto(venta.descuento)} cifra />
          <Fila etiqueta="Impuesto" valor={formatearMonto(venta.impuesto)} cifra />
          <Fila etiqueta="Total" valor={formatearMonto(venta.total)} cifra destacada />
        </dl>
      </Tarjeta>

      <div className="flex flex-wrap justify-center gap-2">
        <Boton tono="primario" icono={<IconoMas className="size-4" />} onClick={alRegistrarOtra}>
          Registrar otra venta
        </Boton>
        <Boton icono={<IconoCarrito className="size-4" />} onClick={alVerListado}>
          Ver en el listado
        </Boton>
      </div>
    </Pila>
  )
}

function Fila({
  etiqueta,
  valor,
  cifra = false,
  destacada = false,
}: {
  etiqueta: string
  valor: React.ReactNode
  cifra?: boolean
  destacada?: boolean
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 px-4 py-2.5 sm:px-5 ${
        destacada ? 'bg-superficie-hundida/60' : ''
      }`}
    >
      <dt className={`text-[0.8125rem] ${destacada ? 'font-medium text-texto' : 'text-texto-suave'}`}>
        {etiqueta}
      </dt>
      <dd
        className={`${cifra ? 'cifra ' : ''}${
          destacada ? 'text-lg font-semibold text-texto' : 'text-sm text-texto'
        }`}
      >
        {valor}
      </dd>
    </div>
  )
}
