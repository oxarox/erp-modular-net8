import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Navigate, useLocation } from 'react-router'
import { PantallaCarga } from '@/app/RutaProtegida'
import { Boton, BotonIcono } from '@/componentes/Boton'
import { Campo, Entrada } from '@/componentes/Formulario'
import { IconoCandado, IconoLuna, IconoSol } from '@/componentes/Iconos'
import { AvisoError } from '@/componentes/Superficie'
import { CredencialesDemo } from '@/caracteristicas/autenticacion/CredencialesDemo'
import { EntradaEnfocable } from '@/caracteristicas/autenticacion/EntradaEnfocable'
import { MarcaErp, PanelMarca } from '@/caracteristicas/autenticacion/PanelMarca'
import { SondaSalud } from '@/caracteristicas/autenticacion/SondaSalud'
import { validarCredenciales } from '@/caracteristicas/autenticacion/validacionSesion'
import type {
  CampoCredencial,
  FalloValidacion,
} from '@/caracteristicas/autenticacion/validacionSesion'
import type { SolicitudIniciarSesion } from '@/nucleo/api/contratos'
import { erroresPorCampo } from '@/nucleo/api/errores'
import { useSesion } from '@/nucleo/autenticacion/ProveedorSesion'
import { useEnfoqueInicial } from '@/nucleo/hooks'
import { useTema } from '@/nucleo/tema'

/**
 * Pantalla de inicio de sesión: la única ruta pública de la consola.
 *
 * Tres decisiones sostienen el archivo:
 *
 * 1. **No se navega a mano tras entrar.** La salida es un único `<Navigate>`
 *    gobernado por `autenticado`, así que da igual si la sesión apareció por
 *    este formulario o por la restauración del token de refresco al arrancar.
 *    Llamar además a `navigate()` desde el `onSuccess` abriría una carrera entre
 *    ese salto y el render que dispara el almacén de sesión al llenarse.
 * 2. **Las tres reglas del validador del servidor se comprueban antes de
 *    llamar** (`validacionSesion.ts`), con sus mismos códigos y textos.
 * 3. **Los errores se clasifican por código, no por texto**: los de validación
 *    van al campo que los origina, y los de credenciales al formulario entero.
 */
export default function PaginaSesion() {
  const { autenticado, restaurando, iniciarSesion } = useSesion()
  const ubicacion = useLocation()
  const { tema, alternar } = useTema()
  const referenciaCorreo = useEnfoqueInicial<HTMLInputElement>()

  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [fallosCliente, setFallosCliente] = useState<
    Partial<Record<CampoCredencial, FalloValidacion>>
  >({})

  const envio = useMutation({
    mutationFn: (credenciales: SolicitudIniciarSesion) =>
      iniciarSesion(credenciales.correo, credenciales.contrasena),
  })

  const erroresDelServidor = erroresPorCampo(envio.error)

  /**
   * Un error sin campo asociado se muestra como error del formulario, y el caso
   * normal aquí es `AUTH_001`: el backend responde exactamente lo mismo si el
   * correo no existe que si la contraseña está mal
   * (`ManejadorIniciarSesion.ManejarAsync`), para que nadie pueda averiguar qué
   * correos están registrados probándolos uno a uno. Colgar ese error del campo
   * «correo» filtraría precisamente lo que el servidor se cuidó de no decir.
   * `AUTH_002` —usuario inactivo, 403— tampoco pertenece a ningún campo.
   */
  const errorGeneral =
    envio.error !== null && Object.keys(erroresDelServidor).length === 0 ? envio.error : null

  /**
   * Escribir invalida el veredicto anterior: dejar «las credenciales no son
   * válidas» en pantalla mientras la persona corrige la contraseña es señalar un
   * problema que ya no existe.
   */
  function limpiarVeredicto(): void {
    setFallosCliente({})

    if (envio.isError) {
      envio.reset()
    }
  }

  function rellenarCon(correoDemo: string, contrasenaDemo: string): void {
    setCorreo(correoDemo)
    setContrasena(contrasenaDemo)
    limpiarVeredicto()
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault()

    const fallos = validarCredenciales(correo, contrasena)
    setFallosCliente(fallos)

    if (fallos.correo || fallos.contrasena) {
      return
    }

    // El servidor normaliza el correo con `Trim().ToLowerInvariant()` antes de
    // buscarlo; recortarlo aquí solo evita que un espacio pegado al copiar
    // viaje en el cuerpo de la petición.
    envio.mutate({ correo: correo.trim(), contrasena })
  }

  if (restaurando) {
    return <PantallaCarga />
  }

  if (autenticado) {
    return <Navigate to={destinoTrasEntrar(ubicacion.state)} replace />
  }

  return (
    <div className="relative grid min-h-dvh bg-fondo lg:grid-cols-2">
      <BotonIcono
        titulo={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        icono={tema === 'oscuro' ? <IconoSol /> : <IconoLuna />}
        onClick={alternar}
        className="absolute top-4 right-4 z-10"
      />

      <PanelMarca />

      <main className="flex flex-col justify-center px-5 py-14 sm:px-10">
        <div className="mx-auto w-full max-w-[26rem]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <MarcaErp />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-texto">ERP Modular</p>
              <p className="text-[0.6875rem] text-texto-tenue">Consola multiempresa</p>
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-texto">Iniciar sesión</h1>
          <p className="mt-1.5 text-sm text-texto-suave">
            El token que devuelve la API trae la empresa y los permisos con los que se arma la
            consola.
          </p>

          <SondaSalud className="mt-5" />

          {/* `noValidate`: el globo nativo del navegador competiría con los mensajes
              del campo, en el idioma del navegador y con reglas que no son las del
              validador del servidor. */}
          <form noValidate onSubmit={alEnviar} className="mt-6 flex flex-col gap-4">
            <Campo etiqueta="Correo" error={fallosCliente.correo?.mensaje ?? erroresDelServidor['correo']} requerido>
              {atributos => (
                <EntradaEnfocable
                  {...atributos}
                  ref={referenciaCorreo}
                  type="email"
                  name="correo"
                  inputMode="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="usuario@empresa.cl"
                  value={correo}
                  onChange={evento => {
                    setCorreo(evento.target.value)
                    limpiarVeredicto()
                  }}
                />
              )}
            </Campo>

            <Campo
              etiqueta="Contraseña"
              error={fallosCliente.contrasena?.mensaje ?? erroresDelServidor['contrasena']}
              requerido
            >
              {atributos => (
                <Entrada
                  {...atributos}
                  type="password"
                  name="contrasena"
                  autoComplete="current-password"
                  value={contrasena}
                  onChange={evento => {
                    setContrasena(evento.target.value)
                    limpiarVeredicto()
                  }}
                />
              )}
            </Campo>

            {errorGeneral && <AvisoError error={errorGeneral} />}

            <Boton
              type="submit"
              tono="primario"
              tamano="lg"
              completo
              cargando={envio.isPending}
              icono={<IconoCandado className="size-4" />}
              className="mt-1"
            >
              Entrar
            </Boton>
          </form>

          <CredencialesDemo className="mt-8" alRellenar={rellenarCon} />
        </div>
      </main>
    </div>
  )
}

/**
 * Ruta a la que volver después de entrar.
 *
 * `RutaProtegida` deja en `location.state` la pantalla que la persona intentaba
 * abrir. Se valida antes de usarla porque el estado del historial no es dato de
 * confianza —puede venir de una entrada vieja o de un enlace preparado por otro—
 * y saltar a una URL de otro origen convertiría este formulario en un redirector
 * abierto: `//dominio.ajeno` empieza por barra y aun así es una dirección
 * absoluta de protocolo relativo.
 */
function destinoTrasEntrar(estado: unknown): string {
  if (typeof estado !== 'object' || estado === null || !('destino' in estado)) {
    return '/'
  }

  const { destino } = estado

  return typeof destino === 'string' && destino.startsWith('/') && !destino.startsWith('//')
    ? destino
    : '/'
}
