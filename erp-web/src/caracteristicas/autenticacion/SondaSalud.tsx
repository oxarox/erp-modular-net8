import { useQuery } from '@tanstack/react-query'
import { claves } from '@/app/clienteConsultas'
import { Boton, Girador } from '@/componentes/Boton'
import { cn } from '@/componentes/cn'
import { IconoActualizar } from '@/componentes/Iconos'
import { api } from '@/nucleo/api/endpoints'
import { mensajeParaUsuario } from '@/nucleo/api/errores'
import { configuracion } from '@/nucleo/configuracion'

/**
 * Indicador de disponibilidad de la API, antes de pedir la contraseña.
 *
 * `/api/salud` es el único endpoint anónimo del sistema, y eso es justo lo que
 * lo hace útil aquí: se puede preguntar sin sesión. Saber que la API no responde
 * ANTES de escribir las credenciales evita el diagnóstico equivocado de siempre
 * —«me rechazó la contraseña»— cuando lo que pasa es que el backend está
 * apagado o que el origen no figura en `Cors:OrigenesPermitidos`.
 *
 * `retry: false` va contra la política general del cliente de consultas, y es
 * deliberado: esto es un indicador, no un dato de la pantalla. Si la API está
 * caída, tres reintentos con espera exponencial solo retrasan ocho segundos el
 * aviso que la persona necesita leer ya. Quien quiera reintentar, tiene el botón.
 */
export function SondaSalud({ className }: { className?: string }) {
  const salud = useQuery({
    queryKey: claves.salud(),
    queryFn: ({ signal }) => api.salud.obtener(signal),
    retry: false,
  })

  if (salud.isPending) {
    return (
      <p className={cn('flex items-center gap-2 text-[0.8125rem] text-texto-tenue', className)}>
        <Girador className="size-3.5" />
        Comprobando la API…
      </p>
    )
  }

  if (salud.isError) {
    return (
      <div
        role="status"
        className={cn(
          'rounded-[var(--radius-borde)] border border-peligro-borde bg-peligro-suave px-3.5 py-3',
          className,
        )}
      >
        <div className="flex items-start gap-2.5">
          <Punto className="mt-1.5 bg-peligro" />
          <div className="min-w-0 text-[0.8125rem]">
            <p className="font-medium text-peligro">API no disponible</p>
            <p className="mt-0.5 leading-relaxed text-texto-suave">
              {mensajeParaUsuario(salud.error)}
            </p>
          </div>
        </div>

        <Boton
          tamano="sm"
          className="mt-2.5 ml-[1.125rem]"
          icono={<IconoActualizar className="size-4" />}
          cargando={salud.isFetching}
          onClick={() => {
            void salud.refetch()
          }}
        >
          Reintentar
        </Boton>
      </div>
    )
  }

  return (
    <p className={cn('flex items-center gap-2 text-[0.8125rem] text-texto-suave', className)}>
      <Punto className="bg-exito" />
      <span>
        <span className="font-medium text-texto">
          {/* En modo demo no hay API: las doce rutas las responde un Service Worker. */}
          {configuracion.modoDemo ? 'Simulador activo' : 'API disponible'}
        </span>{' '}
        · {salud.data.entorno} · v{salud.data.version}
      </span>
    </p>
  )
}

/** El color no es el único portador del estado: lo dice el texto que va al lado. */
function Punto({ className }: { className?: string }) {
  return <span className={cn('size-2 shrink-0 rounded-full', className)} aria-hidden="true" />
}
