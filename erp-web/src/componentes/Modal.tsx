import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/componentes/cn'
import { Boton, BotonIcono } from '@/componentes/Boton'
import { IconoCerrar } from '@/componentes/Iconos'

/**
 * Diálogo modal sobre el elemento nativo `<dialog>`.
 *
 * Se usa `showModal()` en lugar de un div con `position: fixed` porque el
 * navegador ya resuelve —bien, y gratis— lo que una implementación propia suele
 * resolver mal: atrapar el foco dentro del diálogo, inertizar el resto de la
 * página para lectores de pantalla, cerrar con Escape y pintar en la capa
 * superior sin pelear con `z-index`.
 *
 * Lo único que hay que agregar a mano es el cierre al pulsar el fondo, porque
 * `::backdrop` no recibe eventos propios: el clic llega al `<dialog>` con
 * coordenadas fuera de su caja, y eso es lo que se detecta.
 */

/**
 * Lleva el foco al primer control del formulario, si el diálogo tiene uno.
 *
 * `showModal()` enfoca el elemento con atributo `autofocus` y, si no hay
 * ninguno, el primer elemento enfocable —que en estos diálogos es el botón de
 * cerrar—. La trampa es que React **no escribe** ese atributo en el DOM: trata
 * `autoFocus` como una instrucción y llama a `focus()` por su cuenta, en el
 * commit, es decir ANTES de que este efecto abra el diálogo. Así que el
 * `autoFocus` del campo se pierde y quien abre un formulario con el teclado
 * empieza sobre la equis.
 *
 * Se busca un control de formulario y no cualquier enfocable: en un diálogo de
 * confirmación —donde no hay ninguno— lo correcto es justamente el
 * comportamiento nativo, y no adelantar el foco a «Confirmar».
 */
function enfocarPrimerControl(dialogo: HTMLDialogElement): void {
  const control = dialogo.querySelector<HTMLElement>(
    'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
  )

  control?.focus()
}

export interface PropsModal {
  abierto: boolean
  alCerrar: () => void
  titulo: string
  descripcion?: ReactNode
  /** Pie del diálogo. Normalmente los botones de acción. */
  pie?: ReactNode
  anchoClase?: string
  children: ReactNode
}

export function Modal({
  abierto,
  alCerrar,
  titulo,
  descripcion,
  pie,
  anchoClase = 'max-w-lg',
  children,
}: PropsModal) {
  const referencia = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialogo = referencia.current

    if (!dialogo) {
      return
    }

    if (abierto && !dialogo.open) {
      dialogo.showModal()
      enfocarPrimerControl(dialogo)
    } else if (!abierto && dialogo.open) {
      dialogo.close()
    }
  }, [abierto])

  if (!abierto) {
    // Se desmonta el contenido al cerrar para que el formulario de adentro
    // vuelva a montarse limpio la próxima vez, sin arrastrar lo escrito antes.
    return (
      <dialog ref={referencia} className="hidden" aria-label={titulo} />
    )
  }

  return (
    <dialog
      ref={referencia}
      aria-labelledby="titulo-modal"
      onCancel={evento => {
        // Escape: se intercepta para que el estado de React mande sobre el DOM.
        evento.preventDefault()
        alCerrar()
      }}
      onClick={evento => {
        if (evento.target === referencia.current) {
          alCerrar()
        }
      }}
      className={cn(
        'w-[calc(100vw-2rem)] rounded-[calc(var(--radius-borde)+0.35rem)] border border-borde',
        'bg-superficie p-0 text-texto shadow-elevada backdrop:bg-black/45 backdrop:backdrop-blur-[2px]',
        'animate-[var(--animate-subir)] open:flex open:flex-col',
        'max-h-[calc(100dvh-3rem)] m-auto',
        anchoClase,
      )}
    >
      <header className="flex items-start justify-between gap-4 border-b border-borde px-5 py-4">
        <div className="min-w-0">
          <h2 id="titulo-modal" className="text-base font-semibold text-texto">
            {titulo}
          </h2>
          {descripcion && <p className="mt-1 text-[0.8125rem] text-texto-tenue">{descripcion}</p>}
        </div>

        <BotonIcono
          titulo="Cerrar"
          tamano="sm"
          icono={<IconoCerrar className="size-4" />}
          onClick={alCerrar}
        />
      </header>

      <div className="desplazamiento-fino min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

      {pie && (
        <footer className="flex flex-wrap justify-end gap-2 border-t border-borde bg-superficie-hundida/60 px-5 py-3.5">
          {pie}
        </footer>
      )}
    </dialog>
  )
}

/** Confirmación de una acción con consecuencias. */
export function ModalConfirmacion({
  abierto,
  alCerrar,
  alConfirmar,
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  tono = 'primario',
  cargando = false,
}: {
  abierto: boolean
  alCerrar: () => void
  alConfirmar: () => void
  titulo: string
  mensaje: ReactNode
  textoConfirmar?: string
  tono?: 'primario' | 'peligro'
  cargando?: boolean
}) {
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={titulo}
      anchoClase="max-w-md"
      pie={
        <>
          <Boton onClick={alCerrar} disabled={cargando}>
            Cancelar
          </Boton>
          <Boton tono={tono} onClick={alConfirmar} cargando={cargando}>
            {textoConfirmar}
          </Boton>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-texto-suave">{mensaje}</p>
    </Modal>
  )
}
