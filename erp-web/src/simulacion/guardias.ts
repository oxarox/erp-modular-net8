import { CODIGOS_API } from '@/nucleo/api/errores'
import { hashTexto } from '@/simulacion/aleatorio'
import type { IdentidadDemo } from '@/simulacion/sesiones'
import { resolverAcceso } from '@/simulacion/sesiones'
import { errorNoAutenticado, errorProhibido, nuevoTraceId } from '@/simulacion/sobre'

/**
 * Lo que rodea a cada manejador: la latencia, el token, el permiso y la lectura
 * del cuerpo.
 *
 * Está fuera de `manejadores.ts` para que ese archivo se lea como lo que es —la
 * traducción de los doce casos de uso— sin que el andamiaje se mezcle con las
 * reglas de negocio. Es el mismo reparto que hace el backend entre los
 * intermediarios del borde y los controladores.
 */

/**
 * Parámetros de ruta tal como los entrega MSW.
 *
 * Llevan `undefined` en el valor porque `noUncheckedIndexedAccess` está activo y
 * un `:id` que la ruta no capturó no está ahí. Es exactamente el caso que
 * `idDeRuta` tiene que contemplar.
 */
export type ParametrosRuta = Record<string, string | readonly string[] | undefined>

export interface ContextoPeticion {
  peticion: Request
  url: URL
  parametros: ParametrosRuta
  traceId: string
}

export interface ContextoAutenticado extends ContextoPeticion {
  identidad: IdentidadDemo
}

/** La información que MSW entrega al resolutor, reducida a lo que aquí se usa. */
interface InfoMsw {
  request: Request
  params: ParametrosRuta
}

type Resolutor<T extends ContextoPeticion> = (contexto: T) => Promise<Response> | Response

// ── Latencia ────────────────────────────────────────────────────────────────

/**
 * Retardo pequeño y reproducible, entre 60 y 220 ms.
 *
 * Sin latencia la interfaz parece no tener estados de carga: los esqueletos, los
 * botones ocupados y el `placeholderData` de las tablas nunca llegan a verse, y
 * se pierde la mitad del trabajo de esas pantallas. Se deriva de la ruta con un
 * hash y no de `Math.random()` para que cada endpoint tarde siempre lo mismo y
 * la demo no parezca inestable.
 */
function retardoDe(metodo: string, ruta: string): number {
  return 60 + (hashTexto(`${metodo} ${ruta}`) % 161)
}

function esperar(milisegundos: number): Promise<void> {
  return new Promise(resolver => {
    setTimeout(resolver, milisegundos)
  })
}

// ── Envoltorios ─────────────────────────────────────────────────────────────

export function anonimo(resolutor: Resolutor<ContextoPeticion>) {
  return async ({ request, params }: InfoMsw): Promise<Response> => {
    const url = new URL(request.url)

    await esperar(retardoDe(request.method, url.pathname))

    return resolutor({ peticion: request, url, parametros: params, traceId: nuevoTraceId() })
  }
}

/**
 * Exige token y permiso antes de dejar pasar.
 *
 * Una demo donde todo está permitido no demuestra el RBAC, que es media
 * arquitectura del proyecto. Los dos rechazos son los del backend, literalmente:
 * `OnChallenge` responde 401 con `API_001` tanto si falta el token como si ya no
 * sirve —a un desconocido no se le dice en qué falló—, y `OnForbidden` responde
 * 403 con `API_002` cuando el token es bueno pero le falta el permiso.
 */
export function protegido(permiso: string, resolutor: Resolutor<ContextoAutenticado>) {
  return anonimo(contexto => {
    const acceso = resolverAcceso(contexto.peticion.headers.get('Authorization'))

    if (acceso.estado !== 'valido') {
      return errorNoAutenticado(
        contexto.traceId,
        'Se requiere un token de acceso válido.',
        CODIGOS_API.noAutenticado,
      )
    }

    if (!acceso.identidad.permisos.includes(permiso)) {
      return errorProhibido(
        contexto.traceId,
        'No cuenta con el permiso requerido para esta operación.',
        CODIGOS_API.sinPermiso,
      )
    }

    return resolutor({ ...contexto, identidad: acceso.identidad })
  })
}

// ── Lectura del cuerpo ──────────────────────────────────────────────────────

/**
 * Cuerpo JSON de la petición.
 *
 * Un cuerpo ilegible se trata como uno vacío, de modo que el veredicto lo dé la
 * validación de campos. El backend lo rechazaría antes, con `API_006`; a esa
 * diferencia solo se llega enviando JSON roto a mano.
 */
export async function leerCuerpo(peticion: Request): Promise<Record<string, unknown>> {
  try {
    const cuerpo: unknown = await peticion.json()

    return typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export function cadena(cuerpo: Record<string, unknown>, clave: string): string {
  const valor = cuerpo[clave]

  return typeof valor === 'string' ? valor : ''
}

export function numero(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : 0
}

/** `bool?` del contrato: ausente y nulo son lo mismo, y `false` no es ninguno de los dos. */
export function booleanoOpcional(
  cuerpo: Record<string, unknown>,
  clave: string,
): boolean | undefined {
  const valor = cuerpo[clave]

  return typeof valor === 'boolean' ? valor : undefined
}
