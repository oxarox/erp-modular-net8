import { useId, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { claves } from '@/app/clienteConsultas'
import { Girador } from '@/componentes/Boton'
import { Campo, Entrada } from '@/componentes/Formulario'
import { IconoBuscar } from '@/componentes/Iconos'
import { AvisoError, Insignia } from '@/componentes/Superficie'
import { cn } from '@/componentes/cn'
import type { RespuestaProducto, SolicitudBuscarProductos } from '@/nucleo/api/contratos'
import { api } from '@/nucleo/api/endpoints'
import { formatearDecimal, formatearMonto } from '@/nucleo/formato/formato'
import { useValorRetrasado } from '@/nucleo/hooks'
import { motivoNoDisponible } from '@/caracteristicas/ventas/VentaTipos'

/**
 * Buscador de productos de la venta.
 *
 * Es un `combobox` con lista de resultados y no un `<select>`: el catálogo tiene
 * miles de filas y la búsqueda la resuelve el servidor. El patrón ARIA está
 * implementado a mano —`aria-activedescendant` en vez de mover el foco— porque
 * es lo que permite seguir escribiendo mientras se recorren los resultados con
 * las flechas, que es como se opera una caja.
 *
 * El foco nunca sale del campo: las filas cancelan su `mousedown`, de modo que
 * hacer clic en una no dispara el `blur` del input. Así, agregar con el mouse y
 * agregar con Enter dejan la pantalla en el mismo estado, y quien está cargando
 * productos puede encadenar uno tras otro sin volver a pulsar el campo.
 */

/** El desplegable pide ocho filas: lo que cabe sin tapar la venta que hay debajo. */
const RESULTADOS_VISIBLES = 8

export interface PropsVentaSelectorProducto {
  /** Decide qué stock devuelve la búsqueda; sin él no se puede juzgar disponibilidad. */
  almacenId: number
  /** Cantidades ya cargadas, por producto: la fila avisa que el producto ya está en la venta. */
  cantidadesEnVenta: ReadonlyMap<number, number>
  alAgregar: (producto: RespuestaProducto) => void
  deshabilitado?: boolean
}

export function VentaSelectorProducto({
  almacenId,
  cantidadesEnVenta,
  alAgregar,
  deshabilitado = false,
}: PropsVentaSelectorProducto) {
  const [criterio, setCriterio] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [indiceActivo, setIndiceActivo] = useState(0)
  const idLista = useId()

  const criterioRetrasado = useValorRetrasado(criterio, 300)

  const filtros: SolicitudBuscarProductos = {
    criterio: criterioRetrasado.trim() || undefined,
    soloActivos: true,
    almacenId,
    tamanoPagina: RESULTADOS_VISIBLES,
  }

  const consulta = useQuery({
    queryKey: claves.productos.lista(filtros),
    queryFn: ({ signal }) => api.productos.buscar(filtros, signal),
    // Sin esto, cada letra vacía la lista y la reconstruye: el desplegable
    // parpadea y la fila que se estaba por elegir se mueve bajo el cursor.
    placeholderData: anterior => anterior,
    enabled: abierto && !deshabilitado,
  })

  const resultados = consulta.data?.items ?? []
  // El índice se acota al pintar en vez de reiniciarse con un efecto: cuando
  // llega una respuesta más corta, el activo cae dentro del rango en el mismo
  // render y no existe el fotograma en que apunta a una fila inexistente.
  const indiceSeguro = Math.min(indiceActivo, Math.max(resultados.length - 1, 0))

  function agregar(producto: RespuestaProducto | undefined): void {
    if (!producto || motivoNoDisponible(producto) !== null) {
      return
    }

    alAgregar(producto)
    // Se limpia el criterio pero la lista queda abierta: el campo está listo
    // para el siguiente producto sin un clic de por medio.
    setCriterio('')
    setIndiceActivo(0)
  }

  function alPulsarTecla(evento: KeyboardEvent<HTMLInputElement>): void {
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault()

      if (!abierto) {
        setAbierto(true)

        return
      }

      if (resultados.length === 0) {
        return
      }

      const paso = evento.key === 'ArrowDown' ? 1 : -1

      setIndiceActivo((indiceSeguro + paso + resultados.length) % resultados.length)

      return
    }

    if (evento.key === 'Enter') {
      // Sin esto, el Enter enviaría el formulario que contiene al campo: justo lo
      // contrario de lo que espera quien está cargando productos.
      evento.preventDefault()
      agregar(resultados[indiceSeguro])

      return
    }

    if (evento.key === 'Escape' && abierto) {
      evento.preventDefault()
      setAbierto(false)
    }
  }

  return (
    <div>
      {/* El desplegable se ancla a este contenedor y no al bloque completo, para
          que salga pegado al campo y no debajo del texto de ayuda. */}
      <div className="relative">
        <Campo etiqueta="Buscar producto" etiquetaOculta>
          {atributos => (
            <div className="relative">
              <IconoBuscar className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-tenue" />

              <Entrada
                {...atributos}
                type="text"
                role="combobox"
                autoComplete="off"
                aria-expanded={abierto}
                aria-controls={idLista}
                aria-autocomplete="list"
                aria-activedescendant={
                  abierto && resultados.length > 0 ? `${idLista}-${indiceSeguro}` : undefined
                }
                disabled={deshabilitado}
                placeholder="Agregar producto a la venta…"
                value={criterio}
                onChange={evento => {
                  setCriterio(evento.target.value)
                  setIndiceActivo(0)
                  setAbierto(true)
                }}
                onFocus={() => setAbierto(true)}
                onBlur={() => setAbierto(false)}
                onKeyDown={alPulsarTecla}
                className="pr-9 pl-9"
              />

              {consulta.isFetching && (
                <Girador className="absolute top-1/2 right-3 -translate-y-1/2 text-texto-tenue" />
              )}
            </div>
          )}
        </Campo>

        {abierto && (
          <div
            className={cn(
              'absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-[var(--radius-borde)]',
              'border border-borde bg-superficie-elevada shadow-elevada',
              'animate-[var(--animate-entrar)]',
            )}
          >
            {consulta.error ? (
              <AvisoError
                error={consulta.error}
                alReintentar={() => void consulta.refetch()}
                className="m-3"
              />
            ) : (
              <ul
                id={idLista}
                role="listbox"
                aria-label="Resultados de la búsqueda"
                className="desplazamiento-fino max-h-80 overflow-y-auto"
              >
                {resultados.map((producto, indice) => (
                  <FilaResultado
                    key={producto.id}
                    id={`${idLista}-${indice}`}
                    producto={producto}
                    activo={indice === indiceSeguro}
                    cantidadEnVenta={cantidadesEnVenta.get(producto.id) ?? 0}
                    alSenalar={() => setIndiceActivo(indice)}
                    alElegir={() => agregar(producto)}
                  />
                ))}

                {resultados.length === 0 && (
                  <li className="px-3.5 py-6 text-center text-[0.8125rem] text-texto-tenue">
                    {consulta.isPending
                      ? 'Buscando…'
                      : criterio.trim()
                        ? `Ningún producto activo coincide con «${criterio.trim()}».`
                        : 'El catálogo no tiene productos activos.'}
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>

      <p className="mt-1.5 text-[0.8125rem] text-texto-tenue">
        Busque por SKU o nombre. Flechas para recorrer, Enter para agregar.
      </p>
    </div>
  )
}

function FilaResultado({
  id,
  producto,
  activo,
  cantidadEnVenta,
  alSenalar,
  alElegir,
}: {
  id: string
  producto: RespuestaProducto
  activo: boolean
  cantidadEnVenta: number
  alSenalar: () => void
  alElegir: () => void
}) {
  const motivo = motivoNoDisponible(producto)

  return (
    <li
      id={id}
      role="option"
      aria-selected={activo}
      aria-disabled={motivo !== null}
      ref={elemento => {
        if (activo) {
          // `nearest` no hace nada cuando la fila ya se ve, así que no pelea con
          // el desplazamiento del mouse: solo actúa al recorrer con las flechas.
          elemento?.scrollIntoView({ block: 'nearest' })
        }
      }}
      onMouseDown={evento => evento.preventDefault()}
      onMouseMove={alSenalar}
      onClick={alElegir}
      className={cn(
        'flex items-center gap-3 border-b border-borde px-3.5 py-2.5 last:border-b-0',
        motivo === null ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
        activo && 'bg-superficie-hundida',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[0.6875rem] tracking-tight text-texto-tenue">
            {producto.sku}
          </span>
          {cantidadEnVenta > 0 && (
            <Insignia tono="marca">En la venta · {formatearDecimal(cantidadEnVenta)}</Insignia>
          )}
        </div>
        <p className="truncate text-sm text-texto">{producto.nombre}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="cifra text-sm font-medium text-texto">
          {formatearMonto(producto.precioVenta)}
        </span>
        <EtiquetaDisponibilidad producto={producto} motivo={motivo} />
      </div>
    </li>
  )
}

/** Traduce la disponibilidad a una insignia: el número solo no dice si se puede vender. */
function EtiquetaDisponibilidad({
  producto,
  motivo,
}: {
  producto: RespuestaProducto
  motivo: string | null
}) {
  if (motivo !== null) {
    return <Insignia tono="peligro">{motivo}</Insignia>
  }

  if (!producto.controlaInventario) {
    return <Insignia tono="info">Servicio</Insignia>
  }

  const disponible = producto.stockDisponible ?? 0

  return (
    <Insignia tono={disponible <= 5 ? 'alerta' : 'neutro'}>
      {formatearDecimal(disponible)} disp.
    </Insignia>
  )
}
