import { describe, expect, it } from 'vitest'
import type { RespuestaError } from '@/nucleo/api/contratos'
import {
  CODIGOS_API,
  CODIGOS_VENTAS,
  ErrorApi,
  ErrorDeRed,
  erroresPorCampo,
  esSobreDeError,
  mensajeParaUsuario,
} from '@/nucleo/api/errores'

/**
 * Pruebas del sobre de error.
 *
 * El backend promete que TODO error del sistema sale con la misma forma, y todo
 * el manejo de errores del cliente está construido sobre esa promesa. Estas
 * pruebas fijan el otro extremo del contrato: los cuerpos de ejemplo son los que
 * produce `ERP.Api/Contracts/Comun/RespuestaError.cs`, con su serialización
 * camelCase.
 */

function sobre(parcial: Partial<RespuestaError> = {}): RespuestaError {
  return {
    traceId: 'a1b2c3',
    code: 'bad_request',
    message: 'La solicitud no es válida.',
    errorCode: 'API_007',
    details: null,
    ...parcial,
  }
}

describe('ErrorApi', () => {
  it('clasifica por código HTTP', () => {
    expect(new ErrorApi(401, sobre()).esNoAutenticado).toBe(true)
    expect(new ErrorApi(403, sobre()).esProhibido).toBe(true)
    expect(new ErrorApi(404, sobre()).esNoEncontrado).toBe(true)
    expect(new ErrorApi(409, sobre()).esConflicto).toBe(true)
  })

  it('considera reintentable solo lo que puede mejorar solo', () => {
    // 503 es «la base de datos no responde»: el backend lo distingue del 500
    // justamente para poder decir que reintentar tiene sentido. Un 400 no mejora
    // por insistir, y reintentarlo solo retrasa el mensaje que hay que leer.
    expect(new ErrorApi(503, sobre({ errorCode: CODIGOS_API.servicioDatosNoDisponible })).esReintentable).toBe(true)
    expect(new ErrorApi(500, sobre()).esReintentable).toBe(true)
    expect(new ErrorApi(400, sobre()).esReintentable).toBe(false)
    expect(new ErrorApi(409, sobre()).esReintentable).toBe(false)
  })

  it('expone los errores por campo de un validation_error', () => {
    const error = new ErrorApi(
      400,
      sobre({
        code: 'validation_error',
        errorCode: 'API_006',
        details: {
          errors: [{ campo: 'Nombre', codigo: 'MARCA_005', mensaje: 'Mínimo 2 caracteres.' }],
        },
      }),
    )

    expect(error.esValidacion).toBe(true)
    expect(error.erroresDeCampo).toHaveLength(1)
    expect(error.erroresDeCampo[0]?.codigo).toBe('MARCA_005')
  })

  it('devuelve una lista vacía cuando el error no trae detalle de campos', () => {
    // No todo 400 es de validación: el caso de uso también lanza solicitudes
    // inválidas sin detalle por campo, y recorrer `details.errors` a ciegas
    // reventaría la pantalla.
    expect(new ErrorApi(400, sobre()).erroresDeCampo).toEqual([])
  })

  it('tipa el detalle de stock insuficiente solo cuando el código corresponde', () => {
    const stock = new ErrorApi(
      400,
      sobre({
        errorCode: CODIGOS_VENTAS.stockInsuficiente,
        details: { id: 7, disponible: 3, solicitado: 10 },
      }),
    )

    expect(stock.detalleStock).toEqual({ id: 7, disponible: 3, solicitado: 10 })

    // Mismo cuerpo, otro código: no se interpreta como stock.
    const otro = new ErrorApi(400, sobre({ details: { id: 7, disponible: 3, solicitado: 10 } }))

    expect(otro.detalleStock).toBeNull()
  })
})

describe('erroresPorCampo', () => {
  it('normaliza los nombres de propiedad de FluentValidation a los del formulario', () => {
    const error = new ErrorApi(
      400,
      sobre({
        code: 'validation_error',
        details: {
          errors: [
            { campo: 'Nombre', codigo: 'MARCA_001', mensaje: 'El nombre es obligatorio.' },
            { campo: 'Descripcion', codigo: 'MARCA_006', mensaje: 'Máximo 500 caracteres.' },
          ],
        },
      }),
    )

    expect(erroresPorCampo(error)).toEqual({
      nombre: 'El nombre es obligatorio.',
      descripcion: 'Máximo 500 caracteres.',
    })
  })

  it('conserva el índice de las rutas anidadas', () => {
    // La pantalla de venta necesita saber QUÉ línea falló, no solo que falló
    // alguna: `Lineas[0].Cantidad` tiene que llegar identificable.
    const error = new ErrorApi(
      400,
      sobre({
        code: 'validation_error',
        details: {
          errors: [
            { campo: 'Lineas[0].Cantidad', codigo: 'VENTA_005', mensaje: 'Debe ser mayor a cero.' },
          ],
        },
      }),
    )

    expect(erroresPorCampo(error)).toEqual({
      'lineas[0].cantidad': 'Debe ser mayor a cero.',
    })
  })

  it('devuelve un objeto vacío para cualquier cosa que no sea un ErrorApi', () => {
    expect(erroresPorCampo(new Error('roto'))).toEqual({})
    expect(erroresPorCampo(null)).toEqual({})
  })
})

describe('mensajeParaUsuario', () => {
  it('respeta el texto del servidor, que ya viene en español y apto para mostrar', () => {
    const error = new ErrorApi(409, sobre({ message: 'Ya existe una marca con ese nombre.' }))

    expect(mensajeParaUsuario(error)).toBe('Ya existe una marca con ese nombre.')
  })

  it('reescribe solo los casos en que el mensaje genérico no dice qué hacer', () => {
    const sinPermiso = new ErrorApi(403, sobre({ errorCode: CODIGOS_API.sinPermiso }))

    expect(mensajeParaUsuario(sinPermiso)).toContain('permiso')
  })

  it('explica un fallo de red en vez de mostrar el error crudo del navegador', () => {
    expect(mensajeParaUsuario(new ErrorDeRed(new TypeError('Failed to fetch')))).toContain('CORS')
  })
})

describe('esSobreDeError', () => {
  it('reconoce el sobre por sus dos campos de contrato duro', () => {
    expect(esSobreDeError(sobre())).toBe(true)
  })

  it('rechaza un cuerpo que no es el sobre', () => {
    // Un 502 de un proxy intermedio devuelve HTML, y confiarse rompería el
    // manejo de errores justo cuando más falta hace.
    expect(esSobreDeError({ error: 'Bad Gateway' })).toBe(false)
    expect(esSobreDeError('<html></html>')).toBe(false)
    expect(esSobreDeError(null)).toBe(false)
  })
})
