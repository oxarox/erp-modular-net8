/**
 * Previsualización de los totales de una venta.
 *
 * ── Por qué existe este archivo, y qué NO es ────────────────────────────────
 *
 * Es un **espejo** de `ERP.Dominio/Servicios/CalculadoraTotalesVenta.cs`, y su
 * único propósito es que la persona vea el total mientras arma la venta, sin ir
 * y volver al servidor por cada cambio de cantidad.
 *
 * El cálculo que vale es el del servidor. El dominio es la única autoridad sobre
 * cómo se componen subtotal, descuento, impuesto y total (ADR-0005), y la
 * pantalla de nueva venta muestra los totales que devuelve
 * `POST /api/ventas/registrar-venta` —no estos— en cuanto la venta se registra.
 *
 * Duplicar una regla de negocio en el cliente es una deuda consciente: se paga
 * con una prueba que replica exactamente los casos de
 * `ERP.Tests/Ventas/CalculadoraTotalesVentaTests.cs`, de modo que si el dominio
 * cambia y este archivo no, la suite del front se pone roja.
 *
 * Las invariantes replicadas, en el mismo orden que el original:
 *  - el total del documento es la suma de los totales de línea, no un recálculo
 *    sobre la suma (evita redondear dos veces);
 *  - el impuesto se aplica sobre la base ya descontada, nunca sobre el bruto;
 *  - el descuento nunca puede superar el subtotal de su línea.
 */

export interface LineaCalculo {
  cantidad: number
  precioUnitario: number
  descuentoLinea?: number
}

export interface TotalesLinea {
  subtotal: number
  descuento: number
  impuesto: number
  total: number
}

export interface TotalesVenta {
  lineas: TotalesLinea[]
  subtotal: number
  descuento: number
  impuesto: number
  total: number
}

/**
 * Redondeo a 2 decimales, media hacia arriba.
 *
 * Equivale al `MidpointRounding.AwayFromZero` de `Dinero.Redondear` para los
 * montos de una venta, que nunca son negativos.
 *
 * El `toPrecision(12)` intermedio no es adorno: `1.005 * 100` en coma flotante
 * da `100.49999999999999`, y redondear eso directamente devuelve `1.00` en vez
 * de `1.01`. Normalizar la mantisa antes de decidir corrige el caso sin recurrir
 * a una librería de decimales.
 */
export function redondear(valor: number): number {
  if (!Number.isFinite(valor)) {
    return 0
  }

  const escalado = Number((valor * 100).toPrecision(12))

  return Math.round(escalado) / 100
}

export class ErrorCalculoVenta extends Error {
  readonly indiceLinea: number

  constructor(mensaje: string, indiceLinea: number) {
    super(mensaje)
    this.name = 'ErrorCalculoVenta'
    this.indiceLinea = indiceLinea
  }
}

function calcularLinea(
  linea: LineaCalculo,
  indice: number,
  tasaImpuesto: number,
  precioIncluyeImpuesto: boolean,
): TotalesLinea {
  if (linea.cantidad <= 0) {
    throw new ErrorCalculoVenta('La cantidad de una línea debe ser mayor a cero.', indice)
  }

  if (linea.precioUnitario < 0) {
    throw new ErrorCalculoVenta('El precio unitario no puede ser negativo.', indice)
  }

  const descuentoBruto = linea.descuentoLinea ?? 0

  if (descuentoBruto < 0) {
    throw new ErrorCalculoVenta('El descuento no puede ser negativo.', indice)
  }

  const bruto = redondear(linea.precioUnitario * linea.cantidad)

  if (descuentoBruto > bruto) {
    throw new ErrorCalculoVenta('El descuento no puede superar el subtotal de la línea.', indice)
  }

  const descuento = redondear(descuentoBruto)

  if (precioIncluyeImpuesto) {
    // El precio de lista ya trae el impuesto dentro: se desagrega hacia atrás.
    const total = redondear(bruto - descuento)
    const neto = redondear(total / (1 + tasaImpuesto))
    const impuesto = redondear(total - neto)

    // El subtotal declarado es neto, para que el desglose sume exactamente el total.
    return { subtotal: redondear(neto + descuento), descuento, impuesto, total }
  }

  const baseImponible = redondear(bruto - descuento)
  const impuesto = redondear(baseImponible * tasaImpuesto)

  return { subtotal: bruto, descuento, impuesto, total: redondear(baseImponible + impuesto) }
}

export function calcularTotales(
  lineas: readonly LineaCalculo[],
  tasaImpuesto: number,
  precioIncluyeImpuesto = false,
): TotalesVenta {
  if (lineas.length === 0) {
    throw new ErrorCalculoVenta('Una venta debe tener al menos una línea.', -1)
  }

  if (tasaImpuesto < 0 || tasaImpuesto > 1) {
    throw new ErrorCalculoVenta(
      'La tasa de impuesto se expresa como fracción entre 0 y 1.',
      -1,
    )
  }

  const calculadas = lineas.map((linea, indice) =>
    calcularLinea(linea, indice, tasaImpuesto, precioIncluyeImpuesto),
  )

  const sumar = (seleccion: (l: TotalesLinea) => number): number =>
    redondear(calculadas.reduce((acumulado, l) => acumulado + seleccion(l), 0))

  return {
    lineas: calculadas,
    subtotal: sumar(l => l.subtotal),
    descuento: sumar(l => l.descuento),
    impuesto: sumar(l => l.impuesto),
    total: sumar(l => l.total),
  }
}

/**
 * Variante tolerante para la interfaz: mientras se está escribiendo una línea
 * hay estados inválidos (cantidad vacía, descuento mayor al bruto) que no deben
 * hacer estallar el render. Devuelve los totales o el motivo por el que aún no
 * se pueden calcular.
 */
export function calcularTotalesSeguro(
  lineas: readonly LineaCalculo[],
  tasaImpuesto: number,
  precioIncluyeImpuesto = false,
): { totales: TotalesVenta | null; error: ErrorCalculoVenta | null } {
  try {
    return {
      totales: calcularTotales(lineas, tasaImpuesto, precioIncluyeImpuesto),
      error: null,
    }
  } catch (error) {
    return {
      totales: null,
      error: error instanceof ErrorCalculoVenta ? error : null,
    }
  }
}
