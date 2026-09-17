import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/componentes/cn'

/**
 * Botón del sistema.
 *
 * El estado de carga deshabilita el control **y** conserva su ancho: un botón
 * que encoge al enviar desplaza lo que tiene al lado y el clic siguiente cae en
 * otro sitio. Por eso la etiqueta sigue ahí, en `opacity-0`, sosteniendo la caja.
 */

type Tono = 'primario' | 'secundario' | 'fantasma' | 'peligro'
type Tamano = 'sm' | 'md' | 'lg'

const TONOS: Record<Tono, string> = {
  primario:
    'bg-marca text-white shadow-tarjeta hover:bg-marca-hover active:translate-y-px disabled:hover:bg-marca',
  secundario:
    'bg-superficie text-texto border border-borde-fuerte hover:bg-superficie-hundida active:translate-y-px disabled:hover:bg-superficie',
  fantasma: 'text-texto-suave hover:bg-superficie-hundida hover:text-texto',
  peligro:
    'bg-peligro-suave text-peligro border border-peligro-borde hover:bg-peligro hover:text-white',
}

const TAMANOS: Record<Tamano, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-[0.8125rem]',
  md: 'h-9.5 gap-2 px-3.5 text-sm',
  lg: 'h-11 gap-2 px-5 text-[0.9375rem]',
}

export interface PropsBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  tono?: Tono
  tamano?: Tamano
  cargando?: boolean
  icono?: ReactNode
  /** Ocupa todo el ancho disponible. Útil en formularios y en móvil. */
  completo?: boolean
}

export function Boton({
  tono = 'secundario',
  tamano = 'md',
  cargando = false,
  icono,
  completo = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: PropsBoton) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[var(--radius-borde)]',
        'font-medium whitespace-nowrap transition-[background-color,color,transform,opacity] duration-150',
        'disabled:pointer-events-none disabled:opacity-50',
        // `relative` solo mientras hace falta, es decir mientras el girador se
        // superpone. Ponerlo en la base parecería inofensivo y no lo es: una
        // clase `absolute` pasada desde fuera NO puede sobreescribirlo, porque
        // entre dos utilidades de la misma especificidad gana la que va después
        // en la hoja de estilos y no la que va después en el atributo. Un botón
        // que se creía posicionado en absoluto seguiría ocupando su hueco en el
        // flujo —y descolocando la pantalla entera si ese flujo es un grid—.
        cargando && 'relative',
        TONOS[tono],
        TAMANOS[tamano],
        completo && 'w-full',
        className,
      )}
      {...props}
    >
      {cargando && (
        <span className="absolute inset-0 grid place-items-center">
          <Girador />
        </span>
      )}

      <span className={cn('inline-flex items-center gap-2', cargando && 'opacity-0')}>
        {icono}
        {children}
      </span>
    </button>
  )
}

/** Indicador de actividad. `aria-hidden` porque el estado lo comunica `aria-busy`. */
export function Girador({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('size-4 animate-spin', className)}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Botón que solo muestra un icono. Exige `titulo`: sin él no tendría nombre accesible. */
export function BotonIcono({
  titulo,
  icono,
  tono = 'fantasma',
  tamano = 'md',
  className,
  ...props
}: Omit<PropsBoton, 'children' | 'icono'> & { titulo: string; icono: ReactNode }) {
  return (
    <Boton
      tono={tono}
      tamano={tamano}
      aria-label={titulo}
      title={titulo}
      className={cn('aspect-square px-0', className)}
      {...props}
    >
      {icono}
    </Boton>
  )
}
