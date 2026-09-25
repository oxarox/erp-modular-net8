import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { claves } from '@/app/clienteConsultas'
import { Boton } from '@/componentes/Boton'
import { IconoCarrito, IconoFlechaDerecha, IconoRecibo, IconoTablero } from '@/componentes/Iconos'
import {
  AvisoError,
  CabeceraTarjeta,
  EncabezadoPagina,
  EstadoVacio,
  Insignia,
  Pila,
  Tarjeta,
} from '@/componentes/Superficie'
import { Tabla } from '@/componentes/Tabla'
import type { ColumnaTabla } from '@/componentes/Tabla'
import type { RespuestaVenta } from '@/nucleo/api/contratos'
import { api } from '@/nucleo/api/endpoints'
import { PERMISOS } from '@/nucleo/autenticacion/almacenSesion'
import { useSesion } from '@/nucleo/autenticacion/ProveedorSesion'
import {
  aParametroFecha,
  aValorInputFecha,
  formatearEntero,
  formatearFechaHora,
  formatearFechaLarga,
  formatearMonto,
  formatearPorcentaje,
} from '@/nucleo/formato/formato'
import { calcularPeriodo, resumirVentas } from '@/caracteristicas/tablero/agregacion'
import { etiquetaMetodoPago } from '@/nucleo/dominio/etiquetas'
import { DesglosePorMetodo } from '@/caracteristicas/tablero/DesglosePorMetodo'
import { GraficoVentasDiarias } from '@/caracteristicas/tablero/GraficoVentasDiarias'
import { TarjetaIndicador } from '@/caracteristicas/tablero/TarjetaIndicador'

/**
 * Tablero de ventas.
 *
 * ── De dónde salen estos números ────────────────────────────────────────────
 *
 * La API **no tiene endpoint de reportes**. El read model existe
 * —`IConsultaVentasReporte` en la capa de aplicación, con su `ResumenDiarioAsync`
 * que agregaría en SQL— pero ningún controlador lo expone todavía. Así que este
 * tablero hace lo único que puede hacer: pide una página de
 * `GET /api/ventas/buscar-ventas` y agrega en el navegador.
 *
 * Eso tiene un límite concreto y la pantalla lo declara en vez de disimularlo:
 * el servidor devuelve como máximo 200 filas por página
 * (`SolicitudPaginada.TamanoMaximo`), de modo que si el período tiene más
 * documentos, lo que se ve son los 200 más recientes y no el total. El aviso de
 * muestra parcial aparece exactamente en ese caso.
 *
 * En el sistema real esto es una consulta agregada en la base, y el tablero pide
 * un resumen ya calculado. Presentar una suma parcial como si fuera el total
 * sería la clase de error que nadie detecta hasta que alguien cuadra a mano.
 */

/** Ventana del tablero. Treinta días entran en el gráfico sin volverse ilegibles. */
const DIAS = 30

/** Máximo que acepta el servidor por página. Pedir más no trae más. */
const TAMANO_MUESTRA = 200

/** Cuántas ventas se listan abajo: suficientes para reconocer la jornada. */
const ULTIMAS = 8

/**
 * Referencia estable para el caso «todavía no llegaron datos».
 *
 * Escribir `consulta.data?.items ?? []` devolvería un arreglo nuevo en cada
 * render, y con él una dependencia nueva para el `useMemo` de la agregación:
 * el resumen se recalcularía entero en cada pasada sin que nada haya cambiado.
 */
const SIN_VENTAS: RespuestaVenta[] = []

export default function PaginaTablero() {
  const { sesion, tienePermiso } = useSesion()
  const navegar = useNavigate()

  const puedeVerVentas = tienePermiso(PERMISOS.ventas.ver)
  const puedeRegistrar = tienePermiso(PERMISOS.ventas.registrar)

  // Se calcula una sola vez por montaje. Recalcularlo en cada render produciría
  // un `Date` nuevo, y con él una clave de consulta nueva: la pantalla pediría
  // datos en bucle sin que nada haya cambiado.
  const periodo = useMemo(() => calcularPeriodo(DIAS), [])

  const filtros = useMemo(
    () => ({
      desde: aParametroFecha(aValorInputFecha(periodo.inicio), 'inicio'),
      hasta: aParametroFecha(aValorInputFecha(periodo.fin), 'fin'),
      pagina: 1,
      tamanoPagina: TAMANO_MUESTRA,
    }),
    [periodo],
  )

  const consulta = useQuery({
    queryKey: claves.ventas.lista(filtros),
    queryFn: ({ signal }) => api.ventas.buscar(filtros, signal),
    enabled: puedeVerVentas,
  })

  const ventas = consulta.data?.items ?? SIN_VENTAS
  const resumen = useMemo(() => resumirVentas(ventas, periodo), [ventas, periodo])

  const totalServidor = consulta.data?.total ?? 0
  const muestraParcial = totalServidor > ventas.length

  const encabezado = (
    <EncabezadoPagina
      titulo={sesion ? `Hola, ${sesion.nombreCompleto}` : 'Tablero'}
      descripcion={
        <>
          Ventas entre el {formatearFechaLarga(periodo.inicio)} y el{' '}
          {formatearFechaLarga(periodo.fin)}
          {sesion && <> · empresa #{sesion.empresaId}</>}
        </>
      }
      acciones={
        <>
          {puedeVerVentas && (
            <Boton
              icono={<IconoRecibo className="size-4" />}
              onClick={() => navegar('/ventas')}
            >
              Ver ventas
            </Boton>
          )}
          {puedeRegistrar && (
            <Boton
              tono="primario"
              icono={<IconoCarrito className="size-4" />}
              onClick={() => navegar('/ventas/nueva')}
            >
              Registrar venta
            </Boton>
          )}
        </>
      }
    />
  )

  // El tablero es la ruta raíz y la ve cualquier sesión válida, pero se alimenta
  // entero del módulo de ventas: sin ese permiso no hay nada que mostrar, y
  // pedirlo igual solo produciría un 403 con `API_002`.
  if (!puedeVerVentas) {
    return (
      <Pila>
        {encabezado}
        <Tarjeta>
          <EstadoVacio
            icono={<IconoTablero />}
            titulo="El tablero necesita el permiso de ventas"
            descripcion={
              <>
                Todo lo que se muestra aquí se calcula sobre{' '}
                <code className="font-mono text-[0.75rem]">/api/ventas/buscar-ventas</code>, que
                exige el permiso{' '}
                <code className="font-mono text-[0.75rem]">{PERMISOS.ventas.ver}</code>.
              </>
            }
          />
        </Tarjeta>
      </Pila>
    )
  }

  if (consulta.isError) {
    return (
      <Pila>
        {encabezado}
        <AvisoError error={consulta.error} alReintentar={() => void consulta.refetch()} />
      </Pila>
    )
  }

  const cargando = consulta.isPending

  return (
    <Pila>
      {encabezado}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaIndicador
          cargando={cargando}
          etiqueta="Ventas del período"
          valor={formatearMonto(resumen.montoTotal)}
          contexto={
            resumen.vigentes === 0
              ? 'Sin documentos vigentes en la ventana'
              : `${formatearEntero(resumen.vigentes)} documentos vigentes en ${DIAS} días`
          }
        />

        <TarjetaIndicador
          cargando={cargando}
          etiqueta="Ticket promedio"
          valor={formatearMonto(resumen.ticketPromedio)}
          contexto={
            resumen.diaPico
              ? `Día más alto: ${formatearFechaLarga(resumen.diaPico.fecha)} con ${formatearMonto(resumen.diaPico.monto)}`
              : 'Aún no hay ventas que promediar'
          }
        />

        <TarjetaIndicador
          cargando={cargando}
          etiqueta="Documentos anulados"
          valor={formatearEntero(resumen.anulados)}
          tono={resumen.anulados > 0 ? 'alerta' : 'neutro'}
          contexto={
            resumen.documentos === 0
              ? 'Sin documentos en la ventana'
              : `${formatearPorcentaje(resumen.fraccionAnulados)} de ${formatearEntero(resumen.documentos)} documentos`
          }
        />

        <TarjetaIndicador
          cargando={cargando}
          etiqueta="Método principal"
          valor={
            resumen.metodoPrincipal ? etiquetaMetodoPago(resumen.metodoPrincipal.metodo) : '—'
          }
          contexto={
            resumen.metodoPrincipal
              ? `${formatearPorcentaje(resumen.metodoPrincipal.participacionDocumentos)} de los documentos · ${formatearMonto(resumen.metodoPrincipal.monto)}`
              : 'Se determina por cantidad de documentos, no por monto'
          }
        />
      </div>

      <Tarjeta>
        <CabeceraTarjeta
          titulo="Ventas por día"
          descripcion={`Últimos ${DIAS} días, en hora local. Las ventas anuladas no suman.`}
        />

        {cargando ? (
          <div className="px-4 py-6 sm:px-5">
            <div className="h-40 animate-[var(--animate-pulso-suave)] rounded bg-superficie-hundida sm:h-52" />
          </div>
        ) : (
          <GraficoVentasDiarias
            serie={resumen.serie}
            maximo={resumen.maximoDiario}
            montoTotal={resumen.montoTotal}
            diaPico={resumen.diaPico}
          />
        )}
      </Tarjeta>

      <div className="grid gap-4 xl:grid-cols-5">
        <Tarjeta className="xl:col-span-2">
          <CabeceraTarjeta
            titulo="Por método de pago"
            descripcion="Espejo de Ventas:MetodosPagoPermitidos en el servidor."
          />
          <DesglosePorMetodo metodos={resumen.metodos} cargando={cargando} />
        </Tarjeta>

        <Tarjeta className="xl:col-span-3">
          <CabeceraTarjeta
            titulo="Últimas ventas"
            acciones={
              <Boton
                tamano="sm"
                icono={<IconoFlechaDerecha className="size-4" />}
                onClick={() => navegar('/ventas')}
              >
                Ver todas
              </Boton>
            }
          />

          <Tabla
            columnas={COLUMNAS}
            filas={ventas.slice(0, ULTIMAS)}
            claveFila={venta => venta.id}
            cargando={cargando}
            filasEsqueleto={ULTIMAS}
            descripcion="Las ventas más recientes del período, con su folio, fecha, método de pago, estado y total."
            vacio={
              <EstadoVacio
                icono={<IconoRecibo />}
                titulo="Todavía no hay ventas en este período"
                descripcion="Registre una para ver el tablero con datos."
                accion={
                  puedeRegistrar ? (
                    <Boton tono="primario" onClick={() => navegar('/ventas/nueva')}>
                      Registrar la primera
                    </Boton>
                  ) : undefined
                }
              />
            }
          />
        </Tarjeta>
      </div>

      <NotaDeAlcance
        muestraParcial={muestraParcial}
        mostradas={ventas.length}
        total={totalServidor}
      />
    </Pila>
  )
}

const COLUMNAS: ColumnaTabla<RespuestaVenta>[] = [
  {
    clave: 'numero',
    encabezado: 'Folio',
    celda: venta => <span className="font-mono text-[0.8125rem]">{venta.numero}</span>,
  },
  {
    clave: 'fecha',
    encabezado: 'Fecha',
    // `formatearFechaHora` pasa por `fechaUtcDesdeApi`: el backend emite la fecha
    // sin sufijo Z y un `new Date()` directo la correría al huso del navegador.
    celda: venta => formatearFechaHora(venta.fechaUtc),
  },
  {
    clave: 'metodo',
    encabezado: 'Método',
    ocultarEnMovil: true,
    celda: venta => etiquetaMetodoPago(venta.metodoPago),
  },
  {
    clave: 'estado',
    encabezado: 'Estado',
    celda: venta =>
      venta.estado === 'ANULADA' ? (
        <Insignia tono="peligro" punto>
          Anulada
        </Insignia>
      ) : (
        <Insignia tono="exito" punto>
          Completada
        </Insignia>
      ),
  },
  {
    clave: 'total',
    encabezado: 'Total',
    alineacion: 'derecha',
    celda: venta => (
      <span className={venta.estado === 'ANULADA' ? 'text-texto-tenue line-through' : ''}>
        {formatearMonto(venta.total)}
      </span>
    ),
  },
]

/**
 * Declaración del origen de los datos.
 *
 * Va al pie y no en un aviso llamativo porque no es un error: es el alcance
 * real. Pero va, porque un tablero que no dice sobre qué muestra está calculando
 * invita a leer sus cifras como totales.
 */
function NotaDeAlcance({
  muestraParcial,
  mostradas,
  total,
}: {
  muestraParcial: boolean
  mostradas: number
  total: number
}) {
  return (
    <p className="text-[0.8125rem] leading-relaxed text-texto-tenue">
      {muestraParcial ? (
        <>
          <strong className="font-medium text-alerta">Muestra parcial:</strong> el período tiene{' '}
          <span className="cifra">{formatearEntero(total)}</span> documentos y el tablero está
          calculado sobre los <span className="cifra">{formatearEntero(mostradas)}</span> más
          recientes, que es el máximo por página que acepta el servidor.{' '}
        </>
      ) : null}
      Estas cifras se agregan en el navegador sobre{' '}
      <code className="font-mono text-[0.75rem]">/api/ventas/buscar-ventas</code>: la API todavía
      no expone un endpoint de reportes. En el sistema real la agregación la resuelve una
      consulta en la base de datos y el tablero recibe el resumen ya calculado.
    </p>
  )
}
