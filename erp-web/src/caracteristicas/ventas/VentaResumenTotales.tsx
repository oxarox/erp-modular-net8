import type { ReactNode } from 'react'
import { Boton } from '@/componentes/Boton'
import { GrupoCampos } from '@/componentes/Formulario'
import { IconoInfo, IconoRecibo } from '@/componentes/Iconos'
import { AvisoError, CabeceraTarjeta, Tarjeta } from '@/componentes/Superficie'
import { cn } from '@/componentes/cn'
import type { MetodoPago } from '@/nucleo/api/contratos'
import { METODOS_PAGO } from '@/nucleo/api/contratos'
import type { ErrorCalculoVenta, TotalesVenta } from '@/nucleo/dominio/totales'
import { etiquetaMetodoPago } from '@/nucleo/dominio/etiquetas'
import { formatearMonto, formatearPorcentaje } from '@/nucleo/formato/formato'

/**
 * Método de pago, totales y el botón que registra.
 *
 * Los totales que muestra este panel son una **previsualización**. El cálculo
 * que vale lo hace `CalculadoraTotalesVenta` en el dominio del servidor
 * (ADR-0005), y es el que queda guardado en la venta; aquí se replica con
 * `calcularTotalesSeguro` solo para no ir y volver a la API por cada cambio de
 * cantidad. La nota al pie lo dice en la interfaz, no solo en este comentario:
 * quien opera la caja tiene derecho a saber qué número es provisorio.
 */

export interface PropsVentaResumenTotales {
  /** `null` mientras alguna línea está a medio escribir; `errorCalculo` explica por qué. */
  totales: TotalesVenta | null
  errorCalculo: ErrorCalculoVenta | null
  /** Fracción entre 0 y 1; rotula el impuesto con su tasa («IVA 19 %»). */
  tasaImpuesto: number
  metodoPago: MetodoPago
  alCambiarMetodoPago: (metodo: MetodoPago) => void
  /** Mensaje del servidor cuando rechaza el método de pago (VENTA_007). */
  errorMetodoPago?: string
  /** Fallo de registro que no corresponde a ningún control concreto. */
  fallo?: unknown
  alRegistrar: () => void
  registrando: boolean
  /** Por qué no se puede registrar todavía. `null` cuando sí se puede. */
  motivoBloqueo: string | null
}

export function VentaResumenTotales({
  totales,
  errorCalculo,
  tasaImpuesto,
  metodoPago,
  alCambiarMetodoPago,
  errorMetodoPago,
  fallo,
  alRegistrar,
  registrando,
  motivoBloqueo,
}: PropsVentaResumenTotales) {
  return (
    <Tarjeta>
      <CabeceraTarjeta titulo="Resumen" descripcion="Cobro y totales de la venta" />

      <div className="flex flex-col gap-5 p-4 sm:p-5">
        <SelectorMetodoPago
          metodoPago={metodoPago}
          alCambiarMetodoPago={alCambiarMetodoPago}
          error={errorMetodoPago}
          deshabilitado={registrando}
        />

        <dl className="flex flex-col gap-2">
          <FilaTotal etiqueta="Subtotal" valor={totales?.subtotal} />
          <FilaTotal
            etiqueta="Descuento"
            valor={totales ? -totales.descuento : undefined}
            atenuada={!totales || totales.descuento === 0}
          />
          <FilaTotal etiqueta={`IVA ${formatearPorcentaje(tasaImpuesto)}`} valor={totales?.impuesto} />
          <FilaTotal etiqueta="Total" valor={totales?.total} destacada />
        </dl>

        {errorCalculo && (
          <p className="text-[0.8125rem] text-alerta" role="status">
            {errorCalculo.indiceLinea >= 0
              ? `No se puede calcular el total: revise la línea ${errorCalculo.indiceLinea + 1}. ${errorCalculo.message}`
              : errorCalculo.message}
          </p>
        )}

        <p className="flex gap-2 rounded-[var(--radius-borde)] bg-superficie-hundida px-3 py-2.5 text-[0.75rem] leading-relaxed text-texto-tenue">
          <IconoInfo className="mt-px size-4 shrink-0" />
          <span>
            Cálculo referencial. Los totales definitivos los devuelve el servidor al registrar: el
            dominio es la única autoridad sobre cómo se componen descuento, impuesto y total.
          </span>
        </p>

        {fallo != null && <AvisoError error={fallo} />}

        <div>
          <Boton
            tono="primario"
            tamano="lg"
            completo
            icono={<IconoRecibo className="size-[18px]" />}
            cargando={registrando}
            disabled={motivoBloqueo !== null}
            onClick={alRegistrar}
          >
            Registrar venta
          </Boton>

          <p className="mt-2 text-center text-[0.75rem] text-texto-tenue" aria-live="polite">
            {registrando
              ? 'Enviando… no cierre ni recargue la pantalla.'
              : (motivoBloqueo ?? 'La venta descuenta stock y no se puede deshacer desde aquí.')}
          </p>
        </div>
      </div>
    </Tarjeta>
  )
}

/**
 * Los cuatro métodos son espejo de `Ventas:MetodosPagoPermitidos` del
 * appsettings del servidor, que es quien decide de verdad: si el despliegue
 * habilita menos, el registro responde `VENTA_007` y el error se pinta aquí
 * mismo, junto al control que lo provocó.
 *
 * Son radios nativos y no un `<select>` porque son cuatro opciones fijas que se
 * eligen todo el día: se ven todas a la vez, se cambian con una tecla de flecha
 * y no hay un menú que abrir. El `input` está oculto para lectores de pantalla
 * pero sigue siendo el control real, así que el grupo conserva la navegación por
 * flechas y el anuncio correcto sin que haya que reimplementarlos.
 */
function SelectorMetodoPago({
  metodoPago,
  alCambiarMetodoPago,
  error,
  deshabilitado,
}: {
  metodoPago: MetodoPago
  alCambiarMetodoPago: (metodo: MetodoPago) => void
  error?: string
  deshabilitado: boolean
}) {
  return (
    <GrupoCampos titulo="Método de pago">
      <div className="grid grid-cols-2 gap-2">
        {METODOS_PAGO.map(metodo => (
          <label key={metodo} className="block">
            <input
              type="radio"
              name="metodo-pago"
              value={metodo}
              checked={metodoPago === metodo}
              disabled={deshabilitado}
              onChange={() => alCambiarMetodoPago(metodo)}
              className="peer solo-lectores"
            />
            <span
              className={cn(
                'flex h-9.5 cursor-pointer items-center justify-center rounded-[var(--radius-borde)]',
                'border border-borde bg-superficie text-[0.8125rem] font-medium text-texto-suave',
                'transition-colors hover:bg-superficie-hundida',
                'peer-checked:border-marca-borde peer-checked:bg-marca-suave peer-checked:text-marca-texto',
                'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
                'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--anillo)]',
              )}
            >
              {etiquetaMetodoPago(metodo)}
            </span>
          </label>
        ))}
      </div>

      {error && (
        <p className="mt-2 text-[0.8125rem] text-peligro" role="alert">
          {error}
        </p>
      )}
    </GrupoCampos>
  )
}

function FilaTotal({
  etiqueta,
  valor,
  destacada = false,
  atenuada = false,
}: {
  etiqueta: ReactNode
  valor: number | undefined
  destacada?: boolean
  atenuada?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4',
        destacada && 'mt-1 border-t border-borde pt-3',
      )}
    >
      <dt
        className={cn(
          'text-[0.8125rem] text-texto-suave',
          destacada && 'text-sm font-semibold text-texto',
          atenuada && 'text-texto-tenue',
        )}
      >
        {etiqueta}
      </dt>
      <dd
        className={cn(
          'cifra text-sm text-texto',
          destacada && 'text-lg font-semibold tracking-tight',
          atenuada && 'text-texto-tenue',
        )}
      >
        {formatearMonto(valor)}
      </dd>
    </div>
  )
}
