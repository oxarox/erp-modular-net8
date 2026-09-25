import { http } from 'msw'
import type {
  ErrorCampo,
  RespuestaAlmacen,
  RespuestaMarca,
  RespuestaOperacionMarca,
  RespuestaProducto,
  RespuestaSalud,
  RespuestaVenta,
  RespuestaVentaRegistrada,
} from '@/nucleo/api/contratos'
import { METODOS_PAGO } from '@/nucleo/api/contratos'
import {
  CODIGOS_ALMACENES,
  CODIGOS_AUTENTICACION,
  CODIGOS_MARCAS,
  CODIGOS_VENTAS,
} from '@/nucleo/api/errores'
import { PERMISOS } from '@/nucleo/autenticacion/almacenSesion'
import { configuracion } from '@/nucleo/configuracion'
import { calcularTotalesSeguro } from '@/nucleo/dominio/totales'
import type { LineaCalculo } from '@/nucleo/dominio/totales'
import * as datos from '@/simulacion/datos'
import {
  anonimo,
  booleanoOpcional,
  cadena,
  leerCuerpo,
  numero,
  protegido,
} from '@/simulacion/guardias'
import type { IdentidadDemo } from '@/simulacion/sesiones'
import { canjearRefresco, emitirSesion } from '@/simulacion/sesiones'
import {
  aIsoUtc,
  booleanoDe,
  creado,
  enteroDe,
  errorConflicto,
  errorInterno,
  errorNoAutenticado,
  errorNoEncontrado,
  errorSolicitudInvalida,
  errorValidacion,
  fechaDe,
  idDeRuta,
  normalizarPaginacion,
  ok,
  paginar,
  textoDe,
} from '@/simulacion/sobre'

/**
 * Los doce endpoints, reimplementados.
 *
 * Esto no son «datos falsos para que se vea algo»: es una reimplementación del
 * contrato. Cada manejador replica el orden de comprobaciones de su caso de uso,
 * su código de catálogo y su código HTTP, porque una demo que aprueba lo que el
 * backend rechaza —o que responde 403 donde el backend responde 404— miente
 * sobre el sistema que dice representar.
 *
 * ── Por qué el patrón de ruta empieza por `*` ───────────────────────────────
 *
 * `construirUrl` arma la petición como `configuracion.urlApi + ruta` resuelto
 * contra el origen de la página. En modo demo `.env.demo` deja `VITE_API_URL`
 * vacío, así que la URL final es `https://…/api/marcas/buscar-marcas`; pero
 * alguien puede levantar el modo demo en desarrollo con `VITE_API_URL` apuntando
 * a otro origen, y entonces la misma ruta sale como
 * `http://localhost:5080/api/…`. El comodín inicial cubre las dos formas: un
 * patrón que empieza por asterisco es, para MSW, «cualquier origen».
 */

/** La sonda devuelve la versión del ensamblado; aquí, la del paquete del cliente. */
const VERSION = '1.0.0.0'

/** `CodigosErrorValidacion.FormatoInvalido`, el que pone `EmailAddress()`. */
const CODIGO_FORMATO_INVALIDO = 'VAL_004'

/** `0.##` de .NET: sin decimales cuando no hacen falta. */
function comoCantidad(valor: number): string {
  return String(Math.round(valor * 100) / 100)
}

// ── Autenticación ───────────────────────────────────────────────────────────

/**
 * `EmailAddress()` de FluentValidation en modo compatible con ASP.NET Core: no
 * es una expresión de RFC sino una comprobación deliberadamente laxa —una sola
 * arroba, ni al principio ni al final—. Se replica tal cual y no algo «mejor»,
 * porque una regla más estricta rechazaría correos que el servidor acepta.
 *
 * Está escrita aquí y no importada del espejo de `caracteristicas/autenticacion`
 * a propósito: ese archivo es la copia del cliente, y compartir la implementación
 * haría que cliente y servidor coincidieran por construcción en vez de por
 * contrato. El simulador es el servidor; si los dos se apartan, hay que notarlo.
 */
function tieneFormatoDeCorreo(valor: string): boolean {
  const [local, dominio, ...sobrantes] = valor.split('@')

  return sobrantes.length === 0 && Boolean(local) && Boolean(dominio)
}

function identidadDe(usuario: datos.UsuarioDemo): IdentidadDemo {
  return {
    usuarioId: usuario.id,
    empresaId: usuario.empresaId,
    nombreCompleto: usuario.nombreCompleto,
    permisos: usuario.permisos,
  }
}

const iniciarSesion = anonimo(async ({ peticion, traceId }) => {
  const cuerpo = await leerCuerpo(peticion)
  const correo = cadena(cuerpo, 'correo')
  const contrasena = cadena(cuerpo, 'contrasena')

  // FluentValidation recorre todas las reglas y acumula: un correo vacío y una
  // contraseña vacía viajan juntos en el mismo sobre. Lo que corta en el primer
  // fallo es `CascadeMode.Stop`, y lo hace dentro de cada campo.
  const errores: ErrorCampo[] = []

  if (correo.trim() === '') {
    errores.push({
      campo: 'Correo',
      codigo: CODIGOS_AUTENTICACION.correoRequerido,
      mensaje: 'El correo es obligatorio.',
    })
  } else if (!tieneFormatoDeCorreo(correo.trim())) {
    errores.push({
      campo: 'Correo',
      codigo: CODIGO_FORMATO_INVALIDO,
      mensaje: 'El correo no tiene un formato válido.',
    })
  }

  if (contrasena.trim() === '') {
    errores.push({
      campo: 'Contrasena',
      codigo: CODIGOS_AUTENTICACION.contrasenaRequerida,
      mensaje: 'La contraseña es obligatoria.',
    })
  }

  if (errores.length > 0) {
    return errorValidacion(traceId, errores)
  }

  const usuario = datos.autenticar(correo, contrasena)

  if (usuario === null) {
    return errorNoAutenticado(
      traceId,
      'Las credenciales no son válidas.',
      CODIGOS_AUTENTICACION.credencialesInvalidas,
    )
  }

  return ok(emitirSesion(identidadDe(usuario)), traceId)
})

const refrescarSesion = anonimo(async ({ peticion, traceId }) => {
  const token = cadena(await leerCuerpo(peticion), 'tokenRefresco')

  if (token.trim() === '') {
    return errorValidacion(traceId, [
      {
        campo: 'TokenRefresco',
        codigo: CODIGOS_AUTENTICACION.tokenRefrescoInvalido,
        mensaje: 'El token de refresco es obligatorio.',
      },
    ])
  }

  const resultado = canjearRefresco(token)

  if (resultado.estado === 'desconocido') {
    return errorNoAutenticado(
      traceId,
      'El token de refresco no es válido.',
      CODIGOS_AUTENTICACION.tokenRefrescoInvalido,
    )
  }

  if (resultado.estado === 'noVigente') {
    return errorNoAutenticado(
      traceId,
      'La sesión expiró o fue revocada.',
      CODIGOS_AUTENTICACION.tokenRefrescoExpirado,
    )
  }

  return ok(resultado.sesion, traceId)
})

// ── Marcas ──────────────────────────────────────────────────────────────────

function aRespuestaMarca(marca: datos.MarcaDemo): RespuestaMarca {
  return {
    id: marca.id,
    nombre: marca.nombre,
    descripcion: marca.descripcion,
    activo: marca.activo,
  }
}

/**
 * Reglas de FORMA del nombre y la descripción, en el orden del validador.
 *
 * Solo la forma: el nombre duplicado necesita mirar el estado del sistema y por
 * eso vive en el caso de uso, no aquí. Es el mismo reparto que declara
 * `ValidadorSolicitudCrearMarca`.
 */
function validarMarca(nombre: string, descripcion: string): ErrorCampo[] {
  const errores: ErrorCampo[] = []

  // Una cadena de solo espacios cae aquí y no en `MARCA_002`. Es lo que hace el
  // servidor: el `NotEmpty()` de FluentValidation considera vacía también una
  // cadena en blanco, y con `CascadeMode.Stop` la regla siguiente —la que lleva
  // `MARCA_002`— nunca llega a evaluarse. Ese código existe en el validador pero
  // es inalcanzable, y el simulador replica lo que el sistema HACE, no lo que su
  // código sugiere. Ver `validacionMarca.ts`, que toma la misma lectura.
  if (nombre.trim().length === 0) {
    errores.push({
      campo: 'Nombre',
      codigo: CODIGOS_MARCAS.requerido,
      mensaje: 'El nombre es obligatorio.',
    })
  } else if (nombre.length < 2) {
    errores.push({
      campo: 'Nombre',
      codigo: CODIGOS_MARCAS.longitudMinima,
      mensaje: 'El nombre debe tener al menos 2 caracteres.',
    })
  } else if (nombre.length > 120) {
    errores.push({
      campo: 'Nombre',
      codigo: CODIGOS_MARCAS.longitudMaxima,
      mensaje: 'El nombre no puede superar los 120 caracteres.',
    })
  }

  if (descripcion.length > 500) {
    errores.push({
      campo: 'Descripcion',
      codigo: CODIGOS_MARCAS.longitudMaxima,
      mensaje: 'La descripción no puede superar los 500 caracteres.',
    })
  }

  return errores
}

/** `string.IsNullOrWhiteSpace(x) ? null : x.Trim()`, tal como lo hace el caso de uso. */
function descripcionNormalizada(valor: string): string | null {
  return valor.trim() === '' ? null : valor.trim()
}

const buscarMarcas = protegido(PERMISOS.marcas.ver, ({ url, traceId, identidad }) => {
  const encontradas = datos.buscarMarcas(
    identidad.empresaId,
    textoDe(url, 'criterio'),
    booleanoDe(url, 'soloActivas'),
  )

  const paginacion = normalizarPaginacion(enteroDe(url, 'pagina'), enteroDe(url, 'tamanoPagina'))

  return ok(paginar(encontradas.map(aRespuestaMarca), paginacion), traceId)
})

const obtenerMarcaPorId = protegido(PERMISOS.marcas.ver, ({ parametros, traceId, identidad }) => {
  const id = idDeRuta(parametros)
  const marca = id === null ? null : datos.marcaPorId(identidad.empresaId, id)

  if (marca === null) {
    return errorNoEncontrado(
      traceId,
      `No se encontró la marca con identificador ${id ?? 0}.`,
      CODIGOS_MARCAS.noEncontrado,
    )
  }

  return ok(aRespuestaMarca(marca), traceId)
})

const crearMarca = protegido(
  PERMISOS.marcas.gestionar,
  async ({ peticion, traceId, identidad }) => {
    const cuerpo = await leerCuerpo(peticion)
    const nombre = cadena(cuerpo, 'nombre')
    const descripcion = cadena(cuerpo, 'descripcion')
    const errores = validarMarca(nombre, descripcion)

    if (errores.length > 0) {
      return errorValidacion(traceId, errores)
    }

    const limpio = nombre.trim()

    if (datos.existeNombreMarca(identidad.empresaId, limpio.toUpperCase(), null)) {
      return errorConflicto(
        traceId,
        'Ya existe una marca con el mismo nombre para la empresa.',
        CODIGOS_MARCAS.duplicado,
      )
    }

    const marca = datos.crearMarca(
      identidad.empresaId,
      limpio,
      descripcionNormalizada(descripcion),
      booleanoOpcional(cuerpo, 'activo') ?? true,
    )

    const respuesta: RespuestaOperacionMarca = {
      exitoso: true,
      mensaje: 'Marca creada.',
      id: marca.id,
    }

    // `CreatedAtAction(nameof(ObtenerMarcaPorId), …)`: el 201 del backend viene
    // con su cabecera `Location` apuntando a la ficha recién creada.
    return creado(respuesta, traceId, `/api/marcas/obtener-marca-por-id/${marca.id}`)
  },
)

const actualizarMarca = protegido(
  PERMISOS.marcas.gestionar,
  async ({ peticion, parametros, traceId, identidad }) => {
    const cuerpo = await leerCuerpo(peticion)
    const nombre = cadena(cuerpo, 'nombre')
    const descripcion = cadena(cuerpo, 'descripcion')
    const errores = validarMarca(nombre, descripcion)

    if (errores.length > 0) {
      return errorValidacion(traceId, errores)
    }

    const id = idDeRuta(parametros)
    const marca = id === null ? null : datos.marcaPorId(identidad.empresaId, id)

    if (marca === null) {
      return errorNoEncontrado(
        traceId,
        `No se encontró la marca con identificador ${id ?? 0}.`,
        CODIGOS_MARCAS.noEncontrado,
      )
    }

    const limpio = nombre.trim()

    if (datos.existeNombreMarca(identidad.empresaId, limpio.toUpperCase(), marca.id)) {
      return errorConflicto(
        traceId,
        'Ya existe otra marca con el mismo nombre para la empresa.',
        CODIGOS_MARCAS.duplicado,
      )
    }

    // `Activo = comando.Activo ?? existente.Activo`: omitir el campo conserva el
    // estado, no lo apaga.
    datos.actualizarMarca(
      marca,
      limpio,
      descripcionNormalizada(descripcion),
      booleanoOpcional(cuerpo, 'activo') ?? marca.activo,
    )

    const respuesta: RespuestaOperacionMarca = {
      exitoso: true,
      mensaje: 'Marca actualizada.',
      id: marca.id,
    }

    return ok(respuesta, traceId)
  },
)

const desactivarMarca = protegido(
  PERMISOS.marcas.gestionar,
  ({ parametros, traceId, identidad }) => {
    const id = idDeRuta(parametros)
    const marca = id === null ? null : datos.marcaPorId(identidad.empresaId, id)

    if (marca === null) {
      return errorNoEncontrado(
        traceId,
        `No se encontró la marca con identificador ${id ?? 0}.`,
        CODIGOS_MARCAS.noEncontrado,
      )
    }

    if (!marca.activo) {
      return errorConflicto(
        traceId,
        'La marca ya se encuentra inactiva.',
        CODIGOS_MARCAS.entidadInactiva,
      )
    }

    datos.desactivarMarca(marca)

    const respuesta: RespuestaOperacionMarca = {
      exitoso: true,
      mensaje: 'Marca desactivada.',
      id: marca.id,
    }

    return ok(respuesta, traceId)
  },
)

// ── Productos ───────────────────────────────────────────────────────────────

const buscarProductos = protegido(PERMISOS.productos.ver, ({ url, traceId, identidad }) => {
  const almacenId = enteroDe(url, 'almacenId')

  // Se comprueba ANTES de consultar. Sin esto, un almacén ajeno o dado de baja
  // no encuentra existencias y el catálogo entero viajaría con saldo cero —«no
  // queda»— sobre una bodega de la que no se sabe nada. El front trata este 404
  // limpiando el almacén que recordaba.
  if (almacenId !== undefined && !datos.existeAlmacen(identidad.empresaId, almacenId)) {
    return errorNoEncontrado(
      traceId,
      `No se encontró el almacén con identificador ${almacenId}.`,
      CODIGOS_ALMACENES.noEncontrado,
    )
  }

  const encontrados = datos.buscarProductos(
    identidad.empresaId,
    textoDe(url, 'criterio'),
    booleanoDe(url, 'soloActivos'),
  )

  const paginacion = normalizarPaginacion(enteroDe(url, 'pagina'), enteroDe(url, 'tamanoPagina'))
  const pagina = paginar(encontrados, paginacion)

  const items: RespuestaProducto[] = pagina.items.map(producto => ({
    id: producto.id,
    sku: producto.sku,
    nombre: producto.nombre,
    marca: producto.marca,
    categoria: producto.categoria,
    precioVenta: producto.precioVenta,
    controlaInventario: producto.controlaInventario,
    activo: producto.activo,
    // Un servicio no tiene existencias y una consulta sin almacén no sabe de cuál
    // hablar: en ambos casos el saldo es DESCONOCIDO y viaja nulo, para que el
    // front no pinte la línea como agotada. La falta de fila sí es un cero.
    stockDisponible:
      almacenId === undefined || !producto.controlaInventario
        ? null
        : datos.stockDe(producto.id, almacenId),
  }))

  return ok({ ...pagina, items }, traceId)
})

// ── Almacenes ───────────────────────────────────────────────────────────────

const listarAlmacenes = protegido(PERMISOS.almacenes.ver, ({ url, traceId, identidad }) => {
  // Única lista del sistema que NO se pagina: la consume un selector, que
  // necesita el listado completo para poder mostrarse. Ver ADR-0009.
  const almacenes: RespuestaAlmacen[] = datos
    .listarAlmacenes(identidad.empresaId, booleanoDe(url, 'soloActivos'))
    .map(almacen => ({
      id: almacen.id,
      nombre: almacen.nombre,
      ubicacion: almacen.ubicacion,
      esPredeterminado: almacen.esPredeterminado,
      activo: almacen.activo,
    }))

  return ok(almacenes, traceId)
})

// ── Ventas ──────────────────────────────────────────────────────────────────

const buscarVentas = protegido(PERMISOS.ventas.ver, ({ url, traceId, identidad }) => {
  const encontradas = datos.buscarVentas(
    identidad.empresaId,
    fechaDe(url, 'desde'),
    fechaDe(url, 'hasta'),
    textoDe(url, 'estado'),
  )

  const paginacion = normalizarPaginacion(enteroDe(url, 'pagina'), enteroDe(url, 'tamanoPagina'))

  const items: RespuestaVenta[] = encontradas.map(venta => ({
    id: venta.id,
    numero: venta.numero,
    fechaUtc: venta.fechaUtc,
    estado: venta.estado,
    metodoPago: venta.metodoPago,
    total: venta.total,
  }))

  return ok(paginar(items, paginacion), traceId)
})

interface LineaEntrante {
  productoId: number
  cantidad: number
  descuentoLinea: number | null
}

function leerLineas(valor: unknown): LineaEntrante[] | null {
  if (!Array.isArray(valor)) {
    return null
  }

  return valor.map((elemento: unknown) => {
    const linea = typeof elemento === 'object' && elemento !== null ? elemento : {}
    const campos = linea as Record<string, unknown>
    const descuento = campos['descuentoLinea']

    return {
      productoId: numero(campos['productoId']),
      cantidad: numero(campos['cantidad']),
      descuentoLinea: typeof descuento === 'number' ? descuento : null,
    }
  })
}

/** `ValidadorSolicitudRegistrarVenta`: reglas de forma, en el orden en que están escritas. */
function validarVenta(
  almacenId: number,
  metodoPago: string,
  lineas: LineaEntrante[] | null,
): ErrorCampo[] {
  const errores: ErrorCampo[] = []

  if (almacenId <= 0) {
    errores.push({
      campo: 'AlmacenId',
      codigo: CODIGOS_VENTAS.almacenNoEncontrado,
      mensaje: 'Debe indicar un almacén válido.',
    })
  }

  if (metodoPago.trim() === '') {
    errores.push({
      campo: 'MetodoPago',
      codigo: CODIGOS_VENTAS.metodoPagoInvalido,
      mensaje: 'El método de pago es obligatorio.',
    })
  }

  if (lineas === null || lineas.length === 0) {
    errores.push({
      campo: 'Lineas',
      codigo: CODIGOS_VENTAS.sinLineas,
      mensaje: 'La venta debe tener al menos una línea.',
    })

    return errores
  }

  for (const [indice, linea] of lineas.entries()) {
    if (linea.productoId <= 0) {
      errores.push({
        campo: `Lineas[${indice}].ProductoId`,
        codigo: CODIGOS_VENTAS.productoNoEncontrado,
        mensaje: 'Debe indicar un producto válido.',
      })
    }

    if (linea.cantidad <= 0) {
      errores.push({
        campo: `Lineas[${indice}].Cantidad`,
        codigo: CODIGOS_VENTAS.cantidadInvalida,
        mensaje: 'La cantidad debe ser mayor a cero.',
      })
    }

    if (linea.descuentoLinea !== null && linea.descuentoLinea < 0) {
      errores.push({
        campo: `Lineas[${indice}].DescuentoLinea`,
        codigo: CODIGOS_VENTAS.descuentoInvalido,
        mensaje: 'El descuento no puede ser negativo.',
      })
    }
  }

  return errores
}

const registrarVenta = protegido(
  PERMISOS.ventas.registrar,
  async ({ peticion, traceId, identidad }) => {
    const cuerpo = await leerCuerpo(peticion)
    const almacenId = numero(cuerpo['almacenId'])
    const metodoPagoCrudo = cadena(cuerpo, 'metodoPago')
    const lineas = leerLineas(cuerpo['lineas'])

    const errores = validarVenta(almacenId, metodoPagoCrudo, lineas)

    if (errores.length > 0 || lineas === null) {
      return errorValidacion(traceId, errores)
    }

    // A partir de aquí, el orden es el de `ManejadorRegistrarVenta`.
    // `METODOS_PAGO` es el espejo de `Ventas:MetodosPagoPermitidos`; el manejador
    // compara contra la lista ya recortada y en mayúsculas, pero el mensaje de
    // rechazo cita el valor tal como llegó.
    const normalizado = metodoPagoCrudo.trim().toUpperCase()
    const metodoPago = METODOS_PAGO.find(permitido => permitido === normalizado)

    if (metodoPago === undefined) {
      return errorSolicitudInvalida(
        traceId,
        `El método de pago ${metodoPagoCrudo} no está habilitado.`,
        CODIGOS_VENTAS.metodoPagoInvalido,
      )
    }

    // Mismo orden y mismo código que `ManejadorRegistrarVenta`: el almacén se
    // comprueba antes de mirar una sola línea. Sin esa comprobación, un
    // identificador de otra empresa no encuentra existencias y la venta se
    // rechaza con «stock insuficiente: disponible 0», que manda a revisar el
    // inventario en vez de la solicitud.
    if (!datos.existeAlmacen(identidad.empresaId, almacenId)) {
      return errorSolicitudInvalida(
        traceId,
        'Debe indicar un almacén válido.',
        CODIGOS_VENTAS.almacenNoEncontrado,
      )
    }

    const paraCalcular: LineaCalculo[] = []

    /** Unidades ya comprometidas por producto, para que dos líneas del mismo SKU no se validen por separado. */
    const comprometido = new Map<number, number>()

    for (const linea of lineas) {
      const producto = datos.productoPorId(identidad.empresaId, linea.productoId)

      if (producto === null) {
        return errorNoEncontrado(
          traceId,
          `No se encontró el producto con identificador ${linea.productoId}.`,
          CODIGOS_VENTAS.productoNoEncontrado,
        )
      }

      if (!producto.activo) {
        return errorSolicitudInvalida(
          traceId,
          `El producto ${producto.nombre} está inactivo y no puede venderse.`,
          CODIGOS_VENTAS.productoInactivo,
        )
      }

      if (linea.cantidad <= 0) {
        return errorSolicitudInvalida(
          traceId,
          `La cantidad del producto ${producto.nombre} debe ser mayor a cero.`,
          CODIGOS_VENTAS.cantidadInvalida,
        )
      }

      if (producto.controlaInventario) {
        const disponible = datos.stockDe(producto.id, almacenId)

        // Se acumula lo ya comprometido por líneas anteriores del MISMO producto.
        // Comparando línea a línea contra la misma foto, dos líneas de cincuenta
        // unidades pasarían las dos con un saldo de sesenta y el descuento
        // posterior dejaría la existencia en negativo. El servidor real es igual
        // de optimista al validar, pero al escribir choca con
        // `CK_existencias_no_negativa` y revierte la transacción: nunca devuelve
        // un 201 con el inventario corrupto, y aquí tampoco.
        const solicitado = (comprometido.get(producto.id) ?? 0) + linea.cantidad

        if (disponible < solicitado) {
          return errorSolicitudInvalida(
            traceId,
            `Stock insuficiente para ${producto.nombre}: disponible ${comoCantidad(disponible)}, solicitado ${solicitado}.`,
            CODIGOS_VENTAS.stockInsuficiente,
            { id: producto.id, disponible, solicitado },
          )
        }

        comprometido.set(producto.id, solicitado)
      }

      // El precio lo pone el servidor releyendo el catálogo: un cambio de precio
      // a mitad de la venta lo gana el servidor, no el borrador del mostrador.
      paraCalcular.push({
        cantidad: linea.cantidad,
        precioUnitario: producto.precioVenta,
        descuentoLinea: linea.descuentoLinea ?? 0,
      })
    }

    const calculo = calcularTotalesSeguro(
      paraCalcular,
      configuracion.impuesto.tasa,
      configuracion.impuesto.precioIncluyeImpuesto,
    )

    if (calculo.totales === null) {
      // Un descuento mayor al bruto de su línea pasa el validador —solo exige que
      // no sea negativo— y lo rechaza la calculadora del dominio con una excepción
      // que el intermediario traduce a 500. No es un error de validación
      // aprovechable: es una caída, y por eso la pantalla bloquea esa línea antes
      // de enviarla. Ver la nota de `VentaTipos.revisarLinea`.
      return errorInterno(traceId)
    }

    const totales = calculo.totales
    const venta = datos.registrarVenta(identidad.empresaId, new Date(), metodoPago, totales.total)

    // El descuento va después de registrar, como los movimientos de inventario del
    // caso de uso, que se escriben una vez que la venta ya tiene folio.
    for (const linea of lineas) {
      const producto = datos.productoPorId(identidad.empresaId, linea.productoId)

      if (producto?.controlaInventario === true) {
        datos.descontarStock(producto.id, almacenId, linea.cantidad)
      }
    }

    const respuesta: RespuestaVentaRegistrada = {
      id: venta.id,
      numero: venta.numero,
      subtotal: totales.subtotal,
      descuento: totales.descuento,
      impuesto: totales.impuesto,
      total: totales.total,
    }

    return creado(respuesta, traceId)
  },
)

// ── Salud ───────────────────────────────────────────────────────────────────

const salud = anonimo(({ traceId }) => {
  const respuesta: RespuestaSalud = {
    estado: 'ok',
    version: VERSION,
    entorno: 'Demo',
    // Con `Z`: este valor lo produce el reloj del servidor y su `Kind` es `Utc`.
    // Las fechas de venta, que vienen de la base, salen sin él.
    fechaUtc: aIsoUtc(new Date()),
  }

  return ok(respuesta, traceId)
})

export const manejadores = [
  http.get('*/api/salud', salud),

  http.post('*/api/autenticacion/iniciar-sesion', iniciarSesion),
  http.post('*/api/autenticacion/refrescar-sesion', refrescarSesion),

  http.get('*/api/marcas/buscar-marcas', buscarMarcas),
  http.get('*/api/marcas/obtener-marca-por-id/:id', obtenerMarcaPorId),
  http.post('*/api/marcas/crear-marca', crearMarca),
  http.put('*/api/marcas/actualizar-marca/:id', actualizarMarca),
  http.patch('*/api/marcas/desactivar-marca/:id', desactivarMarca),

  http.get('*/api/productos/buscar-productos', buscarProductos),

  http.get('*/api/almacenes/listar-almacenes', listarAlmacenes),

  http.get('*/api/ventas/buscar-ventas', buscarVentas),
  http.post('*/api/ventas/registrar-venta', registrarVenta),
]
