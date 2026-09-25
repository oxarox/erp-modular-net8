import { PERMISOS } from '@/nucleo/autenticacion/almacenSesion'

/**
 * Lo que esta pantalla sabe del backend sin tener que preguntárselo.
 *
 * Es la transcripción de `docs/endpoints.md`, `docs/codigos-error.md` y
 * `ERP.Api/Autorizacion/Permisos.cs`. Vive en un módulo aparte por la misma
 * razón por la que el backend mantiene esas tres tablas y no las reparte entre
 * los archivos que las usan: cuando el servidor agrega una fila hay **un** lugar
 * donde agregarla aquí, y se ve de un vistazo si la consola quedó atrasada.
 *
 * Nada de esto se inventa para rellenar la pantalla. Si una fila no está en la
 * documentación del backend, no está aquí.
 */

// ── Endpoints ───────────────────────────────────────────────────────────────

export type VerboHttp = 'GET' | 'POST' | 'PUT' | 'PATCH'

export interface EndpointConsumido {
  verbo: VerboHttp
  ruta: string
  /** `null` cuando el endpoint es anónimo: salud y los dos de sesión. */
  permiso: string | null
  /** Para qué lo llama esta consola, no qué hace el manejador del servidor. */
  uso: string
}

/**
 * Los doce endpoints que expone el repositorio. La consola los consume todos:
 * no hay ninguna pantalla apoyada en datos que la API no entregue.
 */
export const ENDPOINTS: EndpointConsumido[] = [
  {
    verbo: 'GET',
    ruta: '/api/salud',
    permiso: null,
    uso: 'Sonda de vida. Es la que alimenta la tarjeta de estado de esta pantalla.',
  },
  {
    verbo: 'POST',
    ruta: '/api/autenticacion/iniciar-sesion',
    permiso: null,
    uso: 'Canjea correo y contraseña por el par de tokens y la lista de permisos.',
  },
  {
    verbo: 'POST',
    ruta: '/api/autenticacion/refrescar-sesion',
    permiso: null,
    uso: 'Renovación silenciosa del acceso ante un 401, y al recargar la página.',
  },
  {
    verbo: 'GET',
    ruta: '/api/marcas/buscar-marcas',
    permiso: PERMISOS.marcas.ver,
    uso: 'Tabla de marcas, con búsqueda, filtro por estado y paginación.',
  },
  {
    verbo: 'GET',
    ruta: '/api/marcas/obtener-marca-por-id/{id}',
    permiso: PERMISOS.marcas.ver,
    uso: 'Ficha de una marca. Es el endpoint que usa la sonda de error de más abajo.',
  },
  {
    verbo: 'POST',
    ruta: '/api/marcas/crear-marca',
    permiso: PERMISOS.marcas.gestionar,
    uso: 'Alta de una marca.',
  },
  {
    verbo: 'PUT',
    ruta: '/api/marcas/actualizar-marca/{id}',
    permiso: PERMISOS.marcas.gestionar,
    uso: 'Edición del nombre, la descripción y el estado.',
  },
  {
    verbo: 'PATCH',
    ruta: '/api/marcas/desactivar-marca/{id}',
    permiso: PERMISOS.marcas.gestionar,
    uso: 'Baja lógica: el registro se marca inactivo, nunca se borra (ADR-0007).',
  },
  {
    verbo: 'GET',
    ruta: '/api/productos/buscar-productos',
    permiso: PERMISOS.productos.ver,
    uso: 'Catálogo de productos. Devuelve el stock del almacén que se le indique.',
  },
  {
    verbo: 'GET',
    ruta: '/api/almacenes/listar-almacenes',
    permiso: PERMISOS.almacenes.ver,
    uso: 'Alimenta el selector de almacén. Única lista del sistema que no viene paginada.',
  },
  {
    verbo: 'GET',
    ruta: '/api/ventas/buscar-ventas',
    permiso: PERMISOS.ventas.ver,
    uso: 'Listado de ventas por rango de fechas y estado.',
  },
  {
    verbo: 'POST',
    ruta: '/api/ventas/registrar-venta',
    permiso: PERMISOS.ventas.registrar,
    uso: 'Registro transaccional de la venta, con su descuento de inventario.',
  },
]

// ── Permisos ────────────────────────────────────────────────────────────────

export interface PermisoDelCatalogo {
  clave: string
  /** Qué habilita en esta consola. */
  uso: string
  /** Falso cuando el permiso existe en el catálogo pero ningún endpoint lo exige todavía. */
  tieneEndpoint: boolean
}

/**
 * En el mismo orden que `Permisos.Todos`. El backend mantiene esa colección
 * justamente para poder comparar el catálogo del código contra lo que la base
 * tiene asignado a los roles; aquí cumple el papel equivalente contra el token.
 */
export const CATALOGO_PERMISOS: PermisoDelCatalogo[] = [
  { clave: PERMISOS.marcas.ver, uso: 'Ver el catálogo de marcas.', tieneEndpoint: true },
  {
    clave: PERMISOS.marcas.gestionar,
    uso: 'Crear, editar y desactivar marcas.',
    tieneEndpoint: true,
  },
  {
    clave: PERMISOS.productos.ver,
    uso: 'Ver los productos y su stock por almacén.',
    tieneEndpoint: true,
  },
  {
    clave: PERMISOS.almacenes.ver,
    uso: 'Listar los almacenes de la empresa.',
    tieneEndpoint: true,
  },
  { clave: PERMISOS.ventas.ver, uso: 'Ver el listado de ventas.', tieneEndpoint: true },
  { clave: PERMISOS.ventas.registrar, uso: 'Registrar una venta.', tieneEndpoint: true },
  { clave: PERMISOS.ventas.anular, uso: 'Anular una venta.', tieneEndpoint: false },
  { clave: PERMISOS.reportes.ver, uso: 'Ver los reportes del sistema.', tieneEndpoint: false },
]

// ── Códigos de error ────────────────────────────────────────────────────────

export interface FamiliaCodigoError {
  prefijo: string
  ambito: string
  ejemplo: string
  situacion: string
}

/** Las siete familias con código asignado en `docs/codigos-error.md`. */
export const FAMILIAS_CODIGO_ERROR: FamiliaCodigoError[] = [
  {
    prefijo: 'API_',
    ambito: 'Borde HTTP: lo que falla antes de llegar a un caso de uso.',
    ejemplo: 'API_002',
    situacion: 'Token válido, pero sin el permiso que el endpoint exige. Responde 403.',
  },
  {
    prefijo: 'VAL_',
    ambito: 'Validación de entrada sin módulo propio.',
    ejemplo: 'VAL_006',
    situacion: 'Lista vacía donde se esperaba al menos un elemento.',
  },
  {
    prefijo: 'AUTH_',
    ambito: 'Autenticación y ciclo de vida de la sesión.',
    ejemplo: 'AUTH_001',
    situacion:
      'Credenciales inválidas. Cubre a propósito «ese correo no existe» y «esa clave no es»: separarlas permitiría enumerar usuarios.',
  },
  {
    prefijo: 'MARCA_',
    ambito: 'Catálogo de marcas.',
    ejemplo: 'MARCA_003',
    situacion: 'Ya existe una marca con ese nombre en la empresa. Responde 409.',
  },
  {
    prefijo: 'PROD_',
    ambito: 'Productos.',
    ejemplo: 'PROD_002',
    situacion: 'SKU duplicado en la empresa. Responde 409.',
  },
  {
    prefijo: 'ALMA_',
    ambito: 'Almacenes.',
    ejemplo: 'ALMA_001',
    situacion:
      'El almacén no existe o es de otra empresa. Responde 404: distinguir los dos casos permitiría averiguar qué almacenes tienen las demás.',
  },
  {
    prefijo: 'VENTA_',
    ambito: 'Ventas.',
    ejemplo: 'VENTA_004',
    situacion:
      'Stock insuficiente. Es el único error cuyo «details» la interfaz lee: trae disponible y solicitado para marcar la línea exacta.',
  },
]

// ── Alcance ─────────────────────────────────────────────────────────────────

export interface BrechaDeAlcance {
  titulo: string
  detalle: string
}

/**
 * Lo que esta consola **no** hace, y por qué. La alternativa —dibujar la
 * pantalla igual y rellenarla con datos de mentira— haría ver más grande el
 * repositorio y menos confiable todo lo demás que se muestra en él.
 */
export const FUERA_DE_ALCANCE: BrechaDeAlcance[] = [
  {
    titulo: 'El detalle de una venta',
    detalle:
      '«buscar-ventas» devuelve la cabecera: número, fecha, estado, método de pago y total. No hay endpoint que entregue las líneas, así que la consola no abre el documento.',
  },
  {
    titulo: 'La anulación de ventas',
    detalle:
      'El permiso «ventas.anular» está en el catálogo y los códigos VENTA_010 y VENTA_011 están reservados para ese caso de uso, pero el endpoint no está implementado.',
  },
  {
    titulo: 'El alta y la edición de productos',
    detalle:
      'El módulo es de solo lectura: «buscar-productos» es su único endpoint. Los códigos PROD_002 a PROD_008 describen escrituras que este repositorio no expone.',
  },
  {
    titulo: 'Los reportes',
    detalle:
      '«reportes.ver» está en el catálogo de permisos y no tiene ningún endpoint detrás. El tablero arma sus cifras con los listados que sí existen.',
  },
  {
    titulo: 'Los otros veintinueve módulos',
    detalle:
      'El sistema real tiene 31 módulos y ~185 endpoints; aquí hay dos implementados de punta a punta —Marcas y Ventas— más el catálogo de solo lectura. El inventario completo está en docs/mapa-de-modulos.md.',
  },
]
