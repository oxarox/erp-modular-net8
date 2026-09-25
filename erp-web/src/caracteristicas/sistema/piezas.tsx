import type { ReactNode } from 'react'
import { cn } from '@/componentes/cn'

/**
 * Piezas de presentación que solo usa esta pantalla.
 *
 * Viven aquí y no en `componentes/` a propósito: una ficha técnica es el único
 * lugar de la aplicación donde tiene sentido un párrafo largo o un bloque de
 * JSON, y subir eso al sistema de diseño sería agregarle vocabulario que
 * ninguna otra pantalla va a usar.
 */

/** Rejilla de pares etiqueta/valor. El `dl` es semántico: son definiciones. */
export function RejillaDatos({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <dl className={cn('grid grid-cols-2 gap-x-5 gap-y-4 px-4 py-4 sm:px-5', className)}>
      {children}
    </dl>
  )
}

export function Dato({
  etiqueta,
  valor,
  ayuda,
  mono = false,
  className,
}: {
  etiqueta: string
  valor: ReactNode
  ayuda?: ReactNode
  /** Para identificadores y horas: en ancho fijo no bailan al actualizarse. */
  mono?: boolean
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-[0.6875rem] font-semibold tracking-wider text-texto-tenue uppercase">
        {etiqueta}
      </dt>
      <dd
        className={cn(
          'mt-1 text-sm break-words text-texto',
          mono && 'cifra font-mono text-[0.8125rem]',
        )}
      >
        {valor}
      </dd>
      {ayuda && <p className="mt-1 text-[0.75rem] leading-snug text-texto-tenue">{ayuda}</p>}
    </div>
  )
}

/**
 * Bloque de código. Se desplaza en su propia caja en lugar de romper la línea:
 * un JSON con saltos arbitrarios deja de ser copiable, que es justamente para
 * lo que está puesto.
 */
export function BloqueCodigo({ etiqueta, codigo }: { etiqueta?: string; codigo: string }) {
  return (
    <div className="min-w-0">
      {etiqueta && (
        <p className="mb-1.5 text-[0.6875rem] font-semibold tracking-wider text-texto-tenue uppercase">
          {etiqueta}
        </p>
      )}
      <pre className="desplazamiento-fino overflow-x-auto rounded-[var(--radius-borde)] border border-borde bg-superficie-hundida px-3.5 py-3 font-mono text-[0.75rem] leading-relaxed text-texto-suave">
        <code>{codigo}</code>
      </pre>
    </div>
  )
}

/** Lista de notas explicativas: el texto que convierte un dato en una decisión. */
export function ListaNotas({ className, children }: { className?: string; children: ReactNode }) {
  return <ul className={cn('flex flex-col gap-3.5', className)}>{children}</ul>
}

export function Nota({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <li className="border-l-2 border-borde pl-3.5 text-[0.8125rem] leading-relaxed text-texto-suave">
      <span className="font-medium text-texto">{titulo}</span> {children}
    </li>
  )
}

/** Fragmento de código dentro de un párrafo: nombres de claim, códigos, rutas. */
export function Codigo({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-superficie-hundida px-1 py-px font-mono text-[0.75rem] text-texto">
      {children}
    </code>
  )
}
