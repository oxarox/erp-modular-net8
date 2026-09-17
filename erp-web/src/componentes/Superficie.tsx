import type { ReactNode } from 'react'
import { cn } from '@/componentes/cn'
import { IconoAlerta, IconoActualizar } from '@/componentes/Iconos'
import { Boton } from '@/componentes/Boton'
import { ErrorApi, ErrorDeRed, mensajeParaUsuario } from '@/nucleo/api/errores'

/** Contenedores, estados y etiquetas: las piezas que envuelven al contenido. */

export function Tarjeta({
  className,
  children,
  ...props
}: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[calc(var(--radius-borde)+0.25rem)] border border-borde bg-superficie shadow-tarjeta',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CabeceraTarjeta({
  titulo,
  descripcion,
  acciones,
  className,
}: {
  titulo: ReactNode
  descripcion?: ReactNode
  acciones?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-borde px-4 py-3.5 sm:px-5',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold text-texto">{titulo}</h2>
        {descripcion && <p className="mt-0.5 text-[0.8125rem] text-texto-tenue">{descripcion}</p>}
      </div>
      {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
    </div>
  )
}

/** Encabezado de página: título, bajada y acciones principales. */
export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string
  descripcion?: ReactNode
  acciones?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-texto sm:text-2xl">{titulo}</h1>
        {descripcion && (
          <p className="mt-1 max-w-2xl text-sm text-texto-suave">{descripcion}</p>
        )}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  )
}

// ── Insignias ───────────────────────────────────────────────────────────────

type TonoInsignia = 'neutro' | 'exito' | 'alerta' | 'peligro' | 'info' | 'marca'

const TONOS_INSIGNIA: Record<TonoInsignia, string> = {
  neutro: 'bg-superficie-hundida text-texto-suave border-borde',
  exito: 'bg-exito-suave text-exito border-exito-borde',
  alerta: 'bg-alerta-suave text-alerta border-alerta-borde',
  peligro: 'bg-peligro-suave text-peligro border-peligro-borde',
  info: 'bg-info-suave text-info border-info-borde',
  marca: 'bg-marca-suave text-marca-texto border-marca-borde',
}

export function Insignia({
  tono = 'neutro',
  punto = false,
  className,
  children,
}: {
  tono?: TonoInsignia
  /** Añade un punto de color: ayuda a distinguir estados sin depender solo del color de fondo. */
  punto?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5',
        'text-[0.6875rem] font-medium tracking-wide whitespace-nowrap uppercase',
        TONOS_INSIGNIA[tono],
        className,
      )}
    >
      {punto && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  )
}

// ── Estados ─────────────────────────────────────────────────────────────────

export function Esqueleto({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-[var(--animate-pulso-suave)] rounded bg-superficie-hundida', className)}
      aria-hidden="true"
    />
  )
}

export function EstadoVacio({
  icono,
  titulo,
  descripcion,
  accion,
  className,
}: {
  icono?: ReactNode
  titulo: string
  descripcion?: ReactNode
  accion?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-14 text-center', className)}>
      {icono && (
        <div className="grid size-11 place-items-center rounded-full bg-superficie-hundida text-texto-tenue">
          {icono}
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-texto">{titulo}</p>
        {descripcion && (
          <p className="mx-auto mt-1 max-w-sm text-[0.8125rem] text-texto-tenue">{descripcion}</p>
        )}
      </div>
      {accion}
    </div>
  )
}

/**
 * Presentación estándar de un fallo.
 *
 * Muestra siempre el identificador de correlación cuando existe: es el dato que
 * convierte «no me funciona» en una línea concreta del log del servidor. Es la
 * contraparte de `IntermediarioCorrelacionRequest` en el backend.
 */
export function AvisoError({
  error,
  alReintentar,
  className,
}: {
  error: unknown
  alReintentar?: () => void
  className?: string
}) {
  const traceId = error instanceof ErrorApi ? error.traceId : null
  const codigo = error instanceof ErrorApi ? error.codigo : null
  const esRed = error instanceof ErrorDeRed

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-3 rounded-[var(--radius-borde)] border border-peligro-borde bg-peligro-suave px-4 py-3.5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <IconoAlerta className="mt-0.5 size-[18px] shrink-0 text-peligro" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-texto">{mensajeParaUsuario(error)}</p>

          {esRed && (
            <p className="mt-1 text-[0.8125rem] text-texto-suave">
              Revise que la API esté levantada y que su origen figure en{' '}
              <code className="font-mono text-[0.75rem]">Cors:OrigenesPermitidos</code>.
            </p>
          )}

          {(codigo ?? traceId) && (
            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.6875rem] text-texto-tenue">
              {codigo && (
                <div className="flex gap-1.5">
                  <dt className="opacity-70">código</dt>
                  <dd className="text-texto-suave">{codigo}</dd>
                </div>
              )}
              {traceId && (
                <div className="flex min-w-0 gap-1.5">
                  <dt className="opacity-70">correlación</dt>
                  <dd className="truncate text-texto-suave">{traceId}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>

      {alReintentar && (
        <div>
          <Boton tamano="sm" icono={<IconoActualizar className="size-4" />} onClick={alReintentar}>
            Reintentar
          </Boton>
        </div>
      )}
    </div>
  )
}

/** Envoltura de sección con separadores consistentes. */
export function Pila({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <div className={cn('flex flex-col gap-5', className)}>{children}</div>
}
