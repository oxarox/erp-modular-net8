import type { RespuestaError, RespuestaSesion } from '@/nucleo/api/contratos'
import { ErrorApi, ErrorDeRed, esSobreDeError } from '@/nucleo/api/errores'
import { almacenSesion } from '@/nucleo/autenticacion/almacenSesion'
import { configuracion } from '@/nucleo/configuracion'

/**
 * Cliente HTTP de la API.
 *
 * Concentra cuatro cosas que, repartidas por la aplicación, se desincronizan:
 * el token, la renovación del token, la traducción del sobre de error y el
 * identificador de correlación. Ninguna pantalla llama a `fetch` directamente.
 */

/** Cabecera de correlación del backend (`IntermediarioCorrelacionRequest.Cabecera`). */
const CABECERA_CORRELACION = 'X-Correlacion-Id'

const RUTA_REFRESCO = '/api/autenticacion/refrescar-sesion'
const RUTA_INICIO_SESION = '/api/autenticacion/iniciar-sesion'

export type ValorConsulta = string | number | boolean | null | undefined

export interface OpcionesPeticion {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Parámetros de query. Los `undefined`, `null` y `''` se omiten. */
  consulta?: Record<string, ValorConsulta>
  cuerpo?: unknown
  senal?: AbortSignal
  /** Desactiva el intento de renovación ante un 401. Lo usan los propios endpoints de sesión. */
  sinRenovacion?: boolean
}

/** Se avisa hacia afuera cuando la sesión muere para que la aplicación redirija al login. */
type EscuchaSesionCaida = () => void
const escuchasSesionCaida = new Set<EscuchaSesionCaida>()

export function alCaerLaSesion(escucha: EscuchaSesionCaida): () => void {
  escuchasSesionCaida.add(escucha)

  return () => {
    escuchasSesionCaida.delete(escucha)
  }
}

function anunciarSesionCaida(): void {
  almacenSesion.limpiar()

  for (const escucha of escuchasSesionCaida) {
    escucha()
  }
}

function construirUrl(ruta: string, consulta?: Record<string, ValorConsulta>): string {
  const url = new URL(configuracion.urlApi + ruta, window.location.origin)

  for (const [clave, valor] of Object.entries(consulta ?? {})) {
    if (valor === undefined || valor === null || valor === '') {
      continue
    }

    url.searchParams.set(clave, String(valor))
  }

  return url.toString()
}

/**
 * Lee el cuerpo de una respuesta fallida.
 *
 * El backend promete que todo error sale con el sobre único, pero un 502 de un
 * proxy intermedio o una caída antes de llegar a ASP.NET devuelven HTML. Por eso
 * se sintetiza un sobre equivalente en vez de dejar que `.json()` reviente y el
 * usuario vea un "Unexpected token <".
 */
async function leerSobreDeError(respuesta: Response): Promise<RespuestaError> {
  const traceId = respuesta.headers.get(CABECERA_CORRELACION) ?? 'sin-correlacion'

  try {
    const cuerpo: unknown = await respuesta.json()

    if (esSobreDeError(cuerpo)) {
      return cuerpo
    }
  } catch {
    // Cuerpo vacío o no-JSON: se cae al sobre sintético de abajo.
  }

  return {
    traceId,
    code: respuesta.status >= 500 ? 'internal_error' : 'bad_request',
    message: `La API respondió ${respuesta.status} ${respuesta.statusText || ''}`.trim(),
    errorCode: respuesta.status >= 500 ? 'API_004' : 'API_007',
    details: null,
  }
}

/**
 * Renovación del token de acceso, deduplicada.
 *
 * Si tres consultas del tablero reciben 401 a la vez, se hace UN canje y las
 * tres esperan el mismo resultado. Sin esta promesa compartida, las tres
 * canjearían el mismo token de refresco y —como el backend lo rota en cada
 * uso— dos de ellas recibirían `AUTH_004` y cerrarían la sesión de un usuario
 * cuya sesión estaba perfectamente viva.
 */
let renovacionEnCurso: Promise<string | null> | null = null

async function canjearRefresco(): Promise<string | null> {
  const tokenRefresco = almacenSesion.obtenerTokenRefresco()

  if (!tokenRefresco) {
    return null
  }

  try {
    const sesion = await peticion<RespuestaSesion>(RUTA_REFRESCO, {
      metodo: 'POST',
      cuerpo: { tokenRefresco },
      sinRenovacion: true,
    })

    almacenSesion.establecer(sesion)

    return sesion.tokenAcceso
  } catch {
    // El refresco también falló: expiró, fue revocado o ya se canjeó.
    return null
  }
}

function renovarAcceso(): Promise<string | null> {
  // La limpieza va en un `.finally()` encadenado y NO en un `try/finally` dentro
  // de `canjearRefresco`. La diferencia importa: el cuerpo de una función async
  // corre de forma síncrona hasta el primer `await`, así que en el camino sin
  // token el `finally` interno se ejecutaría ANTES de que esta asignación
  // terminara, y dejaría aquí una promesa resuelta en null para siempre. El
  // primer 401 después de volver a iniciar sesión cerraría entonces una sesión
  // perfectamente válida. Encadenado, el callback corre en un microtask, que es
  // siempre después.
  renovacionEnCurso ??= canjearRefresco().finally(() => {
    renovacionEnCurso = null
  })

  return renovacionEnCurso
}

/**
 * Ejecuta una petición contra la API.
 *
 * @throws {ErrorApi} cuando el servidor responde con el sobre de error.
 * @throws {ErrorDeRed} cuando la petición no llega a destino.
 */
export async function peticion<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  const { metodo = 'GET', consulta, cuerpo, senal, sinRenovacion = false } = opciones

  const enviar = async (token: string | null): Promise<Response> => {
    const cabeceras = new Headers({ Accept: 'application/json' })

    if (cuerpo !== undefined) {
      cabeceras.set('Content-Type', 'application/json')
    }

    if (token) {
      cabeceras.set('Authorization', `Bearer ${token}`)
    }

    try {
      return await fetch(construirUrl(ruta, consulta), {
        method: metodo,
        headers: cabeceras,
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        signal: senal ?? null,
      })
    } catch (causa) {
      // `fetch` solo rechaza por red, CORS o cancelación. Una cancelación se deja
      // propagar tal cual: TanStack Query la reconoce y no la trata como fallo.
      if (causa instanceof DOMException && causa.name === 'AbortError') {
        throw causa
      }

      throw new ErrorDeRed(causa)
    }
  }

  let respuesta = await enviar(almacenSesion.obtenerTokenAcceso())

  // Un 401 con token de refresco disponible merece exactamente un reintento.
  if (respuesta.status === 401 && !sinRenovacion) {
    const tokenNuevo = await renovarAcceso()

    if (tokenNuevo === null) {
      anunciarSesionCaida()
      throw new ErrorApi(401, await leerSobreDeError(respuesta))
    }

    respuesta = await enviar(tokenNuevo)

    if (respuesta.status === 401) {
      anunciarSesionCaida()
    }
  }

  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, await leerSobreDeError(respuesta))
  }

  // 204 y 205 no traen cuerpo; ningún endpoint actual lo hace, pero leer
  // `.json()` de una respuesta vacía lanza y no se gana nada con asumirlo.
  if (respuesta.status === 204 || respuesta.status === 205) {
    return undefined as T
  }

  return (await respuesta.json()) as T
}

/** Inicio de sesión. Separado porque nunca debe intentar renovar: aún no hay sesión. */
export async function iniciarSesionHttp(
  correo: string,
  contrasena: string,
): Promise<RespuestaSesion> {
  const sesion = await peticion<RespuestaSesion>(RUTA_INICIO_SESION, {
    metodo: 'POST',
    cuerpo: { correo, contrasena },
    sinRenovacion: true,
  })

  almacenSesion.establecer(sesion)

  return sesion
}

/**
 * Restaura la sesión al arrancar, canjeando el token de refresco que quedó
 * guardado. Devuelve `null` si no había ninguno o si ya no sirve.
 */
export async function restaurarSesion(): Promise<RespuestaSesion | null> {
  if (!almacenSesion.obtenerTokenRefresco()) {
    return null
  }

  const token = await renovarAcceso()

  return token === null ? null : almacenSesion.obtener()
}

export function cerrarSesion(): void {
  anunciarSesionCaida()
}
