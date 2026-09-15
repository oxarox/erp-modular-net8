# Mapa de endpoints

Mapa canónico de rutas. **Todo cambio de ruta o de contrato actualiza esta tabla en la misma
entrega**; en el sistema real esta es la referencia que consume el equipo de front, y una fila
desactualizada cuesta más que un bug.

Formato de cada fila: verbo, ruta, permiso requerido, caso de uso que la atiende y códigos de
error que puede devolver además de los transversales (`API_001`, `API_002`, `API_004`).

## Autenticación — `/api/autenticacion`

| Verbo | Ruta | Permiso | Caso de uso | Errores |
|---|---|---|---|---|
| POST | `/api/autenticacion/iniciar-sesion` | anónimo | `ManejadorIniciarSesion` | `AUTH_001`, `AUTH_002`, `AUTH_007`, `AUTH_008` |
| POST | `/api/autenticacion/refrescar` | anónimo | `ManejadorRefrescarSesion` | `AUTH_004`, `AUTH_005`, `AUTH_006` |

## Marcas — `/api/marcas`

| Verbo | Ruta | Permiso | Caso de uso | Errores |
|---|---|---|---|---|
| GET | `/api/marcas` | `marcas.ver` | `ManejadorBuscarMarcas` | — |
| GET | `/api/marcas/{id}` | `marcas.ver` | `ManejadorObtenerMarca` | `MARCA_004` |
| POST | `/api/marcas` | `marcas.gestionar` | `ManejadorCrearMarca` | `MARCA_001`–`MARCA_003`, `MARCA_005`–`MARCA_007` |
| PUT | `/api/marcas/{id}` | `marcas.gestionar` | `ManejadorActualizarMarca` | `MARCA_003`, `MARCA_004`, `MARCA_008` |
| PATCH | `/api/marcas/{id}/desactivar` | `marcas.gestionar` | `ManejadorDesactivarMarca` | `MARCA_004`, `MARCA_009`, `MARCA_010` |

**Parámetros de consulta de `GET /api/marcas`**

| Parámetro | Tipo | Por defecto |
|---|---|---|
| `criterio` | texto | — |
| `soloActivas` | booleano | — |
| `pagina` | entero | 1 |
| `tamanoPagina` | entero | 25 (máx. 200) |

## Ventas — `/api/ventas`

| Verbo | Ruta | Permiso | Caso de uso | Errores |
|---|---|---|---|---|
| GET | `/api/ventas` | `ventas.ver` | `ManejadorBuscarVentas` | — |
| POST | `/api/ventas` | `ventas.registrar` | `ManejadorRegistrarVenta` | `VENTA_001`–`VENTA_009`, `VENTA_012` |

**Parámetros de consulta de `GET /api/ventas`**

| Parámetro | Tipo | Nota |
|---|---|---|
| `desde` | fecha UTC | inclusivo |
| `hasta` | fecha UTC | inclusivo del día completo |
| `estado` | texto | `COMPLETADA` o `ANULADA` |
| `pagina` / `tamanoPagina` | entero | estándar |

## Salud — `/api/salud`

| Verbo | Ruta | Permiso | Uso |
|---|---|---|---|
| GET | `/api/salud` | anónimo | Sonda de vida para el orquestador y el monitoreo |

---

## Sobre el alcance

Este repositorio implementa 10 endpoints, suficientes para mostrar los dos patrones que se
repiten en todos los demás: el CRUD de catálogo (Marcas) y la operación transaccional
(Ventas).

El sistema real expone ~185 endpoints en 31 módulos, todos con esta misma estructura de tabla.
El inventario completo de módulos está en [`mapa-de-modulos.md`](mapa-de-modulos.md).
