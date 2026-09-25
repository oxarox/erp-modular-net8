import { CODIGOS_MARCAS } from '@/nucleo/api/errores'

/**
 * Validación de marca en el cliente.
 *
 * Es el espejo de `ERP.Api/Validadores/Marcas/ValidadorSolicitudCrearMarca.cs`:
 * mismas reglas, mismo orden, mismos códigos y mismos textos. Repetir la regla
 * aquí no es desconfiar del servidor —que la vuelve a aplicar igual—, es no
 * gastar un viaje de ida y vuelta para decirle a alguien que el nombre está
 * vacío.
 *
 * Que el espejo sea literal es justamente lo que lo hace mantenible: si mañana
 * el mínimo pasa de 2 a 3, este archivo se pone al lado del `.cs` y la
 * diferencia salta a la vista.
 *
 * ── Lo que este archivo NO valida ───────────────────────────────────────────
 * `MARCA_003`, el nombre duplicado. Esa regla necesita preguntarle a la base si
 * ya existe otra marca con ese nombre en la empresa, así que vive en
 * `ManejadorCrearMarca` y solo el servidor puede contestarla. El reparto es el
 * mismo que declara el propio validador: aquí la FORMA (requerido, largo), allá
 * las reglas que necesitan mirar el estado del sistema.
 *
 * Se mide la cadena **tal como se va a enviar**, sin recortar, porque eso es lo
 * que el validador del servidor va a medir; el `Trim()` lo hace después el caso
 * de uso, al construir la entidad.
 */

export const LIMITES_MARCA = {
  nombreMinimo: 2,
  nombreMaximo: 120,
  descripcionMaxima: 500,
} as const

export interface BorradorMarca {
  nombre: string
  descripcion: string
  activo: boolean
}

/**
 * Un fallo viaja con su código además del texto: es la misma disciplina que se
 * aplica a los errores del servidor —se reacciona al código, no al mensaje— y
 * permite comparar este archivo con el catálogo de `docs/codigos-error.md`.
 */
export interface FalloValidacion {
  codigo: string
  mensaje: string
}

export interface FallosMarca {
  nombre?: FalloValidacion
  descripcion?: FalloValidacion
}

interface Regla {
  codigo: string
  mensaje: string
  cumple: (valor: string) => boolean
}

const REGLAS_NOMBRE: Regla[] = [
  {
    // Cubre también el nombre de solo espacios, y no `MARCA_002`, porque es lo
    // que hace el servidor: el `NotEmpty()` de FluentValidation considera vacía
    // una cadena en blanco, y con `CascadeMode.Stop` la regla que lleva
    // `MARCA_002` queda inalcanzable. Existe en el validador y nunca se
    // devuelve. Separarlas aquí haría que el cliente anunciara un código que la
    // API no emite, que es exactamente lo que el catálogo viene a evitar.
    codigo: CODIGOS_MARCAS.requerido,
    mensaje: 'El nombre es obligatorio.',
    cumple: valor => valor.trim().length > 0,
  },
  {
    codigo: CODIGOS_MARCAS.longitudMinima,
    mensaje: 'El nombre debe tener al menos 2 caracteres.',
    cumple: valor => valor.length >= LIMITES_MARCA.nombreMinimo,
  },
  {
    codigo: CODIGOS_MARCAS.longitudMaxima,
    mensaje: 'El nombre no puede superar los 120 caracteres.',
    cumple: valor => valor.length <= LIMITES_MARCA.nombreMaximo,
  },
]

const REGLAS_DESCRIPCION: Regla[] = [
  {
    codigo: CODIGOS_MARCAS.longitudMaxima,
    mensaje: 'La descripción no puede superar los 500 caracteres.',
    cumple: valor => valor.length <= LIMITES_MARCA.descripcionMaxima,
  },
]

/**
 * Devuelve solo el primer incumplimiento, como el `CascadeMode.Stop` del
 * validador: sin eso, un campo vacío mostraría a la vez «es obligatorio» y
 * «debe tener al menos 2 caracteres», que es ruido y no información.
 */
function primerFallo(valor: string, reglas: Regla[]): FalloValidacion | null {
  const incumplida = reglas.find(regla => !regla.cumple(valor))

  return incumplida ? { codigo: incumplida.codigo, mensaje: incumplida.mensaje } : null
}

export function validarMarca(borrador: BorradorMarca): FallosMarca {
  const fallos: FallosMarca = {}
  const nombre = primerFallo(borrador.nombre, REGLAS_NOMBRE)
  const descripcion = primerFallo(borrador.descripcion, REGLAS_DESCRIPCION)

  if (nombre) {
    fallos.nombre = nombre
  }

  if (descripcion) {
    fallos.descripcion = descripcion
  }

  return fallos
}

/** Aplana los fallos al diccionario `campo → mensaje` que consume `Campo`. */
export function mensajesDeFallos(fallos: FallosMarca): Record<string, string> {
  return {
    ...(fallos.nombre ? { nombre: fallos.nombre.mensaje } : {}),
    ...(fallos.descripcion ? { descripcion: fallos.descripcion.mensaje } : {}),
  }
}
