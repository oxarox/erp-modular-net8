# Mapa de endpoints

Mapa canónico de rutas. **Todo cambio de ruta o de contrato actualiza esta tabla en la misma
entrega**; en el sistema real esta es la referencia que consume el equipo de front, y una fila
desactualizada cuesta más que un bug.

Las rutas no se escriben a mano: se derivan del nombre de la clase y del método. Ver
[convenciones de endpoints](convenciones-endpoints.md#cómo-se-arma-una-ruta).

Cada fila indica verbo, ruta, permiso requerido, caso de uso que la atiende y códigos de error
propios, además de los transversales (`API_001`, `API_002`, `API_004`).

## Autenticación — `ControladorAutenticacion`

| Verbo | Ruta | Permiso | Caso de uso | Errores |
|---|---|---|---|---|
| POST | `/api/autenticacion/iniciar-sesion` | anónimo | `ManejadorIniciarSesion` | `AUTH_001`, `AUTH_002`, `AUTH_007`, `AUTH_008` |
| POST | `/api/autenticacion/refrescar-sesion` | anónimo | `ManejadorRefrescarSesion` | `AUTH_004`, `AUTH_005`, `AUTH_006` |

## Marcas — `ControladorMarcas`

| Verbo | Ruta | Permiso | Caso de uso | Errores |
|---|---|---|---|---|
| GET | `/api/marcas/buscar-marcas` | `marcas.ver` | `ManejadorBuscarMarcas` | — |
| GET | `/api/marcas/obtener-marca-por-id/{id}` | `marcas.ver` | `ManejadorObtenerMarca` | `MARCA_004` |
| POST | `/api/marcas/crear-marca` | `marcas.gestionar` | `ManejadorCrearMarca` | `MARCA_001`–`MARCA_003`, `MARCA_005`–`MARCA_007` |
| PUT | `/api/marcas/actualizar-marca/{id}` | `marcas.gestionar` | `ManejadorActualizarMarca` | `MARCA_003`, `MARCA_004`, `MARCA_008` |
| PATCH | `/api/marcas/desactivar-marca/{id}` | `marcas.gestionar` | `ManejadorDesactivarMarca` | `MARCA_004`, `MARCA_009`, `MARCA_010` |

**Parámetros de consulta de `buscar-marcas`**

| Parámetro | Tipo | Por defecto |
|---|---|---|
| `criterio` | texto | — |
| `soloActivas` | booleano | — |
| `pagina` | entero | 1 |
| `tamanoPagina` | entero | 25 (máx. 200) |

## Ventas — `ControladorVentas`

| Verbo | Ruta | Permiso | Caso de uso | Errores |
|---|---|---|---|---|
| GET | `/api/ventas/buscar-ventas` | `ventas.ver` | `ManejadorBuscarVentas` | — |
| POST | `/api/ventas/registrar-venta` | `ventas.registrar` | `ManejadorRegistrarVenta` | `VENTA_001`–`VENTA_009`, `VENTA_012` |

**Parámetros de consulta de `buscar-ventas`**

| Parámetro | Tipo | Nota |
|---|---|---|
| `desde` | fecha UTC | inclusivo |
| `hasta` | fecha UTC | inclusivo del día completo |
| `estado` | texto | `COMPLETADA` o `ANULADA` |
| `pagina` / `tamanoPagina` | entero | estándar |

## Salud — `ControladorSalud`

| Verbo | Ruta | Permiso | Uso |
|---|---|---|---|
| GET | `/api/salud` | anónimo | Sonda de vida para el orquestador y el monitoreo |

Es la única acción sin token de `[action]` en la ruta: la URL la configura un orquestador y
conviene que sea corta y estable.

---

## Sobre el alcance

Este repositorio implementa 10 endpoints, suficientes para mostrar los dos patrones que se
repiten en todos los demás: el CRUD de catálogo (Marcas) y la operación transaccional
(Ventas).

El sistema real expone ~185 endpoints en 31 módulos, todos con esta misma estructura de tabla.
El inventario completo de módulos está en [`mapa-de-modulos.md`](mapa-de-modulos.md).

Para verificar esta tabla contra el código, basta levantar la API y leer
`GET /swagger/v1/swagger.json`: si una ruta no coincide, la tabla está desactualizada.
