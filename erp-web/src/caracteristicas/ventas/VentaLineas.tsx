import { BotonIcono } from '@/componentes/Boton'
import { Campo, Entrada } from '@/componentes/Formulario'
import { IconoBasura, IconoCarrito } from '@/componentes/Iconos'
import { EstadoVacio, Insignia } from '@/componentes/Superficie'
import { Tabla } from '@/componentes/Tabla'
import type { ColumnaTabla } from '@/componentes/Tabla'
import { CODIGOS_VENTAS } from '@/nucleo/api/errores'
import { formatearDecimal, formatearMonto } from '@/nucleo/formato/formato'
import type { LineaVenta, ProblemaLinea } from '@/caracteristicas/ventas/VentaTipos'
import { brutoDeLinea } from '@/caracteristicas/ventas/VentaTipos'

/**
 * Las líneas de la venta, editables en la propia tabla.
 *
 * Dos decisiones de presentación que conviene explicar:
 *
 * 1. **Rojo bloquea, ámbar avisa.** Un descuento mayor al subtotal se pinta como
 *    error del campo y no deja registrar; un faltante de stock se pinta como
 *    insignia de alerta y sí deja intentarlo, porque el disponible que conoce el
 *    cliente es una foto y la autoridad es el servidor. La distinción es
 *    deliberada: si todo fuera rojo, el rojo dejaría de significar algo.
 * 2. **Las cantidades y los descuentos se escriben en enteros.** El peso chileno
 *    no tiene fracción circulante —`formatearMonto` redondea a entero por la
 *    misma razón— y `SolicitudLineaVenta.Cantidad` es `int` en el contrato.
 *    Restringir el paso a 1 además evita el estado intermedio de un `input
 *    type=number` mientras se escribe «1500.», que el navegador reporta como
 *    cadena vacía y borraría lo tecleado.
 */

export interface PropsVentaLineas {
  lineas: LineaVenta[]
  /** Primer problema por producto, tal como lo resuelve `revisarLinea`. */
  problemas: ReadonlyMap<number, ProblemaLinea>
  /** Errores de forma del servidor; las claves llegan como `lineas[0].cantidad`. */
  erroresDeCampo: Record<string, string>
  alCambiarCantidad: (productoId: number, cantidad: number) => void
  alCambiarDescuento: (productoId: number, descuento: number) => void
  alQuitar: (productoId: number) => void
  deshabilitado?: boolean
}

/** Un `input type=number` vacío devuelve `''`; cualquier otra cosa rara, `NaN`. */
function aNumero(texto: string): number {
  const valor = Number(texto)

  return Number.isFinite(valor) ? valor : 0
}

export function VentaLineas({
  lineas,
  problemas,
  erroresDeCampo,
  alCambiarCantidad,
  alCambiarDescuento,
  alQuitar,
  deshabilitado = false,
}: PropsVentaLineas) {
  // La tabla entrega la fila, no su posición, y la posición hace falta para
  // encontrar el error de campo que el servidor devolvió como `lineas[2]…`.
  const posicionPorProducto = new Map(lineas.map((linea, indice) => [linea.productoId, indice]))

  const unidades = lineas.reduce((total, linea) => total + Math.max(linea.cantidad, 0), 0)

  /** Mensaje a mostrar bajo un control: manda la revisión en vivo; el servidor, de reserva. */
  function errorDe(linea: LineaVenta, campo: 'cantidad' | 'descuentoLinea'): string | undefined {
    const problema = problemas.get(linea.productoId)

    if (problema?.campo === campo && problema.severidad === 'bloqueo') {
      return problema.mensaje
    }

    const posicion = posicionPorProducto.get(linea.productoId) ?? 0

    return erroresDeCampo[`lineas[${posicion}].${campo}`]
  }

  const columnas: ColumnaTabla<LineaVenta>[] = [
    {
      clave: 'producto',
      encabezado: 'Producto',
      // La columna se queda con lo que sobra. Sin esto el reparto automático de
      // la tabla le da el mismo ancho que a «Cantidad» y un nombre de catálogo
      // —«Tornillo autoperforante 8 × 1" (caja de 500)»— se parte en cinco líneas.
      anchoClase: 'w-full min-w-[12rem]',
      celda: linea => {
        const problema = problemas.get(linea.productoId)

        return (
          <div className="min-w-0">
            <span className="font-mono text-[0.6875rem] tracking-tight text-texto-tenue">
              {linea.sku}
            </span>
            <p className="text-sm font-medium text-texto">{linea.nombre}</p>

            {problema?.codigo === CODIGOS_VENTAS.stockInsuficiente && (
              <Insignia tono={problema.severidad === 'bloqueo' ? 'peligro' : 'alerta'} punto className="mt-1.5">
                {problema.mensaje}
              </Insignia>
            )}

            {!linea.controlaInventario && (
              <Insignia tono="info" className="mt-1.5">
                Servicio · sin inventario
              </Insignia>
            )}
          </div>
        )
      },
    },
    {
      clave: 'cantidad',
      encabezado: 'Cantidad',
      anchoClase: 'w-[9rem]',
      celda: linea => (
        <Campo etiqueta={`Cantidad de ${linea.nombre}`} etiquetaOculta error={errorDe(linea, 'cantidad')}>
          {atributos => (
            <Entrada
              {...atributos}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              disabled={deshabilitado}
              value={linea.cantidad === 0 ? '' : linea.cantidad}
              // Seleccionar al enfocar: en una caja se corrige la cantidad
              // escribiendo el número nuevo encima, no borrando el viejo.
              onFocus={evento => evento.currentTarget.select()}
              onChange={evento => alCambiarCantidad(linea.productoId, aNumero(evento.target.value))}
              className="cifra text-right"
            />
          )}
        </Campo>
      ),
    },
    {
      clave: 'precio',
      encabezado: 'Precio unit.',
      alineacion: 'derecha',
      ocultarEnMovil: true,
      celda: linea => <span className="cifra text-texto-suave">{formatearMonto(linea.precioUnitario)}</span>,
    },
    {
      clave: 'descuento',
      encabezado: 'Descuento',
      anchoClase: 'w-[9.5rem]',
      celda: linea => (
        <Campo
          etiqueta={`Descuento de ${linea.nombre}`}
          etiquetaOculta
          error={errorDe(linea, 'descuentoLinea')}
        >
          {atributos => (
            <Entrada
              {...atributos}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              disabled={deshabilitado}
              value={linea.descuentoLinea}
              onFocus={evento => evento.currentTarget.select()}
              onChange={evento => alCambiarDescuento(linea.productoId, aNumero(evento.target.value))}
              className="cifra text-right"
            />
          )}
        </Campo>
      ),
    },
    {
      clave: 'subtotal',
      encabezado: 'Subtotal',
      alineacion: 'derecha',
      celda: linea => {
        const bruto = brutoDeLinea(linea)
        const neto = Math.max(bruto - Math.max(linea.descuentoLinea, 0), 0)

        return (
          <div>
            <span className="cifra text-sm font-medium text-texto">{formatearMonto(neto)}</span>
            {linea.descuentoLinea > 0 && (
              <span className="cifra block text-[0.75rem] text-texto-tenue line-through">
                {formatearMonto(bruto)}
              </span>
            )}
          </div>
        )
      },
    },
    {
      clave: 'acciones',
      encabezado: <span className="solo-lectores">Acciones</span>,
      alineacion: 'derecha',
      anchoClase: 'w-14',
      celda: linea => (
        <BotonIcono
          titulo={`Quitar ${linea.nombre} de la venta`}
          tono="fantasma"
          tamano="sm"
          disabled={deshabilitado}
          icono={<IconoBasura className="size-4" />}
          onClick={() => alQuitar(linea.productoId)}
        />
      ),
    },
  ]

  return (
    <>
      <Tabla
        columnas={columnas}
        filas={lineas}
        claveFila={linea => linea.productoId}
        descripcion="Líneas de la venta en curso, con cantidad y descuento editables."
        vacio={
          <EstadoVacio
            icono={<IconoCarrito />}
            titulo="La venta está vacía"
            descripcion="Busque un producto arriba y agréguelo. Puede hacerlo con el teclado: escriba, baje con las flechas y pulse Enter."
          />
        }
      />

      {lineas.length > 0 && (
        <p className="border-t border-borde px-4 py-2.5 text-[0.8125rem] text-texto-tenue" aria-live="polite">
          {formatearDecimal(lineas.length)} {lineas.length === 1 ? 'producto' : 'productos'} ·{' '}
          {formatearDecimal(unidades)} {unidades === 1 ? 'unidad' : 'unidades'}
        </p>
      )}
    </>
  )
}
