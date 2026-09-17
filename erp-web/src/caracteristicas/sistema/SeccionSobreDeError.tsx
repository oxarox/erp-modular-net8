import { useMutation } from '@tanstack/react-query'
import { Boton } from '@/componentes/Boton'
import { IconoAlerta } from '@/componentes/Iconos'
import { AvisoError, CabeceraTarjeta, Insignia, Tarjeta } from '@/componentes/Superficie'
import { api } from '@/nucleo/api/endpoints'
import { ErrorApi } from '@/nucleo/api/errores'
import { PERMISOS } from '@/nucleo/autenticacion/almacenSesion'
import { useSesion } from '@/nucleo/autenticacion/ProveedorSesion'
import { BloqueCodigo, Codigo } from '@/caracteristicas/sistema/piezas'
import { FAMILIAS_CODIGO_ERROR } from '@/caracteristicas/sistema/catalogos'

/**
 * El contrato de errores, explicado y —abajo— demostrado en vivo.
 *
 * La sonda no es un adorno. Un sobre de error descrito en una tabla es una
 * promesa; el mismo sobre traído del servidor, con su `traceId` real, es la
 * prueba. Cuesta un botón y un endpoint que ya existe.
 */

/**
 * Un id que no puede existir. Se pide a propósito para que el servidor conteste
 * `MARCA_004`: es una lectura, no modifica nada y no deja rastro más allá de una
 * línea en el log con el mismo identificador de correlación que se ve en
 * pantalla.
 */
const ID_INEXISTENTE = 999_999_999

const FORMA_DEL_SOBRE = `{
  "traceId":   string,         // correlación: cruza este error con el log del servidor
  "code":      string,         // familia: validation_error | forbidden | not_found | conflict | …
  "message":   string,         // texto en español, apto para mostrarle a la persona
  "details":   objeto | null,  // detalle tipado del caso, cuando lo hay
  "errorCode": string          // código del catálogo MODULO_###. Contrato duro: nunca viaja null
}`

export function SeccionSobreDeError() {
  const { tienePermiso } = useSesion()
  const puedeVerMarcas = tienePermiso(PERMISOS.marcas.ver)

  const sonda = useMutation({
    mutationFn: () => api.marcas.obtenerPorId(ID_INEXISTENTE),
  })

  return (
    <Tarjeta>
      <CabeceraTarjeta
        titulo="El sobre de error"
        descripcion="Una sola forma para todos los errores del sistema, del 400 de validación al 503 de base de datos caída."
      />

      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
        <BloqueCodigo etiqueta="Forma del sobre" codigo={FORMA_DEL_SOBRE} />

        <p className="text-[0.8125rem] leading-relaxed text-texto-suave">
          Que la forma sea única es lo que permite que el cliente escriba{' '}
          <span className="font-medium text-texto">un</span> manejador y no uno por endpoint: aquí
          es <Codigo>nucleo/api/errores.ts</Codigo>, y ninguna pantalla parsea errores por su
          cuenta. <Codigo>erroresPorCampo()</Codigo> llena un formulario,{' '}
          <Codigo>mensajeParaUsuario()</Codigo> escribe el aviso y todo lo demás reacciona al{' '}
          <Codigo>errorCode</Codigo>. Al texto del mensaje no reacciona nadie: reformular una frase
          en español no puede romper una pantalla.
        </p>
      </div>

      <ul className="divide-y divide-borde border-t border-borde">
        {FAMILIAS_CODIGO_ERROR.map(familia => (
          <li
            key={familia.prefijo}
            className="grid gap-1 px-4 py-3 sm:grid-cols-[6.5rem_1fr] sm:gap-4 sm:px-5"
          >
            <p className="font-mono text-[0.8125rem] font-medium text-texto">{familia.prefijo}</p>
            <div className="min-w-0">
              <p className="text-[0.8125rem] text-texto">{familia.ambito}</p>
              <p className="mt-1 text-[0.75rem] leading-snug text-texto-tenue">
                <Codigo>{familia.ejemplo}</Codigo> {familia.situacion}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="border-t border-borde px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-texto">Ver el contrato funcionando</p>
            <p className="mt-0.5 text-[0.8125rem] text-texto-tenue">
              Pide <Codigo>GET /api/marcas/obtener-marca-por-id/{ID_INEXISTENTE}</Codigo> y muestra
              el sobre que devolvió el servidor, con su identificador de correlación real.
            </p>
          </div>

          <Boton
            tono="secundario"
            icono={<IconoAlerta className="size-4" />}
            cargando={sonda.isPending}
            onClick={() => sonda.mutate()}
          >
            Provocar un 404
          </Boton>
        </div>

        {!puedeVerMarcas && (
          <p className="mt-3 text-[0.8125rem] text-alerta">
            Su sesión no tiene <Codigo>marcas.ver</Codigo>, así que la respuesta no será un 404 sino
            un 403 con <Codigo>API_002</Codigo>: la autorización corre antes que el manejador. Es la
            otra mitad del contrato, y se ve igual de bien.
          </p>
        )}

        {sonda.isError && <RespuestaDeLaSonda error={sonda.error} />}

        {sonda.isSuccess && (
          <p className="mt-3 text-[0.8125rem] text-texto-suave">
            El servidor respondió 200: contra todo pronóstico, la marca #
            {ID_INEXISTENTE.toLocaleString('es-CL')} existe en esta base. La demostración pierde
            gracia, pero el contrato se cumple igual.
          </p>
        )}
      </div>
    </Tarjeta>
  )
}

/**
 * El sobre, reconstruido a partir de `ErrorApi`.
 *
 * No es la respuesta cruda —el cliente HTTP ya la consumió— pero sí son sus
 * cinco campos, sin agregar ni quitar ninguno: `ErrorApi` conserva exactamente
 * lo que el sobre traía.
 */
function RespuestaDeLaSonda({ error }: { error: unknown }) {
  if (!(error instanceof ErrorApi)) {
    return <AvisoError error={error} className="mt-3" />
  }

  const sobre = {
    traceId: error.traceId,
    code: error.familia,
    message: error.message,
    details: error.detalles,
    errorCode: error.codigo,
  }

  return (
    <div className="mt-3 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Insignia tono="peligro">HTTP {error.estado}</Insignia>
        <Insignia tono="neutro">{error.familia}</Insignia>
        <Insignia tono="info">{error.codigo}</Insignia>
        {!error.esReintentable && (
          <span className="text-[0.75rem] text-texto-tenue">
            No es reintentable: el cliente no lo repite.
          </span>
        )}
      </div>

      <BloqueCodigo etiqueta="Sobre recibido" codigo={JSON.stringify(sobre, null, 2)} />
    </div>
  )
}
