import { createContext, use, useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/componentes/cn'
import { BotonIcono } from '@/componentes/Boton'
import { IconoAlerta, IconoCerrar, IconoCheque, IconoInfo } from '@/componentes/Iconos'
import { ErrorApi, mensajeParaUsuario } from '@/nucleo/api/errores'

/**
 * Avisos efímeros.
 *
 * La región va marcada como `aria-live="polite"`: un aviso que solo existe en
 * píxeles no llega a quien navega con lector de pantalla, y «marca creada» es
 * justamente la confirmación que esa persona necesita oír.
 *
 * Los errores entran por `avisarError`, que reutiliza la traducción del sobre de
 * la API y conserva el identificador de correlación. Así el aviso de una pantalla
 * dice lo mismo que diría el bloque de error de otra.
 */

type TonoAviso = 'exito' | 'error' | 'info'

interface Aviso {
  id: number
  tono: TonoAviso
  mensaje: string
  detalle?: string
}

interface ApiNotificaciones {
  avisarExito: (mensaje: string, detalle?: string) => void
  avisarInfo: (mensaje: string, detalle?: string) => void
  avisarError: (error: unknown) => void
}

const ContextoNotificaciones = createContext<ApiNotificaciones | null>(null)

const DURACION_MS = 5000

export function ProveedorNotificaciones({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const siguienteId = useRef(1)
  const temporizadores = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const descartar = useCallback((id: number) => {
    const temporizador = temporizadores.current.get(id)

    if (temporizador) {
      clearTimeout(temporizador)
      temporizadores.current.delete(id)
    }

    setAvisos(actuales => actuales.filter(aviso => aviso.id !== id))
  }, [])

  const agregar = useCallback(
    (tono: TonoAviso, mensaje: string, detalle?: string) => {
      const id = siguienteId.current++

      setAvisos(actuales => [...actuales.slice(-2), { id, tono, mensaje, detalle }])

      // Un error se queda hasta que la persona lo cierre: suele traer el
      // identificador de correlación, y que se desvanezca solo obliga a repetir
      // la operación para volver a verlo.
      if (tono !== 'error') {
        temporizadores.current.set(
          id,
          setTimeout(() => descartar(id), DURACION_MS),
        )
      }
    },
    [descartar],
  )

  const api = useMemo<ApiNotificaciones>(
    () => ({
      avisarExito: (mensaje, detalle) => agregar('exito', mensaje, detalle),
      avisarInfo: (mensaje, detalle) => agregar('info', mensaje, detalle),
      avisarError: error =>
        agregar(
          'error',
          mensajeParaUsuario(error),
          error instanceof ErrorApi ? `${error.codigo} · ${error.traceId}` : undefined,
        ),
    }),
    [agregar],
  )

  return (
    <ContextoNotificaciones value={api}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {avisos.map(aviso => (
          <TarjetaAviso key={aviso.id} aviso={aviso} alDescartar={() => descartar(aviso.id)} />
        ))}
      </div>
    </ContextoNotificaciones>
  )
}

const ESTILOS: Record<TonoAviso, { caja: string; icono: ReactNode }> = {
  exito: {
    caja: 'border-exito-borde bg-exito-suave text-texto',
    icono: <IconoCheque className="size-[18px] text-exito" />,
  },
  error: {
    caja: 'border-peligro-borde bg-peligro-suave text-texto',
    icono: <IconoAlerta className="size-[18px] text-peligro" />,
  },
  info: {
    caja: 'border-info-borde bg-info-suave text-texto',
    icono: <IconoInfo className="size-[18px] text-info" />,
  },
}

function TarjetaAviso({ aviso, alDescartar }: { aviso: Aviso; alDescartar: () => void }) {
  const estilo = ESTILOS[aviso.tono]

  return (
    <div
      role={aviso.tono === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-borde)]',
        'border px-3.5 py-3 shadow-elevada animate-[var(--animate-subir)]',
        estilo.caja,
      )}
    >
      <span className="mt-0.5 shrink-0">{estilo.icono}</span>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-medium">{aviso.mensaje}</p>
        {aviso.detalle && (
          <p className="mt-1 truncate font-mono text-[0.6875rem] text-texto-tenue">{aviso.detalle}</p>
        )}
      </div>

      <BotonIcono
        titulo="Descartar aviso"
        tamano="sm"
        icono={<IconoCerrar className="size-4" />}
        onClick={alDescartar}
        className="-my-1 -mr-1.5"
      />
    </div>
  )
}

export function useNotificaciones(): ApiNotificaciones {
  const contexto = use(ContextoNotificaciones)

  if (!contexto) {
    throw new Error('useNotificaciones debe usarse dentro de <ProveedorNotificaciones>.')
  }

  return contexto
}
