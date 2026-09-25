import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Esqueleto } from '@/componentes/Superficie'
import type { RespuestaVenta } from '@/nucleo/api/contratos'
import { formatearEntero, formatearMonto } from '@/nucleo/formato/formato'

/**
 * Franja de resumen sobre la tabla.
 *
 * Muestra dos cifras que es fácil confundir y que aquí se separan a propósito:
 * cuántos documentos encontró el servidor con el filtro aplicado —ese número es
 * el bueno, llega en `total`— y cuánto suman los de la página que se está
 * viendo. `buscar-ventas` no devuelve ningún agregado del filtro completo, así
 * que la suma se calcula en el cliente y solo puede abarcar lo que el cliente
 * tiene: las filas visibles. Rotularla como «total del período» sería una
 * mentira silenciosa, de las que alguien copia a un informe.
 *
 * Las anuladas se cuentan aparte y quedan fuera de la suma: un documento anulado
 * no vendió nada, y mezclarlo con el resto infla la cifra justo en el caso en
 * que alguien está revisando precisamente eso.
 */

export interface PropsListadoResumenVentas {
  /** `total` de la respuesta paginada: el conteo real del servidor para el filtro. */
  total: number
  /** Filas de la página visible, las únicas sobre las que se puede sumar. */
  ventas: RespuestaVenta[]
  cargando: boolean
}

export function ListadoResumenVentas({ total, ventas, cargando }: PropsListadoResumenVentas) {
  const resumen = useMemo(() => {
    let sumaVigentes = 0
    let sumaAnuladas = 0
    let anuladas = 0

    for (const venta of ventas) {
      if (venta.estado === 'ANULADA') {
        anuladas += 1
        sumaAnuladas += venta.total
      } else {
        sumaVigentes += venta.total
      }
    }

    return { sumaVigentes, sumaAnuladas, anuladas, vigentes: ventas.length - anuladas }
  }, [ventas])

  return (
    <dl className="flex flex-wrap items-start gap-x-10 gap-y-4 border-b border-borde bg-superficie-hundida/60 px-4 py-3 sm:px-5">
      <Dato
        titulo="Documentos encontrados"
        valor={formatearEntero(total)}
        nota="Conteo del servidor para el filtro aplicado."
        cargando={cargando}
      />

      <Dato
        titulo="Suma de esta página"
        valor={formatearMonto(resumen.sumaVigentes)}
        nota={
          <>
            {formatearEntero(resumen.vigentes)} de {formatearEntero(ventas.length)} filas visibles ·
            no es el total del filtro
          </>
        }
        cargando={cargando}
      />

      {resumen.anuladas > 0 && (
        <Dato
          titulo="Anuladas en esta página"
          valor={formatearEntero(resumen.anuladas)}
          nota={`${formatearMonto(resumen.sumaAnuladas)} fuera de la suma`}
          cargando={cargando}
        />
      )}
    </dl>
  )
}

function Dato({
  titulo,
  valor,
  nota,
  cargando,
}: {
  titulo: string
  valor: string
  nota: ReactNode
  cargando: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] font-semibold tracking-wider text-texto-tenue uppercase">
        {titulo}
      </dt>
      <dd className="mt-1">
        {cargando ? (
          <Esqueleto className="h-5 w-24" />
        ) : (
          <span className="cifra text-base font-semibold text-texto">{valor}</span>
        )}
        <span className="mt-0.5 block text-[0.75rem] text-texto-tenue">{nota}</span>
      </dd>
    </div>
  )
}
