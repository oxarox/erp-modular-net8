import { Boton } from '@/componentes/Boton'
import { cn } from '@/componentes/cn'
import { CabeceraTarjeta, Tarjeta } from '@/componentes/Superficie'
import { configuracion } from '@/nucleo/configuracion'

/**
 * Credenciales de la demostración.
 *
 * Los botones rellenan el formulario en vez de entrar directamente. La
 * diferencia importa: quien mira la pantalla ve qué correo y qué contraseña se
 * están usando, puede cambiarlos antes de enviar, y el gesto de entrar sigue
 * siendo suyo. Un botón que inicia sesión solo deja la sensación de que la
 * pantalla hace cosas a sus espaldas.
 *
 * Son credenciales de la semilla de desarrollo, publicadas a propósito en
 * `nucleo/configuracion.ts`; aquí no se inventa ninguna.
 */
export function CredencialesDemo({
  alRellenar,
  className,
}: {
  alRellenar: (correo: string, contrasena: string) => void
  className?: string
}) {
  return (
    <Tarjeta className={cn('bg-superficie-hundida', className)}>
      <CabeceraTarjeta
        titulo="Credenciales de demostración"
        descripcion="Dos usuarios de dos empresas distintas. Entre con uno y después con el otro: sirve para comprobar el aislamiento multiempresa, porque los datos de una empresa no aparecen en la sesión de la otra."
      />

      <ul className="divide-y divide-borde">
        {configuracion.credencialesDemo.map(credencial => (
          <li
            key={credencial.correo}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
          >
            <div className="min-w-0">
              <p className="truncate text-[0.8125rem] font-medium text-texto">
                {credencial.empresa}
              </p>
              <p className="truncate font-mono text-[0.75rem] text-texto-tenue">
                {credencial.correo} · {credencial.contrasena}
              </p>
            </div>

            <Boton
              tamano="sm"
              aria-label={`Rellenar el formulario con las credenciales de ${credencial.empresa}`}
              onClick={() => alRellenar(credencial.correo, credencial.contrasena)}
            >
              Rellenar
            </Boton>
          </li>
        ))}
      </ul>
    </Tarjeta>
  )
}
