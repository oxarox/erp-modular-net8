import type { SVGProps } from 'react'

/**
 * Juego de iconos propio, en SVG inline.
 *
 * Son trazos de 24×24 con `currentColor`, de modo que heredan el color del texto
 * y funcionan en los dos temas sin variantes. Se escriben a mano en lugar de
 * traer una librería de iconos porque la aplicación usa quince, y quince iconos
 * pesan menos que el árbol de dependencias de cualquier paquete que traiga mil.
 *
 * Todos son decorativos (`aria-hidden`): el significado lo aporta el texto que
 * los acompaña o el `aria-label` del control que los contiene.
 */

type PropsIcono = SVGProps<SVGSVGElement>

function Base({ children, ...props }: PropsIcono) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      width={20}
      height={20}
      {...props}
    >
      {children}
    </svg>
  )
}

export const IconoTablero = (p: PropsIcono) => (
  <Base {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Base>
)

export const IconoEtiqueta = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M3.5 12.7V5.5A2 2 0 0 1 5.5 3.5h7.2a2 2 0 0 1 1.41.59l6.3 6.3a2 2 0 0 1 0 2.82l-7.2 7.2a2 2 0 0 1-2.82 0l-6.3-6.3a2 2 0 0 1-.59-1.41Z" />
    <circle cx="8.5" cy="8.5" r="1.4" />
  </Base>
)

export const IconoRecibo = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M5 3.5h14v17l-2.5-1.5L14 20.5 12 19l-2 1.5L7.5 19 5 20.5Z" />
    <path d="M9 8.5h6M9 12.5h6" />
  </Base>
)

export const IconoCarrito = (p: PropsIcono) => (
  <Base {...p}>
    <circle cx="9.5" cy="19.5" r="1.3" />
    <circle cx="17.5" cy="19.5" r="1.3" />
    <path d="M2.5 3.5h2.2l2.3 11.2a1.5 1.5 0 0 0 1.47 1.2h8.8a1.5 1.5 0 0 0 1.47-1.17L20.5 7H6" />
  </Base>
)

export const IconoPulso = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M2.5 12.5h4l2-6 3.5 12 3-9 2 3h4.5" />
  </Base>
)

export const IconoBuscar = (p: PropsIcono) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Base>
)

export const IconoMas = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
)

export const IconoLapiz = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17Z" />
    <path d="m14.5 6.5 3 3" />
  </Base>
)

export const IconoApagar = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M12 3.5v8" />
    <path d="M18 6.6a8 8 0 1 1-12 0" />
  </Base>
)

export const IconoBasura = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M4 7h16M9.5 7V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4A1.3 1.3 0 0 1 14.5 4.8V7" />
    <path d="M6 7h12l-.9 12.2a1.6 1.6 0 0 1-1.6 1.3H8.5a1.6 1.6 0 0 1-1.6-1.3Z" />
  </Base>
)

export const IconoCerrar = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
)

export const IconoCheque = (p: PropsIcono) => (
  <Base {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Base>
)

export const IconoAlerta = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M12 3.8 2.8 20h18.4Z" />
    <path d="M12 10v4" />
    <path d="M12 17.2h.01" />
  </Base>
)

export const IconoInfo = (p: PropsIcono) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5" />
    <path d="M12 7.8h.01" />
  </Base>
)

export const IconoSol = (p: PropsIcono) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Base>
)

export const IconoLuna = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.5 8.5 0 1 0 10.2 10.2Z" />
  </Base>
)

export const IconoFlechaIzquierda = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </Base>
)

export const IconoFlechaDerecha = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M9.5 5.5 16 12l-6.5 6.5" />
  </Base>
)

export const IconoMenu = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M4 6.5h16M4 12h16M4 17.5h16" />
  </Base>
)

export const IconoCaja = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4Z" />
    <path d="M3.5 7.5 12 11.6l8.5-4.1M12 11.6v8.9" />
  </Base>
)

export const IconoCandado = (p: PropsIcono) => (
  <Base {...p}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </Base>
)

export const IconoEscudo = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M12 3 5 5.8v5.4c0 4.3 2.9 8.2 7 9.3 4.1-1.1 7-5 7-9.3V5.8Z" />
    <path d="m9 12 2 2 4-4.2" />
  </Base>
)

export const IconoActualizar = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M20 11.5A8 8 0 1 0 18.3 17" />
    <path d="M20.5 4.5v5h-5" />
  </Base>
)
