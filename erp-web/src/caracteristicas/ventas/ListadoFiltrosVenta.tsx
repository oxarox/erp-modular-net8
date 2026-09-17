import { Boton, BotonIcono } from '@/componentes/Boton'
import { Campo, Entrada, Seleccion } from '@/componentes/Formulario'
import { IconoActualizar } from '@/componentes/Iconos'
import { BarraFiltros } from '@/componentes/Tabla'
import { ESTADOS_VENTA } from '@/nucleo/api/contratos'
import { etiquetaEstadoVenta } from '@/nucleo/dominio/etiquetas'
import { aValorInputFecha } from '@/nucleo/formato/formato'

/**
 * Barra de filtros del listado de ventas.
 *
 * No guarda estado propio: recibe los valores y devuelve los cambios. El estado
 * vive en la URL —`useFiltrosEnUrl` en `PaginaVentas`—, que es lo que permite
 * mandar «las ventas anuladas de septiembre» como un enlace.
 *
 * Los atajos se calculan sobre el día **local** del navegador, mientras que el
 * servidor compara contra `fechaUtc`. En una zona alejada de UTC eso mueve el
 * borde del rango unas horas. Se acepta a propósito: la alternativa —desplazar
 * el rango por la zona horaria— haría que las fechas escritas a mano dejaran de
 * significar lo que dicen, y una fecha que no significa lo que dice es peor que
 * un borde de día impreciso.
 */

export interface CambioFiltrosVenta {
  desde?: string
  hasta?: string
  estado?: string
}

interface Atajo {
  etiqueta: string
  /**
   * El rango se calcula al pulsar y no al importar el módulo: una pestaña que
   * quedó abierta toda la noche tiene que seguir entendiendo «Hoy».
   */
  calcular: () => { desde: string; hasta: string }
}

const ATAJOS: Atajo[] = [
  {
    etiqueta: 'Hoy',
    calcular: () => {
      const hoy = aValorInputFecha(new Date())

      return { desde: hoy, hasta: hoy }
    },
  },
  {
    etiqueta: 'Últimos 7 días',
    calcular: () => {
      const hasta = new Date()
      const desde = new Date(hasta)

      // Seis días atrás más el de hoy: siete jornadas, que es lo que la gente
      // entiende al leer «últimos 7 días».
      desde.setDate(desde.getDate() - 6)

      return { desde: aValorInputFecha(desde), hasta: aValorInputFecha(hasta) }
    },
  },
  {
    etiqueta: 'Este mes',
    calcular: () => {
      const hoy = new Date()

      return {
        desde: aValorInputFecha(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
        hasta: aValorInputFecha(hoy),
      }
    },
  },
]

export interface PropsListadoFiltrosVenta {
  desde: string
  hasta: string
  estado: string
  /** Hay algo en la URL que se puede deshacer; gobierna el botón de limpiar. */
  hayFiltros: boolean
  actualizando: boolean
  alCambiar: (cambios: CambioFiltrosVenta) => void
  alLimpiar: () => void
  alActualizar: () => void
}

export function ListadoFiltrosVenta({
  desde,
  hasta,
  estado,
  hayFiltros,
  actualizando,
  alCambiar,
  alLimpiar,
  alActualizar,
}: PropsListadoFiltrosVenta) {
  const atajoActivo = ATAJOS.find(atajo => {
    const rango = atajo.calcular()

    return rango.desde === desde && rango.hasta === hasta
  })

  // `YYYY-MM-DD` es de ancho fijo y con ceros a la izquierda, así que el orden
  // alfabético coincide con el cronológico: comparar como texto basta y evita
  // construir dos `Date` en cada render. El rango invertido no se bloquea en el
  // control porque igual puede llegar escrito en la URL; se avisa y ya.
  const rangoInvertido = desde !== '' && hasta !== '' && desde > hasta

  return (
    <BarraFiltros>
      <Campo etiqueta="Desde" className="min-w-[8.5rem] flex-1 sm:w-40 sm:flex-none">
        {atributos => (
          <Entrada
            type="date"
            value={desde}
            onChange={evento => alCambiar({ desde: evento.target.value })}
            // El glifo del selector nativo es negro fijo: en tema oscuro se
            // invierte para que no desaparezca contra la superficie.
            className="dark:[&::-webkit-calendar-picker-indicator]:invert"
            {...atributos}
          />
        )}
      </Campo>

      <Campo
        etiqueta="Hasta"
        className="min-w-[8.5rem] flex-1 sm:w-40 sm:flex-none"
        error={rangoInvertido ? 'El término es anterior al inicio.' : undefined}
      >
        {atributos => (
          <Entrada
            type="date"
            value={hasta}
            onChange={evento => alCambiar({ hasta: evento.target.value })}
            className="dark:[&::-webkit-calendar-picker-indicator]:invert"
            {...atributos}
          />
        )}
      </Campo>

      <div className="flex items-center gap-1.5 pb-0.5" role="group" aria-label="Rangos rápidos">
        {ATAJOS.map(atajo => (
          <Boton
            key={atajo.etiqueta}
            tamano="sm"
            tono={atajo === atajoActivo ? 'primario' : 'secundario'}
            aria-pressed={atajo === atajoActivo}
            onClick={() => alCambiar(atajo.calcular())}
          >
            {atajo.etiqueta}
          </Boton>
        ))}
      </div>

      <Campo etiqueta="Estado" className="w-full sm:w-44">
        {atributos => (
          <Seleccion
            value={estado}
            onChange={evento => alCambiar({ estado: evento.target.value })}
            {...atributos}
          >
            <option value="">Todos</option>
            {ESTADOS_VENTA.map(valor => (
              <option key={valor} value={valor}>
                {etiquetaEstadoVenta(valor)}
              </option>
            ))}
          </Seleccion>
        )}
      </Campo>

      <div className="ml-auto flex items-center gap-2 pb-0.5">
        {hayFiltros && (
          <Boton tamano="sm" tono="fantasma" onClick={alLimpiar}>
            Limpiar
          </Boton>
        )}

        {/* El mismo control informa y actúa: mientras hay una consulta en vuelo
            muestra el girador, y en reposo permite forzar una relectura. */}
        <BotonIcono
          titulo="Actualizar"
          tamano="sm"
          tono="secundario"
          icono={<IconoActualizar className="size-4" />}
          cargando={actualizando}
          onClick={alActualizar}
        />
      </div>
    </BarraFiltros>
  )
}
