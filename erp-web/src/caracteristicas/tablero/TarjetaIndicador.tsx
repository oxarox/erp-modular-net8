import type { ReactNode } from 'react'
import { cn } from '@/componentes/cn'
import { Esqueleto, Tarjeta } from '@/componentes/Superficie'

/**
 * Tarjeta de indicador del tablero.
 *
 * Las tres partes son obligatorias a propósito. Una cifra sin contexto no se
 * puede interpretar —«$4.320.900» no dice sobre cuántos documentos ni sobre qué
 * ventana— y un indicador que no se puede interpretar se ignora. La línea de
 * contexto es lo que convierte el número en una lectura.
 */
export function TarjetaIndicador({
  etiqueta,
  valor,
  contexto,
  tono = 'neutro',
  cargando = false,
}: {
  etiqueta: string
  valor: ReactNode
  contexto: ReactNode
  /** `alerta` tiñe la cifra: se usa cuando el propio valor es la noticia. */
  tono?: 'neutro' | 'alerta'
  cargando?: boolean
}) {
  return (
    <Tarjeta className="px-4 py-3.5 sm:px-5">
      <p className="text-[0.6875rem] font-semibold tracking-wider text-texto-tenue uppercase">
        {etiqueta}
      </p>

      {cargando ? (
        <>
          <Esqueleto className="mt-2 h-7 w-32" />
          <Esqueleto className="mt-2 h-3.5 w-40" />
        </>
      ) : (
        <>
          <p
            className={cn(
              'cifra mt-1.5 truncate text-2xl font-semibold',
              tono === 'alerta' ? 'text-alerta' : 'text-texto',
            )}
          >
            {valor}
          </p>
          <p className="mt-1 text-[0.8125rem] leading-snug text-texto-tenue">{contexto}</p>
        </>
      )}
    </Tarjeta>
  )
}
