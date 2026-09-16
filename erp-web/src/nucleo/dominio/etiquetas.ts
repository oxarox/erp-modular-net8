import { capitalizar } from '@/nucleo/formato/formato'

/**
 * Cómo se escriben en pantalla los valores que el dominio guarda como códigos.
 *
 * El servidor emite `DEBITO` y `COMPLETADA`: son constantes de configuración y
 * de estado —viajan en mayúsculas y sin tildes porque son identificadores, no
 * texto—. En la interfaz se escriben como se escriben en español, y eso tiene
 * que decidirse **en un solo sitio**: mientras esta tabla no existió, el tablero
 * mostraba «Débito» y la pantalla de venta «Debito», que es el tipo de
 * inconsistencia que nadie reporta y todos notan.
 *
 * Un valor que no esté en la tabla no desaparece: cae en `capitalizar`. La lista
 * de métodos permitidos es configuración del servidor
 * (`Ventas:MetodosPagoPermitidos`) y puede crecer sin que este archivo se
 * entere; mostrar un nombre poco pulido es mejor que mostrar un hueco.
 */

const ETIQUETAS_METODO_PAGO: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  DEBITO: 'Débito',
  CREDITO: 'Crédito',
  TRANSFERENCIA: 'Transferencia',
}

export function etiquetaMetodoPago(metodo: string): string {
  return ETIQUETAS_METODO_PAGO[metodo] ?? capitalizar(metodo)
}

const ETIQUETAS_ESTADO_VENTA: Record<string, string> = {
  COMPLETADA: 'Completada',
  ANULADA: 'Anulada',
}

export function etiquetaEstadoVenta(estado: string): string {
  return ETIQUETAS_ESTADO_VENTA[estado] ?? capitalizar(estado)
}
