import { useState } from 'react'
import type { CSSProperties } from 'react'
import { cn } from '@/componentes/cn'
import type { PuntoDia } from '@/caracteristicas/tablero/agregacion'
import { describirDia } from '@/caracteristicas/tablero/agregacion'
import {
  formatearDiaMes,
  formatearFecha,
  formatearFechaLarga,
  formatearMonto,
} from '@/nucleo/formato/formato'

/**
 * Gráfico de barras de la venta diaria, en SVG escrito a mano.
 *
 * Tres decisiones que explican la forma del archivo:
 *
 * 1. **Sin librería de gráficos.** Son treinta rectángulos y tres líneas. La
 *    alternativa más liviana del ecosistema pesa más que todo el resto de esta
 *    consola junta, y ninguna de ellas hereda los tokens del tema: habría que
 *    pasarle la paleta a mano y volver a pasársela al cambiar a modo oscuro.
 *    Aquí las barras son `var(--marca)` y el tema las cambia solo.
 *
 * 2. **El texto no entra al SVG.** El trazado usa `preserveAspectRatio="none"`,
 *    que es lo que permite que se estire a cualquier ancho sin anchos fijos en
 *    píxeles; esa deformación también estiraría las letras. Los rótulos del eje
 *    son HTML posicionado sobre las mismas fracciones que las líneas de
 *    referencia, y los trazos llevan `vector-effect="non-scaling-stroke"` para
 *    que una línea de 1px siga midiendo 1px después del estiramiento.
 *
 * 3. **Los días sin ventas son una barra en cero, no un hueco.** Una serie que
 *    omite los días vacíos comprime el tiempo y miente sobre la cadencia: nueve
 *    ventas en nueve días seguidos y nueve repartidas en un mes se verían igual.
 *
 * Accesibilidad: el `role="img"` resume la serie para quien no la ve, la tabla
 * `solo-lectores` de abajo **es** la serie —un gráfico que solo existe como
 * píxeles no se puede leer— y cada columna es un punto de tabulación para que el
 * detalle de un día también se alcance con el teclado, no solo con el mouse.
 */

/** Unidades del sistema de coordenadas interno; no son píxeles. */
const ANCHO = 300
const ALTO = 100

/**
 * Un día con ventas nunca debe verse como un día sin ventas. Con un máximo alto,
 * una jornada floja daría una barra de altura cero y quedaría indistinguible del
 * domingo cerrado, así que se le garantiza una altura mínima visible. Es la única
 * licencia que se toma el gráfico con la escala, y solo hacia arriba desde cero.
 */
const ALTURA_MINIMA = 1.2

/** Fracciones del máximo donde se dibujan las líneas de referencia. */
const MARCAS_EJE = [1, 0.5, 0] as const

/** El alto del trazado y el de la columna de rótulos tienen que ser el mismo. */
const ALTO_TRAZADO = 'h-40 sm:h-52'

export function GraficoVentasDiarias({
  serie,
  maximo,
  montoTotal,
  diaPico,
}: {
  serie: PuntoDia[]
  maximo: number
  montoTotal: number
  diaPico: PuntoDia | null
}) {
  const [indiceActivo, setIndiceActivo] = useState<number | null>(null)

  const cantidad = Math.max(serie.length, 1)
  const anchoRanura = ANCHO / cantidad
  const anchoBarra = anchoRanura * 0.6
  const puntoActivo = indiceActivo === null ? null : (serie.at(indiceActivo) ?? null)

  const primero = serie.at(0)
  const ultimo = serie.at(-1)
  const medio = serie.at(Math.floor(serie.length / 2))

  const resumenSerie = [
    `Ventas diarias del ${formatearFecha(primero?.fecha)} al ${formatearFecha(ultimo?.fecha)},`,
    `${serie.length} barras, una por día.`,
    `Total del período: ${formatearMonto(montoTotal)}.`,
    diaPico
      ? `Día más alto: ${formatearFechaLarga(diaPico.fecha)}, ${formatearMonto(diaPico.monto)}.`
      : 'No hubo ventas en el período.',
    'El detalle día por día está en la tabla que sigue al gráfico.',
  ].join(' ')

  const alturaDe = (monto: number): number =>
    monto > 0 && maximo > 0 ? Math.max((monto / maximo) * ALTO, ALTURA_MINIMA) : 0

  return (
    <figure>
      <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2.5 sm:grid-cols-[4.75rem_minmax(0,1fr)]">
        {/* Eje Y. Cada rótulo se centra sobre su línea con la misma fracción que
            usa el trazado, así no hay dos escalas que mantener sincronizadas. */}
        <div className={cn('relative', ALTO_TRAZADO)} aria-hidden="true">
          {/* Con el máximo en cero las tres marcas dirían «$0»: queda solo la base. */}
          {MARCAS_EJE.filter(fraccion => maximo > 0 || fraccion === 0).map(fraccion => (
            <span
              key={fraccion}
              className="cifra absolute right-0 -translate-y-1/2 text-[0.625rem] whitespace-nowrap text-texto-tenue"
              style={{ top: `${(1 - fraccion) * 100}%` }}
            >
              {formatearMonto(maximo * fraccion)}
            </span>
          ))}
        </div>

        <div className={cn('relative', ALTO_TRAZADO)}>
          <svg
            viewBox={`0 0 ${ANCHO} ${ALTO}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={resumenSerie}
            className="size-full overflow-visible"
          >
            {MARCAS_EJE.map(fraccion => (
              <line
                key={fraccion}
                x1={0}
                x2={ANCHO}
                y1={(1 - fraccion) * ALTO}
                y2={(1 - fraccion) * ALTO}
                stroke={fraccion === 0 ? 'var(--borde-fuerte)' : 'var(--borde)'}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                shapeRendering="crispEdges"
              />
            ))}

            {serie.map((punto, indice) => {
              const activo = indice === indiceActivo
              const altura = alturaDe(punto.monto)
              const izquierdaRanura = indice * anchoRanura

              return (
                <g
                  key={punto.clave}
                  tabIndex={0}
                  aria-label={`${formatearFechaLarga(punto.fecha)}: ${formatearMonto(punto.monto)}, ${describirDia(punto)}`}
                  onMouseEnter={() => setIndiceActivo(indice)}
                  onMouseLeave={() => setIndiceActivo(actual => (actual === indice ? null : actual))}
                  onFocus={() => setIndiceActivo(indice)}
                  onBlur={() => setIndiceActivo(actual => (actual === indice ? null : actual))}
                >
                  {/* Franja de la ranura: es el área sensible —la barra sola sería
                      un blanco de un píxel en un día flojo— y además marca la
                      columna activa. */}
                  <rect
                    x={izquierdaRanura}
                    y={0}
                    width={anchoRanura}
                    height={ALTO}
                    fill="var(--superficie-hundida)"
                    opacity={activo ? 1 : 0}
                  />

                  <rect
                    x={izquierdaRanura + (anchoRanura - anchoBarra) / 2}
                    y={ALTO - altura}
                    width={anchoBarra}
                    height={altura}
                    fill="var(--marca)"
                    opacity={activo ? 1 : 0.82}
                  />
                </g>
              )
            })}
          </svg>

          {puntoActivo && indiceActivo !== null && (
            <div
              className="pointer-events-none absolute z-10 rounded-[var(--radius-borde)] border border-borde bg-superficie-elevada px-2.5 py-1.5 shadow-elevada"
              style={estiloTooltip(indiceActivo, puntoActivo, serie.length, maximo)}
              aria-hidden="true"
            >
              <p className="text-[0.6875rem] whitespace-nowrap text-texto-suave">
                {formatearFechaLarga(puntoActivo.fecha)}
              </p>
              <p className="cifra text-[0.875rem] font-semibold whitespace-nowrap text-texto">
                {formatearMonto(puntoActivo.monto)}
              </p>
              <p className="text-[0.625rem] whitespace-nowrap text-texto-tenue">
                {describirDia(puntoActivo)}
              </p>
            </div>
          )}

          {maximo === 0 && (
            <p className="absolute inset-0 grid place-items-center text-[0.8125rem] text-texto-tenue">
              Sin ventas registradas en el período
            </p>
          )}
        </div>

        <div aria-hidden="true" />

        <div
          className="cifra flex justify-between pt-2 text-[0.6875rem] text-texto-tenue"
          aria-hidden="true"
        >
          <span>{formatearDiaMes(primero?.fecha)}</span>
          <span>{formatearDiaMes(medio?.fecha)}</span>
          <span>{formatearDiaMes(ultimo?.fecha)}</span>
        </div>
      </div>

      {/* La serie completa, en texto. Es la versión del gráfico que puede leer un
          lector de pantalla, y la que sobrevive si alguien copia la pantalla. */}
      <table className="solo-lectores">
        <caption>Venta diaria del período, día por día.</caption>
        <thead>
          <tr>
            <th scope="col">Día</th>
            <th scope="col">Monto</th>
            <th scope="col">Documentos</th>
          </tr>
        </thead>
        <tbody>
          {serie.map(punto => (
            <tr key={punto.clave}>
              <th scope="row">{formatearFechaLarga(punto.fecha)}</th>
              <td>{formatearMonto(punto.monto)}</td>
              <td>{punto.documentos}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

/**
 * Coloca el tooltip sin que se salga del trazado ni tape la barra que describe.
 *
 * Horizontal: se centra sobre la columna, salvo en los extremos, donde se ancla
 * por su borde para no desbordar la tarjeta. Vertical: arriba, y abajo cuando la
 * barra es alta y le quitaría el sitio.
 */
function estiloTooltip(
  indice: number,
  punto: PuntoDia,
  cantidad: number,
  maximo: number,
): CSSProperties {
  const centro = ((indice + 0.5) / Math.max(cantidad, 1)) * 100

  let desplazamiento = '-50%'

  if (centro < 18) {
    desplazamiento = '0%'
  } else if (centro > 82) {
    desplazamiento = '-100%'
  }

  const barraAlta = maximo > 0 && punto.monto / maximo > 0.55

  return {
    left: `${centro}%`,
    transform: `translateX(${desplazamiento})`,
    ...(barraAlta ? { bottom: '0.375rem' } : { top: '0.375rem' }),
  }
}
