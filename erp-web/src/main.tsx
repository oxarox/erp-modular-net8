import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import '@/estilos/global.css'
import { Rutas } from '@/app/Rutas'
import { crearClienteConsultas } from '@/app/clienteConsultas'
import { ProveedorNotificaciones } from '@/componentes/Notificaciones'
import { ProveedorSesion } from '@/nucleo/autenticacion/ProveedorSesion'
import { configuracion } from '@/nucleo/configuracion'

/**
 * Punto de entrada.
 *
 * El orden de los proveedores no es arbitrario: las notificaciones envuelven a
 * todo porque cualquier capa puede necesitar avisar; la sesión va por dentro
 * porque un fallo al restaurarla se anuncia con una notificación; y el cliente
 * de consultas va por dentro de la sesión porque sus peticiones ya salen con
 * token.
 *
 * En modo demo el Service Worker se registra ANTES de montar React. Si React
 * montara primero, las primeras consultas saldrían a una API que no existe y la
 * pantalla arrancaría con un error de red.
 */
// Fuera de la función: un QueryClient por proceso. Crearlo dentro del render
// devolvería una caché nueva en cada pasada y todas las consultas volverían a
// pedir datos como si fuera la primera vez.
const clienteConsultas = crearClienteConsultas()

async function arrancar(): Promise<void> {
  if (configuracion.modoDemo) {
    const { iniciarSimulacion } = await import('@/simulacion/iniciar')
    await iniciarSimulacion()
  }

  const contenedor = document.getElementById('root')

  if (!contenedor) {
    throw new Error('Falta el contenedor #root en index.html.')
  }

  createRoot(contenedor).render(
    <StrictMode>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <ProveedorNotificaciones>
          <ProveedorSesion>
            <QueryClientProvider client={clienteConsultas}>
              <Rutas />
            </QueryClientProvider>
          </ProveedorSesion>
        </ProveedorNotificaciones>
      </BrowserRouter>
    </StrictMode>,
  )
}

void arrancar()
