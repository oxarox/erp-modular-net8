import { useEffect, useState } from 'react'
import { cn } from '@/componentes/cn'
import { IconoCandado } from '@/componentes/Iconos'
import { useSesion } from '@/nucleo/autenticacion/ProveedorSesion'
import { fechaUtcDesdeApi } from '@/nucleo/formato/formato'

/**
 * Cuenta atrás del token de acceso.
 *
 * Parece un adorno y no lo es: el backend emite accesos de 30 minutos y valida
 * con `ClockSkew = TimeSpan.Zero`, es decir, sin la tolerancia de cinco minutos
 * que ASP.NET concede por omisión. Un token expirado está expirado. Mostrar
 * cuánto queda convierte «se me cerró la sesión de golpe» en algo previsible, y
 * deja a la vista una decisión de seguridad que de otro modo es invisible.
 *
 * Cuando el token vence, el cliente HTTP lo renueva solo con el token de
 * refresco; este reloj solo informa.
 */
export function RelojSesion() {
  const { sesion } = useSesion()
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), 15_000)

    return () => clearInterval(intervalo)
  }, [])

  if (!sesion) {
    return null
  }

  const expira = fechaUtcDesdeApi(sesion.accesoExpiraUtc)

  if (!expira) {
    return null
  }

  const minutos = Math.max(0, Math.round((expira.getTime() - ahora) / 60_000))
  const porVencer = minutos <= 5

  return (
    <span
      title={`El token de acceso expira a las ${expira.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}. Se renueva solo.`}
      className={cn(
        'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-medium md:inline-flex',
        porVencer
          ? 'border-alerta-borde bg-alerta-suave text-alerta'
          : 'border-borde bg-superficie-hundida text-texto-tenue',
      )}
    >
      <IconoCandado className="size-3.5" />
      <span className="cifra">
        {minutos === 0 ? 'renovando' : `${minutos} min`}
      </span>
    </span>
  )
}
