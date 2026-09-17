# Convenciones de endpoints

Con ~185 endpoints repartidos en 31 módulos, la consistencia no es estética: es lo que permite
que el front escriba un cliente genérico en vez de treinta y uno.

## Cómo se arma una ruta

**Nadie escribe una ruta literal.** Se derivan del nombre de la clase y del método:

```csharp
[Authorize]
public sealed class ControladorMarcas : ControladorBase   // [Route("api/[controller]")] en la base
{
    [HttpPost("[action]")]
    public async Task<ActionResult<RespuestaOperacionMarca>> CrearMarca(...)
}
```

```
ControladorMarcas . CrearMarca
        │               │
        │               └─ [action] ──► crear-marca
        └─ [controller] ──► Marcas ──► marcas

            POST /api/marcas/crear-marca
```

Dos piezas lo hacen posible, ambas registradas en `Program.cs`:

| Pieza | Qué hace |
|---|---|
| [`ConvencionNombreControlador`](../ERP.Api/Convenciones/ConvencionNombreControlador.cs) | Recorta el prefijo `Controlador` del nombre de la clase |
| [`TransformadorSlug`](../ERP.Api/Convenciones/TransformadorSlug.cs) | Convierte PascalCase a kebab-case en `[controller]` y `[action]` |

El beneficio es que renombrar un método renombra la ruta, y **ninguna ruta puede quedar
desalineada del código ni en PascalCase por descuido**. Con 36 controladores escritos por
varias personas a lo largo de meses, es la diferencia entre una API consistente y un muestrario
de criterios.

Variantes en uso:

| Forma | Ejemplo | Cuándo |
|---|---|---|
| `[HttpGet("[action]")]` | `/api/marcas/buscar-marcas` | Caso normal |
| `[HttpGet("[action]/{id:long}")]` | `/api/marcas/obtener-marca-por-id/5` | La acción opera sobre un id |
| `[HttpGet]` | `/api/salud` | La URL la consume una máquina y debe ser corta |

El `id` va siempre restringido por tipo (`{id:long}`): un `/api/marcas/obtener-marca-por-id/abc`
responde 404 por enrutamiento, sin llegar al controlador.

### Por qué acción y no REST por recurso

Es una decisión consciente y no es REST de manual. Un ERP acumula operaciones que no caben en
cinco verbos: anular una venta, cerrar una caja, aprobar una solicitud, recalcular un costo.
Forzarlas a `PUT /api/ventas/{id}` con un campo `estado` en el cuerpo hace que el permiso, la
validación y la auditoría de cuatro operaciones distintas convivan en un mismo endpoint.

Con una acción por caso de uso, cada operación tiene su ruta, su permiso, su validador y su
manejador. El costo es que la URL no es canónicamente REST; a cambio, el mapa de rutas se lee
como el mapa de casos de uso, que es exactamente lo que el equipo necesita consultar.

## Verbos y códigos

| Operación | Verbo | Éxito | Errores esperados |
|---|---|---|---|
| Listar / buscar | `GET` | 200 | 400; 404 si un filtro **nombra** un recurso inexistente o de otra empresa |
| Obtener uno | `GET` | 200 | 404 |
| Crear | `POST` | 201 + `Location` si hay lectura por id | 400, 409 |
| Actualizar | `PUT` | 200 | 400, 404, 409 |
| Cambiar estado | `PATCH` | 200 | 404, 409 |
| Acción de negocio | `POST` | 201 | 400, 404 |

**No se usa `DELETE`.** El sistema hace baja lógica
([ADR-0007](decisiones/ADR-0007-baja-logica.md)), así que el verbo sería una mentira.

**Un filtro que nombra un recurso se comprueba antes de consultar.** Un `?almacenId=` de otra
empresa no devuelve filas, y una lista vacía —o peor, un saldo en cero— es una afirmación falsa
sobre datos que el usuario sí va a leer. Se responde 404 con el código del módulo dueño del
recurso, igual que si se hubiera pedido por id.

Códigos transversales: 401 sin token válido, 403 con token pero sin permiso, **503 cuando la
base de datos u otra dependencia no responde** y 500 solo para fallos no previstos del propio
sistema. Separar el 503 del 500 no es cosmética: le dice a quien opera dónde mirar, y al cliente
que reintentar tiene sentido.

## Paginación

```
GET /api/ventas/buscar-ventas?pagina=1&tamanoPagina=25
```

| Parámetro | Por defecto | Máximo |
|---|---|---|
| `pagina` | 1 | — |
| `tamanoPagina` | 25 | 200 |

Valores fuera de rango se **normalizan**, no se rechazan: pedir `tamanoPagina=5000` devuelve
200 filas, no un 400. La normalización vive en `SolicitudPaginada.Normalizar`, un solo lugar,
para que 31 módulos no inventen 31 defaults.

```json
{
  "pagina": 1,
  "tamanoPagina": 25,
  "total": 143,
  "totalPaginas": 6,
  "items": [ ... ]
}
```

El conteo y el salto se hacen **en la base de datos**. Nunca se materializa la tabla completa
para contar en memoria.

### Cuándo una lista puede no paginarse

Excepción acotada y escrita: [ADR-0009](decisiones/ADR-0009-listas-de-selector-sin-paginar.md).
Una lista devuelve el arreglo directo solo si su cardinalidad está acotada **por diseño** —no
porque hoy tenga pocas filas— y quien la consume es un selector, que necesita el listado
completo para poder mostrarse. Hoy la única es
`GET /api/almacenes/listar-almacenes`.

Todo lo que crece con la operación se pagina, aunque hoy tenga diez filas: el criterio es cómo
crece, no cuánto mide. En duda, se pagina. Y la lista que no se pagina lo dice en su fila de
[`endpoints.md`](endpoints.md), que es donde el front lo consulta.

## Errores

Una sola forma, siempre, incluidos el 401 y el 403:

```json
{
  "traceId": "8f3c1e94a2b04d7f",
  "code": "conflict",
  "message": "Ya existe una marca con el mismo nombre para la empresa.",
  "details": null,
  "errorCode": "MARCA_003"
}
```

| Campo | Para qué |
|---|---|
| `traceId` | Llave para encontrar el request en los logs. Viaja también en la cabecera `X-Correlacion-Id` |
| `code` | Familia del error: `validation_error`, `unauthorized`, `forbidden`, `bad_request`, `not_found`, `conflict`, `service_unavailable`, `internal_error` |
| `message` | Texto en español, apto para mostrar. Puede reformularse sin romper el contrato |
| `details` | Datos estructurados. Nunca trazas, SQL ni datos de terceros |
| `errorCode` | Código del catálogo. **Contrato duro: nunca viaja null** |

`errorCode` nunca es null porque un cliente que recibe `null` no puede decidir nada y termina
comparando el texto del mensaje —que sí cambia—. Cada factory de
[`RespuestaError`](../ERP.Api/Contracts/Comun/RespuestaError.cs) aplica el fallback de su
familia.

**El 401 y el 403 también llevan el sobre.** El middleware de autenticación corta el request
antes del manejador de errores, así que por defecto ASP.NET los devuelve con el cuerpo vacío;
`EventosJwtVersionAutenticacion` los intercepta (`OnChallenge` / `OnForbidden`) para que el
cliente no tenga que tratarlos como casos especiales.

Errores de validación: un objeto por campo dentro de `details.errors`.

```json
{
  "traceId": "aac2ed3645224c34",
  "code": "validation_error",
  "message": "La solicitud contiene campos inválidos.",
  "details": {
    "errors": [
      { "campo": "Correo", "codigo": "AUTH_007", "mensaje": "El correo es obligatorio." },
      { "campo": "Contrasena", "codigo": "AUTH_008", "mensaje": "La contraseña es obligatoria." }
    ]
  },
  "errorCode": "API_006"
}
```

Se devuelven **todos los campos** inválidos de una vez, pero **un solo error por campo**
(`CascadeMode.Stop`): un correo vacío reporta "es obligatorio" y no además "formato inválido",
que sería ruido.

## Fechas

- Toda fecha que cruza la API es **UTC** y se llama `...Utc` en los contratos.
- Los filtros `desde` / `hasta` son **inclusivos del día completo**: quien filtra hasta el 15
  espera ver lo del 15 a las 23:59. La conversión está en el repositorio, no en cada
  controlador.

## Nombres en JSON

`camelCase`, con la serialización por defecto de ASP.NET. Las propiedades nulas se omiten
(`DefaultIgnoreCondition = WhenWritingNull`) y los enum viajan como cadena, no como número: un
`3` en un JSON no le dice nada a nadie dentro de seis meses.

## Idempotencia y concurrencia

- `PUT` y `PATCH` son idempotentes: repetir la llamada deja el mismo estado.
- Desactivar algo ya inactivo devuelve **409**, no 200: el cliente pidió un cambio de estado
  que no ocurrió, y conviene que lo sepa.
- La unicidad se valida en el caso de uso *y* se garantiza con una restricción única en la
  base: dos requests simultáneos pueden pasar ambos la validación previa.
