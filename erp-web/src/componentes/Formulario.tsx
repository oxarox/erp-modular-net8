import { useId } from 'react'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/componentes/cn'

/**
 * Controles de formulario.
 *
 * El punto de todo este archivo es que un campo con error quede correctamente
 * anunciado sin que cada pantalla se acuerde de hacerlo: `Campo` genera el `id`,
 * lo enlaza con la etiqueta, y expone `aria-describedby` y `aria-invalid` a
 * través de una función de render. Un formulario no puede olvidarse de
 * describir su error porque el componente no le deja escribirlo de otra forma.
 */

const BASE_CONTROL = cn(
  'w-full rounded-[var(--radius-borde)] border bg-superficie px-3 text-sm text-texto',
  'placeholder:text-texto-tenue transition-colors',
  'disabled:cursor-not-allowed disabled:bg-superficie-hundida disabled:text-texto-tenue',
  'aria-[invalid=true]:border-peligro aria-[invalid=true]:bg-peligro-suave/40',
)

export interface AtributosControl {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
}

export interface PropsCampo {
  etiqueta: string
  /** Texto de ayuda permanente. Se oculta cuando hay error para no competir con él. */
  ayuda?: ReactNode
  error?: string
  requerido?: boolean
  /** Oculta la etiqueta visualmente pero la mantiene para lectores de pantalla. */
  etiquetaOculta?: boolean
  className?: string
  children: (atributos: AtributosControl) => ReactNode
}

export function Campo({
  etiqueta,
  ayuda,
  error,
  requerido = false,
  etiquetaOculta = false,
  className,
  children,
}: PropsCampo) {
  const id = useId()
  const idAyuda = `${id}-ayuda`
  const idError = `${id}-error`

  const descrito = [error ? idError : null, ayuda && !error ? idAyuda : null]
    .filter(Boolean)
    .join(' ')

  const atributos: AtributosControl = {
    id,
    ...(descrito ? { 'aria-describedby': descrito } : {}),
    ...(error ? { 'aria-invalid': true as const } : {}),
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className={cn(
          'text-[0.8125rem] font-medium text-texto-suave',
          etiquetaOculta && 'solo-lectores',
        )}
      >
        {etiqueta}
        {requerido && (
          <span className="ml-0.5 text-peligro" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children(atributos)}

      {error ? (
        <p id={idError} className="text-[0.8125rem] text-peligro" role="alert">
          {error}
        </p>
      ) : ayuda ? (
        <p id={idAyuda} className="text-[0.8125rem] text-texto-tenue">
          {ayuda}
        </p>
      ) : null}
    </div>
  )
}

export function Entrada({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(BASE_CONTROL, 'h-9.5', className)} {...props} />
}

export function AreaTexto({
  className,
  rows = 3,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cn(BASE_CONTROL, 'py-2 leading-relaxed', className)} {...props} />
}

export function Seleccion({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        BASE_CONTROL,
        'h-9.5 cursor-pointer appearance-none bg-no-repeat pr-9',
        // La flecha va en el fondo para no depender de un icono posicionado
        // encima, que tendría que replicar el color en cada tema.
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22 stroke-linecap=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')]",
        'bg-[length:1rem] bg-[position:right_0.65rem_center]',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}

/** Casilla de verificación con su etiqueta, como una sola unidad clicable. */
export function Casilla({
  etiqueta,
  descripcion,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { etiqueta: ReactNode; descripcion?: ReactNode }) {
  const id = useId()

  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input
        id={id}
        type="checkbox"
        className={cn(
          'mt-0.5 size-4 shrink-0 cursor-pointer appearance-none rounded-[0.3rem] border border-borde-fuerte bg-superficie',
          'checked:border-marca checked:bg-marca transition-colors',
          "checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22white%22 stroke-width=%223.2%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m5 12.5 4.5 4.5L19 7%22/></svg>')]",
          'checked:bg-[length:0.7rem] checked:bg-center checked:bg-no-repeat',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        {...props}
      />
      <label htmlFor={id} className="cursor-pointer select-none text-sm leading-tight">
        <span className="text-texto">{etiqueta}</span>
        {descripcion && <span className="mt-0.5 block text-[0.8125rem] text-texto-tenue">{descripcion}</span>}
      </label>
    </div>
  )
}

/** Agrupa campos bajo un título, con la semántica correcta para lectores de pantalla. */
export function GrupoCampos({
  titulo,
  descripcion,
  className,
  children,
}: {
  titulo: string
  descripcion?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="text-sm font-semibold text-texto">{titulo}</legend>
      {descripcion && <p className="mt-0.5 mb-3 text-[0.8125rem] text-texto-tenue">{descripcion}</p>}
      <div className={cn(!descripcion && 'mt-3')}>{children}</div>
    </fieldset>
  )
}
