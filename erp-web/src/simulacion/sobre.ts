import type { ErrorCampo, RespuestaPaginada } from '@/nucleo/api/contratos'
import { CODIGOS_API } from '@/nucleo/api/errores'
import { crearAleatorio, hashTexto } from '@/simulacion/aleatorio'

/**
 * El borde HTTP del simulador: sobre de error, paginación, cabeceras y lectura
 * de parámetros.
 *
 * Todo lo que aquí se replica sale de tres archivos del backend y no de la
 * intuición: `ERP.Api/Contracts/Comun/RespuestaError.cs` (las familias y los
 * códigos por defecto), `ERP.Aplicacion/Comun/Paginacion/SolicitudPaginada.cs`
 * (la normalización) e `IntermediarioCorrelacionRequest` (la cabecera). Si el
 * simulador se apartara de ellos, la demo estaría mintiendo sobre el backend
 * que dice representar.
 */

/** `IntermediarioCorrelacionRequest.Cabecera`. Viaja en TODA respuesta, también en las de error. */
export const CABECERA_CORRELACION = 'X-Correlacion-Id'

// El identificador de correlación también se sortea con semilla fija: aparece en
// pantalla —la sección del sobre de error lo muestra— y un valor distinto en cada
// recarga volvería a romper la reproducibilidad de las capturas.
const azarCorrelacion = crearAleatorio(hashTexto('correlacion'))

/**
 * Identificador de correlación con la forma exacta del backend: el `Guid.NewGuid().ToString("N")`
 * del intermediario son treinta y dos hexadecimales en minúscula, sin guiones.
 */
export function nuevoTraceId(): string {
  let texto = ''

  while (texto.length < 32) {
    texto += azarCorrelacion.entero(0, 0xffff).toString(16).padStart(4, '0')
  }

  return texto.slice(0, 32)
}

/**
 * Serializa omitiendo los nulos.
 *
 * No es una preferencia estética: el backend configura
 * `DefaultIgnoreCondition = WhenWritingNull` (Program.cs), así que una propiedad
 * nula **no aparece** en el JSON. Por eso los contratos del cliente declaran los
 * campos opcionales con `?` y no solo como `| null`. Emitir `"descripcion": null`
 * aquí dejaría sin ejercitar justamente ese camino.
 */
function serializar(cuerpo: unknown): string {
  return JSON.stringify(cuerpo, (_clave, valor: unknown) => (valor === null ? undefined : valor))
}

function respuestaJson(cuerpo: unknown, traceId: string, estado: number): Response {
  return new Response(serializar(cuerpo), {
    status: estado,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      [CABECERA_CORRELACION]: traceId,
    },
  })
}

export function ok(cuerpo: unknown, traceId: string): Response {
  return respuestaJson(cuerpo, traceId, 200)
}

export function creado(cuerpo: unknown, traceId: string, ubicacion?: string): Response {
  const respuesta = respuestaJson(cuerpo, traceId, 201)

  if (ubicacion) {
    respuesta.headers.set('Location', ubicacion)
  }

  return respuesta
}

// ── Sobre de error ──────────────────────────────────────────────────────────

/**
 * Arma el sobre igual que `RespuestaError.Crear`.
 *
 * La regla que hay que respetar sí o sí: **`errorCode` nunca viaja null**. Cada
 * familia tiene su código por defecto y, si el caso de uso no aporta uno propio,
 * se usa ese. Un cliente que recibe `null` no puede decidir nada y termina
 * comparando el texto del mensaje, que es exactamente lo que el contrato evita.
 */
function sobre(
  estado: number,
  traceId: string,
  code: string,
  mensaje: string,
  codigoPorDefecto: string,
  codigoError?: string,
  detalles?: unknown,
): Response {
  const errorCode = codigoError && codigoError.trim() !== '' ? codigoError : codigoPorDefecto

  return respuestaJson(
    {
      traceId,
      code,
      message: mensaje,
      details: detalles ?? null,
      errorCode,
    },
    traceId,
    estado,
  )
}

/**
 * 400 con `details.errors`. Los campos se nombran en PascalCase, como los nombra
 * FluentValidation (`Nombre`, `Lineas[0].Cantidad`): `erroresPorCampo` del
 * cliente cuenta con esa forma para bajar la inicial y marcar la línea exacta.
 *
 * Un campo sin código propio hereda el del sobre, igual que `NormalizarCampos`.
 */
export function errorValidacion(
  traceId: string,
  errores: readonly ErrorCampo[],
  codigoError?: string,
): Response {
  const errorCode = codigoError && codigoError.trim() !== '' ? codigoError : CODIGOS_API.cuerpoInvalido

  return sobre(
    400,
    traceId,
    'validation_error',
    'La solicitud contiene campos inválidos.',
    CODIGOS_API.cuerpoInvalido,
    codigoError,
    {
      errors: errores.map(error => ({
        ...error,
        codigo: error.codigo.trim() === '' ? errorCode : error.codigo,
      })),
    },
  )
}

export function errorNoAutenticado(traceId: string, mensaje: string, codigoError?: string): Response {
  return sobre(401, traceId, 'unauthorized', mensaje, CODIGOS_API.noAutenticado, codigoError)
}

export function errorProhibido(traceId: string, mensaje: string, codigoError?: string): Response {
  return sobre(403, traceId, 'forbidden', mensaje, CODIGOS_API.sinPermiso, codigoError)
}

export function errorSolicitudInvalida(
  traceId: string,
  mensaje: string,
  codigoError?: string,
  detalles?: unknown,
): Response {
  return sobre(
    400,
    traceId,
    'bad_request',
    mensaje,
    CODIGOS_API.parametroInvalido,
    codigoError,
    detalles,
  )
}

export function errorNoEncontrado(traceId: string, mensaje: string, codigoError?: string): Response {
  return sobre(404, traceId, 'not_found', mensaje, CODIGOS_API.recursoNoEncontrado, codigoError)
}

export function errorConflicto(traceId: string, mensaje: string, codigoError?: string): Response {
  return sobre(409, traceId, 'conflict', mensaje, CODIGOS_API.conflictoDeEstado, codigoError)
}

/**
 * 500 con el mensaje genérico de `RespuestaError.Interno`.
 *
 * Está aquí porque hay un camino real que llega a él: un descuento de línea
 * mayor al bruto pasa el validador —solo exige que no sea negativo— y lo rechaza
 * `CalculadoraTotalesVenta` con una excepción que el intermediario traduce a 500.
 * La interfaz lo tiene documentado en `VentaTipos.revisarLinea`, y por eso
 * bloquea la línea antes de enviarla.
 */
export function errorInterno(traceId: string, codigoError?: string): Response {
  return sobre(
    500,
    traceId,
    'internal_error',
    'Ocurrió un error inesperado. Si el problema persiste, informe el identificador de correlación.',
    CODIGOS_API.errorInterno,
    codigoError,
  )
}

// ── Paginación ──────────────────────────────────────────────────────────────

export interface Paginacion {
  pagina: number
  tamanoPagina: number
}

const PAGINA_POR_DEFECTO = 1
const TAMANO_POR_DEFECTO = 25
const TAMANO_MAXIMO = 200

/** Espejo literal de `SolicitudPaginada.Normalizar`. */
export function normalizarPaginacion(pagina?: number, tamanoPagina?: number): Paginacion {
  const paginaNormalizada = pagina === undefined || pagina < 1 ? PAGINA_POR_DEFECTO : pagina
  const tamanoBase = tamanoPagina === undefined || tamanoPagina < 1 ? TAMANO_POR_DEFECTO : tamanoPagina

  return {
    pagina: paginaNormalizada,
    tamanoPagina: Math.min(tamanoBase, TAMANO_MAXIMO),
  }
}

/** Forma única de toda lista del sistema (`ResultadoPaginado`). */
export function paginar<T>(items: readonly T[], paginacion: Paginacion): RespuestaPaginada<T> {
  const salto = (paginacion.pagina - 1) * paginacion.tamanoPagina

  return {
    pagina: paginacion.pagina,
    tamanoPagina: paginacion.tamanoPagina,
    total: items.length,
    totalPaginas: Math.ceil(items.length / paginacion.tamanoPagina),
    items: items.slice(salto, salto + paginacion.tamanoPagina),
  }
}

// ── Fechas en el cable ──────────────────────────────────────────────────────

/**
 * Fecha CON sufijo `Z`.
 *
 * Es la forma que sale cuando el valor lo produjo el reloj del servidor:
 * `RelojSistema.AhoraUtc` devuelve `DateTime.UtcNow`, cuyo `Kind` es `Utc`, y
 * `System.Text.Json` escribe entonces la `Z`. Le corresponde a `fechaUtc` de
 * `/api/salud` y a las dos expiraciones de la sesión.
 */
export function aIsoUtc(fecha: Date): string {
  return fecha.toISOString()
}

/**
 * Fecha SIN sufijo `Z`, que es lo que el backend real manda para todo lo que
 * viene de la base de datos.
 *
 * Un `datetime2` de SQL Server se materializa con `Kind = Unspecified`, y
 * `System.Text.Json` omite entonces el desfase: `"2026-09-15T14:30:00"`. Como en
 * ECMAScript una fecha-hora sin desfase se interpreta en hora **local**, el
 * cliente tiene `fechaUtcDesdeApi` para no desplazar cada venta según el huso del
 * navegador. Emitirlas aquí con `Z` haría que ese código nunca se ejercitara y
 * ocultaría justo el error que previene, así que se emiten como las emite el
 * servidor: se toman los componentes **UTC** del instante y se escriben sin zona.
 */
export function aIsoSinZ(fecha: Date): string {
  return fecha.toISOString().slice(0, 19)
}

// ── Lectura de parámetros ───────────────────────────────────────────────────

export function textoDe(url: URL, clave: string): string | undefined {
  const valor = url.searchParams.get(clave)

  return valor === null || valor.trim() === '' ? undefined : valor
}

/**
 * El enlazador de ASP.NET acepta `true`/`false` sin distinguir mayúsculas. Se
 * admiten además `1` y `0` por tolerancia; el cliente manda `String(booleano)`,
 * así que en la práctica siempre llega la primera forma.
 */
export function booleanoDe(url: URL, clave: string): boolean | undefined {
  const valor = textoDe(url, clave)?.toLowerCase()

  if (valor === 'true' || valor === '1') {
    return true
  }

  if (valor === 'false' || valor === '0') {
    return false
  }

  return undefined
}

export function enteroDe(url: URL, clave: string): number | undefined {
  const valor = textoDe(url, clave)

  if (valor === undefined) {
    return undefined
  }

  const convertido = Number.parseInt(valor, 10)

  return Number.isNaN(convertido) ? undefined : convertido
}

/**
 * Lee una fecha del query string.
 *
 * El cliente manda `2026-09-15T00:00:00` (ver `aParametroFecha`) y el backend la
 * enlaza a un `DateTime` sin zona que compara contra columnas guardadas en UTC:
 * en la práctica el literal **es** UTC. Aquí se fuerza esa lectura agregando la
 * `Z` cuando falta, que es la misma trampa que `fechaUtcDesdeApi` resuelve en el
 * otro sentido.
 */
export function fechaDe(url: URL, clave: string): Date | undefined {
  const valor = textoDe(url, clave)

  if (valor === undefined) {
    return undefined
  }

  const tieneZona = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(valor)
  const fecha = new Date(tieneZona ? valor : `${valor}Z`)

  return Number.isNaN(fecha.getTime()) ? undefined : fecha
}

/**
 * El identificador de una ruta `.../{id:long}`.
 *
 * La restricción `:long` del backend hace que `/obtener-marca-por-id/abc` ni
 * siquiera llegue al controlador: no hay ruta que coincida y ASP.NET responde
 * 404. Devolver `null` aquí produce ese mismo 404.
 */
export function idDeRuta(
  parametros: Record<string, string | readonly string[] | undefined>,
): number | null {
  const crudo = parametros['id']
  const texto = Array.isArray(crudo) ? crudo[0] : (crudo as string | undefined)

  if (texto === undefined || !/^-?\d+$/.test(texto)) {
    return null
  }

  return Number.parseInt(texto, 10)
}
