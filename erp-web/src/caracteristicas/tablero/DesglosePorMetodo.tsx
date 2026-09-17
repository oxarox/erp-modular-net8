import type { DesgloseMetodo } from '@/caracteristicas/tablero/agregacion'
import { etiquetaMetodoPago } from '@/nucleo/dominio/etiquetas'
import { Esqueleto } from '@/componentes/Superficie'
import { formatearEntero, formatearMonto, formatearPorcentaje } from '@/nucleo/formato/formato'

/**
 * Reparto del monto del período entre los métodos de pago.
 *
 * Se listan los cuatro métodos siempre, incluido el que no registró ninguna
 * venta: «Transferencia: $0» es un dato —nadie transfirió— y un método ausente
 * de la lista se leería como que el sistema no lo acepta.
 *
 * La barra es decorativa (`aria-hidden`): el porcentaje ya está escrito al lado,
 * y repetir la misma información en el árbol de accesibilidad solo alarga la
 * lectura.
 */
export function DesglosePorMetodo({
  metodos,
  cargando,
}: {
  metodos: DesgloseMetodo[]
  cargando: boolean
}) {
  if (cargando) {
    return (
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        {[0, 1, 2, 3].map(indice => (
          <div key={indice}>
            <Esqueleto className="h-4 w-full" />
            <Esqueleto className="mt-2 h-1.5 w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-4 px-4 py-4 sm:px-5">
      {metodos.map(metodo => (
        <li key={metodo.metodo}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate text-[0.8125rem] text-texto">
              <span className="font-medium">{etiquetaMetodoPago(metodo.metodo)}</span>
              <span className="text-texto-tenue">
                {' · '}
                {formatearEntero(metodo.documentos)} doc.
              </span>
            </p>
            <p className="cifra shrink-0 text-[0.8125rem] font-medium text-texto">
              {formatearMonto(metodo.monto)}
            </p>
          </div>

          <div className="mt-1.5 flex items-center gap-2.5">
            <div
              className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-superficie-hundida"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-marca"
                style={{ width: `${(metodo.participacionMonto * 100).toFixed(1)}%` }}
              />
            </div>
            <p className="cifra w-12 shrink-0 text-right text-[0.6875rem] text-texto-tenue">
              {formatearPorcentaje(metodo.participacionMonto)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
