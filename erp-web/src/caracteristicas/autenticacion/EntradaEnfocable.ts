import type { ComponentProps, ReactNode, RefAttributes } from 'react'
import { Entrada } from '@/componentes/Formulario'

/**
 * La `Entrada` del sistema de diseño, declarada de forma que acepte `ref`.
 *
 * `Entrada` tipa sus props como `InputHTMLAttributes`, que no incluye `ref`, así
 * que el compilador rechaza pasarle una aunque en tiempo de ejecución funcione:
 * en React 19 la `ref` es una prop más y `Entrada` hace spread de todas sus
 * props sobre el `<input>`, de modo que llega al elemento. Lo único que falta es
 * el tipo.
 *
 * Esto no es una aserción que tape un error: una función que acepta menos props
 * es válida allí donde se esperan más, y TypeScript lo comprueba. La alternativa
 * —copiar las clases del control para poder enfocarlo— duplicaría el sistema de
 * diseño para ganar una llamada a `focus()`.
 *
 * Si algún día `componentes/Formulario` declara `ref` en sus props, este archivo
 * sobra y se borra.
 */
export const EntradaEnfocable: (
  props: ComponentProps<typeof Entrada> & RefAttributes<HTMLInputElement>,
) => ReactNode = Entrada
