import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Retrasa un valor hasta que deja de cambiar.
 *
 * Se usa en los buscadores: sin esto, escribir «insumo» dispara seis consultas
 * y la respuesta de la tercera puede llegar después de la sexta y pintar
 * resultados viejos.
 */
export function useValorRetrasado<T>(valor: T, milisegundos = 300): T {
  const [retrasado, setRetrasado] = useState(valor)

  useEffect(() => {
    const temporizador = setTimeout(() => setRetrasado(valor), milisegundos)

    return () => clearTimeout(temporizador)
  }, [valor, milisegundos])

  return retrasado
}

/**
 * Filtros de una pantalla, guardados en la barra de direcciones.
 *
 * Que el estado viva en la URL y no en `useState` tiene tres consecuencias que
 * se notan en un ERP: el enlace de «ventas anuladas de septiembre» se puede
 * pegar en un chat, el botón «atrás» del navegador deshace un filtro en vez de
 * salirse de la pantalla, y recargar no pierde lo que se estaba mirando.
 *
 * Los valores vacíos se borran de la URL en lugar de escribirse como `?x=`:
 * una barra de direcciones llena de parámetros vacíos es ilegible y, además,
 * `?pagina=1` no aporta nada sobre el valor por defecto.
 */
export function useFiltrosEnUrl<T extends Record<keyof T, string>>(
  porDefecto: T,
): {
  filtros: T
  establecer: (cambios: Partial<T>) => void
  limpiar: () => void
  hayFiltros: boolean
} {
  const [parametros, setParametros] = useSearchParams()

  // El objeto de valores por defecto suele escribirse como constante a nivel de
  // módulo, pero también puede venir como literal en línea, y compararlo por
  // identidad recalcularía en cada render. Se compara por contenido.
  const firma = JSON.stringify(porDefecto)

  const filtros = useMemo(() => {
    const base = JSON.parse(firma) as T
    const resultado = { ...base }

    for (const clave of Object.keys(base) as (keyof T)[]) {
      const valor = parametros.get(String(clave))

      if (valor !== null) {
        resultado[clave] = valor as T[keyof T]
      }
    }

    return resultado
  }, [parametros, firma])

  const establecer = useCallback(
    (cambios: Partial<T>) => {
      const base = JSON.parse(firma) as T

      setParametros(
        actuales => {
          const siguientes = new URLSearchParams(actuales)

          for (const [clave, valor] of Object.entries(cambios) as [keyof T, string | undefined][]) {
            // Un valor igual al de por defecto se borra en vez de escribirse:
            // `?pagina=1` no aporta nada sobre no poner nada, y una barra de
            // direcciones llena de parámetros redundantes es ilegible.
            if (valor === undefined || valor === '' || valor === base[clave]) {
              siguientes.delete(String(clave))
            } else {
              siguientes.set(String(clave), valor)
            }
          }

          return siguientes
        },
        { replace: true },
      )
    },
    [setParametros, firma],
  )

  const limpiar = useCallback(() => {
    setParametros(new URLSearchParams(), { replace: true })
  }, [setParametros])

  /**
   * Verdadero cuando algún filtro se apartó de su valor por defecto —incluida la
   * paginación—. Es la condición del botón «Limpiar», que devuelve la pantalla a
   * su vista inicial y no solo a sus filtros de contenido.
   */
  const hayFiltros = (Object.keys(porDefecto) as (keyof T)[]).some(
    clave => filtros[clave] !== porDefecto[clave],
  )

  return { filtros, establecer, limpiar, hayFiltros }
}

/**
 * Enfoca un elemento una sola vez, al montar.
 * Se usa en el primer campo de un formulario y en el buscador de una tabla.
 */
export function useEnfoqueInicial<T extends HTMLElement>(activo = true) {
  const referencia = useRef<T>(null)

  useEffect(() => {
    if (activo) {
      referencia.current?.focus()
    }
  }, [activo])

  return referencia
}
