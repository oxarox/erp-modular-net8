import { cn } from '@/componentes/cn'
import { IconoCerrar, IconoCheque } from '@/componentes/Iconos'
import { CabeceraTarjeta, Insignia, Tarjeta } from '@/componentes/Superficie'
import { useSesion } from '@/nucleo/autenticacion/ProveedorSesion'
import { formatearEntero } from '@/nucleo/formato/formato'
import { Codigo } from '@/caracteristicas/sistema/piezas'
import { CATALOGO_PERMISOS } from '@/caracteristicas/sistema/catalogos'

/**
 * El catálogo completo de permisos, contrastado contra los que trae el token.
 *
 * Mostrar también los que **no** se tienen es lo que hace útil la cuadrícula: la
 * barra lateral ya esconde lo que la sesión no puede usar, de modo que sin esta
 * pantalla un permiso faltante es indistinguible de un módulo inexistente.
 *
 * Que el catálogo se liste desde el cliente es comodidad, no seguridad. Quien
 * autoriza es el servidor, y responde 403 con `API_002` aunque la URL se escriba
 * a mano.
 */
export function SeccionPermisos() {
  const { sesion } = useSesion()
  const permisosDelToken = sesion?.permisos ?? []

  const clavesDelCatalogo = new Set(CATALOGO_PERMISOS.map(permiso => permiso.clave))
  const concedidos = CATALOGO_PERMISOS.filter(permiso => permisosDelToken.includes(permiso.clave))

  // Un permiso que el token trae y el catálogo local no conoce significa que el
  // backend agregó uno y esta consola quedó atrasada. Es información, no un
  // error: se muestra aparte en vez de descartarse en silencio.
  const desconocidos = permisosDelToken.filter(permiso => !clavesDelCatalogo.has(permiso))

  return (
    <Tarjeta>
      <CabeceraTarjeta
        titulo="Permisos del token"
        descripcion="Espejo de ERP.Api/Autorizacion/Permisos.cs, en su mismo orden."
        acciones={
          <Insignia tono={concedidos.length === CATALOGO_PERMISOS.length ? 'exito' : 'neutro'}>
            {formatearEntero(concedidos.length)} de {formatearEntero(CATALOGO_PERMISOS.length)}
          </Insignia>
        }
      />

      <ul className="grid gap-2.5 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-4">
        {CATALOGO_PERMISOS.map(permiso => {
          const concedido = permisosDelToken.includes(permiso.clave)

          return (
            <li
              key={permiso.clave}
              className={cn(
                'flex gap-2.5 rounded-[var(--radius-borde)] border px-3 py-2.5',
                concedido
                  ? 'border-exito-borde bg-exito-suave'
                  : 'border-borde bg-superficie-hundida',
              )}
            >
              {concedido ? (
                <IconoCheque className="mt-px size-4 shrink-0 text-exito" />
              ) : (
                <IconoCerrar className="mt-px size-4 shrink-0 text-texto-tenue" />
              )}

              <div className="min-w-0">
                <p
                  className={cn(
                    'truncate font-mono text-[0.75rem]',
                    concedido ? 'text-texto' : 'text-texto-tenue',
                  )}
                  title={permiso.clave}
                >
                  {permiso.clave}
                </p>
                <p className="mt-0.5 text-[0.75rem] leading-snug text-texto-tenue">{permiso.uso}</p>
                {!permiso.tieneEndpoint && (
                  <p className="mt-1 text-[0.6875rem] text-alerta">Sin endpoint en este repositorio.</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {desconocidos.length > 0 && (
        <div className="border-t border-borde px-4 py-3.5 sm:px-5">
          <p className="text-[0.8125rem] text-texto-suave">
            El token trae {formatearEntero(desconocidos.length)} permiso
            {desconocidos.length === 1 ? '' : 's'} que este catálogo no conoce. El servidor agregó
            algo y la consola quedó atrasada:
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {desconocidos.map(permiso => (
              <li key={permiso}>
                <Codigo>{permiso}</Codigo>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Tarjeta>
  )
}
