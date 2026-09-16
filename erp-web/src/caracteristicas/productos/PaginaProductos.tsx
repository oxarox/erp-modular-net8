import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { claves } from '@/app/clienteConsultas'
import { Boton } from '@/componentes/Boton'
import { cn } from '@/componentes/cn'
import { Campo, Casilla, Entrada, Seleccion } from '@/componentes/Formulario'
import { IconoCaja, IconoCarrito } from '@/componentes/Iconos'
import { EncabezadoPagina, EstadoVacio, Insignia, Pila, Tarjeta } from '@/componentes/Superficie'
import { BarraFiltros, Paginador, Tabla } from '@/componentes/Tabla'
import type { ColumnaTabla } from '@/componentes/Tabla'
import { CeldaStock } from '@/caracteristicas/productos/CeldaStock'
import type { RespuestaAlmacen, RespuestaProducto } from '@/nucleo/api/contratos'
import { api } from '@/nucleo/api/endpoints'
import { PERMISOS } from '@/nucleo/autenticacion/almacenSesion'
import { useSesion } from '@/nucleo/autenticacion/ProveedorSesion'
import { formatearMonto } from '@/nucleo/formato/formato'
import { useFiltrosEnUrl, useValorRetrasado } from '@/nucleo/hooks'

/**
 * Catálogo de productos.
 *
 * Es la única pantalla de solo lectura de la consola, y conviene dejar escrito
 * por qué: la API expone `buscar-productos` y ningún endpoint de alta. Este
 * módulo no está para administrar el catálogo —el ABM completo, con validación,
 * conflicto por nombre repetido y baja lógica, se muestra una vez y está en
 * Marcas— sino para responder la pregunta que se hace justo antes de vender:
 * «¿existe este SKU y cuánto queda donde voy a despachar?».
 *
 * De ahí que el selector de almacén sea el control principal y no un adorno.
 * Sin `almacenId` el servidor devuelve el catálogo sin stock, que es medio
 * catálogo; con él, cada fila trae el disponible de ese almacén
 * (`ConsultaCatalogoProductosEfCore` en el backend).
 */

/** Los filtros viven en la URL, así que todos son texto. */
type FiltrosCatalogo = {
  criterio: string
  almacen: string
  soloActivos: string
  pagina: string
  tamano: string
}

// Constante de módulo y no literal en línea: `useFiltrosEnUrl` la usa como
// dependencia de `establecer`, y un objeto nuevo en cada render dejaría esa
// función inestable justo donde se la mete en un efecto.
const FILTROS_POR_DEFECTO: FiltrosCatalogo = {
  criterio: '',
  almacen: '',
  soloActivos: 'si',
  pagina: '1',
  tamano: '25',
}

/** Tope del servidor (`SolicitudPaginada.TamanoMaximo`). Pedir más devuelve 400. */
const TAMANO_MAXIMO = 200

export default function PaginaProductos() {
  const navegar = useNavigate()
  const { tienePermiso } = useSesion()
  const { filtros, establecer, limpiar, hayFiltros } = useFiltrosEnUrl(FILTROS_POR_DEFECTO)

  const puedeVender = tienePermiso(PERMISOS.ventas.registrar)
  const puedeVerAlmacenes = tienePermiso(PERMISOS.almacenes.ver)

  // El texto se escribe rápido y se consulta lento: el campo responde a cada
  // tecla y la URL —y con ella la consulta— solo cuando la mano se detiene.
  const [criterio, setCriterio] = useState(filtros.criterio)
  const criterioRetrasado = useValorRetrasado(criterio, 300)

  useEffect(() => {
    if (criterioRetrasado !== filtros.criterio) {
      establecer({ criterio: criterioRetrasado, pagina: '1' })
    }
  }, [criterioRetrasado, filtros.criterio, establecer])

  const pagina = enteroDesdeUrl(filtros.pagina, FILTROS_POR_DEFECTO.pagina)
  const tamanoPagina = Math.min(
    enteroDesdeUrl(filtros.tamano, FILTROS_POR_DEFECTO.tamano),
    TAMANO_MAXIMO,
  )
  const soloActivos = filtros.soloActivos !== 'no'

  // Se pide la lista completa y activa: son pocos almacenes y cambian poco, así
  // que no hay paginación que administrar ni motivo para refrescarlos seguido.
  // Si el rol no trae `almacenes.ver` no se consulta, porque el 403 sería seguro.
  const consultaAlmacenes = useQuery({
    queryKey: claves.almacenes.lista(),
    queryFn: ({ signal }) => api.almacenes.listar(true, signal),
    enabled: puedeVerAlmacenes,
    staleTime: 5 * 60_000,
  })

  const almacenes = useMemo(() => consultaAlmacenes.data ?? [], [consultaAlmacenes.data])
  const almacenElegido = idDesdeUrl(filtros.almacen)

  const almacenId = useMemo(
    () => resolverAlmacen(almacenes, almacenElegido),
    [almacenes, almacenElegido],
  )

  // Mientras el almacén no se conozca, la consulta espera. Lanzarla igual
  // pintaría la tabla dos veces —una sin la columna de stock y otra con ella— y
  // ese parpadeo se lee como un error de la pantalla.
  const esperandoAlmacenes = puedeVerAlmacenes && consultaAlmacenes.isPending

  const parametros = useMemo(
    () => ({
      criterio: filtros.criterio === '' ? undefined : filtros.criterio,
      soloActivos,
      almacenId,
      pagina,
      tamanoPagina,
    }),
    [filtros.criterio, soloActivos, almacenId, pagina, tamanoPagina],
  )

  const consulta = useQuery({
    queryKey: claves.productos.lista(parametros),
    queryFn: ({ signal }) => api.productos.buscar(parametros, signal),
    enabled: !esperandoAlmacenes,
    // Conserva la página anterior mientras llega la nueva: sin esto la tabla se
    // vacía en cada clic del paginador y la vista salta hacia arriba.
    placeholderData: anterior => anterior,
  })

  const datos = consulta.data
  const almacenActual = almacenes.find(almacen => almacen.id === almacenId)
  const columnas = construirColumnas(almacenId !== undefined)

  function quitarFiltros(): void {
    setCriterio('')
    limpiar()
  }

  return (
    <Pila>
      <EncabezadoPagina
        titulo="Productos"
        descripcion="Catálogo de la empresa: precio vigente y stock disponible por almacén."
        acciones={
          puedeVender ? (
            <Boton
              tono="primario"
              icono={<IconoCarrito className="size-[18px]" />}
              onClick={() => navegar('/ventas/nueva')}
            >
              Nueva venta
            </Boton>
          ) : undefined
        }
      />

      <NotaDelModulo puedeVender={puedeVender} />

      <Tarjeta>
        <BarraFiltros>
          <Campo etiqueta="Buscar" className="min-w-[13rem] flex-1 sm:max-w-xs">
            {atributos => (
              <Entrada
                {...atributos}
                type="search"
                value={criterio}
                onChange={evento => setCriterio(evento.target.value)}
                placeholder="SKU o nombre…"
                autoComplete="off"
              />
            )}
          </Campo>

          {puedeVerAlmacenes && (
            <Campo etiqueta="Almacén" className="min-w-[12rem]">
              {atributos => (
                <Seleccion
                  {...atributos}
                  value={almacenId === undefined ? '' : String(almacenId)}
                  disabled={almacenes.length === 0}
                  onChange={evento => establecer({ almacen: evento.target.value, pagina: '1' })}
                >
                  {almacenes.length === 0 && (
                    <option value="">
                      {consultaAlmacenes.isPending ? 'Cargando…' : 'Sin almacenes activos'}
                    </option>
                  )}

                  {almacenes.map(almacen => (
                    <option key={almacen.id} value={almacen.id}>
                      {etiquetaAlmacen(almacen)}
                    </option>
                  ))}
                </Seleccion>
              )}
            </Campo>
          )}

          <Casilla
            etiqueta="Solo activos"
            checked={soloActivos}
            onChange={evento =>
              establecer({ soloActivos: evento.target.checked ? 'si' : 'no', pagina: '1' })
            }
            className="mb-2"
          />

          <AvisoSinStock
            puedeVerAlmacenes={puedeVerAlmacenes}
            fallaronAlmacenes={consultaAlmacenes.isError}
            alReintentar={() => void consultaAlmacenes.refetch()}
          />
        </BarraFiltros>

        {/* Atenuar mientras llega la página siguiente comunica «esto ya no es
            definitivo» sin quitar de pantalla lo que se estaba leyendo. */}
        <div
          className={cn(
            'transition-opacity duration-150',
            consulta.isFetching && !consulta.isPending && 'opacity-60',
          )}
          aria-busy={consulta.isFetching}
        >
          <Tabla
            columnas={columnas}
            filas={datos?.items}
            claveFila={producto => producto.id}
            cargando={consulta.isPending}
            error={consulta.error}
            alReintentar={() => void consulta.refetch()}
            filasEsqueleto={8}
            descripcion={
              almacenActual
                ? `Catálogo de productos con el stock disponible en ${almacenActual.nombre}.`
                : 'Catálogo de productos, sin stock por almacén.'
            }
            vacio={
              <EstadoVacio
                icono={<IconoCaja className="size-5" />}
                titulo={hayFiltros ? 'Ningún producto coincide' : 'El catálogo está vacío'}
                descripcion={
                  soloActivos
                    ? 'El producto puede existir y estar dado de baja: quite «Solo activos» para verlo.'
                    : 'Los productos se cargan con la semilla de datos; este catálogo no se edita desde la consola.'
                }
                accion={
                  hayFiltros ? (
                    <Boton tamano="sm" onClick={quitarFiltros}>
                      Quitar filtros
                    </Boton>
                  ) : undefined
                }
              />
            }
          />
        </div>

        {datos && datos.total > 0 && (
          <Paginador
            pagina={datos.pagina}
            tamanoPagina={datos.tamanoPagina}
            total={datos.total}
            totalPaginas={datos.totalPaginas}
            cargando={consulta.isFetching}
            alCambiarPagina={siguiente => establecer({ pagina: String(siguiente) })}
            alCambiarTamano={tamano => establecer({ tamano: String(tamano), pagina: '1' })}
          />
        )}
      </Tarjeta>
    </Pila>
  )
}

// ── Columnas ────────────────────────────────────────────────────────────────

/**
 * Las columnas se arman fuera del componente porque son configuración, no
 * estado: no dependen de nada que cambie entre renders salvo de si hay almacén.
 * Tenerlas aquí deja el cuerpo de la página como lo que es —datos, filtros y
 * disposición— y no como un archivo de definiciones de tabla.
 *
 * La columna de stock **no se pinta vacía cuando no hay almacén**: se quita. Una
 * columna entera de guiones ocupa el mismo ancho que una útil y no dice nada.
 */
function construirColumnas(mostrarStock: boolean): ColumnaTabla<RespuestaProducto>[] {
  const stock: ColumnaTabla<RespuestaProducto> = {
    clave: 'stock',
    encabezado: 'Stock',
    alineacion: 'derecha',
    anchoClase: 'w-[9rem]',
    celda: producto => <CeldaStock producto={producto} />,
  }

  return [
    {
      clave: 'sku',
      encabezado: 'SKU',
      anchoClase: 'w-[8.5rem]',
      celda: producto => (
        <span className="font-mono text-[0.8125rem] text-texto-suave">{producto.sku}</span>
      ),
    },
    {
      clave: 'nombre',
      encabezado: 'Producto',
      celda: producto => {
        const clasificacion = [producto.marca, producto.categoria].filter(Boolean).join(' · ')

        return (
          <div className="min-w-0">
            <p className="font-medium text-texto">{producto.nombre}</p>
            {/* Marca y categoría se ocultan en móvil por el mismo criterio que
                `ocultarEnMovil` aplica a las columnas: en una pantalla angosta
                el nombre es el ancla y dos renglones grises por fila estorban. */}
            {clasificacion !== '' && (
              <p className="hidden text-[0.75rem] text-texto-tenue sm:block">{clasificacion}</p>
            )}
          </div>
        )
      },
    },
    {
      clave: 'precio',
      encabezado: 'Precio',
      alineacion: 'derecha',
      anchoClase: 'w-[8rem]',
      celda: producto => (
        <span className="cifra text-texto">{formatearMonto(producto.precioVenta)}</span>
      ),
    },
    ...(mostrarStock ? [stock] : []),
    {
      clave: 'estado',
      encabezado: 'Estado',
      alineacion: 'derecha',
      anchoClase: 'w-[7rem]',
      celda: producto =>
        producto.activo ? (
          <Insignia tono="exito" punto>
            Activo
          </Insignia>
        ) : (
          <Insignia tono="neutro" punto>
            Inactivo
          </Insignia>
        ),
    },
  ]
}

// ── Piezas de la pantalla ───────────────────────────────────────────────────

function NotaDelModulo({ puedeVender }: { puedeVender: boolean }) {
  return (
    <Tarjeta className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
      <span
        className="grid size-8 shrink-0 place-items-center rounded-full bg-marca-suave text-marca-texto"
        aria-hidden="true"
      >
        <IconoCaja className="size-[18px]" />
      </span>

      <div className="min-w-0 text-[0.8125rem] leading-relaxed text-texto-suave">
        <p>
          Este módulo existe para que la venta pueda elegir productos reales con su stock, en vez de
          escribir identificadores a mano. Es de{' '}
          <strong className="font-medium text-texto">solo lectura</strong>: la API expone{' '}
          <code className="font-mono text-[0.75rem]">buscar-productos</code> y nada más, porque el
          alta de catálogo no está implementada en este repositorio. El patrón completo de alta,
          edición y baja lógica está en el módulo de Marcas.
        </p>

        {puedeVender && (
          <p className="mt-1.5">
            <Link
              to="/ventas/nueva"
              className="font-medium text-marca-texto underline decoration-marca-borde underline-offset-2 hover:decoration-current"
            >
              Registrar una venta con estos productos
            </Link>
          </p>
        )}
      </div>
    </Tarjeta>
  )
}

/**
 * Explica la ausencia de la columna de stock en lugar de dejarla desaparecer sin
 * más. Son dos causas distintas y con la primera no hay nada que intentar: si el
 * rol no incluye `almacenes.ver`, reintentar no la arregla.
 */
function AvisoSinStock({
  puedeVerAlmacenes,
  fallaronAlmacenes,
  alReintentar,
}: {
  puedeVerAlmacenes: boolean
  fallaronAlmacenes: boolean
  alReintentar: () => void
}) {
  if (!puedeVerAlmacenes) {
    return (
      <p className="mb-2 text-[0.8125rem] text-texto-tenue">
        Su rol no incluye <code className="font-mono text-[0.75rem]">almacenes.ver</code>: el
        catálogo se muestra sin stock.
      </p>
    )
  }

  if (!fallaronAlmacenes) {
    return null
  }

  return (
    <p className="mb-1 flex flex-wrap items-center gap-2 text-[0.8125rem] text-texto-tenue">
      No se pudieron cargar los almacenes; el catálogo se muestra sin stock.
      <Boton tamano="sm" tono="fantasma" onClick={alReintentar}>
        Reintentar
      </Boton>
    </p>
  )
}

// ── Lectura de la URL ───────────────────────────────────────────────────────

/**
 * La barra de direcciones es entrada del usuario: `?pagina=-3` o `?tamano=hola`
 * se escriben sin esfuerzo y no tienen por qué llegar a la API.
 */
function enteroDesdeUrl(valor: string, porDefecto: string): number {
  const numero = Number.parseInt(valor, 10)

  return Number.isFinite(numero) && numero >= 1 ? numero : Number.parseInt(porDefecto, 10)
}

function idDesdeUrl(valor: string): number | undefined {
  const numero = Number.parseInt(valor, 10)

  return Number.isFinite(numero) && numero > 0 ? numero : undefined
}

/**
 * Almacén cuyo stock se muestra.
 *
 * El de la URL manda, pero solo si sigue existiendo: un enlace guardado el mes
 * pasado puede apuntar a un almacén dado de baja, y un `select` con un valor que
 * no está entre sus opciones se pinta en blanco. Cuando no hay elección válida
 * se usa el predeterminado de la empresa; si ninguno lo es —dato mal sembrado,
 * no una razón para dejar la columna vacía— se toma el primero.
 */
/**
 * Decide con qué almacén se consulta el catálogo.
 *
 * El identificador solo se acepta si está **en la lista que devolvió el
 * servidor**. Parece una precaución de más y no lo es: el filtro vive en la URL,
 * de modo que puede llegar un `?almacen=` de una sesión anterior, de otra
 * empresa o simplemente inventado, y desde que
 * `ManejadorBuscarProductos` valida el almacén, enviarlo ya no devuelve el
 * catálogo con saldo cero —que era una mentira— sino un 404 con `ALMA_001`.
 * Filtrarlo aquí convierte ese error en un silencioso «se usó el predeterminado».
 *
 * Mientras la lista no haya llegado se devuelve `undefined`: sin almacén el
 * servidor responde el catálogo sin stock, que es una respuesta válida y no un
 * error.
 */
function resolverAlmacen(
  almacenes: RespuestaAlmacen[],
  elegido: number | undefined,
): number | undefined {
  if (elegido !== undefined && almacenes.some(almacen => almacen.id === elegido)) {
    return elegido
  }

  const predeterminado = almacenes.find(almacen => almacen.esPredeterminado) ?? almacenes[0]

  return predeterminado?.id
}

function etiquetaAlmacen(almacen: RespuestaAlmacen): string {
  return almacen.ubicacion ? `${almacen.nombre} · ${almacen.ubicacion}` : almacen.nombre
}
