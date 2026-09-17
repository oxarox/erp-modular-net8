import { useQuery } from '@tanstack/react-query'
import { Boton } from '@/componentes/Boton'
import { IconoActualizar } from '@/componentes/Iconos'
import { AvisoError, CabeceraTarjeta, Esqueleto, Insignia, Tarjeta } from '@/componentes/Superficie'
import { claves } from '@/app/clienteConsultas'
import { api } from '@/nucleo/api/endpoints'
import { configuracion } from '@/nucleo/configuracion'
import { fechaUtcDesdeApi, formatearDecimal, formatearFechaHora } from '@/nucleo/formato/formato'
import { Codigo, Dato, RejillaDatos } from '@/caracteristicas/sistema/piezas'

/**
 * Estado de la API, leído de la única sonda anónima del sistema.
 *
 * `/api/salud` no requiere token y no revela nada del estado interno más allá de
 * que el proceso responde: esa es la decisión del backend y aquí se respeta.
 * Todo lo que se muestra sale de los cuatro campos que devuelve.
 *
 * Se repite cada 30 segundos porque esta pantalla se deja abierta mientras se
 * levanta o se reinicia la API, y el valor de la tarjeta está en enterarse de la
 * caída sin recargar.
 */
export function SeccionEstadoApi() {
  const consulta = useQuery({
    queryKey: claves.salud(),
    queryFn: ({ signal }) => api.salud.obtener(signal),
    refetchInterval: 30_000,
  })

  const salud = consulta.data
  const fechaServidor = fechaUtcDesdeApi(salud?.fechaUtc)

  // `dataUpdatedAt` es el instante del navegador en que llegó ESTA respuesta, así
  // que la resta compara dos relojes en el mismo momento. Incluye la latencia de
  // ida y vuelta, de modo que es una cota superior del desfase, no un desfase
  // puro: por eso se muestra con esa advertencia y no como un dato exacto.
  const desfaseMs =
    fechaServidor && consulta.dataUpdatedAt > 0
      ? fechaServidor.getTime() - consulta.dataUpdatedAt
      : null

  return (
    <Tarjeta>
      <CabeceraTarjeta
        titulo="Estado de la API"
        descripcion="GET /api/salud — la única sonda anónima del sistema. Se relee cada 30 segundos."
        acciones={
          <Boton
            tamano="sm"
            icono={<IconoActualizar className="size-4" />}
            cargando={consulta.isFetching}
            onClick={() => void consulta.refetch()}
          >
            Refrescar
          </Boton>
        }
      />

      {consulta.isError ? (
        <AvisoError
          error={consulta.error}
          alReintentar={() => void consulta.refetch()}
          className="m-4"
        />
      ) : (
        <RejillaDatos className="sm:grid-cols-3 lg:grid-cols-5">
          <Dato
            etiqueta="Estado"
            valor={
              consulta.isPending ? (
                <Esqueleto className="h-5 w-16" />
              ) : (
                <Insignia tono={salud?.estado === 'ok' ? 'exito' : 'alerta'} punto>
                  {salud?.estado ?? 'desconocido'}
                </Insignia>
              )
            }
          />

          <Dato
            etiqueta="Versión"
            mono
            valor={consulta.isPending ? <Esqueleto className="h-4 w-20" /> : salud?.version}
            ayuda="Del ensamblado de ERP.Api."
          />

          <Dato
            etiqueta="Entorno"
            mono
            valor={consulta.isPending ? <Esqueleto className="h-4 w-24" /> : salud?.entorno}
            ayuda="IHostEnvironment.EnvironmentName."
          />

          <Dato
            etiqueta="Hora del servidor"
            mono
            valor={
              consulta.isPending ? <Esqueleto className="h-4 w-32" /> : formatearFechaHora(fechaServidor)
            }
            ayuda="Instante UTC de la sonda, mostrado en la zona de este navegador."
          />

          <Dato
            etiqueta="Desfase"
            mono
            valor={
              consulta.isPending ? (
                <Esqueleto className="h-4 w-16" />
              ) : (
                formatearDesfase(desfaseMs)
              )
            }
            ayuda="Contra el reloj de este equipo. Incluye la ida y vuelta de la petición."
          />
        </RejillaDatos>
      )}

      <div className="border-t border-borde px-4 py-3 text-[0.8125rem] text-texto-suave sm:px-5">
        {configuracion.modoDemo ? (
          <p>
            <Insignia tono="alerta" punto className="mr-2 align-middle">
              Modo demo
            </Insignia>
            No hay API ni base de datos detrás: las respuestas las produce un Service Worker en
            este navegador, con datos equivalentes a la semilla de desarrollo. Lo que se ve arriba
            es la sonda simulada.
          </p>
        ) : (
          <p>
            Origen configurado: <Codigo>{configuracion.urlApi}</Codigo>. Sale de{' '}
            <Codigo>VITE_API_URL</Codigo> y es el mismo que la API debe tener en{' '}
            <Codigo>Cors:OrigenesPermitidos</Codigo> para dejar pasar al navegador.
          </p>
        )}
      </div>
    </Tarjeta>
  )
}

/** Segundos con signo: el `+` dice «el servidor va adelante» sin necesidad de leyenda. */
function formatearDesfase(milisegundos: number | null): string {
  if (milisegundos === null) {
    return '—'
  }

  const segundos = milisegundos / 1000

  return `${segundos > 0 ? '+' : ''}${formatearDecimal(segundos)} s`
}
