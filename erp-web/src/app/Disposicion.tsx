import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { cn } from '@/componentes/cn'
import { Boton, BotonIcono } from '@/componentes/Boton'
import {
  IconoApagar,
  IconoCerrar,
  IconoLuna,
  IconoMenu,
  IconoSol,
} from '@/componentes/Iconos'
import { Insignia } from '@/componentes/Superficie'
import { NAVEGACION } from '@/app/navegacion'
import { RelojSesion } from '@/app/RelojSesion'
import { useSesion } from '@/nucleo/autenticacion/ProveedorSesion'
import { configuracion } from '@/nucleo/configuracion'
import { iniciales } from '@/nucleo/formato/formato'
import { useTema } from '@/nucleo/tema'

/**
 * Armazón de la aplicación: barra lateral, encabezado y área de contenido.
 *
 * En escritorio la barra lateral es parte del layout; bajo `lg` se convierte en
 * un panel deslizante. Se usa el mismo árbol para los dos casos —no hay una
 * versión móvil aparte— porque dos árboles se desincronizan en cuanto alguien
 * agrega un módulo y lo registra en uno solo.
 */
export function Disposicion() {
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <div className="flex min-h-dvh bg-fondo">
      <a
        href="#contenido"
        className="solo-lectores focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[var(--radius-borde)] focus:bg-superficie focus:px-3 focus:py-2 focus:text-sm focus:shadow-elevada"
      >
        Saltar al contenido
      </a>

      {menuAbierto && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}

      <BarraLateral abierta={menuAbierto} alCerrar={() => setMenuAbierto(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Encabezado alAbrirMenu={() => setMenuAbierto(true)} />

        <main id="contenido" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function BarraLateral({ abierta, alCerrar }: { abierta: boolean; alCerrar: () => void }) {
  const { tienePermiso, sesion } = useSesion()

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-[17rem] flex-col border-r border-borde bg-superficie',
        'transition-transform duration-200 lg:static lg:translate-x-0',
        abierta ? 'translate-x-0 shadow-elevada' : '-translate-x-full',
      )}
      aria-label="Navegación principal"
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-borde px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Marca />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-texto">ERP Modular</p>
            <p className="truncate text-[0.6875rem] text-texto-tenue">Consola multiempresa</p>
          </div>
        </div>

        <BotonIcono
          titulo="Cerrar menú"
          tamano="sm"
          icono={<IconoCerrar className="size-4" />}
          onClick={alCerrar}
          className="lg:hidden"
        />
      </div>

      <nav className="desplazamiento-fino flex-1 overflow-y-auto px-3 py-4">
        {NAVEGACION.map(seccion => {
          const visibles = seccion.entradas.filter(
            entrada => !entrada.permiso || tienePermiso(entrada.permiso),
          )

          if (visibles.length === 0) {
            return null
          }

          return (
            <div key={seccion.titulo} className="mb-5 last:mb-0">
              <p className="mb-1.5 px-2.5 text-[0.6875rem] font-semibold tracking-wider text-texto-tenue uppercase">
                {seccion.titulo}
              </p>

              <ul className="flex flex-col gap-0.5">
                {visibles.map(entrada => (
                  <li key={entrada.ruta}>
                    <NavLink
                      to={entrada.ruta}
                      end={entrada.exacta ?? false}
                      // Navegar cierra el panel: en móvil, quedarse mirando el menú
                      // abierto encima de la página nueva se siente roto.
                      onClick={alCerrar}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2.5 rounded-[var(--radius-borde)] px-2.5 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-marca-suave font-medium text-marca-texto'
                            : 'text-texto-suave hover:bg-superficie-hundida hover:text-texto',
                        )
                      }
                    >
                      <entrada.icono className="size-[18px] shrink-0" />
                      {entrada.etiqueta}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-borde px-4 py-3">
        {configuracion.modoDemo && (
          <Insignia tono="alerta" punto className="mb-2.5">
            Modo demo
          </Insignia>
        )}

        <p className="text-[0.6875rem] leading-relaxed text-texto-tenue">
          {configuracion.modoDemo
            ? 'Los datos los sirve un Service Worker en el navegador. No hay API ni base de datos detrás.'
            : `API: ${configuracion.urlApi}`}
        </p>

        {sesion && (
          <p className="mt-1 font-mono text-[0.6875rem] text-texto-tenue">
            empresa #{sesion.empresaId} · {sesion.permisos.length} permisos
          </p>
        )}
      </div>
    </aside>
  )
}

function Marca() {
  return (
    <span
      className="grid size-8 shrink-0 place-items-center rounded-[0.55rem] bg-marca text-white"
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M9 10h14M9 16h9M9 22h5" />
        <circle cx="22.5" cy="21.5" r="3.2" strokeWidth="2.2" />
      </svg>
    </span>
  )
}

function Encabezado({ alAbrirMenu }: { alAbrirMenu: () => void }) {
  const { sesion, cerrarSesion } = useSesion()
  const { tema, alternar } = useTema()

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-borde bg-superficie/85 px-4 backdrop-blur sm:px-6 lg:px-8">
      <BotonIcono
        titulo="Abrir menú"
        icono={<IconoMenu />}
        onClick={alAbrirMenu}
        className="lg:hidden"
      />

      <div className="min-w-0 flex-1">
        {sesion && (
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full bg-marca-suave text-[0.6875rem] font-semibold text-marca-texto"
              aria-hidden="true"
            >
              {iniciales(sesion.nombreCompleto)}
            </span>

            <div className="min-w-0 leading-tight">
              <p className="truncate text-[0.8125rem] font-medium text-texto">
                {sesion.nombreCompleto}
              </p>
              <p className="truncate text-[0.6875rem] text-texto-tenue">
                usuario #{sesion.usuarioId}
              </p>
            </div>
          </div>
        )}
      </div>

      <RelojSesion />

      <BotonIcono
        titulo={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        icono={tema === 'oscuro' ? <IconoSol /> : <IconoLuna />}
        onClick={alternar}
      />

      <Boton
        tamano="sm"
        icono={<IconoApagar className="size-4" />}
        onClick={cerrarSesion}
        className="hidden sm:inline-flex"
      >
        Salir
      </Boton>

      <BotonIcono
        titulo="Cerrar sesión"
        icono={<IconoApagar />}
        onClick={cerrarSesion}
        className="sm:hidden"
      />
    </header>
  )
}
