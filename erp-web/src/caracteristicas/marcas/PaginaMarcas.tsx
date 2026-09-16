import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { claves } from '@/app/clienteConsultas'
import { Boton, BotonIcono } from '@/componentes/Boton'
import { Campo, Casilla, Entrada } from '@/componentes/Formulario'
import {
  IconoApagar,
  IconoBuscar,
  IconoEtiqueta,
  IconoLapiz,
  IconoMas,
} from '@/componentes/Iconos'
import { EncabezadoPagina, EstadoVacio, Insignia, Pila, Tarjeta } from '@/componentes/Superficie'
import type { ColumnaTabla } from '@/componentes/Tabla'
import { BarraFiltros, Paginador, Tabla } from '@/componentes/Tabla'
import type { RespuestaMarca } from '@/nucleo/api/contratos'
import { api } from '@/nucleo/api/endpoints'
import { PERMISOS } from '@/nucleo/autenticacion/almacenSesion'
import { useSesion } from '@/nucleo/autenticacion/ProveedorSesion'
import { useFiltrosEnUrl, useValorRetrasado } from '@/nucleo/hooks'
import { DialogoDesactivarMarca } from '@/caracteristicas/marcas/DialogoDesactivarMarca'
import { FormularioMarca } from '@/caracteristicas/marcas/FormularioMarca'

/**
 * Catálogo de marcas: listar, filtrar, crear, editar y dar de baja.
 *
 * Es el módulo plantilla del sistema —el backend tiene treinta catálogos con
 * esta misma forma— así que lo que se resuelve aquí es lo que después se copia:
 * el estado en la URL, la vuelta a la página 1 al filtrar, los dos estados
 * vacíos distintos, el error de campo que solo el servidor conoce y la baja
 * lógica explicada en vez de un botón de papelera.
 */

interface FiltrosMarcas {
  criterio: string
  soloActivas: string
  pagina: string
  tamanoPagina: string
}

/**
 * Los filtros viven en la barra de direcciones y no en `useState`: así el enlace
 * de «marcas inactivas que dicen "norte"» se puede pegar en un chat y recargar
 * no pierde lo que se estaba mirando.
 *
 * Se declara fuera del componente porque `useFiltrosEnUrl` lo usa como
 * dependencia: un literal nuevo en cada render recrearía sus funciones.
 */
const FILTROS_POR_DEFECTO: FiltrosMarcas = {
  criterio: '',
  soloActivas: '',
  pagina: '1',
  tamanoPagina: '25',
}

/** La URL la escribe cualquiera: `?pagina=abc` no puede dejar la pantalla en blanco. */
function enteroDeUrl(valor: string, porDefecto: number): number {
  const numero = Number.parseInt(valor, 10)

  return Number.isFinite(numero) && numero > 0 ? numero : porDefecto
}

export default function PaginaMarcas() {
  const { tienePermiso } = useSesion()

  // Comodidad de interfaz, no seguridad: ocultar el botón evita el intento
  // inútil, no lo impide. La autorización de verdad la aplica el servidor con
  // `[AutorizarPermiso(Permisos.Marcas.Gestionar)]` en `ControladorMarcas`, y
  // quien llame al endpoint a mano recibirá un 403 (`API_002`) igual.
  const puedeGestionar = tienePermiso(PERMISOS.marcas.gestionar)

  const { filtros, establecer } = useFiltrosEnUrl(FILTROS_POR_DEFECTO)

  // El campo se pinta con el valor de la URL en cada tecla, pero la consulta
  // espera a que la escritura se detenga: sin esto, «insumo» dispara seis
  // búsquedas y la tercera puede llegar después de la sexta.
  const criterioRetrasado = useValorRetrasado(filtros.criterio, 300)

  const soloActivas = filtros.soloActivas === '1'
  const pagina = enteroDeUrl(filtros.pagina, 1)
  const tamanoPagina = enteroDeUrl(filtros.tamanoPagina, 25)

  const [dialogo, setDialogo] = useState<Dialogo>({ tipo: 'cerrado' })

  const filtrosConsulta = useMemo(
    () => ({
      criterio: criterioRetrasado.trim() || undefined,
      // Solo se manda cuando está marcado. El repositorio filtra con
      // `soloActivas == true`, así que enviar `false` es idéntico a no enviar
      // nada y solo ensuciaría la clave de la consulta.
      soloActivas: soloActivas || undefined,
      pagina,
      tamanoPagina,
    }),
    [criterioRetrasado, soloActivas, pagina, tamanoPagina],
  )

  const consulta = useQuery({
    queryKey: claves.marcas.lista(filtrosConsulta),
    queryFn: ({ signal }) => api.marcas.buscar(filtrosConsulta, signal),
    // Mantiene la página anterior mientras llega la nueva: sin esto la tabla
    // parpadea en blanco cada vez que se avanza de página.
    placeholderData: anterior => anterior,
  })

  /**
   * Cualquier cambio de filtro vuelve a la página 1.
   *
   * Es el error clásico de las tablas paginadas: se filtra estando en la página
   * 7, el resultado tiene dos páginas, y queda a la vista una tabla vacía que
   * parece decir «no hay nada» cuando lo que pasa es que esa página no existe.
   */
  function filtrar(cambios: Partial<FiltrosMarcas>) {
    establecer({ ...cambios, pagina: '1' })
  }

  /** Se conserva el tamaño de página: no es un filtro, es una preferencia de lectura. */
  function limpiarFiltros() {
    establecer({ criterio: '', soloActivas: '', pagina: '1' })
  }

  const cerrarDialogo = () => setDialogo({ tipo: 'cerrado' })

  const columnas: ColumnaTabla<RespuestaMarca>[] = [
    {
      clave: 'id',
      encabezado: 'ID',
      anchoClase: 'w-16',
      celda: marca => (
        <span className="font-mono text-[0.8125rem] text-texto-tenue">{marca.id}</span>
      ),
    },
    {
      clave: 'nombre',
      encabezado: 'Nombre',
      celda: marca => <span className="font-medium text-texto">{marca.nombre}</span>,
    },
    {
      clave: 'descripcion',
      encabezado: 'Descripción',
      ocultarEnMovil: true,
      celda: marca =>
        marca.descripcion ? (
          // Truncada, pero con el texto completo a un `title` de distancia: una
          // descripción larga no puede romper el ancho de la tabla ni obligar a
          // abrir la edición para leerla.
          <span className="block max-w-[32rem] truncate text-texto-suave" title={marca.descripcion}>
            {marca.descripcion}
          </span>
        ) : (
          <span className="text-texto-tenue">—</span>
        ),
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      anchoClase: 'w-28',
      celda: marca =>
        marca.activo ? (
          <Insignia tono="exito" punto>
            Activa
          </Insignia>
        ) : (
          <Insignia tono="neutro" punto>
            Inactiva
          </Insignia>
        ),
    },
  ]

  if (puedeGestionar) {
    columnas.push({
      clave: 'acciones',
      encabezado: <span className="solo-lectores">Acciones</span>,
      alineacion: 'derecha',
      anchoClase: 'w-24',
      celda: marca => (
        <div className="flex justify-end gap-1">
          {/* El nombre entra en el título del botón: en una tabla de veinte
              filas, veinte controles llamados «Editar» no se distinguen. */}
          <BotonIcono
            titulo={`Editar ${marca.nombre}`}
            tamano="sm"
            icono={<IconoLapiz className="size-4" />}
            onClick={() => setDialogo({ tipo: 'edicion', marca })}
          />

          {/* Solo tiene sentido en las activas: desactivar una inactiva es el
              conflicto `MARCA_010` que el servidor rechaza. */}
          {marca.activo && (
            <BotonIcono
              titulo={`Desactivar ${marca.nombre}`}
              tamano="sm"
              icono={<IconoApagar className="size-4" />}
              onClick={() => setDialogo({ tipo: 'baja', marca })}
            />
          )}
        </div>
      ),
    })
  }

  return (
    <Pila>
      <EncabezadoPagina
        titulo="Marcas"
        descripcion="Catálogo de marcas de la empresa. Se dan de baja, nunca se borran: los documentos que ya las usan tienen que seguir leyéndose."
        acciones={
          puedeGestionar && (
            <Boton
              tono="primario"
              icono={<IconoMas className="size-4" />}
              onClick={() => setDialogo({ tipo: 'alta' })}
            >
              Nueva marca
            </Boton>
          )
        }
      />

      <Tarjeta className="overflow-hidden">
        <BarraFiltros>
          <Campo etiqueta="Buscar marca" etiquetaOculta className="min-w-[12rem] flex-1 sm:max-w-sm">
            {atributos => (
              <div className="relative">
                <IconoBuscar className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-tenue" />
                <Entrada
                  {...atributos}
                  type="search"
                  value={filtros.criterio}
                  onChange={evento => filtrar({ criterio: evento.target.value })}
                  // El servidor busca con LIKE sobre el nombre y nada más
                  // (`RepositorioMarcaEfCore.BuscarAsync`); prometer aquí que
                  // también busca en la descripción sería mentir.
                  placeholder="Buscar por nombre…"
                  className="pl-9"
                />
              </div>
            )}
          </Campo>

          {/* La casilla se centra contra la altura del campo de búsqueda; va en
              un contenedor propio porque `cn` no resuelve utilidades en conflicto. */}
          <div className="flex h-9.5 items-center">
            <Casilla
              etiqueta="Solo activas"
              checked={soloActivas}
              onChange={evento => filtrar({ soloActivas: evento.target.checked ? '1' : '' })}
            />
          </div>
        </BarraFiltros>

        <Tabla
          columnas={columnas}
          filas={consulta.data?.items}
          claveFila={marca => marca.id}
          cargando={consulta.isPending}
          error={consulta.error}
          alReintentar={() => void consulta.refetch()}
          descripcion="Marcas de la empresa, con su descripción, su estado y las acciones disponibles."
          vacio={
            <TablaVacia
              hayFiltros={filtros.criterio.trim() !== '' || soloActivas}
              // Una página más allá del final no es «no hay marcas»: hay, pero
              // no en esta página. Pasa al desactivar el último registro de la
              // última página.
              paginaFueraDeRango={pagina > 1 && (consulta.data?.total ?? 0) > 0}
              puedeGestionar={puedeGestionar}
              alCrear={() => setDialogo({ tipo: 'alta' })}
              alLimpiarFiltros={limpiarFiltros}
              alVolverAlInicio={() => establecer({ pagina: '1' })}
            />
          }
        />

        {!consulta.isError && (
          <Paginador
            pagina={consulta.data?.pagina ?? pagina}
            tamanoPagina={consulta.data?.tamanoPagina ?? tamanoPagina}
            total={consulta.data?.total ?? 0}
            totalPaginas={consulta.data?.totalPaginas ?? 1}
            alCambiarPagina={siguiente => establecer({ pagina: String(siguiente) })}
            alCambiarTamano={tamano => establecer({ tamanoPagina: String(tamano), pagina: '1' })}
            cargando={consulta.isFetching}
          />
        )}
      </Tarjeta>

      {/* Los diálogos se montan solo cuando hay algo que mostrar: así el
          formulario arranca limpio en cada apertura, sin un efecto que lo
          reinicie, y la marca en edición nunca queda colgando en el estado. */}
      {dialogo.tipo === 'alta' && <FormularioMarca alCerrar={cerrarDialogo} />}

      {dialogo.tipo === 'edicion' && (
        <FormularioMarca marca={dialogo.marca} alCerrar={cerrarDialogo} />
      )}

      {dialogo.tipo === 'baja' && (
        <DialogoDesactivarMarca marca={dialogo.marca} alCerrar={cerrarDialogo} />
      )}
    </Pila>
  )
}

/** Qué diálogo está abierto y sobre qué marca. Un solo estado, sin banderas sueltas. */
type Dialogo =
  | { tipo: 'cerrado' }
  | { tipo: 'alta' }
  | { tipo: 'edicion'; marca: RespuestaMarca }
  | { tipo: 'baja'; marca: RespuestaMarca }

interface PropsTablaVacia {
  hayFiltros: boolean
  paginaFueraDeRango: boolean
  puedeGestionar: boolean
  alCrear: () => void
  alLimpiarFiltros: () => void
  alVolverAlInicio: () => void
}

/**
 * Los tres vacíos posibles, que no son el mismo.
 *
 * «Todavía no hay marcas» pide crear la primera; «ningún resultado» pide soltar
 * el filtro; «esta página quedó vacía» pide volver al principio. Mostrar el
 * mismo cartel en los tres casos deja a la persona sin el único botón que le
 * sirve.
 */
function TablaVacia({
  hayFiltros,
  paginaFueraDeRango,
  puedeGestionar,
  alCrear,
  alLimpiarFiltros,
  alVolverAlInicio,
}: PropsTablaVacia) {
  if (paginaFueraDeRango) {
    return (
      <EstadoVacio
        titulo="Esta página ya no tiene registros"
        descripcion="Quedó fuera de rango, probablemente porque la lista se acortó."
        accion={<Boton onClick={alVolverAlInicio}>Ir a la primera página</Boton>}
      />
    )
  }

  if (hayFiltros) {
    return (
      <EstadoVacio
        icono={<IconoBuscar className="size-5" />}
        titulo="Ninguna marca coincide con el filtro"
        descripcion="Puede que exista pero esté inactiva, o que el nombre se escriba de otra forma."
        accion={<Boton onClick={alLimpiarFiltros}>Limpiar filtros</Boton>}
      />
    )
  }

  return (
    <EstadoVacio
      icono={<IconoEtiqueta className="size-5" />}
      titulo="Todavía no hay marcas"
      descripcion="Las marcas agrupan los productos del catálogo. Cree la primera para empezar a clasificarlos."
      accion={
        puedeGestionar ? (
          <Boton tono="primario" icono={<IconoMas className="size-4" />} onClick={alCrear}>
            Crear la primera marca
          </Boton>
        ) : undefined
      }
    />
  )
}
