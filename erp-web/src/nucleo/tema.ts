import { useCallback, useSyncExternalStore } from 'react'

/**
 * Tema claro / oscuro.
 *
 * La clase `.dark` la aplica el script inline de `index.html` antes del primer
 * pintado; este módulo solo la conmuta después. Ese reparto es intencional: si
 * la decisión inicial la tomara React, la página se pintaría en claro durante un
 * fotograma antes de hidratarse, y ese destello blanco a las dos de la mañana es
 * exactamente lo que el modo oscuro viene a evitar.
 *
 * Tres estados posibles, no dos: sin preferencia guardada se sigue al sistema
 * operativo, y solo una elección explícita se persiste.
 */

export type Tema = 'claro' | 'oscuro'

const CLAVE = 'erp.tema'

type Escucha = () => void
const escuchas = new Set<Escucha>()

function notificar(): void {
  for (const escucha of escuchas) {
    escucha()
  }
}

function suscribir(escucha: Escucha): () => void {
  escuchas.add(escucha)

  const consulta = window.matchMedia('(prefers-color-scheme: dark)')
  const alCambiarSistema = () => {
    // Solo se sigue al sistema mientras no haya una elección explícita.
    if (leerGuardado() === null) {
      aplicar(consulta.matches ? 'oscuro' : 'claro')
      notificar()
    }
  }

  consulta.addEventListener('change', alCambiarSistema)

  return () => {
    escuchas.delete(escucha)
    consulta.removeEventListener('change', alCambiarSistema)
  }
}

function leerGuardado(): Tema | null {
  try {
    const valor = window.localStorage.getItem(CLAVE)

    return valor === 'claro' || valor === 'oscuro' ? valor : null
  } catch {
    return null
  }
}

function aplicar(tema: Tema): void {
  document.documentElement.classList.toggle('dark', tema === 'oscuro')
}

function temaActual(): Tema {
  return document.documentElement.classList.contains('dark') ? 'oscuro' : 'claro'
}

export function useTema(): { tema: Tema; alternar: () => void } {
  const tema = useSyncExternalStore(suscribir, temaActual, () => 'claro' as const)

  const alternar = useCallback(() => {
    const siguiente: Tema = temaActual() === 'oscuro' ? 'claro' : 'oscuro'

    try {
      window.localStorage.setItem(CLAVE, siguiente)
    } catch {
      // Sin persistencia el tema dura lo que dure la pestaña. Sigue siendo mejor
      // que no poder cambiarlo.
    }

    aplicar(siguiente)
    notificar()
  }, [])

  return { tema, alternar }
}
