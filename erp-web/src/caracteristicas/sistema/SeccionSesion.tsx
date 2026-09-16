import { useEffect, useState } from 'react'
import { cn } from '@/componentes/cn'
import { CabeceraTarjeta, Tarjeta } from '@/componentes/Superficie'
import { useSesion } from '@/nucleo/autenticacion/ProveedorSesion'
import {
  fechaUtcDesdeApi,
  formatearEntero,
  formatearFechaHora,
  formatearRelativo,
} from '@/nucleo/formato/formato'
import { Codigo, Dato, ListaNotas, Nota, RejillaDatos } from '@/caracteristicas/sistema/piezas'
import { CATALOGO_PERMISOS } from '@/caracteristicas/sistema/catalogos'

/**
 * La sesión actual, con las tres decisiones de seguridad que la explican.
 *
 * Todo lo que se muestra aquí llegó en la respuesta del login: la consola no
 * abre el JWT ni decodifica su carga útil. No hace falta —el servidor ya
 * devuelve los mismos datos en el cuerpo— y meter un decodificador de tokens en
 * el cliente invita a empezar a *confiar* en lo que el token dice, que es
 * exactamente lo que no corresponde hacer del lado del navegador.
 */
export function SeccionSesion() {
  const { sesion } = useSesion()
  const ahora = useAhora()

  // `RutaProtegida` garantiza que aquí hay sesión; el guardia existe porque el
  // tipo lo permite, no porque el caso ocurra.
  if (!sesion) {
    return null
  }

  const acceso = cuentaAtras(fechaUtcDesdeApi(sesion.accesoExpiraUtc), ahora)
  const refresco = cuentaAtras(fechaUtcDesdeApi(sesion.refrescoExpiraUtc), ahora)

  return (
    <Tarjeta>
      <CabeceraTarjeta
        titulo="La sesión actual"
        descripcion="Lo que devolvió el login, tal cual. La consola no abre el token."
      />

      <RejillaDatos className="sm:grid-cols-3">
        <Dato etiqueta="Usuario" valor={sesion.nombreCompleto} />

        <Dato etiqueta="Identificador" mono valor={`#${sesion.usuarioId}`} />

        <Dato
          etiqueta="Empresa"
          mono
          valor={`#${sesion.empresaId}`}
          ayuda="Resuelta desde el claim del token, nunca desde la petición."
        />

        <Dato
          etiqueta="Permisos en el token"
          mono
          valor={`${formatearEntero(sesion.permisos.length)} de ${CATALOGO_PERMISOS.length}`}
          ayuda="Viajan firmados: autorizar no cuesta una consulta."
        />

        <Dato
          etiqueta="Acceso"
          valor={<CuentaAtras {...acceso} />}
          ayuda={`Expira a las ${formatearFechaHora(sesion.accesoExpiraUtc)}. Se renueva solo.`}
        />

        <Dato
          etiqueta="Refresco"
          valor={<CuentaAtras {...refresco} />}
          ayuda={`Expira el ${formatearFechaHora(sesion.refrescoExpiraUtc)}. De un solo uso.`}
        />
      </RejillaDatos>

      <div className="border-t border-borde px-4 py-4 sm:px-5">
        <ListaNotas>
          <Nota titulo="Los permisos viajan firmados dentro del token.">
            El servidor no consulta la base de datos para autorizar: lee los claims del JWT que la
            petición ya trae. El costo aceptado es el opuesto y está escrito en el ADR-0003:
            quitarle un permiso a alguien no surte efecto hasta que su acceso expira. Por eso el
            acceso dura minutos y no horas, y por eso existe el claim{' '}
            <Codigo>auth_version</Codigo>, que invalida de golpe todos los tokens vivos de un
            usuario subiendo un entero.
          </Nota>

          <Nota titulo="Un token expirado está expirado.">
            El backend valida con <Codigo>ClockSkew = TimeSpan.Zero</Codigo>, sin los cinco minutos
            de tolerancia que ASP.NET concede por omisión —cinco minutos de tolerancia son cinco
            minutos de acceso después de vencido—. Cuando la cuenta atrás llega a cero la petición
            siguiente recibe 401, y el cliente HTTP canjea el refresco sin que nadie vuelva a
            escribir la contraseña.
          </Nota>

          <Nota titulo="La empresa sale del token, nunca de la URL.">
            Ningún endpoint acepta un <Codigo>empresaId</Codigo> por ruta, query o cuerpo: si el
            cliente pudiera proponerlo no habría aislamiento. Cambiar un número en la barra de
            direcciones no muestra datos de otra empresa, porque la consulta ya viene recortada por
            el filtro global del <Codigo>DbContext</Codigo> y, además, cada método de repositorio
            recibe el <Codigo>empresaId</Codigo> explícito. Dos barreras, no una (ADR-0002).
          </Nota>
        </ListaNotas>
      </div>
    </Tarjeta>
  )
}

function CuentaAtras({ texto, urgente }: { texto: string; urgente: boolean }) {
  return (
    <span className={cn('cifra font-mono text-[0.8125rem]', urgente && 'text-alerta')}>{texto}</span>
  )
}

/**
 * Tiempo restante hasta un vencimiento.
 *
 * Los minutos son la unidad útil mientras queden pocos —es el dato que dice si
 * conviene guardar antes de enviar—; para el refresco, que dura siete días,
 * «quedan 9.840 min» no informa nada, así que se cambia a tiempo relativo.
 */
function cuentaAtras(fecha: Date | null, ahora: number): { texto: string; urgente: boolean } {
  if (!fecha) {
    return { texto: '—', urgente: false }
  }

  const minutos = Math.round((fecha.getTime() - ahora) / 60_000)

  if (minutos <= 0) {
    return { texto: 'expirado', urgente: true }
  }

  if (minutos < 120) {
    return { texto: `quedan ${formatearEntero(minutos)} min`, urgente: minutos <= 5 }
  }

  return { texto: formatearRelativo(fecha, new Date(ahora)), urgente: false }
}

/**
 * Marca de tiempo que avanza sola.
 *
 * Cada 15 segundos y no cada segundo: lo que se muestra son minutos, y un
 * render por segundo solo gastaría batería para repintar el mismo número
 * cincuenta y nueve veces.
 */
function useAhora(intervaloMs = 15_000): number {
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), intervaloMs)

    return () => clearInterval(intervalo)
  }, [intervaloMs])

  return ahora
}
