import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RespuestaSesion } from '@/nucleo/api/contratos'
import { alCaerLaSesion, peticion } from '@/nucleo/api/cliente'
import { ErrorApi, ErrorDeRed } from '@/nucleo/api/errores'
import { almacenSesion } from '@/nucleo/autenticacion/almacenSesion'

/**
 * Pruebas del cliente HTTP.
 *
 * Lo que se prueba aquí no es que `fetch` funcione, sino las tres decisiones que
 * el cliente toma por su cuenta y que son difíciles de ver a ojo: cuándo renueva
 * el token, cuántas veces lo renueva si varias consultas fallan a la vez, y qué
 * hace cuando el servidor no devuelve el sobre de error que promete.
 */

function sesion(sufijo: string): RespuestaSesion {
  return {
    tokenAcceso: `acceso-${sufijo}`,
    accesoExpiraUtc: '2026-09-15T15:00:00',
    tokenRefresco: `refresco-${sufijo}`,
    refrescoExpiraUtc: '2026-09-22T14:30:00',
    usuarioId: 10,
    nombreCompleto: 'Administración Norte',
    empresaId: 1,
    permisos: ['marcas.ver'],
  }
}

function respuesta(estado: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json', 'X-Correlacion-Id': 'correlacion-de-prueba' },
  })
}

function sobre401() {
  return {
    traceId: 'correlacion-de-prueba',
    code: 'unauthorized',
    message: 'Se requiere un token de acceso válido.',
    errorCode: 'API_001',
    details: null,
  }
}

let fetchSimulado: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchSimulado = vi.fn()
  vi.stubGlobal('fetch', fetchSimulado)
  almacenSesion.limpiar()
})

afterEach(() => {
  vi.unstubAllGlobals()
  almacenSesion.limpiar()
})

describe('peticion', () => {
  it('adjunta el token de acceso cuando hay sesión', async () => {
    almacenSesion.establecer(sesion('1'))
    fetchSimulado.mockResolvedValueOnce(respuesta(200, { total: 0 }))

    await peticion('/api/marcas/buscar-marcas')

    const cabeceras = fetchSimulado.mock.calls[0]?.[1]?.headers as Headers

    expect(cabeceras.get('Authorization')).toBe('Bearer acceso-1')
  })

  it('omite los parámetros vacíos en vez de enviarlos en blanco', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(200, {}))

    await peticion('/api/marcas/buscar-marcas', {
      consulta: { criterio: '', soloActivas: true, pagina: undefined, tamanoPagina: 25 },
    })

    const url = new URL(fetchSimulado.mock.calls[0]?.[0] as string)

    expect(url.searchParams.has('criterio')).toBe(false)
    expect(url.searchParams.has('pagina')).toBe(false)
    expect(url.searchParams.get('soloActivas')).toBe('true')
    expect(url.searchParams.get('tamanoPagina')).toBe('25')
  })

  it('traduce el sobre de error del servidor a un ErrorApi', async () => {
    fetchSimulado.mockResolvedValueOnce(
      respuesta(409, {
        traceId: 'abc',
        code: 'conflict',
        message: 'Ya existe una marca con ese nombre.',
        errorCode: 'MARCA_003',
        details: null,
      }),
    )

    await expect(peticion('/api/marcas/crear-marca', { metodo: 'POST', cuerpo: {} })).rejects.toThrow(
      ErrorApi,
    )
  })

  it('sintetiza un sobre cuando el cuerpo no es el sobre prometido', async () => {
    // Un 502 de un proxy intermedio devuelve HTML. Sin esto, `.json()` lanza y
    // la persona ve un «Unexpected token <» en vez de un mensaje.
    fetchSimulado.mockResolvedValueOnce(
      new Response('<html>Bad Gateway</html>', { status: 502, statusText: 'Bad Gateway' }),
    )

    await expect(peticion('/api/salud')).rejects.toMatchObject({
      estado: 502,
      codigo: 'API_004',
    })
  })

  it('distingue un fallo de red de una respuesta de error', async () => {
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(peticion('/api/salud')).rejects.toThrow(ErrorDeRed)
  })

  it('deja propagar la cancelación sin convertirla en un fallo', async () => {
    // TanStack Query cancela consultas al desmontar o al cambiar un filtro.
    // Tratar eso como error de red pintaría un aviso rojo en cada tecleo.
    fetchSimulado.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))

    await expect(peticion('/api/marcas/buscar-marcas')).rejects.toThrow(DOMException)
  })
})

describe('renovación del token', () => {
  it('canjea el refresco ante un 401 y reintenta la petición original', async () => {
    almacenSesion.establecer(sesion('1'))

    fetchSimulado
      .mockResolvedValueOnce(respuesta(401, sobre401()))
      .mockResolvedValueOnce(respuesta(200, sesion('2')))
      .mockResolvedValueOnce(respuesta(200, { items: [] }))

    await peticion('/api/marcas/buscar-marcas')

    expect(fetchSimulado).toHaveBeenCalledTimes(3)
    expect(almacenSesion.obtenerTokenAcceso()).toBe('acceso-2')

    // El reintento sale con el token nuevo, no con el que acababa de fallar.
    const cabecerasReintento = fetchSimulado.mock.calls[2]?.[1]?.headers as Headers

    expect(cabecerasReintento.get('Authorization')).toBe('Bearer acceso-2')
  })

  it('hace UN solo canje aunque varias consultas reciban 401 a la vez', async () => {
    // Es la razón de ser de la promesa compartida: el backend ROTA el token de
    // refresco en cada uso, así que tres canjes en paralelo significan dos
    // `AUTH_004` y una sesión cerrada por error.
    almacenSesion.establecer(sesion('1'))

    fetchSimulado.mockImplementation((url: string) => {
      if (String(url).includes('refrescar-sesion')) {
        return Promise.resolve(respuesta(200, sesion('2')))
      }

      const cabeceras = fetchSimulado.mock.calls.at(-1)?.[1]?.headers as Headers

      return Promise.resolve(
        cabeceras.get('Authorization') === 'Bearer acceso-1'
          ? respuesta(401, sobre401())
          : respuesta(200, { items: [] }),
      )
    })

    await Promise.all([
      peticion('/api/marcas/buscar-marcas'),
      peticion('/api/ventas/buscar-ventas'),
      peticion('/api/productos/buscar-productos'),
    ])

    const canjes = fetchSimulado.mock.calls.filter(([url]) =>
      String(url).includes('refrescar-sesion'),
    )

    expect(canjes).toHaveLength(1)
  })

  it('avisa que la sesión cayó cuando el refresco tampoco sirve', async () => {
    almacenSesion.establecer(sesion('1'))

    fetchSimulado
      .mockResolvedValueOnce(respuesta(401, sobre401()))
      .mockResolvedValueOnce(
        respuesta(401, {
          traceId: 'abc',
          code: 'unauthorized',
          message: 'El token de refresco no es válido.',
          errorCode: 'AUTH_004',
          details: null,
        }),
      )

    const aviso = vi.fn()
    const cancelar = alCaerLaSesion(aviso)

    await expect(peticion('/api/marcas/buscar-marcas')).rejects.toThrow(ErrorApi)

    expect(aviso).toHaveBeenCalledTimes(1)
    expect(almacenSesion.obtener()).toBeNull()

    cancelar()
  })

  it('no intenta renovar la propia petición de inicio de sesión', async () => {
    // Un 401 en el login son credenciales malas, no un token vencido: canjear
    // un refresco ahí produciría un error incomprensible en vez de «credenciales
    // no válidas».
    fetchSimulado.mockResolvedValueOnce(
      respuesta(401, {
        traceId: 'abc',
        code: 'unauthorized',
        message: 'Las credenciales no son válidas.',
        errorCode: 'AUTH_001',
        details: null,
      }),
    )

    await expect(
      peticion('/api/autenticacion/iniciar-sesion', {
        metodo: 'POST',
        cuerpo: { correo: 'a@b.cl', contrasena: 'mala' },
        sinRenovacion: true,
      }),
    ).rejects.toMatchObject({ codigo: 'AUTH_001' })

    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })

  it('no intenta renovar cuando no hay token de refresco guardado', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(401, sobre401()))

    await expect(peticion('/api/marcas/buscar-marcas')).rejects.toThrow(ErrorApi)

    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })

  it('vuelve a intentar renovar después de un intento sin token', async () => {
    // Regresión: si la promesa compartida no se limpiara tras un intento fallido
    // por falta de token, el primer 401 después de iniciar sesión cerraría una
    // sesión perfectamente válida con la respuesta cacheada del intento anterior.
    fetchSimulado.mockResolvedValueOnce(respuesta(401, sobre401()))
    await expect(peticion('/api/marcas/buscar-marcas')).rejects.toThrow(ErrorApi)

    almacenSesion.establecer(sesion('1'))

    fetchSimulado
      .mockResolvedValueOnce(respuesta(401, sobre401()))
      .mockResolvedValueOnce(respuesta(200, sesion('2')))
      .mockResolvedValueOnce(respuesta(200, { items: [] }))

    await peticion('/api/marcas/buscar-marcas')

    expect(almacenSesion.obtenerTokenAcceso()).toBe('acceso-2')
  })
})
