import { CabeceraTarjeta, Insignia, Tarjeta } from '@/componentes/Superficie'
import { Tabla } from '@/componentes/Tabla'
import type { ColumnaTabla } from '@/componentes/Tabla'
import { useSesion } from '@/nucleo/autenticacion/ProveedorSesion'
import { Codigo } from '@/caracteristicas/sistema/piezas'
import { ENDPOINTS } from '@/caracteristicas/sistema/catalogos'
import type { EndpointConsumido, VerboHttp } from '@/caracteristicas/sistema/catalogos'

/**
 * Los doce endpoints del repositorio y para qué los usa esta consola.
 *
 * La columna del permiso se tacha cuando la sesión no lo tiene. Es la misma
 * información de la cuadrícula de arriba dicha en el otro orden: ahí se ve qué
 * puede hacer el usuario, aquí qué pasaría si pidiera esta ruta.
 */
export function SeccionEndpoints() {
  const { tienePermiso } = useSesion()

  return (
    <Tarjeta>
      <CabeceraTarjeta
        titulo="Endpoints que consume esta consola"
        descripcion="Los doce que expone el repositorio. No hay ninguna pantalla apoyada en datos que la API no entregue."
      />

      <Tabla
        columnas={construirColumnas(tienePermiso)}
        filas={ENDPOINTS}
        claveFila={endpoint => `${endpoint.verbo} ${endpoint.ruta}`}
        descripcion="Endpoints de la API con su verbo, ruta, permiso requerido y uso en la consola."
      />

      <div className="border-t border-borde px-4 py-3.5 text-[0.8125rem] leading-relaxed text-texto-suave sm:px-5">
        <p>
          Las rutas no se escriben a mano: se derivan del nombre del controlador y del método, así
          que <Codigo>ControladorMarcas.CrearMarca</Codigo> solo puede llamarse{' '}
          <Codigo>POST /api/marcas/crear-marca</Codigo> y ninguna ruta puede desalinearse del
          código. <Codigo>/api/salud</Codigo> es la única excepción —la configura un orquestador y
          conviene que sea corta y estable—.
        </p>
      </div>
    </Tarjeta>
  )
}

/**
 * Las columnas se arman fuera del componente porque dependen de un solo dato de
 * la sesión —si tiene o no el permiso— y no de su estado: sacarlas de ahí deja
 * el componente en lo que hace, que es disponer tres bloques.
 */
function construirColumnas(
  tienePermiso: (permiso: string) => boolean,
): ColumnaTabla<EndpointConsumido>[] {
  return [
    {
      clave: 'verbo',
      encabezado: 'Verbo',
      anchoClase: 'w-24',
      celda: endpoint => <Insignia tono={TONO_VERBO[endpoint.verbo]}>{endpoint.verbo}</Insignia>,
    },
    {
      clave: 'ruta',
      encabezado: 'Ruta',
      celda: endpoint => <span className="font-mono text-[0.75rem]">{endpoint.ruta}</span>,
    },
    {
      clave: 'permiso',
      encabezado: 'Permiso',
      anchoClase: 'w-44',
      celda: endpoint => <CeldaPermiso permiso={endpoint.permiso} concedido={tienePermiso} />,
    },
    {
      clave: 'uso',
      encabezado: 'Para qué lo usa esta consola',
      ocultarEnMovil: true,
      celda: endpoint => <span className="text-[0.8125rem] text-texto-suave">{endpoint.uso}</span>,
    },
  ]
}

function CeldaPermiso({
  permiso,
  concedido,
}: {
  permiso: string | null
  concedido: (permiso: string) => boolean
}) {
  if (permiso === null) {
    return <span className="text-[0.75rem] text-texto-tenue">anónimo</span>
  }

  const loTiene = concedido(permiso)

  return (
    <span
      className={
        loTiene
          ? 'font-mono text-[0.75rem] text-texto'
          : 'font-mono text-[0.75rem] text-texto-tenue line-through'
      }
      title={
        loTiene ? undefined : 'Su sesión no tiene este permiso: el servidor responde 403, API_002.'
      }
    >
      {permiso}
    </span>
  )
}

/** El color separa lectura de escritura de un vistazo, no decora. */
const TONO_VERBO: Record<VerboHttp, 'neutro' | 'marca' | 'info' | 'alerta'> = {
  GET: 'neutro',
  POST: 'marca',
  PUT: 'info',
  PATCH: 'alerta',
}
