import { describe, expect, it } from 'vitest'
import type { RespuestaProducto } from '@/nucleo/api/contratos'
import { CODIGOS_VENTAS } from '@/nucleo/api/errores'
import type { LineaVenta } from '@/caracteristicas/ventas/VentaTipos'
import {
  lineaDesdeProducto,
  motivoNoDisponible,
  revisarLinea,
} from '@/caracteristicas/ventas/VentaTipos'

/**
 * Pruebas de las reglas de una línea de venta.
 *
 * Estas reglas repiten en el cliente lo que `ManejadorRegistrarVenta` decide en
 * el servidor. Lo que se fija aquí no es que la regla sea correcta —de eso
 * responde el dominio— sino que el cliente la esté repitiendo **con el mismo
 * código del catálogo**, que es lo que permite que la interfaz marque el control
 * exacto en vez de mostrar un aviso genérico.
 */

function producto(parcial: Partial<RespuestaProducto> = {}): RespuestaProducto {
  return {
    id: 1,
    sku: 'SKU-0001',
    nombre: 'Insumo de ejemplo A',
    precioVenta: 1990,
    controlaInventario: true,
    activo: true,
    stockDisponible: 100,
    ...parcial,
  }
}

function linea(parcial: Partial<LineaVenta> = {}): LineaVenta {
  return { ...lineaDesdeProducto(producto()), ...parcial }
}

describe('lineaDesdeProducto', () => {
  it('arranca en una unidad sin descuento', () => {
    const resultado = lineaDesdeProducto(producto())

    expect(resultado.cantidad).toBe(1)
    expect(resultado.descuentoLinea).toBe(0)
    expect(resultado.stockConfirmado).toBe(false)
  })

  it('deja el stock en null para un servicio', () => {
    // Un servicio no mueve inventario: el servidor ni siquiera consulta su
    // stock, así que un 0 aquí diría algo que no es cierto.
    const resultado = lineaDesdeProducto(
      producto({ controlaInventario: false, stockDisponible: null }),
    )

    expect(resultado.stockDisponible).toBeNull()
  })
})

describe('revisarLinea', () => {
  it('acepta una línea correcta', () => {
    expect(revisarLinea(linea({ cantidad: 2 }))).toBeNull()
  })

  it.each([0, -1, 1.5])('rechaza la cantidad %s con VENTA_005', cantidad => {
    const problema = revisarLinea(linea({ cantidad }))

    expect(problema?.codigo).toBe(CODIGOS_VENTAS.cantidadInvalida)
    expect(problema?.severidad).toBe('bloqueo')
    expect(problema?.campo).toBe('cantidad')
  })

  it('rechaza un descuento negativo con VENTA_006', () => {
    const problema = revisarLinea(linea({ descuentoLinea: -1 }))

    expect(problema?.codigo).toBe(CODIGOS_VENTAS.descuentoInvalido)
    expect(problema?.campo).toBe('descuentoLinea')
  })

  it('bloquea un descuento mayor al subtotal de la línea', () => {
    // Es el único caso que el validador del borde HTTP no filtra: quien lo
    // rechaza es el dominio, con una excepción que sale como 500. Enviarlo no
    // devuelve un error aprovechable, devuelve una caída.
    const problema = revisarLinea(linea({ cantidad: 1, descuentoLinea: 5000 }))

    expect(problema?.codigo).toBe(CODIGOS_VENTAS.descuentoInvalido)
    expect(problema?.severidad).toBe('bloqueo')
  })

  it('avisa —no bloquea— un faltante de stock que solo conoce el cliente', () => {
    // El disponible leído del catálogo es una foto: otra caja pudo vender esa
    // unidad, o una recepción pudo reponerla. La autoridad es el servidor.
    const problema = revisarLinea(linea({ cantidad: 200, stockDisponible: 100 }))

    expect(problema?.codigo).toBe(CODIGOS_VENTAS.stockInsuficiente)
    expect(problema?.severidad).toBe('aviso')
  })

  it('bloquea el faltante una vez que el servidor confirmó el disponible', () => {
    // Tras un VENTA_004, reenviar la misma línea solo repite el rechazo.
    const problema = revisarLinea(
      linea({ cantidad: 200, stockDisponible: 100, stockConfirmado: true }),
    )

    expect(problema?.severidad).toBe('bloqueo')
  })

  it('no aplica la regla de stock a un servicio', () => {
    const servicio = lineaDesdeProducto(
      producto({ controlaInventario: false, stockDisponible: null }),
    )

    expect(revisarLinea({ ...servicio, cantidad: 999 })).toBeNull()
  })

  it('devuelve un solo problema, como el CascadeMode.Stop del validador', () => {
    // Enumerar tres fallos de la misma línea a la vez no ayuda a corregir ninguno.
    const problema = revisarLinea(linea({ cantidad: 0, descuentoLinea: -5 }))

    expect(problema?.codigo).toBe(CODIGOS_VENTAS.cantidadInvalida)
  })
})

describe('motivoNoDisponible', () => {
  it('deja agregar un producto activo con stock', () => {
    expect(motivoNoDisponible(producto())).toBeNull()
  })

  it('deja agregar siempre un servicio, con la bodega en cero', () => {
    expect(
      motivoNoDisponible(producto({ controlaInventario: false, stockDisponible: null })),
    ).toBeNull()
  })

  it('apaga un producto inactivo', () => {
    expect(motivoNoDisponible(producto({ activo: false }))).toBe('Inactivo')
  })

  it('apaga un producto inventariado sin existencias', () => {
    expect(motivoNoDisponible(producto({ stockDisponible: 0 }))).toBe('Sin stock')
  })
})
