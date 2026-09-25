import { CODIGOS_AUTENTICACION } from '@/nucleo/api/errores'

/**
 * Espejo en el cliente de `ERP.Api/Validadores/Auth/ValidadorSolicitudIniciarSesion.cs`.
 *
 * Se duplican tres reglas para no gastar un viaje de red en contestar que el
 * correo está vacío. La regla que manda sigue siendo la del servidor: esto
 * adelanta el mismo veredicto, con el mismo código de catálogo y el mismo texto,
 * de modo que la persona lea lo mismo venga el error de donde venga. Si el
 * validador del backend cambia, este archivo cambia en la misma entrega.
 */

/**
 * `CodigosErrorValidacion.FormatoInvalido`.
 *
 * No está en los `CODIGOS_*` de núcleo porque hasta ahora ninguna pantalla
 * reaccionaba a un código `VAL_###`; cuando una segunda lo necesite, este es el
 * que hay que subir a `nucleo/api/errores.ts`.
 */
export const CODIGO_FORMATO_INVALIDO = 'VAL_004'

export type CampoCredencial = 'correo' | 'contrasena'

export interface FalloValidacion {
  /** Código del catálogo, igual al que devolvería el servidor para esta misma regla. */
  codigo: string
  mensaje: string
}

/** `NotEmptyValidator` de FluentValidation considera vacía una cadena de solo espacios. */
function estaVacio(valor: string): boolean {
  return valor.trim() === ''
}

/**
 * `EmailAddress()` de FluentValidation usa el modo compatible con ASP.NET Core,
 * que no es una expresión regular de RFC sino una comprobación deliberadamente
 * laxa: exactamente una arroba, ni al principio ni al final. Se replica tal cual
 * —y no algo «mejor»— porque una regla más estricta aquí rechazaría correos que
 * el servidor acepta, y el usuario se quedaría sin poder entrar con una cuenta
 * perfectamente válida.
 */
function tieneFormatoDeCorreo(valor: string): boolean {
  const [local, dominio, ...sobrantes] = valor.split('@')

  return sobrantes.length === 0 && Boolean(local) && Boolean(dominio)
}

export function validarCredenciales(
  correo: string,
  contrasena: string,
): Partial<Record<CampoCredencial, FalloValidacion>> {
  const fallos: Partial<Record<CampoCredencial, FalloValidacion>> = {}

  // `CascadeMode.Stop`: cada campo reporta un solo fallo, el primero que encuentra.
  if (estaVacio(correo)) {
    fallos.correo = {
      codigo: CODIGOS_AUTENTICACION.correoRequerido,
      mensaje: 'El correo es obligatorio.',
    }
  } else if (!tieneFormatoDeCorreo(correo.trim())) {
    fallos.correo = {
      codigo: CODIGO_FORMATO_INVALIDO,
      mensaje: 'El correo no tiene un formato válido.',
    }
  }

  // La contraseña no se recorta: un espacio al final forma parte de ella y el
  // servidor la compara tal como llega contra el hash.
  if (estaVacio(contrasena)) {
    fallos.contrasena = {
      codigo: CODIGOS_AUTENTICACION.contrasenaRequerida,
      mensaje: 'La contraseña es obligatoria.',
    }
  }

  return fallos
}
