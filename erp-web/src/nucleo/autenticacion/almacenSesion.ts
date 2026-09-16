import type { RespuestaSesion } from '@/nucleo/api/contratos'

/**
 * Estado de la sesión, fuera de React.
 *
 * Vive fuera del árbol de componentes por una razón concreta: el cliente HTTP
 * necesita leer el token en cada petición y escribirlo cuando lo renueva, y el
 * cliente HTTP no es un componente. Si la sesión viviera solo en un contexto de
 * React, habría que pasarle el token a cada llamada o mantener una copia
 * paralela —y dos copias del token se desincronizan el día que expira una.
 *
 * React se suscribe a este almacén con `useSyncExternalStore`, así que sigue
 * habiendo una única fuente de verdad.
 *
 * ── Dónde queda cada token ──────────────────────────────────────────────────
 * - **Acceso: solo en memoria.** Vive 30 minutos y da acceso a todo. Guardarlo
 *   en `localStorage` lo deja legible por cualquier script inyectado en la
 *   página, así que se paga el costo de perderlo al recargar.
 * - **Refresco: en `localStorage`.** Sin él, recargar la página cerraría la
 *   sesión. Es de un solo uso —el backend lo rota en cada canje— y puede
 *   revocarse subiendo `auth_version` del usuario, que invalida además todos los
 *   accesos vivos. Ver docs/seguridad-y-rbac.md.
 */

export type Sesion = RespuestaSesion

const CLAVE_REFRESCO = 'erp.refresco'

type Escucha = () => void

let sesionActual: Sesion | null = null
const escuchas = new Set<Escucha>()

function notificar(): void {
  for (const escucha of escuchas) {
    escucha()
  }
}

/** `localStorage` puede lanzar: modo privado, cookies bloqueadas, cuota llena. */
function leerAlmacenamiento(clave: string): string | null {
  try {
    return window.localStorage.getItem(clave)
  } catch {
    return null
  }
}

function escribirAlmacenamiento(clave: string, valor: string | null): void {
  try {
    if (valor === null) {
      window.localStorage.removeItem(clave)
    } else {
      window.localStorage.setItem(clave, valor)
    }
  } catch {
    // Sin almacenamiento persistente la sesión dura lo que dure la pestaña.
    // Es una degradación aceptable; romper la aplicación no lo sería.
  }
}

export const almacenSesion = {
  subscribe(escucha: Escucha): () => void {
    escuchas.add(escucha)

    return () => {
      escuchas.delete(escucha)
    }
  },

  /**
   * Devuelve la misma referencia mientras la sesión no cambie: `useSyncExternalStore`
   * compara por identidad y un objeto nuevo en cada llamada provocaría un bucle
   * infinito de renderizado.
   */
  obtener(): Sesion | null {
    return sesionActual
  },

  establecer(sesion: Sesion): void {
    sesionActual = sesion
    escribirAlmacenamiento(CLAVE_REFRESCO, sesion.tokenRefresco)
    notificar()
  },

  limpiar(): void {
    sesionActual = null
    escribirAlmacenamiento(CLAVE_REFRESCO, null)
    notificar()
  },

  obtenerTokenAcceso(): string | null {
    return sesionActual?.tokenAcceso ?? null
  },

  /**
   * Token de refresco disponible: el de la sesión en memoria o, tras recargar la
   * página, el que quedó guardado.
   */
  obtenerTokenRefresco(): string | null {
    return sesionActual?.tokenRefresco ?? leerAlmacenamiento(CLAVE_REFRESCO)
  },

  tienePermiso(permiso: string): boolean {
    return sesionActual?.permisos.includes(permiso) ?? false
  },
}

/** Catálogo de permisos, espejo de `ERP.Api/Autorizacion/Permisos.cs`. */
export const PERMISOS = {
  marcas: { ver: 'marcas.ver', gestionar: 'marcas.gestionar' },
  ventas: { ver: 'ventas.ver', registrar: 'ventas.registrar', anular: 'ventas.anular' },
  productos: { ver: 'productos.ver' },
  almacenes: { ver: 'almacenes.ver' },
  reportes: { ver: 'reportes.ver' },
} as const
