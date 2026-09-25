import type { RespuestaProducto } from '@/nucleo/api/contratos'
import { CODIGOS_VENTAS } from '@/nucleo/api/errores'
import { redondear } from '@/nucleo/dominio/totales'
import { formatearDecimal, formatearMonto } from '@/nucleo/formato/formato'

/**
 * La línea de una venta mientras se arma, y las reglas que deciden si puede
 * enviarse.
 *
 * Esta revisión **no sustituye** a la del servidor: la repite para que la
 * persona corrija antes de enviar, no para autorizar nada. Cada caso lleva
 * anotado el código con el que el backend rechazaría esa misma línea, de modo
 * que si mañana cambia una regla del dominio se sabe exactamente qué mirar aquí.
 */

export interface LineaVenta {
  productoId: number
  sku: string
  nombre: string
  /**
   * Precio de lista al momento de agregar el producto. Solo se muestra: la
   * solicitud no lo envía y el servidor relee `Producto.PrecioVenta` al
   * registrar, así que un cambio de precio a mitad de la venta lo gana el
   * servidor. Ver `ManejadorRegistrarVenta`.
   */
  precioUnitario: number
  /** Entera: `SolicitudLineaVenta.Cantidad` es `int` en el contrato del servidor. */
  cantidad: number
  descuentoLinea: number
  controlaInventario: boolean
  /**
   * Disponible en el almacén elegido, leído al agregar el producto. Es una foto:
   * otra caja puede haber vendido la misma unidad un segundo después, y una
   * recepción puede haberla repuesto. `null` cuando el producto es un servicio.
   */
  stockDisponible: number | null
  /**
   * `true` cuando `stockDisponible` viene de un `VENTA_004` que el servidor acaba
   * de responder, y no de la búsqueda del catálogo. Cambia el trato del faltante
   * de aviso a bloqueo: mientras es una foto vale dudar de ella, pero una vez que
   * el servidor dijo el número, reenviar la misma línea solo repite el rechazo.
   */
  stockConfirmado: boolean
}

export type SeveridadProblema = 'bloqueo' | 'aviso'

export interface ProblemaLinea {
  /** Código del catálogo del backend que rechazaría esta línea. */
  codigo: string
  severidad: SeveridadProblema
  mensaje: string
  /** Control al que corresponde el problema, para pintarlo junto a él. */
  campo: 'cantidad' | 'descuentoLinea'
}

export function lineaDesdeProducto(producto: RespuestaProducto): LineaVenta {
  return {
    productoId: producto.id,
    sku: producto.sku,
    nombre: producto.nombre,
    precioUnitario: producto.precioVenta,
    cantidad: 1,
    descuentoLinea: 0,
    controlaInventario: producto.controlaInventario,
    // Un servicio no mueve inventario: el servidor ni siquiera consulta su stock.
    stockDisponible: producto.controlaInventario ? (producto.stockDisponible ?? 0) : null,
    stockConfirmado: false,
  }
}

/** Bruto de la línea, redondeado igual que `Dinero.Redondear` en el dominio. */
export function brutoDeLinea(linea: LineaVenta): number {
  return redondear(linea.precioUnitario * linea.cantidad)
}

/**
 * El primer problema de la línea, o `null` si está lista para enviarse.
 *
 * Devuelve uno solo y en este orden, imitando el `CascadeMode.Stop` del
 * validador del servidor: enumerar tres fallos de la misma línea a la vez no
 * ayuda a corregir ninguno.
 */
export function revisarLinea(linea: LineaVenta): ProblemaLinea | null {
  if (!Number.isInteger(linea.cantidad) || linea.cantidad <= 0) {
    return {
      codigo: CODIGOS_VENTAS.cantidadInvalida,
      severidad: 'bloqueo',
      mensaje: 'La cantidad debe ser un entero mayor a cero.',
      campo: 'cantidad',
    }
  }

  if (linea.descuentoLinea < 0) {
    return {
      codigo: CODIGOS_VENTAS.descuentoInvalido,
      severidad: 'bloqueo',
      mensaje: 'El descuento no puede ser negativo.',
      campo: 'descuentoLinea',
    }
  }

  const bruto = brutoDeLinea(linea)

  if (linea.descuentoLinea > bruto) {
    // Este caso merece explicación, porque es el único que el borde HTTP **no**
    // filtra: `ValidadorSolicitudLineaVenta` solo exige descuento >= 0. Quien lo
    // rechaza es `CalculadoraTotalesVenta`, con una `ArgumentOutOfRangeException`
    // que el intermediario de excepciones traduce a 500. Es decir: enviarlo no
    // devuelve un error de validación aprovechable, devuelve una caída. Por eso
    // aquí es bloqueo y no aviso.
    return {
      codigo: CODIGOS_VENTAS.descuentoInvalido,
      severidad: 'bloqueo',
      mensaje: `El descuento no puede superar el subtotal de la línea (${formatearMonto(bruto)}).`,
      campo: 'descuentoLinea',
    }
  }

  if (
    linea.controlaInventario &&
    linea.stockDisponible !== null &&
    linea.cantidad > linea.stockDisponible
  ) {
    return {
      codigo: CODIGOS_VENTAS.stockInsuficiente,
      severidad: linea.stockConfirmado ? 'bloqueo' : 'aviso',
      mensaje: `Disponible ${formatearDecimal(linea.stockDisponible)}, solicitado ${formatearDecimal(linea.cantidad)}.`,
      campo: 'cantidad',
    }
  }

  return null
}

/**
 * Motivo por el que un producto del catálogo no puede entrar a la venta, o
 * `null` si puede.
 *
 * Los dos motivos son los mismos que el servidor comprueba línea por línea en
 * `ManejadorRegistrarVenta`, y se adelantan aquí para que el resultado de la
 * búsqueda diga *por qué* está apagado en vez de solo estarlo.
 */
export function motivoNoDisponible(producto: RespuestaProducto): string | null {
  if (!producto.activo) {
    // La búsqueda pide `soloActivos: true`, así que esto no debería aparecer. Se
    // comprueba igual porque la lista puede venir de la caché de TanStack Query
    // y el producto haberse dado de baja mientras tanto. VENTA_003.
    return 'Inactivo'
  }

  if (!producto.controlaInventario) {
    // Un servicio —una instalación, una hora de soporte— no tiene existencias que
    // descontar: el manejador salta la comprobación de stock y no genera
    // movimiento de inventario. Se vende siempre, con la bodega en cero.
    return null
  }

  return (producto.stockDisponible ?? 0) > 0 ? null : 'Sin stock'
}
