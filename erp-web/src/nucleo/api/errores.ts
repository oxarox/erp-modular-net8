import type {
  DetalleStockInsuficiente,
  DetalleValidacion,
  ErrorCampo,
  FamiliaError,
  RespuestaError,
} from '@/nucleo/api/contratos'

/**
 * Traducción del sobre de error de la API a algo con lo que la interfaz pueda
 * decidir.
 *
 * La regla la fija el backend y aquí solo se respeta: **se reacciona al
 * `errorCode`, nunca al texto del mensaje**. Reformular un mensaje en español no
 * debe romper una pantalla. Ver docs/codigos-error.md.
 */

/** Códigos transversales del borde HTTP (`CodigosErrorApi`). */
export const CODIGOS_API = {
  noAutenticado: 'API_001',
  sinPermiso: 'API_002',
  recursoNoEncontrado: 'API_003',
  errorInterno: 'API_004',
  empresaNoResuelta: 'API_005',
  cuerpoInvalido: 'API_006',
  parametroInvalido: 'API_007',
  conflictoDeEstado: 'API_008',
  servicioDatosNoDisponible: 'API_009',
} as const

/** Códigos de autenticación (`CodigosErrorAutenticacion`). */
export const CODIGOS_AUTENTICACION = {
  credencialesInvalidas: 'AUTH_001',
  usuarioInactivo: 'AUTH_002',
  empresaInactiva: 'AUTH_003',
  tokenRefrescoInvalido: 'AUTH_004',
  tokenRefrescoExpirado: 'AUTH_005',
  sesionRevocada: 'AUTH_006',
  correoRequerido: 'AUTH_007',
  contrasenaRequerida: 'AUTH_008',
} as const

/** Códigos del módulo de marcas (`CodigosErrorMarcas`). */
export const CODIGOS_MARCAS = {
  requerido: 'MARCA_001',
  noSoloEspacios: 'MARCA_002',
  duplicado: 'MARCA_003',
  noEncontrado: 'MARCA_004',
  longitudMinima: 'MARCA_005',
  longitudMaxima: 'MARCA_006',
  creacionFallida: 'MARCA_007',
  actualizacionFallida: 'MARCA_008',
  desactivacionFallida: 'MARCA_009',
  entidadInactiva: 'MARCA_010',
} as const

/**
 * Códigos del módulo de almacenes (`CodigosErrorAlmacenes`).
 *
 * `ALMA_001` lo devuelve también `buscar-productos` cuando el filtro `almacenId`
 * no es de la empresa del token. Importa que sea un 404 y no una lista con saldo
 * cero: «no queda» y «ese almacén no es tuyo» son afirmaciones distintas, y la
 * primera sería falsa. El front la trata limpiando el almacén recordado.
 */
export const CODIGOS_ALMACENES = {
  noEncontrado: 'ALMA_001',
} as const

/** Códigos del módulo de ventas (`CodigosErrorVentas`). */
export const CODIGOS_VENTAS = {
  sinLineas: 'VENTA_001',
  productoNoEncontrado: 'VENTA_002',
  productoInactivo: 'VENTA_003',
  stockInsuficiente: 'VENTA_004',
  cantidadInvalida: 'VENTA_005',
  descuentoInvalido: 'VENTA_006',
  metodoPagoInvalido: 'VENTA_007',
  almacenNoEncontrado: 'VENTA_008',
  clienteNoEncontrado: 'VENTA_009',
  noEncontrada: 'VENTA_010',
  yaAnulada: 'VENTA_011',
  registroFallido: 'VENTA_012',
} as const

/**
 * Un error devuelto por la API, ya normalizado.
 *
 * Existe como clase y no como objeto suelto para que TanStack Query, los
 * `catch` y los `ErrorBoundary` puedan distinguirlo de un fallo de red con un
 * `instanceof` en vez de inspeccionar propiedades.
 */
export class ErrorApi extends Error {
  readonly estado: number
  readonly familia: FamiliaError | string
  readonly codigo: string
  readonly traceId: string
  readonly detalles: RespuestaError['details']

  constructor(estado: number, sobre: RespuestaError) {
    super(sobre.message)
    this.name = 'ErrorApi'
    this.estado = estado
    this.familia = sobre.code
    this.codigo = sobre.errorCode
    this.traceId = sobre.traceId
    this.detalles = sobre.details ?? null
  }

  get esValidacion(): boolean {
    return this.familia === 'validation_error'
  }

  get esNoAutenticado(): boolean {
    return this.estado === 401
  }

  get esProhibido(): boolean {
    return this.estado === 403
  }

  get esNoEncontrado(): boolean {
    return this.estado === 404
  }

  get esConflicto(): boolean {
    return this.estado === 409
  }

  /** 503 y 500 son reintentables; un 400 no lo es por más veces que se envíe. */
  get esReintentable(): boolean {
    return this.estado >= 500
  }

  /** Errores por campo, si el sobre los trae. Vacío en cualquier otro caso. */
  get erroresDeCampo(): ErrorCampo[] {
    const detalles = this.detalles as DetalleValidacion | null

    return Array.isArray(detalles?.errors) ? detalles.errors : []
  }

  /** Detalle tipado de `VENTA_004`, cuando el error es ese. */
  get detalleStock(): DetalleStockInsuficiente | null {
    if (this.codigo !== CODIGOS_VENTAS.stockInsuficiente) {
      return null
    }

    const detalles = this.detalles as DetalleStockInsuficiente | null

    return typeof detalles?.disponible === 'number' ? detalles : null
  }
}

/** La petición nunca llegó al servidor: DNS, CORS, red caída, servidor apagado. */
export class ErrorDeRed extends Error {
  readonly causaOriginal: unknown

  constructor(causaOriginal: unknown) {
    super(
      'No se pudo contactar a la API. Verifique que esté corriendo y que el origen esté autorizado por CORS.',
    )
    this.name = 'ErrorDeRed'
    this.causaOriginal = causaOriginal
  }
}

/** Comprueba que un objeto cualquiera tenga la forma del sobre de error. */
export function esSobreDeError(valor: unknown): valor is RespuestaError {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const posible = valor as Partial<RespuestaError>

  return typeof posible.message === 'string' && typeof posible.errorCode === 'string'
}

/**
 * Convierte los errores por campo en un diccionario apto para un formulario.
 *
 * FluentValidation nombra las propiedades como en C# (`Nombre`,
 * `Lineas[0].Cantidad`), así que se normaliza la inicial a minúscula para que
 * coincida con el nombre del campo en el formulario. El índice se conserva:
 * `Lineas[0].Cantidad` queda como `lineas[0].cantidad`, que es lo que necesita
 * la pantalla de venta para marcar la línea exacta.
 */
export function erroresPorCampo(error: unknown): Record<string, string> {
  if (!(error instanceof ErrorApi)) {
    return {}
  }

  const mapa: Record<string, string> = {}

  for (const campo of error.erroresDeCampo) {
    const clave = campo.campo
      .split('.')
      .map(parte => parte.charAt(0).toLowerCase() + parte.slice(1))
      .join('.')

    // Se queda con el primero: FluentValidation corta en el primer fallo por campo
    // (CascadeMode.Stop), pero un objeto anidado puede repetir la ruta.
    mapa[clave] ??= campo.mensaje
  }

  return mapa
}

/**
 * Mensaje listo para mostrar.
 *
 * El backend ya devuelve textos en español aptos para el usuario final, así que
 * lo normal es respetarlos. Solo se reescriben los casos en que el mensaje
 * genérico del servidor no le dice a la persona qué hacer a continuación.
 */
export function mensajeParaUsuario(error: unknown): string {
  if (error instanceof ErrorDeRed) {
    return error.message
  }

  if (!(error instanceof ErrorApi)) {
    return error instanceof Error && error.message
      ? error.message
      : 'Ocurrió un error inesperado.'
  }

  switch (error.codigo) {
    case CODIGOS_API.sinPermiso:
      return 'Su usuario no tiene el permiso necesario para esta operación.'
    case CODIGOS_API.servicioDatosNoDisponible:
      return 'La base de datos no está respondiendo. Vuelva a intentarlo en unos instantes.'
    case CODIGOS_AUTENTICACION.sesionRevocada:
    case CODIGOS_AUTENTICACION.tokenRefrescoExpirado:
      return 'Su sesión expiró. Vuelva a iniciar sesión.'
    default:
      return error.message
  }
}
