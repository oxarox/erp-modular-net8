/**
 * Contratos de la API, transcritos uno a uno desde `ERP.Api/Contracts/`.
 *
 * Los nombres están en español y en camelCase porque así salen: ASP.NET Core
 * serializa con `JsonNamingPolicy.CamelCase`, de modo que el record
 * `RespuestaSesion(string TokenAcceso, ...)` viaja como `{ "tokenAcceso": ... }`.
 *
 * Dos detalles que se heredan de la configuración del servidor y que explican la
 * forma de estos tipos:
 *
 * 1. `DefaultIgnoreCondition = WhenWritingNull`: las propiedades nulas **no
 *    aparecen** en el JSON. Por eso los campos opcionales se declaran con `?` y
 *    no solo como `| null`.
 * 2. Las fechas son `DateTime` de .NET. Cuando vienen de la base de datos su
 *    `Kind` es `Unspecified` y el JSON sale sin sufijo `Z` —ver
 *    `nucleo/formato/fechas.ts`, que se encarga de no interpretarlas como hora
 *    local.
 *
 * Si una fila de `docs/endpoints.md` cambia, este archivo cambia en la misma
 * entrega. Es el único punto de contacto con el servidor.
 */

// ── Transversales ───────────────────────────────────────────────────────────

/**
 * Forma única de toda respuesta de lista del sistema
 * (`ERP.Api/Contracts/Comun/RespuestaPaginada.cs`).
 */
export interface RespuestaPaginada<T> {
  pagina: number
  tamanoPagina: number
  total: number
  totalPaginas: number
  items: T[]
}

/** Un error de validación asociado a un campo concreto de la solicitud. */
export interface ErrorCampo {
  /** Ruta de la propiedad tal como la nombra FluentValidation: `Nombre`, `Lineas[0].Cantidad`. */
  campo: string
  /** Código del catálogo: `MARCA_001`, `VENTA_005`… */
  codigo: string
  mensaje: string
}

/** Detalle que acompaña a un `validation_error`. */
export interface DetalleValidacion {
  errors: ErrorCampo[]
}

/** Detalle que acompaña a `VENTA_004` (stock insuficiente). */
export interface DetalleStockInsuficiente {
  id: number
  disponible: number
  solicitado: number
}

/**
 * Sobre único de error (`ERP.Api/Contracts/Comun/RespuestaError.cs`).
 * Todos los errores del sistema salen con esta forma: el cliente escribe UN
 * manejador de errores, no uno por endpoint.
 */
export interface RespuestaError {
  /** Identificador de correlación, para cruzar con los logs del servidor. */
  traceId: string
  /** Familia del error: `validation_error`, `not_found`, `conflict`… */
  code: FamiliaError | string
  /** Texto en español, apto para mostrar al usuario final. */
  message: string
  details?: DetalleValidacion | DetalleStockInsuficiente | Record<string, unknown> | null
  /** Código del catálogo `MODULO_###`. Contrato duro del backend: nunca viaja null. */
  errorCode: string
}

export type FamiliaError =
  | 'validation_error'
  | 'unauthorized'
  | 'forbidden'
  | 'bad_request'
  | 'not_found'
  | 'conflict'
  | 'service_unavailable'
  | 'internal_error'

// ── Autenticación ───────────────────────────────────────────────────────────

export interface SolicitudIniciarSesion {
  correo: string
  contrasena: string
}

export interface SolicitudRefrescarSesion {
  tokenRefresco: string
}

export interface RespuestaSesion {
  tokenAcceso: string
  accesoExpiraUtc: string
  tokenRefresco: string
  refrescoExpiraUtc: string
  usuarioId: number
  nombreCompleto: string
  empresaId: number
  /** Permisos `modulo.accion` que el token trae firmados. Es la fuente de la navegación. */
  permisos: string[]
}

// ── Marcas ──────────────────────────────────────────────────────────────────

export interface SolicitudBuscarMarcas {
  criterio?: string
  soloActivas?: boolean
  pagina?: number
  tamanoPagina?: number
}

export interface SolicitudCrearMarca {
  nombre: string
  descripcion?: string | null
  activo?: boolean
}

export type SolicitudActualizarMarca = SolicitudCrearMarca

export interface RespuestaMarca {
  id: number
  nombre: string
  descripcion?: string | null
  activo: boolean
}

export interface RespuestaOperacionMarca {
  exitoso: boolean
  mensaje: string
  id: number
}

// ── Productos (catálogo de solo lectura) ────────────────────────────────────

export interface SolicitudBuscarProductos {
  criterio?: string
  soloActivos?: boolean
  /** Cuando viene, la respuesta trae el stock disponible en ese almacén. */
  almacenId?: number
  pagina?: number
  tamanoPagina?: number
}

export interface RespuestaProducto {
  id: number
  sku: string
  nombre: string
  marca?: string | null
  categoria?: string | null
  precioVenta: number
  controlaInventario: boolean
  activo: boolean
  /** `null` si el producto no controla inventario o si no se pidió un almacén. */
  stockDisponible?: number | null
}

// ── Almacenes ───────────────────────────────────────────────────────────────

export interface RespuestaAlmacen {
  id: number
  nombre: string
  ubicacion?: string | null
  esPredeterminado: boolean
  activo: boolean
}

// ── Ventas ──────────────────────────────────────────────────────────────────

export const ESTADOS_VENTA = ['COMPLETADA', 'ANULADA'] as const
export type EstadoVenta = (typeof ESTADOS_VENTA)[number]

/** Espejo de `Ventas:MetodosPagoPermitidos` en appsettings.json. */
export const METODOS_PAGO = ['EFECTIVO', 'DEBITO', 'CREDITO', 'TRANSFERENCIA'] as const
export type MetodoPago = (typeof METODOS_PAGO)[number]

export interface SolicitudBuscarVentas {
  /** Fecha UTC, inclusiva. */
  desde?: string
  /** Fecha UTC, inclusiva del día completo (el servidor la lleva a las 23:59:59.999). */
  hasta?: string
  estado?: EstadoVenta
  pagina?: number
  tamanoPagina?: number
}

export interface SolicitudLineaVenta {
  productoId: number
  cantidad: number
  descuentoLinea?: number | null
}

export interface SolicitudRegistrarVenta {
  clienteId?: number | null
  almacenId: number
  metodoPago: string
  lineas: SolicitudLineaVenta[]
}

export interface RespuestaVenta {
  id: number
  numero: string
  fechaUtc: string
  estado: string
  metodoPago: string
  total: number
}

export interface RespuestaVentaRegistrada {
  id: number
  /** Folio legible generado por el servidor: `V-20260915-0001`. */
  numero: string
  subtotal: number
  descuento: number
  impuesto: number
  total: number
}

// ── Salud ───────────────────────────────────────────────────────────────────

export interface RespuestaSalud {
  estado: string
  version: string
  entorno: string
  fechaUtc: string
}
