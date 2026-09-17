import { describe, expect, it } from 'vitest'
import { CODIGOS_AUTENTICACION, CODIGOS_MARCAS } from '@/nucleo/api/errores'
import {
  CODIGO_FORMATO_INVALIDO,
  validarCredenciales,
} from '@/caracteristicas/autenticacion/validacionSesion'
import { validarMarca } from '@/caracteristicas/marcas/validacionMarca'

/**
 * Pruebas de los validadores del cliente.
 *
 * Los dos son espejos literales de sus contrapartes en
 * `ERP.Api/Validadores/`, y lo que se fija aquí es esa correspondencia: cada
 * caso comprueba el **código del catálogo**, no el texto, porque es el código lo
 * que tiene que coincidir con lo que devolvería el servidor ante la misma
 * entrada. Si mañana una regla cambia en C# y no aquí, estas pruebas siguen
 * verdes pero el `.cs` y el `.ts` dejan de decir lo mismo — por eso cada bloque
 * nombra el archivo que replica, para que la comparación sea de un vistazo.
 */

describe('validarMarca — espejo de ValidadorSolicitudCrearMarca.cs', () => {
  const valido = { nombre: 'Acme', descripcion: '', activo: true }

  it('acepta una marca válida', () => {
    expect(validarMarca(valido)).toEqual({})
  })

  it('exige el nombre con MARCA_001', () => {
    expect(validarMarca({ ...valido, nombre: '' }).nombre?.codigo).toBe(CODIGOS_MARCAS.requerido)
  })

  it('trata el nombre de solo espacios como ausente, igual que el servidor', () => {
    // MARCA_002 existe en el validador del servidor y es inalcanzable: el
    // `NotEmpty()` de FluentValidation ya considera vacía una cadena en blanco y
    // `CascadeMode.Stop` corta ahí. El espejo devuelve lo que la API devuelve.
    expect(validarMarca({ ...valido, nombre: '   ' }).nombre?.codigo).toBe(
      CODIGOS_MARCAS.requerido,
    )
  })

  it('exige el mínimo de dos caracteres con MARCA_005', () => {
    expect(validarMarca({ ...valido, nombre: 'A' }).nombre?.codigo).toBe(
      CODIGOS_MARCAS.longitudMinima,
    )
  })

  it('corta el nombre en 120 caracteres con MARCA_006', () => {
    expect(validarMarca({ ...valido, nombre: 'x'.repeat(120) }).nombre).toBeUndefined()
    expect(validarMarca({ ...valido, nombre: 'x'.repeat(121) }).nombre?.codigo).toBe(
      CODIGOS_MARCAS.longitudMaxima,
    )
  })

  it('corta la descripción en 500 caracteres', () => {
    expect(validarMarca({ ...valido, descripcion: 'x'.repeat(500) }).descripcion).toBeUndefined()
    expect(validarMarca({ ...valido, descripcion: 'x'.repeat(501) }).descripcion?.codigo).toBe(
      CODIGOS_MARCAS.longitudMaxima,
    )
  })

  it('reporta un solo fallo por campo, como el CascadeMode.Stop del validador', () => {
    // Un campo vacío que dijera a la vez «es obligatorio» y «mínimo 2
    // caracteres» es ruido, no información.
    expect(validarMarca({ ...valido, nombre: '' }).nombre?.codigo).toBe(CODIGOS_MARCAS.requerido)
  })

  it('mide la cadena sin recortar, igual que el servidor', () => {
    // El validador del servidor mide lo que recibe; el `Trim()` lo hace después
    // el caso de uso al construir la entidad. Un nombre de un carácter con
    // espacios alrededor cumple el mínimo allá, y tiene que cumplirlo aquí.
    expect(validarMarca({ ...valido, nombre: ' A ' })).toEqual({})
  })

  it('no valida el nombre duplicado: esa regla necesita la base de datos', () => {
    // MARCA_003 vive en `ManejadorCrearMarca` porque hay que preguntarle al
    // sistema si ya existe. El cliente cubre la forma; el servidor, el estado.
    const fallos = validarMarca({ ...valido, nombre: 'Genérica' })

    expect(fallos).toEqual({})
  })
})

describe('validarCredenciales — espejo de ValidadorSolicitudIniciarSesion.cs', () => {
  it('acepta credenciales completas', () => {
    expect(validarCredenciales('admin@norte.cl', 'Demo.1234')).toEqual({})
  })

  it('exige el correo con AUTH_007', () => {
    expect(validarCredenciales('', 'x').correo?.codigo).toBe(CODIGOS_AUTENTICACION.correoRequerido)
    expect(validarCredenciales('   ', 'x').correo?.codigo).toBe(
      CODIGOS_AUTENTICACION.correoRequerido,
    )
  })

  it('exige la contraseña con AUTH_008', () => {
    expect(validarCredenciales('a@b.cl', '').contrasena?.codigo).toBe(
      CODIGOS_AUTENTICACION.contrasenaRequerida,
    )
  })

  it.each(['sinarroba', '@dominio.cl', 'local@', 'dos@arrobas@cl'])(
    'rechaza el correo %s con VAL_004',
    correo => {
      expect(validarCredenciales(correo, 'x').correo?.codigo).toBe(CODIGO_FORMATO_INVALIDO)
    },
  )

  it('acepta lo que acepta EmailAddress() de FluentValidation, ni más ni menos', () => {
    // La comprobación del servidor es deliberadamente laxa: exactamente una
    // arroba, ni al principio ni al final. Una regla más estricta aquí
    // rechazaría correos que el servidor acepta, y dejaría a alguien sin poder
    // entrar con una cuenta perfectamente válida.
    expect(validarCredenciales('a@b', 'x')).toEqual({})
    expect(validarCredenciales('nombre.apellido+etiqueta@sub.dominio.cl', 'x')).toEqual({})
  })

  it('reporta los dos campos a la vez cuando los dos fallan', () => {
    // El corte en el primer fallo es POR CAMPO, no por formulario: obligar a
    // corregir de a uno multiplica los viajes.
    const fallos = validarCredenciales('', '')

    expect(fallos.correo).toBeDefined()
    expect(fallos.contrasena).toBeDefined()
  })
})
