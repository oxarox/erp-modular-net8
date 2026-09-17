# ADR-0009 — Las listas de cardinalidad acotada no se paginan

- **Estado:** aceptada
- **Ámbito:** contrato de la API

## Contexto

La convención del sistema es que **toda lista devuelve `RespuestaPaginada<T>`**
([convenciones de endpoints](../convenciones-endpoints.md#paginación)). Con ~185 endpoints en 31
módulos, esa uniformidad es lo que permite que el front escriba un cliente de listas y no
treinta y uno.

`GET /api/almacenes/listar-almacenes` fue la primera lista que no la cumplió. No es un descuido:
los almacenes de una empresa son una bodega central y un puñado de sucursales, y quien consume
la lista es un selector que necesita el listado **completo** para poder mostrarse. Paginarlo
significa que el cliente recorra páginas para pintar un desplegable, o que pida
`tamanoPagina=200` y confíe en que nadie abra la sucursal 201.

El problema no era la excepción, era dónde estaba escrita: en el comentario XML del controlador
y en `endpoints.md`. Los dos documentos que alguien lee como norma antes de escribir el módulo
34 —`checklist-endpoint.md` y `convenciones-endpoints.md`— seguían diciendo lo contrario, y
quien revisara ese PR no tenía con qué zanjar la discusión.

## Decisión

Una lista puede devolver el arreglo directo, sin sobre de paginación, **solo si cumple las
tres condiciones a la vez**:

1. **Cardinalidad acotada por diseño**, no por el tamaño actual de los datos: la entidad
   representa unidades de la estructura de la empresa (almacenes, sucursales, cajas, métodos de
   pago, categorías de nivel raíz), no documentos que la operación acumula día a día.
2. **Se consume como selector**, donde el listado incompleto no sirve: el cliente necesita todas
   las opciones para dibujar el control.
3. **Queda escrito**: fila en [`endpoints.md`](../endpoints.md) diciendo que no se pagina, y el
   porqué en el comentario XML de la acción.

Cualquier lista que crezca con la operación —ventas, movimientos, productos, clientes,
bitácora— se pagina, aunque hoy tenga diez filas. El criterio es cómo crece, no cuánto mide.

En caso de duda, se pagina: es el default correcto y el que ya entiende el cliente genérico.

## Consecuencias

**A favor**

- El selector se resuelve en una llamada y el front no escribe un bucle de páginas para pintar
  un desplegable.
- La excepción tiene un límite escrito. Sin él, "mi lista también es chica" habilita cualquier
  cosa, y el cliente genérico deja de existir por acumulación de casos particulares.

**Costo asumido**

- **Hay dos formas de respuesta para listas**, y el front debe saber cuál espera cada endpoint.
  Se mitiga con `endpoints.md`, que lo dice fila por fila, pero es un costo real: el cliente
  genérico ya no cubre el 100 % de las listas.
- Si una de estas entidades dejara de ser acotada —una cadena con cuatrocientas sucursales—, el
  endpoint necesita cambiar de forma, y eso rompe al cliente. Es un cambio de contrato, con su
  versión, no un ajuste.

## Alternativas descartadas

- **Paginar todo, sin excepciones.** Es la opción más consistente y estuvo cerca de ganar. Se
  descartó porque traslada el costo al lugar más caro: cada selector del front pasa a recorrer
  páginas, o a pedir un `tamanoPagina` grande que es una excepción igual, pero implícita y sin
  límite escrito.
- **Devolver `RespuestaPaginada<T>` con la lista completa en una sola página.** Conserva la
  forma y miente sobre el fondo: `totalPaginas: 1` siempre, y un cliente que pagine de verdad
  nunca se entera de que no hace falta. Una uniformidad de fachada es peor que una excepción
  documentada.
- **Un parámetro `sinPaginar=true` en las listas paginadas.** Convierte cada endpoint de lista
  en dos contratos según un booleano, y el permiso de traerse la tabla entera queda a un query
  string de distancia en `buscar-ventas`.
