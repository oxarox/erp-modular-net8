import { createContext, use, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { alCaerLaSesion, cerrarSesion as cerrarSesionHttp, iniciarSesionHttp, restaurarSesion } from '@/nucleo/api/cliente'
import { almacenSesion } from '@/nucleo/autenticacion/almacenSesion'
import type { Sesion } from '@/nucleo/autenticacion/almacenSesion'

/**
 * Puente entre el almacén de sesión (que vive fuera de React) y el árbol de
 * componentes.
 *
 * No guarda una copia del estado: `useSyncExternalStore` lee del almacén, de
 * modo que cuando el cliente HTTP renueva el token en medio de una petición, la
 * interfaz se entera sin que nadie tenga que sincronizar dos estados.
 */

interface ValorSesion {
  sesion: Sesion | null
  autenticado: boolean
  /** Verdadero mientras se canjea el token de refresco guardado, al arrancar. */
  restaurando: boolean
  iniciarSesion: (correo: string, contrasena: string) => Promise<void>
  cerrarSesion: () => void
  tienePermiso: (permiso: string) => boolean
  /** Verdadero si tiene al menos uno de los permisos indicados. */
  tieneAlgunPermiso: (...permisos: string[]) => boolean
}

const ContextoSesion = createContext<ValorSesion | null>(null)

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const sesion = useSyncExternalStore(almacenSesion.subscribe, almacenSesion.obtener, () => null)
  const [restaurando, setRestaurando] = useState(() => almacenSesion.obtenerTokenRefresco() !== null)

  // Al arrancar se canjea el token de refresco guardado. Es lo que hace que
  // recargar la página no obligue a volver a escribir la contraseña, aun cuando
  // el token de acceso solo vivía en memoria.
  useEffect(() => {
    // `restaurando` ya nace en false cuando no hay token guardado: sin nada que
    // canjear, no hay nada que esperar.
    if (almacenSesion.obtenerTokenRefresco() === null) {
      return
    }

    let vigente = true

    void restaurarSesion().finally(() => {
      if (vigente) {
        setRestaurando(false)
      }
    })

    return () => {
      vigente = false
    }
  }, [])

  // El cliente HTTP avisa cuando ya no puede renovar. Aquí solo hace falta
  // apagar el indicador de restauración; el almacén ya se limpió solo.
  useEffect(() => alCaerLaSesion(() => setRestaurando(false)), [])

  const iniciarSesion = useCallback(async (correo: string, contrasena: string) => {
    await iniciarSesionHttp(correo, contrasena)
  }, [])

  const valor = useMemo<ValorSesion>(
    () => ({
      sesion,
      autenticado: sesion !== null,
      restaurando,
      iniciarSesion,
      cerrarSesion: cerrarSesionHttp,
      tienePermiso: (permiso: string) => sesion?.permisos.includes(permiso) ?? false,
      tieneAlgunPermiso: (...permisos: string[]) =>
        permisos.some(permiso => sesion?.permisos.includes(permiso) ?? false),
    }),
    [sesion, restaurando, iniciarSesion],
  )

  return <ContextoSesion value={valor}>{children}</ContextoSesion>
}

export function useSesion(): ValorSesion {
  const contexto = use(ContextoSesion)

  if (!contexto) {
    throw new Error('useSesion debe usarse dentro de <ProveedorSesion>.')
  }

  return contexto
}
