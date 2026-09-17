/**
 * Une clases de CSS descartando `false`, `null` y `undefined`.
 *
 * Es deliberadamente mínimo —no resuelve conflictos entre utilidades de Tailwind
 * como haría `tailwind-merge`— porque en esta aplicación los componentes definen
 * su propia base y solo reciben clases aditivas desde fuera. Traer una
 * dependencia para eso sería pagar 8 kB por un problema que no tenemos.
 */
export type ValorClase = string | false | null | undefined

export function cn(...clases: ValorClase[]): string {
  return clases.filter(Boolean).join(' ')
}
