# ADR-0008 — El stock es la proyección de los movimientos, no un contador

- **Estado:** aceptada
- **Ámbito:** inventario

## Contexto

La forma ingenua de llevar stock es una columna `Cantidad` en el producto que sube y baja. Es
simple hasta el primer descuadre, y entonces no hay forma de saber qué pasó: la columna dice
"7" y nadie puede reconstruir por qué.

## Decisión

- `movimientos_inventario` es la **fuente de verdad**: cada ingreso, egreso, ajuste o traslado
  queda como un asiento inmutable, con su origen (`OrigenTipo` + `OrigenId`), su fecha y su
  usuario.
- `existencias` es una **proyección**: el saldo por producto y almacén. Solo cambia como
  consecuencia de un movimiento, nunca por escritura directa desde un caso de uso.
- La inmutabilidad es una regla de dominio explícita
  (`PoliticaInmutabilidadMovimientoInventario`), no una convención: corregir el stock significa
  registrar un movimiento de ajuste, jamás editar o borrar el anterior.
- El stock no negativo está protegido en tres niveles, a propósito:
  1. el caso de uso valida antes de escribir, para dar un mensaje útil;
  2. el servicio de dominio aborta la transacción si el saldo quedaría negativo;
  3. la base de datos tiene un `CHECK (Cantidad >= 0)`.

  Los dos primeros son ergonomía; el tercero es la garantía. Entre la validación del paso 1 y
  la escritura puede entrar otra venta.

## Consecuencias

**A favor**

- Todo saldo es auditable: se puede reconstruir el stock a cualquier fecha sumando movimientos.
- El origen de cada movimiento apunta al documento que lo causó, así que un descuadre se
  investiga en minutos.

**Costo asumido**

- Cada operación escribe dos veces (movimiento + proyección), dentro de la misma transacción.
- La tabla de movimientos crece sin parar y necesita una política de archivado a largo plazo.

## Alternativas descartadas

- **Solo la columna de saldo.** Rápido y sin auditoría: el primer descuadre se vuelve
  irresoluble.
- **Solo movimientos, calculando el saldo al vuelo.** Auditable, pero cada validación de stock
  en una venta se convierte en una agregación sobre toda la historia del producto.
