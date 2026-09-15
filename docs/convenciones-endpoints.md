# Convenciones de endpoints

Con ~185 endpoints repartidos en 31 módulos, la consistencia no es estética: es lo que permite
que el front escriba un cliente genérico en vez de treinta y uno.

## Rutas

- Prefijo `api/`, recurso en **plural**, todo en **kebab-case**:
  `/api/marcas`, `/api/movimientos-inventario`, `/api/autenticacion/iniciar-sesion`.
- El recurso es un sustantivo. Las acciones que no encajan en un verbo HTTP van como
  subrecurso con verbo en infinitivo: `PATCH /api/marcas/{id}/desactivar`.
- El `id` se restringe por tipo en la ruta: `{id:long}`. Un `/api/marcas/abc` responde 404 por
  enrutamiento, sin llegar al controlador.

## Verbos y códigos

| Operación | Verbo y ruta | Éxito | Errores esperados |
|---|---|---|---|
| Listar / buscar | `GET /api/recursos` | 200 | 400 |
| Obtener uno | `GET /api/recursos/{id}` | 200 | 404 |
| Crear | `POST /api/recursos` | 201 + `Location` | 400, 409 |
| Reemplazar | `PUT /api/recursos/{id}` | 200 | 400, 404, 409 |
| Cambiar estado | `PATCH /api/recursos/{id}/accion` | 200 | 404, 409 |
| Acción de negocio | `POST /api/recursos` | 201 | 400, 404 |

**No se usa `DELETE`.** El sistema hace baja lógica
([ADR-0007](decisiones/ADR-0007-baja-logica.md)), así que el verbo sería una mentira.

Códigos transversales: 401 sin token válido, 403 con token pero sin permiso, 500 solo para
fallos no previstos.

## Paginación

Toda lista paginada usa los mismos parámetros y la misma forma de respuesta:

```
GET /api/ventas?pagina=1&tamanoPagina=25
```

| Parámetro | Por defecto | Máximo |
|---|---|---|
| `pagina` | 1 | — |
| `tamanoPagina` | 25 | 200 |

Valores fuera de rango se **normalizan**, no se rechazan: pedir `tamanoPagina=5000` devuelve
200 páginas, no un 400. La normalización vive en `SolicitudPaginada.Normalizar`, un solo lugar,
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

## Errores

Una sola forma, siempre:

```json
{
  "codigo": "VENTA_004",
  "mensaje": "Stock insuficiente para Insumo de ejemplo A: disponible 2, solicitado 5.",
  "correlacionId": "8f3c1e94a2b04d7f",
  "detalles": { "id": 1, "disponible": 2, "solicitado": 5 }
}
```

- `codigo` es para el programa; `mensaje` es para la persona. El mensaje puede reformularse sin
  romper el contrato; el código no.
- `correlacionId` viene también en la cabecera `X-Correlacion-Id`, y es la llave para encontrar
  el request en los logs.
- `detalles` nunca lleva trazas, SQL ni datos de otros usuarios.

Errores de validación de entrada: un objeto por campo dentro de `detalles`.

```json
{
  "codigo": "API_006",
  "mensaje": "La solicitud contiene campos inválidos.",
  "detalles": [
    { "campo": "Nombre", "codigo": "MARCA_005", "mensaje": "El nombre debe tener al menos 2 caracteres." }
  ]
}
```

Se devuelven **todos** los campos inválidos de una vez, no el primero: obligar a corregir de a
uno es una mala experiencia y multiplica los viajes.

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
