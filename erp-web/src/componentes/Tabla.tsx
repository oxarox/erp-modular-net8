import type { ReactNode } from 'react'
import { cn } from '@/componentes/cn'
import { BotonIcono } from '@/componentes/Boton'
import { IconoFlechaDerecha, IconoFlechaIzquierda } from '@/componentes/Iconos'
import { AvisoError, Esqueleto, EstadoVacio } from '@/componentes/Superficie'
import { formatearEntero } from '@/nucleo/formato/formato'

/**
 * Tabla de datos y paginador.
 *
 * Existe un único componente de tabla porque existe una única forma de respuesta
 * paginada: `ResultadoPaginado<T>` del backend garantiza que los 33 módulos del
 * sistema devuelvan `pagina`, `tamanoPagina`, `total`, `totalPaginas` e `items`.
 * Esa decisión del servidor es la que permite que aquí no haya una tabla por
 * módulo.
 *
 * La tabla se hace cargo de los cuatro estados —cargando, error, vacío y con
 * datos— para que ninguna pantalla se olvide del tercero, que es el que siempre
 * se olvida.
 */

export interface ColumnaTabla<T> {
  clave: string
  encabezado: ReactNode
  /** Alineación del contenido. Los montos van a la derecha. */
  alineacion?: 'izquierda' | 'derecha' | 'centro'
  /** Se oculta bajo `sm`, para que en móvil sobrevivan solo las columnas que importan. */
  ocultarEnMovil?: boolean
  anchoClase?: string
  celda: (fila: T) => ReactNode
}

const ALINEACION = {
  izquierda: 'text-left',
  derecha: 'text-right',
  centro: 'text-center',
} as const

export interface PropsTabla<T> {
  columnas: ColumnaTabla<T>[]
  filas: T[] | undefined
  claveFila: (fila: T) => string | number
  cargando?: boolean
  error?: unknown
  alReintentar?: () => void
  vacio?: ReactNode
  /** Leyenda para lectores de pantalla; describe qué contiene la tabla. */
  descripcion: string
  filasEsqueleto?: number
  alPulsarFila?: (fila: T) => void
}

export function Tabla<T>({
  columnas,
  filas,
  claveFila,
  cargando = false,
  error,
  alReintentar,
  vacio,
  descripcion,
  filasEsqueleto = 6,
  alPulsarFila,
}: PropsTabla<T>) {
  if (error) {
    return <AvisoError error={error} alReintentar={alReintentar} className="m-4" />
  }

  const sinDatos = !cargando && (filas?.length ?? 0) === 0

  return (
    <div className="desplazamiento-fino overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <caption className="solo-lectores">{descripcion}</caption>

        <thead>
          <tr className="border-b border-borde">
            {columnas.map(columna => (
              <th
                key={columna.clave}
                scope="col"
                className={cn(
                  'px-4 py-2.5 text-[0.6875rem] font-semibold tracking-wider text-texto-tenue uppercase',
                  ALINEACION[columna.alineacion ?? 'izquierda'],
                  columna.ocultarEnMovil && 'hidden sm:table-cell',
                  columna.anchoClase,
                )}
              >
                {columna.encabezado}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-borde">
          {cargando &&
            Array.from({ length: filasEsqueleto }, (_, indice) => (
              <tr key={`esqueleto-${indice}`}>
                {columnas.map(columna => (
                  <td
                    key={columna.clave}
                    className={cn('px-4 py-3', columna.ocultarEnMovil && 'hidden sm:table-cell')}
                  >
                    <Esqueleto className="h-4 w-full max-w-[9rem]" />
                  </td>
                ))}
              </tr>
            ))}

          {!cargando &&
            filas?.map(fila => (
              <tr
                key={claveFila(fila)}
                onClick={alPulsarFila ? () => alPulsarFila(fila) : undefined}
                className={cn(
                  'transition-colors',
                  alPulsarFila ? 'cursor-pointer hover:bg-superficie-hundida' : 'hover:bg-superficie-hundida/60',
                )}
              >
                {columnas.map(columna => (
                  <td
                    key={columna.clave}
                    className={cn(
                      'px-4 py-3 align-middle text-texto',
                      ALINEACION[columna.alineacion ?? 'izquierda'],
                      columna.ocultarEnMovil && 'hidden sm:table-cell',
                    )}
                  >
                    {columna.celda(fila)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>

      {sinDatos && (vacio ?? <EstadoVacio titulo="Sin resultados" descripcion="Pruebe con otros filtros." />)}
    </div>
  )
}

// ── Paginador ───────────────────────────────────────────────────────────────

export interface PropsPaginador {
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
  alCambiarPagina: (pagina: number) => void
  alCambiarTamano?: (tamano: number) => void
  cargando?: boolean
}

/** El backend acepta hasta 200 por página (`SolicitudPaginada.TamanoMaximo`). */
const TAMANOS = [10, 25, 50, 100] as const

export function Paginador({
  pagina,
  tamanoPagina,
  total,
  totalPaginas,
  alCambiarPagina,
  alCambiarTamano,
  cargando = false,
}: PropsPaginador) {
  const desde = total === 0 ? 0 : (pagina - 1) * tamanoPagina + 1
  const hasta = Math.min(pagina * tamanoPagina, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borde px-4 py-3">
      <p className="text-[0.8125rem] text-texto-tenue" aria-live="polite">
        {total === 0 ? (
          'Sin registros'
        ) : (
          <>
            <span className="cifra text-texto-suave">
              {formatearEntero(desde)}–{formatearEntero(hasta)}
            </span>{' '}
            de <span className="cifra text-texto-suave">{formatearEntero(total)}</span>
          </>
        )}
      </p>

      <div className="flex items-center gap-2">
        {alCambiarTamano && (
          <label className="flex items-center gap-1.5 text-[0.8125rem] text-texto-tenue">
            <span className="hidden sm:inline">Por página</span>
            <select
              value={tamanoPagina}
              onChange={evento => alCambiarTamano(Number(evento.target.value))}
              className="h-8 cursor-pointer rounded-[var(--radius-borde)] border border-borde bg-superficie px-2 text-[0.8125rem] text-texto"
            >
              {TAMANOS.map(tamano => (
                <option key={tamano} value={tamano}>
                  {tamano}
                </option>
              ))}
            </select>
          </label>
        )}

        <nav className="flex items-center gap-1" aria-label="Paginación">
          <BotonIcono
            titulo="Página anterior"
            tamano="sm"
            tono="secundario"
            icono={<IconoFlechaIzquierda className="size-4" />}
            disabled={pagina <= 1 || cargando}
            onClick={() => alCambiarPagina(pagina - 1)}
          />

          <span className="cifra px-2 text-[0.8125rem] text-texto-suave">
            {pagina} / {Math.max(totalPaginas, 1)}
          </span>

          <BotonIcono
            titulo="Página siguiente"
            tamano="sm"
            tono="secundario"
            icono={<IconoFlechaDerecha className="size-4" />}
            disabled={pagina >= totalPaginas || cargando}
            onClick={() => alCambiarPagina(pagina + 1)}
          />
        </nav>
      </div>
    </div>
  )
}

/** Barra de filtros sobre una tabla, con el espaciado ya resuelto. */
export function BarraFiltros({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-3 border-b border-borde px-4 py-3 sm:px-5',
        className,
      )}
    >
      {children}
    </div>
  )
}
