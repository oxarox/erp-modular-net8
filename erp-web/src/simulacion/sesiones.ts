import type { RespuestaSesion } from '@/nucleo/api/contratos'
import { crearAleatorio, hashTexto } from '@/simulacion/aleatorio'
import { aIsoUtc } from '@/simulacion/sobre'

/**
 * Sesiones del modo demo: tokens opacos guardados en memoria, con expiración y
 * rotación.
 *
 * No se firma nada —no hay servidor que verifique una firma— pero sí se replican
 * las tres propiedades que la interfaz necesita ver funcionando:
 *
 *  1. **el acceso caduca.** Treinta minutos, igual que `OpcionesJwt.MinutosTokenAcceso`.
 *     Un acceso vencido responde 401 `API_001`, que es lo que dispara la
 *     renovación automática del cliente HTTP. Sin expiración, esa renovación
 *     —que es de las partes más delicadas de `nucleo/api/cliente.ts`— no se
 *     ejercitaría nunca en la demo;
 *  2. **el refresco rota.** Canjearlo lo revoca en el mismo acto, así que el
 *     token viejo deja de servir de inmediato. Es lo que hace que valga la pena
 *     la promesa compartida de `renovarAcceso`: sin rotación, tres 401 a la vez
 *     canjearían tres veces sin consecuencias y el error quedaría escondido;
 *  3. **se distingue «no existe» de «ya no sirve».** El backend guarda la sesión
 *     y la marca revocada (`SesionUsuario.FechaRevocacionUtc`) en vez de
 *     borrarla, de modo que un hash desconocido devuelve `AUTH_004` y uno
 *     conocido pero revocado o vencido devuelve `AUTH_005`. Aquí igual.
 *
 * El registro se refleja en `sessionStorage`, junto con la posición del
 * generador de tokens. Es la única parte del simulador que sobrevive a una
 * recarga, y el motivo es concreto: sin eso, refrescar la página cerraría la
 * sesión —el token de refresco guardado no correspondería a ninguna sesión viva
 * y la restauración devolvería `AUTH_004`—, y con ella se perdería la
 * posibilidad de mostrar funcionando lo que la consola hace al arrancar. El
 * resto del estado sí se vuelve a sembrar, que es lo correcto para
 * una demo: el catálogo y el histórico son deterministas y vuelven a salir
 * idénticos. `sessionStorage` y no `localStorage` a propósito: cerrar la
 * pestaña termina la sesión, que es lo que uno espera de una demostración.
 */

/** `OpcionesJwt.MinutosTokenAcceso` y `OpcionesJwt.DiasTokenRefresco`. */
const MINUTOS_ACCESO = 30
const DIAS_REFRESCO = 7

const MS_POR_MINUTO = 60_000
const MS_POR_DIA = 86_400_000

export interface IdentidadDemo {
  usuarioId: number
  empresaId: number
  nombreCompleto: string
  permisos: readonly string[]
}

interface RegistroAcceso extends IdentidadDemo {
  expiraEn: number
}

interface RegistroRefresco extends IdentidadDemo {
  expiraEn: number
  revocado: boolean
}

const CLAVE_REGISTRO = 'erp.demo.sesiones'

interface RegistroPersistido {
  accesos: [string, RegistroAcceso][]
  refrescos: [string, RegistroRefresco][]
  /** Número de orden del último token emitido. Ver `tokenOpaco`. */
  tokensEmitidos: number
}

/**
 * `sessionStorage` puede lanzar —ventana privada, cookies bloqueadas, cuota— y
 * el contenido puede venir de una versión anterior del simulador. En cualquiera
 * de esos casos se arranca con el registro vacío: la demo pide credenciales otra
 * vez, que es una degradación aceptable, y nunca revienta.
 *
 * El contador y las sesiones se aceptan o se descartan juntos, nunca a medias.
 * Heredar las sesiones sin su contador es peor que no heredar nada: la emisión
 * volvería a empezar desde uno y repetiría tokens que esas mismas sesiones ya
 * tienen como clave, que es justo lo que el contador existe para impedir.
 */
function leerRegistro(): RegistroPersistido {
  const vacio: RegistroPersistido = { accesos: [], refrescos: [], tokensEmitidos: 0 }

  try {
    const crudo = window.sessionStorage.getItem(CLAVE_REGISTRO)

    if (crudo === null) {
      return vacio
    }

    const { accesos, refrescos, tokensEmitidos } = JSON.parse(crudo) as Partial<RegistroPersistido>

    if (
      !Array.isArray(accesos) ||
      !Array.isArray(refrescos) ||
      typeof tokensEmitidos !== 'number' ||
      !Number.isInteger(tokensEmitidos) ||
      tokensEmitidos < 0
    ) {
      return vacio
    }

    return { accesos, refrescos, tokensEmitidos }
  } catch {
    return vacio
  }
}

const registroGuardado = leerRegistro()

const accesos = new Map<string, RegistroAcceso>(registroGuardado.accesos)
const refrescos = new Map<string, RegistroRefresco>(registroGuardado.refrescos)

let tokensEmitidos = registroGuardado.tokensEmitidos

function guardarRegistro(): void {
  try {
    window.sessionStorage.setItem(
      CLAVE_REGISTRO,
      JSON.stringify({ accesos: [...accesos], refrescos: [...refrescos], tokensEmitidos }),
    )
  } catch {
    // Sin persistencia, la sesión dura lo que dure la página. Sigue funcionando.
  }
}

/**
 * Token opaco derivado de su número de orden.
 *
 * Cada token estrena generador en vez de compartir uno vivo, y el motivo es que
 * la posición de ese generador es estado de la sesión —no contenido que se pueda
 * volver a derivar— y tenía que persistirse con el registro. Con un generador
 * compartido había que guardar su estado interno; con uno por token basta el
 * contador, que viaja en la misma escritura que las sesiones y por eso no puede
 * desincronizarse de ellas.
 *
 * Que no se persistiera costaba caro. Al recargar, el generador volvía al
 * principio y la primera emisión de la página nueva —la de la restauración—
 * reproducía el par que ya existía: `emitirSesion` reescribía con `revocado` en
 * falso la misma clave de `refrescos` que `canjearRefresco` acababa de revocar,
 * deshaciendo la rotación en el mismo acto. El token de refresco quedaba
 * congelado para el resto de la pestaña y la propiedad 2 del encabezado dejaba
 * de ser demostrable.
 *
 * La semilla sigue siendo propia, sin tocar el generador del catálogo: los
 * productos y las ventas deben salir idénticos se haya iniciado sesión o no.
 */
function tokenOpaco(prefijo: string): string {
  tokensEmitidos += 1

  const azar = crearAleatorio(hashTexto(`tokens.${tokensEmitidos}`))
  let cuerpo = ''

  while (cuerpo.length < 40) {
    cuerpo += azar.entero(0, 0xffff).toString(16).padStart(4, '0')
  }

  return `${prefijo}.${cuerpo.slice(0, 40)}`
}

export function emitirSesion(identidad: IdentidadDemo): RespuestaSesion {
  const ahora = Date.now()
  const tokenAcceso = tokenOpaco('acc')
  const tokenRefresco = tokenOpaco('ref')
  const accesoExpiraEn = ahora + MINUTOS_ACCESO * MS_POR_MINUTO
  const refrescoExpiraEn = ahora + DIAS_REFRESCO * MS_POR_DIA

  accesos.set(tokenAcceso, { ...identidad, expiraEn: accesoExpiraEn })
  refrescos.set(tokenRefresco, { ...identidad, expiraEn: refrescoExpiraEn, revocado: false })
  guardarRegistro()

  return {
    tokenAcceso,
    accesoExpiraUtc: aIsoUtc(new Date(accesoExpiraEn)),
    tokenRefresco,
    refrescoExpiraUtc: aIsoUtc(new Date(refrescoExpiraEn)),
    usuarioId: identidad.usuarioId,
    nombreCompleto: identidad.nombreCompleto,
    empresaId: identidad.empresaId,
    permisos: [...identidad.permisos],
  }
}

export type ResultadoAcceso =
  | { estado: 'valido'; identidad: IdentidadDemo }
  /** Sin cabecera, con un esquema que no es `Bearer`, o con un token desconocido. */
  | { estado: 'ausente' }
  | { estado: 'expirado' }

/**
 * Resuelve la cabecera `Authorization`.
 *
 * Un token desconocido y uno ausente se tratan igual —el backend responde el
 * mismo 401 `API_001` en ambos casos, desde `OnChallenge`— y solo el vencimiento
 * se separa, porque es el único que la interfaz necesita poder provocar a
 * propósito para ver la renovación en acción.
 */
export function resolverAcceso(cabecera: string | null): ResultadoAcceso {
  const token = cabecera?.startsWith('Bearer ') === true ? cabecera.slice(7).trim() : null

  if (token === null || token === '') {
    return { estado: 'ausente' }
  }

  const registro = accesos.get(token)

  if (registro === undefined) {
    return { estado: 'ausente' }
  }

  if (registro.expiraEn <= Date.now()) {
    // El backend valida con `ClockSkew = TimeSpan.Zero`: no hay tolerancia, un
    // token expirado está expirado. Se borra para no acumular registros muertos.
    accesos.delete(token)
    guardarRegistro()

    return { estado: 'expirado' }
  }

  return { estado: 'valido', identidad: registro }
}

export type ResultadoRefresco =
  /** Hash desconocido: `AUTH_004`. */
  | { estado: 'desconocido' }
  /** Conocido pero revocado por rotación o vencido: `AUTH_005`. */
  | { estado: 'noVigente' }
  | { estado: 'valido'; sesion: RespuestaSesion }

/**
 * Canjea un token de refresco por un par nuevo y revoca el usado.
 *
 * El orden es el de `ManejadorRefrescarSesion`: primero se busca la sesión,
 * después se comprueba que esté vigente y recién entonces se revoca y se emite.
 */
export function canjearRefresco(token: string): ResultadoRefresco {
  const registro = refrescos.get(token)

  if (registro === undefined) {
    return { estado: 'desconocido' }
  }

  if (registro.revocado || registro.expiraEn <= Date.now()) {
    return { estado: 'noVigente' }
  }

  registro.revocado = true

  // `emitirSesion` vuelve a guardar; la revocación viaja en la misma escritura.
  return { estado: 'valido', sesion: emitirSesion(registro) }
}
