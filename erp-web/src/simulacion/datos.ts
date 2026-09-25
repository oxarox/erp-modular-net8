import type { MetodoPago } from '@/nucleo/api/contratos'
import { crearAleatorio, hashTexto } from '@/simulacion/aleatorio'
import { claveExistencia, sembrarCatalogo } from '@/simulacion/catalogo'
import type {
  AlmacenDemo,
  Catalogo,
  MarcaDemo,
  ProductoDemo,
  UsuarioDemo,
} from '@/simulacion/catalogo'
import { generarHistorial, siguienteNumeroVenta } from '@/simulacion/historial'
import type { VentaDemo } from '@/simulacion/historial'
import { aIsoSinZ } from '@/simulacion/sobre'

/**
 * El «servidor» del modo demo: el estado completo, en memoria, y las consultas
 * que los manejadores necesitan.
 *
 * Cada función de lectura recibe el `empresaId` como primer parámetro y filtra
 * por él sin excepción. No es una formalidad: es el filtro global multiempresa
 * del backend traído aquí, y es lo que hace que entrar con `admin@sur.cl` no
 * muestre ni una marca de Norte. Un recurso de otra empresa se comporta como
 * inexistente —los buscadores no lo devuelven y los `...PorId` devuelven `null`,
 * que el manejador traduce a 404— porque un 403 confirmaría que existe, y eso es
 * justo lo que el backend evita filtrar.
 *
 * Todo vive en memoria y se pierde al recargar. Es lo correcto para una demo: se
 * puede crear, editar y dar de baja sin miedo, y la recarga devuelve el tablero
 * al estado que se comparte por enlace.
 */

export type { AlmacenDemo, MarcaDemo, ProductoDemo, UsuarioDemo, VentaDemo }

/** Ventana del histórico y volumen por empresa. */
const DIAS_DE_HISTORIA = 45
const VENTAS_EMPRESA_NORTE = 90
const VENTAS_EMPRESA_SUR = 20

interface EstadoDemo extends Catalogo {
  ventas: VentaDemo[]
  ultimoIdVenta: number
  ultimoIdMarca: number
}

/**
 * Siembra el estado completo.
 *
 * `hoy` es un parámetro con valor por defecto para que las fechas se calculen
 * siempre relativas al momento en que se abre la demo: un histórico anclado a una
 * fecha fija se ve viejo a la semana, y el tablero —que mira los últimos treinta
 * días— aparecería vacío.
 */
export function sembrar(hoy: Date = new Date()): EstadoDemo {
  // El catálogo tiene su propia secuencia y no depende de nada más: sale
  // idéntico en cada recarga y en cada navegador. Ver `aleatorio.ts`.
  const catalogo = sembrarCatalogo(crearAleatorio(hashTexto('erp-modular-net8/demo')))

  const deLaEmpresa = (empresaId: number): ProductoDemo[] =>
    catalogo.productos.filter(producto => producto.empresaId === empresaId)

  // Cada empresa sortea su historia con su propia secuencia. Compartir una sola
  // las acoplaba: la cantidad de tiradas que consume la primera depende de la
  // hora del día —el día en curso está a medias—, así que al cruzar cualquier
  // frontera horaria la segunda salía con otros folios y otros montos, y el
  // enlace compartido dejaba de mostrar lo que mostraba.
  const generar = (empresaId: number, objetivo: number): VentaDemo[] =>
    generarHistorial({
      empresaId,
      productos: deLaEmpresa(empresaId),
      objetivo,
      dias: DIAS_DE_HISTORIA,
      hoy,
      azar: crearAleatorio(hashTexto(`historial:${empresaId}`)),
      // El identificador definitivo se asigna abajo, al ordenar: lo que importa
      // es que el folio ya esté puesto, y ese sí depende del orden de emisión.
      siguienteId: () => 0,
    })

  const ventas = [
    ...generar(1, VENTAS_EMPRESA_NORTE),
    ...generar(2, VENTAS_EMPRESA_SUR),
  ].toSorted((izquierda, derecha) => izquierda.fechaUtc.localeCompare(derecha.fechaUtc))

  // Los identificadores se reparten en orden cronológico porque así crece una
  // columna de identidad: importa para el desempate de `buscar-ventas`, que
  // ordena por fecha descendente y después por id descendente.
  for (const [indice, venta] of ventas.entries()) {
    venta.id = indice + 1
  }

  return {
    ...catalogo,
    ventas,
    ultimoIdVenta: ventas.length,
    ultimoIdMarca: catalogo.marcas.length,
  }
}

const estado = sembrar()

// ── Comparadores ────────────────────────────────────────────────────────────

/**
 * `StringComparer.OrdinalIgnoreCase`, que es lo que pide explícitamente
 * `ManejadorBuscarMarcas`: compara unidades UTF-16 y no alfabeto, de modo que
 * «Ñ» y «É» quedan después de «Z». Se replica tal cual y no «mejor», porque el
 * orden de una lista paginada decide qué fila cae en qué página.
 */
function compararOrdinalSinMayusculas(izquierda: string, derecha: string): number {
  const a = izquierda.toUpperCase()
  const b = derecha.toUpperCase()

  if (a < b) {
    return -1
  }

  return a > b ? 1 : 0
}

/**
 * El orden del catálogo de productos NO es ordinal: lo pone SQL Server con su
 * colación por defecto (`Latin1_General_CI_AS`), que ignora mayúsculas pero no
 * tildes. `sensitivity: 'accent'` es el equivalente más cercano.
 */
const colacionSql = new Intl.Collator('es', { sensitivity: 'accent' })

/** `EF.Functions.Like('%criterio%')` sobre una colación que ignora mayúsculas. */
function contiene(texto: string, criterio: string): boolean {
  return texto.toLocaleLowerCase().includes(criterio.toLocaleLowerCase())
}

// ── Autenticación ───────────────────────────────────────────────────────────

/**
 * Un correo inexistente y una contraseña incorrecta devuelven lo mismo —`null`—
 * a propósito: distinguirlos permitiría enumerar usuarios válidos, y el backend
 * es explícito sobre no hacerlo.
 */
export function autenticar(correo: string, contrasena: string): UsuarioDemo | null {
  const normalizado = correo.trim().toLowerCase()

  const usuario = estado.usuarios.find(candidato => candidato.correo === normalizado)

  return usuario && usuario.contrasena === contrasena ? usuario : null
}

// ── Almacenes ───────────────────────────────────────────────────────────────

export function listarAlmacenes(empresaId: number, soloActivos?: boolean): AlmacenDemo[] {
  return estado.almacenes
    .filter(almacen => almacen.empresaId === empresaId)
    .filter(almacen => soloActivos !== true || almacen.activo)
    .toSorted((izquierda, derecha) => {
      if (izquierda.esPredeterminado !== derecha.esPredeterminado) {
        return izquierda.esPredeterminado ? -1 : 1
      }

      return compararOrdinalSinMayusculas(izquierda.nombre, derecha.nombre)
    })
}

/**
 * No mira `activo` a propósito, igual que `RepositorioAlmacenEfCore.ExisteAsync`:
 * una bodega dada de baja sigue teniendo saldo y consultarlo es legítimo. Lo
 * único que esta comprobación impide es afirmar algo sobre un almacén ajeno.
 */
export function existeAlmacen(empresaId: number, almacenId: number): boolean {
  return estado.almacenes.some(
    almacen => almacen.empresaId === empresaId && almacen.id === almacenId,
  )
}

// ── Marcas ──────────────────────────────────────────────────────────────────

export function buscarMarcas(
  empresaId: number,
  criterio: string | undefined,
  soloActivas: boolean | undefined,
): MarcaDemo[] {
  const buscado = criterio?.trim()

  return estado.marcas
    .filter(marca => marca.empresaId === empresaId)
    .filter(marca => soloActivas !== true || marca.activo)
    .filter(marca => buscado === undefined || buscado === '' || contiene(marca.nombre, buscado))
    .toSorted((izquierda, derecha) =>
      compararOrdinalSinMayusculas(izquierda.nombre, derecha.nombre),
    )
}

export function marcaPorId(empresaId: number, id: number): MarcaDemo | null {
  return estado.marcas.find(marca => marca.empresaId === empresaId && marca.id === id) ?? null
}

/** El duplicado se decide sobre el nombre NORMALIZADO en mayúsculas, como el caso de uso. */
export function existeNombreMarca(
  empresaId: number,
  nombreNormalizado: string,
  excluirId: number | null,
): boolean {
  return estado.marcas.some(
    marca =>
      marca.empresaId === empresaId &&
      marca.id !== excluirId &&
      marca.nombre.toUpperCase() === nombreNormalizado,
  )
}

export function crearMarca(
  empresaId: number,
  nombre: string,
  descripcion: string | null,
  activo: boolean,
): MarcaDemo {
  estado.ultimoIdMarca += 1

  const marca: MarcaDemo = { id: estado.ultimoIdMarca, empresaId, nombre, descripcion, activo }

  estado.marcas.push(marca)

  return marca
}

export function actualizarMarca(
  marca: MarcaDemo,
  nombre: string,
  descripcion: string | null,
  activo: boolean,
): void {
  marca.nombre = nombre
  marca.descripcion = descripcion
  marca.activo = activo
}

/** Baja lógica: no existe borrado físico en el sistema (ADR-0007). */
export function desactivarMarca(marca: MarcaDemo): void {
  marca.activo = false
}

// ── Productos y existencias ─────────────────────────────────────────────────

export function buscarProductos(
  empresaId: number,
  criterio: string | undefined,
  soloActivos: boolean | undefined,
): ProductoDemo[] {
  const buscado = criterio?.trim()

  return estado.productos
    .filter(producto => producto.empresaId === empresaId)
    .filter(producto => soloActivos !== true || producto.activo)
    .filter(
      producto =>
        buscado === undefined ||
        buscado === '' ||
        // El mismo texto busca por código y por nombre: quien atiende un mostrador
        // teclea el SKU si lo tiene a la vista y el nombre si no.
        contiene(producto.sku, buscado) ||
        contiene(producto.nombre, buscado),
    )
    .toSorted((izquierda, derecha) => {
      const porNombre = colacionSql.compare(izquierda.nombre, derecha.nombre)

      return porNombre === 0 ? izquierda.id - derecha.id : porNombre
    })
}

export function productoPorId(empresaId: number, id: number): ProductoDemo | null {
  return (
    estado.productos.find(producto => producto.empresaId === empresaId && producto.id === id) ?? null
  )
}

/**
 * Saldo en crudo, tal como está en la tabla.
 *
 * La ausencia de fila se devuelve como cero y no como desconocido: el read model
 * entrega el valor sin interpretarlo y quien decide qué significa es el caso de
 * uso. La distinción entre «cero» y «no aplica» se resuelve en el manejador.
 */
export function stockDe(productoId: number, almacenId: number): number {
  return estado.existencias.get(claveExistencia(productoId, almacenId)) ?? 0
}

export function descontarStock(productoId: number, almacenId: number, cantidad: number): void {
  const clave = claveExistencia(productoId, almacenId)

  estado.existencias.set(clave, (estado.existencias.get(clave) ?? 0) - cantidad)
}

// ── Ventas ──────────────────────────────────────────────────────────────────

export function buscarVentas(
  empresaId: number,
  desde: Date | undefined,
  hasta: Date | undefined,
  estadoVenta: string | undefined,
): VentaDemo[] {
  // El filtro «hasta» es inclusivo del día completo: quien pide el 15 espera ver
  // las ventas de las 23:59 del 15. El backend lo consigue llevando la fecha al
  // último tick del día; aquí, al último milisegundo del mismo día UTC.
  const finDeDia =
    hasta === undefined
      ? undefined
      : Date.UTC(
          hasta.getUTCFullYear(),
          hasta.getUTCMonth(),
          hasta.getUTCDate(),
          23,
          59,
          59,
          999,
        )

  const normalizado = estadoVenta?.trim().toUpperCase()

  return estado.ventas
    .filter(venta => venta.empresaId === empresaId)
    .filter(venta => {
      // Las fechas guardadas no llevan `Z` pero son UTC, igual que en la base.
      const instante = Date.parse(`${venta.fechaUtc}Z`)

      if (desde !== undefined && instante < desde.getTime()) {
        return false
      }

      return finDeDia === undefined || instante <= finDeDia
    })
    .filter(venta => normalizado === undefined || normalizado === '' || venta.estado === normalizado)
    .toSorted((izquierda, derecha) => {
      const porFecha = derecha.fechaUtc.localeCompare(izquierda.fechaUtc)

      return porFecha === 0 ? derecha.id - izquierda.id : porFecha
    })
}

export function siguienteNumero(empresaId: number, fechaUtc: Date): string {
  return siguienteNumeroVenta(estado.ventas, empresaId, fechaUtc)
}

export function registrarVenta(
  empresaId: number,
  fecha: Date,
  metodoPago: MetodoPago,
  total: number,
): VentaDemo {
  estado.ultimoIdVenta += 1

  const venta: VentaDemo = {
    id: estado.ultimoIdVenta,
    empresaId,
    numero: siguienteNumero(empresaId, fecha),
    fechaUtc: aIsoSinZ(fecha),
    estado: 'COMPLETADA',
    metodoPago,
    total,
  }

  estado.ventas.push(venta)

  return venta
}
