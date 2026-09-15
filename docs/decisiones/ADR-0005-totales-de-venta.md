# ADR-0005 — Los totales se calculan en el dominio y se guardan con el documento

- **Estado:** aceptada
- **Ámbito:** ventas y reportes

## Contexto

En un ERP, el total de una venta se lee en cuatro lugares distintos: la respuesta del endpoint,
el comprobante, el reporte diario y el cuadre de caja. Si cada uno lo recalcula, tarde o
temprano dos de ellos discrepan —normalmente por una diferencia de redondeo o porque uno aplica
el impuesto antes del descuento y el otro después— y desde ese momento nadie confía en las
cifras del sistema.

El problema se agrava con el tiempo: si la tasa de impuesto cambia, recalcular ventas del año
pasado con la tasa nueva produce un histórico falso.

## Decisión

**Un solo cálculo, en un solo lugar, guardado una sola vez.**

- `CalculadoraTotalesVenta` (servicio de dominio puro) es el único autorizado a decidir cómo se
  componen subtotal, descuento, impuesto y total.
- Sus invariantes están escritas y probadas:
  - el total del documento es la **suma de los totales de línea**, no un recálculo sobre la
    suma (evita redondear dos veces);
  - el impuesto se aplica sobre la base **ya descontada**;
  - el descuento nunca supera el subtotal de su línea.
- El resultado se **denormaliza**: se guarda en las columnas de `ventas` y `ventas_detalle`.
- Los reportes **leen** esas columnas. Nunca recalculan.

La tasa de impuesto y el criterio de precio (neto o con impuesto incluido) son configuración
(`OpcionesVentas`), no constantes del dominio: cambian por país y por cliente.

## Consecuencias

**A favor**

- El histórico es inmutable: una venta de hace dos años muestra hoy lo que mostró entonces.
- La regla más delicada del sistema está cubierta por pruebas de cálculo puro, que corren en
  milisegundos y se leen como una especificación.
- Los reportes agregan en SQL sobre columnas indexadas, sin cargar agregados en memoria.

**Costo asumido**

- El dato vive dos veces (línea y documento). Es denormalización deliberada, y la invariante
  "el total es la suma de las líneas" está probada justamente para que la duplicación no derive.
- Si se descubre un error de cálculo, corregir el histórico exige una migración de datos
  explícita, no un simple cambio de código.

## Alternativas descartadas

- **Calcular al vuelo en cada lectura.** Evita la duplicación, pero ata el histórico a la
  configuración actual y hace lento cualquier reporte grande.
- **Calcular en la base con columnas computadas.** Mueve una regla de negocio al motor de base
  de datos, donde no se puede probar ni versionar como código.
