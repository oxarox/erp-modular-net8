import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router'
import { Disposicion } from '@/app/Disposicion'
import { PantallaCarga, RutaProtegida } from '@/app/RutaProtegida'
import { Boton } from '@/componentes/Boton'
import { EstadoVacio } from '@/componentes/Superficie'
import { alCaerLaSesion } from '@/nucleo/api/cliente'
import { PERMISOS } from '@/nucleo/autenticacion/almacenSesion'

/**
 * Mapa de rutas.
 *
 * Cada pantalla se carga bajo demanda: quien entra al tablero no descarga el
 * formulario de venta ni la pantalla de arquitectura. Con siete pantallas la
 * diferencia es modesta, pero es el patrón que sostiene un sistema de 31
 * módulos, que es lo que este repositorio está mostrando.
 */

const PaginaSesion = lazy(() => import('@/caracteristicas/autenticacion/PaginaSesion'))
const PaginaTablero = lazy(() => import('@/caracteristicas/tablero/PaginaTablero'))
const PaginaMarcas = lazy(() => import('@/caracteristicas/marcas/PaginaMarcas'))
const PaginaProductos = lazy(() => import('@/caracteristicas/productos/PaginaProductos'))
const PaginaVentas = lazy(() => import('@/caracteristicas/ventas/PaginaVentas'))
const PaginaNuevaVenta = lazy(() => import('@/caracteristicas/ventas/PaginaNuevaVenta'))
const PaginaSistema = lazy(() => import('@/caracteristicas/sistema/PaginaSistema'))

export function Rutas() {
  useRedirigirAlCaerLaSesion()

  return (
    <Suspense fallback={<PantallaCarga mensaje="Cargando…" />}>
      <Routes>
        <Route path="/sesion" element={<PaginaSesion />} />

        <Route
          element={
            <RutaProtegida>
              <Disposicion />
            </RutaProtegida>
          }
        >
          <Route index element={<PaginaTablero />} />

          <Route
            path="marcas"
            element={
              <RutaProtegida permiso={PERMISOS.marcas.ver}>
                <PaginaMarcas />
              </RutaProtegida>
            }
          />

          <Route
            path="productos"
            element={
              <RutaProtegida permiso={PERMISOS.productos.ver}>
                <PaginaProductos />
              </RutaProtegida>
            }
          />

          <Route
            path="ventas"
            element={
              <RutaProtegida permiso={PERMISOS.ventas.ver}>
                <PaginaVentas />
              </RutaProtegida>
            }
          />

          <Route
            path="ventas/nueva"
            element={
              <RutaProtegida permiso={PERMISOS.ventas.registrar}>
                <PaginaNuevaVenta />
              </RutaProtegida>
            }
          />

          <Route path="sistema" element={<PaginaSistema />} />

          <Route path="*" element={<PaginaNoEncontrada />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

/**
 * Cuando el cliente HTTP no logra renovar el acceso, la sesión se limpia sola.
 * Aquí solo se completa el gesto: sacar a la persona de una pantalla que ya no
 * puede cargar datos y llevarla al login.
 */
function useRedirigirAlCaerLaSesion(): void {
  const navegar = useNavigate()

  useEffect(
    () =>
      alCaerLaSesion(() => {
        navegar('/sesion', { replace: true })
      }),
    [navegar],
  )
}

function PaginaNoEncontrada() {
  const navegar = useNavigate()

  return (
    <EstadoVacio
      titulo="Esa pantalla no existe"
      descripcion="Puede que el enlace esté mal escrito o que el módulo todavía no esté implementado en este repositorio."
      accion={
        <Boton tono="primario" onClick={() => navegar('/')}>
          Ir al tablero
        </Boton>
      }
    />
  )
}
