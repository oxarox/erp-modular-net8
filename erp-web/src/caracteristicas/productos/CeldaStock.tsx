import type { RespuestaProducto } from '@/nucleo/api/contratos'
import { cn } from '@/componentes/cn'
import { Insignia } from '@/componentes/Superficie'
import { formatearEntero } from '@/nucleo/formato/formato'

/**
 * Presentación del stock de una fila del catálogo.
 *
 * Toda la pieza existe por una distinción que el backend sí hace y que la
 * interfaz aplasta con facilidad: `stockDisponible` llega en `null` cuando **no
 * hay nada que contar** —el producto es un servicio, o no se pidió almacén— y
 * llega en `0` cuando hay algo que contar y la cuenta dio cero.
 *
 * No son lo mismo y no pueden verse igual. Pintar el `null` como «0» convierte
 * una ausencia de dato en una afirmación falsa: diría que se agotó una hora de
 * instalación, que no se agota. Pintar el `0` como «—» hace lo contrario y es
 * peor, porque esconde justo la fila que le importa a quien está por vender.
 * Por eso son dos ramas y no una.
 */

/**
 * Bajo este número la cifra se pinta en alerta.
 *
 * Es un umbral **de la interfaz**, no del dominio: el catálogo todavía no
 * expone punto de reorden por producto. El día que lo exponga, esta constante
 * sobra y la comparación pasa a leer el campo real.
 */
const UMBRAL_STOCK_BAJO = 10

export function CeldaStock({ producto }: { producto: RespuestaProducto }) {
  const stock = producto.stockDisponible

  if (typeof stock !== 'number') {
    // Un servicio se marca; un producto inventariado sin almacén pedido solo
    // deja el guión, porque ahí el dato falta pero existe.
    return producto.controlaInventario ? (
      <span className="text-texto-tenue">—</span>
    ) : (
      <span className="inline-flex items-center gap-2">
        <span className="text-texto-tenue">—</span>
        <Insignia tono="neutro">Servicio</Insignia>
      </span>
    )
  }

  if (stock === 0) {
    return (
      <Insignia tono="peligro" punto>
        Sin stock
      </Insignia>
    )
  }

  const bajo = stock <= UMBRAL_STOCK_BAJO

  return (
    <span className={cn('cifra', bajo ? 'font-medium text-alerta' : 'text-texto')}>
      {formatearEntero(stock)}
      {/* El color no puede ser el único canal: quien usa lector de pantalla
          también necesita enterarse de que quedan tres. */}
      {bajo && <span className="solo-lectores"> (stock bajo)</span>}
    </span>
  )
}
