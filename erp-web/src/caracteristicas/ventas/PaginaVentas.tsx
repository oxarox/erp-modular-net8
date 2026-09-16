import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { claves } from '@/app/clienteConsultas'
import { Boton } from '@/componentes/Boton'
import { cn } from '@/componentes/cn'
import { IconoInfo, IconoMas, IconoRecibo } from '@/componentes/Iconos'
import { EncabezadoPagina, EstadoVacio, Insignia, Pila, Tarjeta } from '@/componentes/Superficie'
import { Paginador, Tabla } from '@/componentes/Tabla'
import type { ColumnaTabla } from '@/componentes/Tabla'
import { ListadoFiltrosVenta } from '@/caracteristicas/ventas/ListadoFiltrosVenta'
import { ListadoResumenVentas } from '@/caracteristicas/ventas/ListadoResumenVentas'
import { ESTADOS_VENTA } from '@/nucleo/api/contratos'
import type { EstadoVenta, RespuestaVenta, SolicitudBuscarVentas } from '@/nucleo/api/contratos'
import { api } from '@/nucleo/api/endpoints'
import { etiquetaEstadoVenta, etiquetaMetodoPago } from '@/nucleo/dominio/etiquetas'
import { PERMISOS } from '@/nucleo/autenticacion/almacenSesion'
import { useSesion } from '@/nucleo/autenticacion/ProveedorSesion'
import {
  aParametroFecha,
  formatearFechaHora,
  formatearMonto,
} from '@/nucleo/formato/formato'
import { useFiltrosEnUrl } from '@/nucleo/hooks'

/**
 * Listado de ventas: consulta sobre `buscar-ventas`.
 *
 * Tres decisiones explican casi todo lo que sigue.
 *
 * 1. **Las fechas pasan siempre por `nucleo/formato`, nunca por `new Date(...)`
 *    directo.** `fechaUtc` viaja sin sufijo `Z` cuando el `DateTime` viene de SQL
 *    Server con `Kind=Unspecified`; el constructor de JavaScript interpreta esa
 *    cadena como hora **local** y correría cada venta tres o cuatro horas. Los
 *    `formatear*` delegan en `fechaUtcDesdeApi`, que agrega la zona antes de
 *    construir el `Date`.
 * 2. **El filtro, el tamaño de página y la página viven en la URL.** Recargar no
 *    pierde la vista, «atrás» deshace un filtro en vez de salir de la pantalla y
 *    el enlace se puede pegar en un chat tal cual.
 * 3. **Solo se suma la página visible, y se dice en pantalla.** El endpoint no
 *    devuelve agregados; ver `ListadoResumenVentas`.
 */

const FILTROS_POR_DEFECTO = {
  desde: '',
  hasta: '',
  estado: '',
  pagina: '1',
  tamanoPagina: '25',
}

/** `SolicitudPaginada.TamanoMaximo` del backend: pedir más devuelve 400. */
const TAMANO_PAGINA_MAXIMO = 200

/** Referencia estable para los renders sin datos: el resumen no recalcula en vano. */
const SIN_VENTAS: RespuestaVenta[] = []

const TONOS_ESTADO: Record<string, 'exito' | 'peligro'> = {
  COMPLETADA: 'exito',
  ANULADA: 'peligro',
}

/**
 * La URL la escribe cualquiera. Un `?estado=FOO` no debe viajar al servidor para
 * que este conteste 400: se descarta aquí y el filtro queda en «todos».
 */
function esEstadoVenta(valor: string): valor is EstadoVenta {
  return (ESTADOS_VENTA as readonly string[]).includes(valor)
}

/** Misma razón: `?pagina=-3` o `?tamanoPagina=abc` se ignoran en vez de propagarse. */
function aEnteroPositivo(valor: string, porDefecto: number, maximo = Number.MAX_SAFE_INTEGER) {
  const numero = Number.parseInt(valor, 10)

  return Number.isFinite(numero) && numero >= 1 ? Math.min(numero, maximo) : porDefecto
}

const COLUMNAS: ColumnaTabla<RespuestaVenta>[] = [
  {
    clave: 'numero',
    encabezado: 'Folio',
    anchoClase: 'w-44',
    // Monoespaciado porque `V-20260915-0001` se lee por bloques y se compara
    // carácter a carácter contra un comprobante impreso.
    celda: venta => <span className="font-mono text-[0.8125rem] text-texto">{venta.numero}</span>,
  },
  {
    clave: 'fecha',
    encabezado: 'Fecha',
    celda: venta => (
      <span className="cifra whitespace-nowrap text-texto-suave">
        {formatearFechaHora(venta.fechaUtc)}
      </span>
    ),
  },
  {
    clave: 'metodoPago',
    encabezado: 'Método de pago',
    ocultarEnMovil: true,
    celda: venta => etiquetaMetodoPago(venta.metodoPago),
  },
  {
    clave: 'estado',
    encabezado: 'Estado',
    celda: venta => <InsigniaEstadoVenta estado={venta.estado} />,
  },
  {
    clave: 'total',
    encabezado: 'Total',
    alineacion: 'derecha',
    celda: venta => (
      <span
        className={cn(
          'cifra font-medium',
          // Un documento anulado conserva su monto pero ya no vale: tacharlo
          // evita que la columna se lea como si esa plata hubiera entrado.
          venta.estado === 'ANULADA' ? 'text-texto-tenue line-through' : 'text-texto',
        )}
      >
        {formatearMonto(venta.total)}
      </span>
    ),
  },
]

export default function PaginaVentas() {
  const { tienePermiso } = useSesion()
  const navegar = useNavigate()
  const { filtros, establecer, limpiar, hayFiltros } = useFiltrosEnUrl(FILTROS_POR_DEFECTO)

  const pagina = aEnteroPositivo(filtros.pagina, 1)
  const tamanoPagina = aEnteroPositivo(filtros.tamanoPagina, 25, TAMANO_PAGINA_MAXIMO)

  const parametros = useMemo<SolicitudBuscarVentas>(
    () => ({
      // `aParametroFecha` pone el inicio y el fin del día; el backend además
      // extiende `hasta` al último tick, de modo que un rango de un solo día
      // abarca la jornada completa.
      desde: aParametroFecha(filtros.desde, 'inicio'),
      hasta: aParametroFecha(filtros.hasta, 'fin'),
      estado: esEstadoVenta(filtros.estado) ? filtros.estado : undefined,
      pagina,
      tamanoPagina,
    }),
    [filtros.desde, filtros.hasta, filtros.estado, pagina, tamanoPagina],
  )

  const consulta = useQuery({
    queryKey: claves.ventas.lista(parametros),
    queryFn: ({ signal }) => api.ventas.buscar(parametros, signal),
    // Conserva la tabla anterior mientras llega la página nueva: sin esto, cada
    // clic del paginador la deja en blanco y la vista salta hacia arriba.
    placeholderData: anterior => anterior,
  })

  const puedeRegistrar = tienePermiso(PERMISOS.ventas.registrar)
  const ventas = consulta.data?.items ?? SIN_VENTAS

  return (
    <Pila>
      <EncabezadoPagina
        titulo="Ventas"
        descripcion="Documentos emitidos por la empresa de su sesión. El rango, el estado y la página quedan escritos en la dirección, así que esta vista se comparte tal como se ve."
        acciones={
          puedeRegistrar && (
            <Boton
              tono="primario"
              icono={<IconoMas className="size-4" />}
              onClick={() => navegar('/ventas/nueva')}
            >
              Nueva venta
            </Boton>
          )
        }
      />

      <Tarjeta className="overflow-hidden">
        <ListadoFiltrosVenta
          desde={filtros.desde}
          hasta={filtros.hasta}
          estado={filtros.estado}
          hayFiltros={hayFiltros}
          actualizando={consulta.isFetching}
          // Cualquier filtro nuevo cambia el conjunto: quedarse en la página 4
          // mostraría un vacío que parece un error del sistema.
          alCambiar={cambios => establecer({ ...cambios, pagina: FILTROS_POR_DEFECTO.pagina })}
          alLimpiar={limpiar}
          alActualizar={() => void consulta.refetch()}
        />

        {!consulta.isError && (
          <ListadoResumenVentas
            total={consulta.data?.total ?? 0}
            ventas={ventas}
            cargando={consulta.isPending}
          />
        )}

        <Tabla
          columnas={COLUMNAS}
          filas={consulta.data?.items}
          claveFila={venta => venta.id}
          cargando={consulta.isPending}
          error={consulta.error}
          alReintentar={() => void consulta.refetch()}
          descripcion="Ventas encontradas para el rango y el estado seleccionados."
          vacio={
            <EstadoVacio
              icono={<IconoRecibo className="size-5" />}
              titulo={hayFiltros ? 'Sin ventas para estos filtros' : 'Todavía no hay ventas'}
              descripcion={
                hayFiltros
                  ? 'Pruebe con otro rango de fechas o quite el filtro de estado.'
                  : 'Las ventas aparecen en esta tabla apenas se registran.'
              }
              accion={
                puedeRegistrar && !hayFiltros ? (
                  <Boton tono="primario" tamano="sm" onClick={() => navegar('/ventas/nueva')}>
                    Registrar la primera venta
                  </Boton>
                ) : null
              }
            />
          }
        />

        {!consulta.isError && (
          <Paginador
            pagina={pagina}
            tamanoPagina={tamanoPagina}
            total={consulta.data?.total ?? 0}
            totalPaginas={consulta.data?.totalPaginas ?? 0}
            alCambiarPagina={nueva => establecer({ pagina: String(nueva) })}
            alCambiarTamano={nuevo =>
              establecer({ tamanoPagina: String(nuevo), pagina: FILTROS_POR_DEFECTO.pagina })
            }
            cargando={consulta.isFetching}
          />
        )}
      </Tarjeta>

      <NotaAlcance puedeAnular={tienePermiso(PERMISOS.ventas.anular)} />
    </Pila>
  )
}

/** Los estados llegan del dominio en mayúsculas; uno desconocido no debe romper la fila. */
function InsigniaEstadoVenta({ estado }: { estado: string }) {
  return (
    <Insignia tono={TONOS_ESTADO[estado] ?? 'neutro'} punto={estado === 'COMPLETADA'}>
      {etiquetaEstadoVenta(estado)}
    </Insignia>
  )
}

/**
 * Nota de alcance.
 *
 * El módulo de ventas de este repositorio expone dos operaciones —buscar y
 * registrar—: no hay endpoint de detalle ni de anulación. Se dice en pantalla en
 * lugar de dejar filas que parecen pulsables o un botón «Anular» que no llama a
 * ninguna parte, que es la forma más rápida de que una demo pierda credibilidad.
 */
function NotaAlcance({ puedeAnular }: { puedeAnular: boolean }) {
  return (
    <p className="flex items-start gap-2 text-[0.8125rem] text-texto-tenue">
      <IconoInfo className="mt-px size-4 shrink-0" />
      <span>
        El módulo expone <code className="font-mono text-[0.75rem]">buscar-ventas</code> y{' '}
        <code className="font-mono text-[0.75rem]">registrar-venta</code>. No hay endpoint de
        detalle ni de anulación, así que las filas no abren ninguna ficha y esta pantalla no ofrece
        la acción de anular.
        {puedeAnular && (
          <>
            {' '}
            Su sesión sí trae el permiso{' '}
            <code className="font-mono text-[0.75rem]">ventas.anular</code>: quedará conectado el
            día que el endpoint exista.
          </>
        )}
      </span>
    </p>
  )
}
