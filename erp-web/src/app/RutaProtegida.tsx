import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Girador } from '@/componentes/Boton'
import { EstadoVacio } from '@/componentes/Superficie'
import { IconoEscudo } from '@/componentes/Iconos'
import { useSesion } from '@/nucleo/autenticacion/ProveedorSesion'

/**
 * Guarda de ruta.
 *
 * Tres casos, en este orden:
 *
 * 1. **Restaurando.** Al recargar la página aún se está canjeando el token de
 *    refresco guardado. Redirigir aquí mandaría al login a alguien con sesión
 *    válida, así que se espera.
 * 2. **Sin sesión.** Se va al login recordando a dónde quería ir, para volver
 *    ahí después de entrar.
 * 3. **Sin el permiso.** Se muestra el mismo mensaje que daría el servidor. Esto
 *    es cortesía de interfaz: quien manda es el 403 con `API_002` del backend,
 *    que se produce igual si alguien llega por otra vía.
 */
export function RutaProtegida({
  permiso,
  children,
}: {
  permiso?: string
  children: ReactNode
}) {
  const { autenticado, restaurando, tienePermiso } = useSesion()
  const ubicacion = useLocation()

  if (restaurando) {
    return <PantallaCarga />
  }

  if (!autenticado) {
    return <Navigate to="/sesion" state={{ destino: ubicacion.pathname + ubicacion.search }} replace />
  }

  if (permiso && !tienePermiso(permiso)) {
    return (
      <EstadoVacio
        icono={<IconoEscudo />}
        titulo="No cuenta con el permiso requerido"
        descripcion={
          <>
            Esta sección exige el permiso{' '}
            <code className="font-mono text-[0.75rem] text-texto-suave">{permiso}</code>. El
            servidor responde <code className="font-mono text-[0.75rem]">403 · API_002</code> a
            quien no lo tiene.
          </>
        }
      />
    )
  }

  return <>{children}</>
}

export function PantallaCarga({ mensaje = 'Restaurando sesión…' }: { mensaje?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-fondo">
      <div className="flex flex-col items-center gap-3 text-texto-tenue">
        <Girador className="size-6" />
        <p className="text-sm">{mensaje}</p>
      </div>
    </div>
  )
}
