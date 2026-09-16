import type { ComponentType, SVGProps } from 'react'
import {
  IconoCaja,
  IconoCarrito,
  IconoEtiqueta,
  IconoPulso,
  IconoRecibo,
  IconoTablero,
} from '@/componentes/Iconos'
import { PERMISOS } from '@/nucleo/autenticacion/almacenSesion'

/**
 * Mapa de navegación.
 *
 * Cada entrada declara el permiso que la habilita, y la barra lateral esconde lo
 * que el usuario no puede usar. Esto es **comodidad, no seguridad**: los permisos
 * viajan firmados dentro del JWT y quien manda es el servidor, que responde 403
 * con `API_002` aunque alguien escriba la URL a mano. Ocultar el enlace evita que
 * la persona descubra por un 403 que no tenía acceso; no evita nada más.
 * Ver docs/decisiones/ADR-0003-rbac-por-permisos.md.
 */

export interface EntradaNavegacion {
  ruta: string
  etiqueta: string
  icono: ComponentType<SVGProps<SVGSVGElement>>
  /** `undefined` = visible para cualquier sesión válida. */
  permiso?: string
  /** Coincidencia exacta de ruta; sin esto `/ventas` marcaría también `/ventas/nueva`. */
  exacta?: boolean
}

export interface SeccionNavegacion {
  titulo: string
  entradas: EntradaNavegacion[]
}

export const NAVEGACION: SeccionNavegacion[] = [
  {
    titulo: 'Operación',
    entradas: [
      { ruta: '/', etiqueta: 'Tablero', icono: IconoTablero, exacta: true },
      { ruta: '/ventas', etiqueta: 'Ventas', icono: IconoRecibo, permiso: PERMISOS.ventas.ver, exacta: true },
      {
        ruta: '/ventas/nueva',
        etiqueta: 'Nueva venta',
        icono: IconoCarrito,
        permiso: PERMISOS.ventas.registrar,
      },
    ],
  },
  {
    titulo: 'Catálogo',
    entradas: [
      { ruta: '/marcas', etiqueta: 'Marcas', icono: IconoEtiqueta, permiso: PERMISOS.marcas.ver },
      { ruta: '/productos', etiqueta: 'Productos', icono: IconoCaja, permiso: PERMISOS.productos.ver },
    ],
  },
  {
    titulo: 'Sistema',
    entradas: [{ ruta: '/sistema', etiqueta: 'Estado y arquitectura', icono: IconoPulso }],
  },
]
