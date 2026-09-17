/**
 * Generador pseudoaleatorio con semilla fija.
 *
 * Existe en lugar de `Math.random()` por un motivo que se nota a la primera
 * recarga: una demo que muestra cifras distintas cada vez se lee como rota, y
 * dos capturas de la misma pantalla no coinciden jamás. Con semilla fija el
 * catálogo, los folios, las fechas y los montos son idénticos en todos los
 * navegadores y en todas las sesiones, de modo que un enlace a la demo muestra
 * exactamente lo que mostraba cuando alguien lo compartió.
 *
 * Es un xorshift32 de seis líneas. No sirve para criptografía y aquí nadie lo
 * necesita: lo único que se le pide es repartir bien y repetirse siempre.
 */

export interface OpcionPonderada<T> {
  valor: T
  /** Peso relativo, no una probabilidad: los pesos no tienen que sumar uno. */
  peso: number
}

export interface Aleatorio {
  /** Fracción en `[0, 1)`. */
  siguiente(): number
  /** Entero en `[minimo, maximo]`, ambos extremos incluidos. */
  entero(minimo: number, maximo: number): number
  decision(probabilidad: number): boolean
  /**
   * Un elemento al azar.
   *
   * El respaldo va en la firma y no se resuelve con `!` porque un arreglo vacío
   * de verdad no tiene nada que devolver: `noUncheckedIndexedAccess` tiene razón
   * en avisarlo, y obligar a quien llama a decir qué pasa en ese caso es más
   * honesto que afirmarle al compilador algo que no se sabe.
   */
  elegir<T>(opciones: readonly T[], respaldo: T): T
  ponderado<T>(opciones: readonly OpcionPonderada<T>[], respaldo: T): T
}

export function crearAleatorio(semilla: number): Aleatorio {
  // Cero es el punto fijo del xorshift: partir de ahí devolvería cero para
  // siempre. Se sustituye por la razón áurea en 32 bits, la constante de
  // siembra habitual para esta familia de generadores.
  let estado = (semilla >>> 0) || 0x9e37_79b9

  function siguiente(): number {
    estado ^= estado << 13
    estado ^= estado >>> 17
    estado ^= estado << 5
    estado >>>= 0

    return estado / 0x1_0000_0000
  }

  const aleatorio: Aleatorio = {
    siguiente,

    entero(minimo, maximo) {
      return minimo + Math.floor(siguiente() * (maximo - minimo + 1))
    },

    decision(probabilidad) {
      return siguiente() < probabilidad
    },

    elegir(opciones, respaldo) {
      return opciones[Math.floor(siguiente() * opciones.length)] ?? respaldo
    },

    ponderado(opciones, respaldo) {
      const total = opciones.reduce((suma, opcion) => suma + opcion.peso, 0)
      let restante = siguiente() * total

      for (const opcion of opciones) {
        restante -= opcion.peso

        if (restante < 0) {
          return opcion.valor
        }
      }

      // Solo se llega aquí con la lista vacía o con todos los pesos en cero.
      return respaldo
    },
  }

  return aleatorio
}

/**
 * FNV-1a de 32 bits.
 *
 * Convierte una cadena —la ruta de un endpoint, por ejemplo— en una semilla
 * estable, para derivar de ella un valor reproducible sin arrastrar el estado
 * de ningún generador compartido.
 */
export function hashTexto(texto: string): number {
  let hash = 0x811c_9dc5

  for (let indice = 0; indice < texto.length; indice += 1) {
    hash ^= texto.charCodeAt(indice)
    hash = Math.imul(hash, 0x0100_0193)
  }

  return hash >>> 0
}
