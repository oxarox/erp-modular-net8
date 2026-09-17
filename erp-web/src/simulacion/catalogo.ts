import type { Aleatorio } from '@/simulacion/aleatorio'

/**
 * La semilla del modo demo.
 *
 * Arranca donde arranca `20260101_001_datos_semilla.sql` —dos empresas, un rol
 * administrador, un usuario por empresa, «Bodega central», las marcas «Genérica»
 * y «Acme», los tres SKU de ejemplo y cien unidades de cada producto que controla
 * inventario— y crece desde ahí hasta un catálogo que se pueda recorrer.
 *
 * Lo que se agrega no es relleno: la interfaz tiene una regla distinta para el
 * producto inactivo, para el de stock bajo, para el agotado y para el servicio,
 * y sin un ejemplar de cada una la demo no puede mostrarlas. Lo mismo con la
 * segunda empresa: su catálogo es deliberadamente **otro**, porque es lo que
 * hace visible el aislamiento al cambiar de usuario.
 */

export interface EmpresaDemo {
  id: number
  razonSocial: string
  nombreFantasia: string
}

export interface UsuarioDemo {
  id: number
  empresaId: number
  correo: string
  /** En claro: es una semilla de demostración, no hay hash que verificar sin servidor. */
  contrasena: string
  nombreCompleto: string
  permisos: string[]
}

export interface AlmacenDemo {
  id: number
  empresaId: number
  nombre: string
  ubicacion: string | null
  esPredeterminado: boolean
  activo: boolean
}

export interface MarcaDemo {
  id: number
  empresaId: number
  nombre: string
  descripcion: string | null
  activo: boolean
}

export interface ProductoDemo {
  id: number
  empresaId: number
  sku: string
  nombre: string
  marca: string | null
  categoria: string | null
  precioVenta: number
  controlaInventario: boolean
  activo: boolean
}

export interface Catalogo {
  empresas: EmpresaDemo[]
  usuarios: UsuarioDemo[]
  almacenes: AlmacenDemo[]
  marcas: MarcaDemo[]
  productos: ProductoDemo[]
  /**
   * `${productoId}:${almacenId}` → cantidad.
   *
   * Que una clave **no exista** es un cero real y no un desconocido: así lo
   * decide `ManejadorBuscarProductos.StockDe` sobre la tabla `existencias`, y
   * por eso el mapa se deja incompleto a propósito en la sucursal.
   */
  existencias: Map<string, number>
}

/** Catálogo completo de `ERP.Api/Autorizacion/Permisos.cs`: el rol Administrador los trae todos. */
const PERMISOS_ADMINISTRADOR = [
  'marcas.ver',
  'marcas.gestionar',
  'productos.ver',
  'almacenes.ver',
  'ventas.ver',
  'ventas.registrar',
  'ventas.anular',
  'reportes.ver',
]

export function claveExistencia(productoId: number, almacenId: number): string {
  return `${productoId}:${almacenId}`
}

interface FilaMarca {
  nombre: string
  descripcion: string | null
  activo?: boolean
}

interface FilaProducto {
  sku: string
  nombre: string
  marca: string | null
  categoria: string | null
  precioVenta: number
  controlaInventario: boolean
  activo?: boolean
  /** Existencia en la bodega predeterminada. Cien, como la semilla, salvo que se diga otra cosa. */
  stock?: number
}

// ── Empresa 1: Comercial Norte SpA, distribuidor de insumos ────────────────

const MARCAS_NORTE: FilaMarca[] = [
  { nombre: 'Genérica', descripcion: 'Marca por defecto del catálogo.' },
  { nombre: 'Acme', descripcion: 'Marca de ejemplo.' },
  { nombre: 'Bosch', descripcion: 'Herramienta eléctrica profesional.' },
  { nombre: '3M', descripcion: 'Abrasivos, cintas y elementos de protección.' },
  { nombre: 'Stanley', descripcion: 'Herramienta manual y organización.' },
  { nombre: 'Sika', descripcion: 'Adhesivos, selladores y morteros.' },
  { nombre: 'Truper', descripcion: 'Ferretería general.' },
  { nombre: 'Lumisol', descripcion: 'Iluminación LED para interior y exterior.' },
  { nombre: 'Ferrex', descripcion: 'Línea importada de fijaciones.' },
  {
    nombre: 'Kloro',
    descripcion: 'Línea de aseo industrial. Descontinuada en 2025.',
    activo: false,
  },
]

const PRODUCTOS_NORTE: FilaProducto[] = [
  // Los tres de la semilla, con la marca y la categoría que el script les asigna.
  {
    sku: 'SKU-0001',
    nombre: 'Insumo de ejemplo A',
    marca: 'Acme',
    categoria: 'Insumos',
    precioVenta: 1990,
    controlaInventario: true,
  },
  {
    sku: 'SKU-0002',
    nombre: 'Insumo de ejemplo B',
    marca: 'Acme',
    categoria: 'Insumos',
    precioVenta: 4990,
    controlaInventario: true,
  },
  {
    sku: 'SKU-9000',
    nombre: 'Servicio de instalación',
    marca: 'Acme',
    categoria: 'Insumos',
    precioVenta: 25000,
    controlaInventario: false,
  },

  {
    sku: 'SKU-0101',
    nombre: 'Guantes de nitrilo talla M (caja de 100)',
    marca: '3M',
    categoria: 'Seguridad',
    precioVenta: 8990,
    controlaInventario: true,
  },
  // Stock bajo: la tabla de productos marca en ámbar todo lo que baja de diez.
  {
    sku: 'SKU-0102',
    nombre: 'Mascarilla respiratoria P2',
    marca: '3M',
    categoria: 'Seguridad',
    precioVenta: 3490,
    controlaInventario: true,
    stock: 8,
  },
  {
    sku: 'SKU-0103',
    nombre: 'Cinta de embalaje 48 mm x 100 m',
    marca: 'Genérica',
    categoria: 'Insumos',
    precioVenta: 1290,
    controlaInventario: true,
  },
  {
    sku: 'SKU-0201',
    nombre: 'Taladro percutor 650 W',
    marca: 'Bosch',
    categoria: 'Herramientas',
    precioVenta: 79990,
    controlaInventario: true,
    stock: 24,
  },
  // Agotado: el selector de la venta lo muestra apagado, con el motivo escrito.
  {
    sku: 'SKU-0202',
    nombre: 'Set de brocas HSS 19 piezas',
    marca: 'Bosch',
    categoria: 'Herramientas',
    precioVenta: 14990,
    controlaInventario: true,
    stock: 0,
  },
  {
    sku: 'SKU-0203',
    nombre: 'Juego de destornilladores 6 piezas',
    marca: 'Stanley',
    categoria: 'Herramientas',
    precioVenta: 12990,
    controlaInventario: true,
  },
  {
    sku: 'SKU-0301',
    nombre: 'Sellador de poliuretano 300 ml',
    marca: 'Sika',
    categoria: 'Adhesivos',
    precioVenta: 6490,
    controlaInventario: true,
  },
  {
    sku: 'SKU-0302',
    nombre: 'Adhesivo epóxico bicomponente 50 ml',
    marca: 'Sika',
    categoria: 'Adhesivos',
    precioVenta: 9990,
    controlaInventario: true,
  },
  {
    sku: 'SKU-0303',
    nombre: 'Tornillo autoperforante 8 x 1" (caja de 500)',
    marca: 'Ferrex',
    categoria: 'Fijaciones',
    precioVenta: 15990,
    controlaInventario: true,
  },
  // Inactivo, junto con su marca: la baja lógica es la única que existe (ADR-0007).
  {
    sku: 'SKU-0401',
    nombre: 'Detergente industrial 5 L',
    marca: 'Kloro',
    categoria: 'Aseo',
    precioVenta: 11990,
    controlaInventario: true,
    activo: false,
    stock: 12,
  },
  {
    sku: 'SKU-0402',
    nombre: 'Escobillón industrial 60 cm',
    marca: 'Truper',
    categoria: 'Aseo',
    precioVenta: 5990,
    controlaInventario: true,
  },
  {
    sku: 'SKU-0501',
    nombre: 'Foco LED 20 W luz fría',
    marca: 'Lumisol',
    categoria: 'Iluminación',
    precioVenta: 4590,
    controlaInventario: true,
  },
  // Segundo servicio: sin existencias que descontar, se vende con la bodega en cero.
  {
    sku: 'SKU-9001',
    nombre: 'Mantenimiento preventivo por hora',
    marca: 'Genérica',
    categoria: 'Servicios',
    precioVenta: 18000,
    controlaInventario: false,
  },
]

// ── Empresa 2: Distribuidora Sur Ltda, abarrotes ───────────────────────────

const MARCAS_SUR: FilaMarca[] = [
  { nombre: 'Andes Provisiones', descripcion: 'Abarrotes secos y conservas.' },
  { nombre: 'Patagonia Foods', descripcion: 'Elaborados del sur.' },
  { nombre: 'Viña Tinto Austral', descripcion: 'Vinos del valle.' },
  { nombre: 'Kütral Congelados', descripcion: 'Cadena de frío. Convenio terminado.', activo: false },
]

const PRODUCTOS_SUR: FilaProducto[] = [
  {
    sku: 'SUR-1001',
    nombre: 'Café de grano tostado 1 kg',
    marca: 'Andes Provisiones',
    categoria: 'Abarrotes',
    precioVenta: 12900,
    controlaInventario: true,
  },
  {
    sku: 'SUR-1002',
    nombre: 'Aceite de oliva extra virgen 500 ml',
    marca: 'Patagonia Foods',
    categoria: 'Abarrotes',
    precioVenta: 8900,
    controlaInventario: true,
  },
  {
    sku: 'SUR-1003',
    nombre: 'Mermelada de murta 250 g',
    marca: 'Patagonia Foods',
    categoria: 'Abarrotes',
    precioVenta: 4200,
    controlaInventario: true,
  },
  {
    sku: 'SUR-2001',
    nombre: 'Vino tinto reserva 750 ml',
    marca: 'Viña Tinto Austral',
    categoria: 'Bebidas',
    precioVenta: 15900,
    controlaInventario: true,
    stock: 46,
  },
  {
    sku: 'SUR-3001',
    nombre: 'Berries congelados 1 kg',
    marca: 'Kütral Congelados',
    categoria: 'Congelados',
    precioVenta: 7900,
    controlaInventario: true,
    activo: false,
    stock: 30,
  },
  {
    sku: 'SUR-9000',
    nombre: 'Despacho a domicilio',
    marca: null,
    categoria: 'Servicios',
    precioVenta: 6000,
    controlaInventario: false,
  },
]

const STOCK_POR_DEFECTO = 100

export function sembrarCatalogo(azar: Aleatorio): Catalogo {
  const empresas: EmpresaDemo[] = [
    { id: 1, razonSocial: 'Comercial Norte SpA', nombreFantasia: 'Norte' },
    { id: 2, razonSocial: 'Distribuidora Sur Ltda', nombreFantasia: 'Sur' },
  ]

  const usuarios: UsuarioDemo[] = [
    {
      id: 1,
      empresaId: 1,
      correo: 'admin@norte.cl',
      contrasena: 'Demo.1234',
      nombreCompleto: 'Administración Norte',
      permisos: [...PERMISOS_ADMINISTRADOR],
    },
    {
      id: 2,
      empresaId: 2,
      correo: 'admin@sur.cl',
      contrasena: 'Demo.1234',
      nombreCompleto: 'Administración Sur',
      permisos: [...PERMISOS_ADMINISTRADOR],
    },
  ]

  const almacenes: AlmacenDemo[] = [
    {
      id: 1,
      empresaId: 1,
      nombre: 'Bodega central',
      ubicacion: 'Av. Industrial 2450, Santiago',
      esPredeterminado: true,
      activo: true,
    },
    {
      id: 2,
      empresaId: 1,
      nombre: 'Sucursal centro',
      ubicacion: 'Moneda 870, Santiago',
      esPredeterminado: false,
      activo: true,
    },
    {
      id: 3,
      empresaId: 2,
      nombre: 'Bodega central',
      ubicacion: 'Ruta 5 Sur km 1020, Puerto Montt',
      esPredeterminado: true,
      activo: true,
    },
  ]

  const marcas: MarcaDemo[] = []
  const productos: ProductoDemo[] = []
  const existencias = new Map<string, number>()

  const agregarMarcas = (empresaId: number, filas: FilaMarca[]): void => {
    for (const fila of filas) {
      marcas.push({
        id: marcas.length + 1,
        empresaId,
        nombre: fila.nombre,
        descripcion: fila.descripcion,
        activo: fila.activo ?? true,
      })
    }
  }

  const agregarProductos = (empresaId: number, filas: FilaProducto[]): void => {
    const predeterminado = almacenes.find(a => a.empresaId === empresaId && a.esPredeterminado)
    const secundarios = almacenes.filter(a => a.empresaId === empresaId && !a.esPredeterminado)

    for (const fila of filas) {
      const producto: ProductoDemo = {
        id: productos.length + 1,
        empresaId,
        sku: fila.sku,
        nombre: fila.nombre,
        marca: fila.marca,
        categoria: fila.categoria,
        precioVenta: fila.precioVenta,
        controlaInventario: fila.controlaInventario,
        activo: fila.activo ?? true,
      }

      productos.push(producto)

      if (!producto.controlaInventario) {
        // Un servicio no tiene fila en `existencias`: no es que no quede, es que
        // la pregunta no aplica. El caso de uso lo distingue devolviendo nulo.
        continue
      }

      if (predeterminado) {
        existencias.set(
          claveExistencia(producto.id, predeterminado.id),
          fila.stock ?? STOCK_POR_DEFECTO,
        )
      }

      for (const almacen of secundarios) {
        // La sucursal no replica la bodega central: surte poco más de la mitad
        // del catálogo. Los productos que no surte quedan SIN fila, que es como
        // se ve un cero de verdad en la tabla de existencias.
        if (azar.decision(0.55)) {
          existencias.set(claveExistencia(producto.id, almacen.id), azar.entero(4, 48))
        }
      }
    }
  }

  agregarMarcas(1, MARCAS_NORTE)
  agregarMarcas(2, MARCAS_SUR)
  agregarProductos(1, PRODUCTOS_NORTE)
  agregarProductos(2, PRODUCTOS_SUR)

  return { empresas, usuarios, almacenes, marcas, productos, existencias }
}
