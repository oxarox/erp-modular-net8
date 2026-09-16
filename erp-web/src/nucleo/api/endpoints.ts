import type {
  RespuestaAlmacen,
  RespuestaMarca,
  RespuestaOperacionMarca,
  RespuestaPaginada,
  RespuestaProducto,
  RespuestaSalud,
  RespuestaVenta,
  RespuestaVentaRegistrada,
  SolicitudActualizarMarca,
  SolicitudBuscarMarcas,
  SolicitudBuscarProductos,
  SolicitudBuscarVentas,
  SolicitudCrearMarca,
  SolicitudRegistrarVenta,
} from '@/nucleo/api/contratos'
import { peticion } from '@/nucleo/api/cliente'

/**
 * Los endpoints de la API, uno por función.
 *
 * Es la transcripción de `docs/endpoints.md`. Las rutas del backend no se
 * escriben a mano: se derivan del nombre del controlador y del método
 * (`ControladorMarcas.CrearMarca` → `POST /api/marcas/crear-marca`), así que
 * aquí tampoco se improvisan — cada una corresponde a una fila de esa tabla.
 *
 * Ninguna función de este archivo captura errores: los propaga para que quien
 * llama decida. Ver `nucleo/api/errores.ts`.
 */

export const api = {
  // ── Salud ──────────────────────────────────────────────────────────────
  salud: {
    /** Sonda anónima. Sirve para saber si la API está viva antes de pedir credenciales. */
    obtener: (senal?: AbortSignal) =>
      peticion<RespuestaSalud>('/api/salud', { senal, sinRenovacion: true }),
  },

  // ── Marcas ─────────────────────────────────────────────────────────────
  marcas: {
    buscar: (filtros: SolicitudBuscarMarcas, senal?: AbortSignal) =>
      peticion<RespuestaPaginada<RespuestaMarca>>('/api/marcas/buscar-marcas', {
        consulta: { ...filtros },
        senal,
      }),

    obtenerPorId: (id: number, senal?: AbortSignal) =>
      peticion<RespuestaMarca>(`/api/marcas/obtener-marca-por-id/${id}`, { senal }),

    crear: (solicitud: SolicitudCrearMarca) =>
      peticion<RespuestaOperacionMarca>('/api/marcas/crear-marca', {
        metodo: 'POST',
        cuerpo: solicitud,
      }),

    actualizar: (id: number, solicitud: SolicitudActualizarMarca) =>
      peticion<RespuestaOperacionMarca>(`/api/marcas/actualizar-marca/${id}`, {
        metodo: 'PUT',
        cuerpo: solicitud,
      }),

    /** Baja lógica: no existe borrado físico en el sistema. Ver ADR-0007. */
    desactivar: (id: number) =>
      peticion<RespuestaOperacionMarca>(`/api/marcas/desactivar-marca/${id}`, {
        metodo: 'PATCH',
      }),
  },

  // ── Catálogo ───────────────────────────────────────────────────────────
  productos: {
    buscar: (filtros: SolicitudBuscarProductos, senal?: AbortSignal) =>
      peticion<RespuestaPaginada<RespuestaProducto>>('/api/productos/buscar-productos', {
        consulta: { ...filtros },
        senal,
      }),
  },

  almacenes: {
    listar: (soloActivos: boolean | undefined, senal?: AbortSignal) =>
      peticion<RespuestaAlmacen[]>('/api/almacenes/listar-almacenes', {
        consulta: { soloActivos },
        senal,
      }),
  },

  // ── Ventas ─────────────────────────────────────────────────────────────
  ventas: {
    buscar: (filtros: SolicitudBuscarVentas, senal?: AbortSignal) =>
      peticion<RespuestaPaginada<RespuestaVenta>>('/api/ventas/buscar-ventas', {
        consulta: { ...filtros },
        senal,
      }),

    registrar: (solicitud: SolicitudRegistrarVenta) =>
      peticion<RespuestaVentaRegistrada>('/api/ventas/registrar-venta', {
        metodo: 'POST',
        cuerpo: solicitud,
      }),
  },
}
