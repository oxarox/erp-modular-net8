# Catálogo de códigos de error

Decisión de fondo: [ADR-0004](decisiones/ADR-0004-codigos-de-error.md).

## Reglas

1. Formato `MODULO_###`, con el módulo en mayúsculas y correlativo de tres dígitos.
2. **El correlativo es global por módulo y nunca se reutiliza**, ni siquiera si el código queda
   obsoleto. Reutilizar un número hace que un cliente antiguo interprete mal un error nuevo.
3. Un código obsoleto se marca como tal en esta tabla; no se borra la fila ni se recicla.
4. Los códigos viven en constantes (`ERP.Aplicacion/Comun/CodigosError/`), nunca como literales.
5. **Antes de crear un código, se lee esta tabla** para tomar el siguiente correlativo libre.
6. El mensaje en español puede cambiar libremente; el código, no.

## API — transversales del borde HTTP

| Código | Situación | HTTP |
|---|---|---|
| `API_001` | No hay token o no es válido | 401 |
| `API_002` | Token válido sin el permiso requerido | 403 |
| `API_003` | Recurso inexistente (o de otra empresa) | 404 |
| `API_004` | Error no previsto | 500 |
| `API_005` | El token no identifica una empresa válida | 401 |
| `API_006` | El cuerpo contiene campos inválidos | 400 |
| `API_007` | Parámetro de consulta inválido | 400 |
| `API_008` | Conflicto con el estado actual del recurso | 409 |
| `API_009` | La base de datos u otra dependencia no responde | 503 |

> `API_009` existe para separar **"hay un bug"** de **"hay una dependencia caída"**. Con un 500
> genérico para ambos, quien está de turno no sabe si buscar en el código o levantar la base; y
> el cliente no sabe si reintentar tiene sentido. Con 503 lo sabe: sí lo tiene.

## VAL — validación genérica de entrada

| Código | Situación |
|---|---|
| `VAL_001` | Campo obligatorio ausente |
| `VAL_002` | Longitud por debajo del mínimo |
| `VAL_003` | Longitud por encima del máximo |
| `VAL_004` | Formato inválido |
| `VAL_005` | Valor fuera de rango |
| `VAL_006` | Lista vacía cuando se esperaba al menos un elemento |
| `VAL_007` | Texto compuesto solo por espacios |

## AUTH — autenticación

| Código | Situación | HTTP |
|---|---|---|
| `AUTH_001` | Credenciales inválidas (correo inexistente **o** contraseña incorrecta) | 401 |
| `AUTH_002` | Usuario inactivo | 403 |
| `AUTH_003` | Empresa inactiva | 403 |
| `AUTH_004` | Token de refresco inválido | 401 |
| `AUTH_005` | Token de refresco expirado | 401 |
| `AUTH_006` | Sesión revocada | 401 |
| `AUTH_007` | Correo obligatorio | 400 |
| `AUTH_008` | Contraseña obligatoria | 400 |
| `AUTH_009` | Contraseña que no cumple la política | 400 |

> `AUTH_001` cubre a propósito dos situaciones distintas. Separarlas permitiría enumerar qué
> correos existen en el sistema.

## MARCA — catálogo de marcas

| Código | Situación | HTTP |
|---|---|---|
| `MARCA_001` | Nombre obligatorio | 400 |
| `MARCA_002` | Nombre compuesto solo por espacios | 400 |
| `MARCA_003` | Ya existe una marca con ese nombre en la empresa | 409 |
| `MARCA_004` | Marca no encontrada | 404 |
| `MARCA_005` | Nombre por debajo del largo mínimo | 400 |
| `MARCA_006` | Nombre o descripción por encima del largo máximo | 400 |
| `MARCA_007` | No se pudo crear | 400 |
| `MARCA_008` | No se pudo actualizar | 400 |
| `MARCA_009` | No se pudo desactivar | 400 |
| `MARCA_010` | La marca ya está inactiva | 409 |

## PROD — productos

| Código | Situación | HTTP |
|---|---|---|
| `PROD_001` | Producto no encontrado | 404 |
| `PROD_002` | SKU duplicado en la empresa | 409 |
| `PROD_003` | SKU obligatorio | 400 |
| `PROD_004` | Nombre obligatorio | 400 |
| `PROD_005` | Precio inválido | 400 |
| `PROD_006` | Marca no encontrada | 404 |
| `PROD_007` | Categoría no encontrada | 404 |
| `PROD_008` | Producto inactivo | 400 |

## ALMA — almacenes

| Código | Situación | HTTP |
|---|---|---|
| `ALMA_001` | Almacén no encontrado (inexistente o de otra empresa) | 404 |

> `ALMA_001` cubre las dos situaciones a propósito, igual que `AUTH_001`: separarlas permitiría
> enumerar qué almacenes existen en otras empresas. Lo devuelve `buscar-productos` cuando el
> filtro `almacenId` no es de la empresa del token; sin él, la consulta no encontraría
> existencias y el catálogo entero viajaría con saldo cero, que significa "no queda".

## VENTA — ventas

| Código | Situación | HTTP |
|---|---|---|
| `VENTA_001` | La venta no tiene líneas | 400 |
| `VENTA_002` | Producto de una línea no encontrado | 404 |
| `VENTA_003` | Producto inactivo | 400 |
| `VENTA_004` | Stock insuficiente | 400 |
| `VENTA_005` | Cantidad inválida | 400 |
| `VENTA_006` | Descuento inválido | 400 |
| `VENTA_007` | Método de pago no habilitado | 400 |
| `VENTA_008` | Almacén inexistente o de otra empresa | 400 |
| `VENTA_009` | Cliente no encontrado | 404 |
| `VENTA_010` | Venta no encontrada | 404 |
| `VENTA_011` | La venta ya está anulada | 409 |
| `VENTA_012` | No se pudo registrar la venta | 500 |

## Prefijos reservados

Los módulos documentados en [`mapa-de-modulos.md`](mapa-de-modulos.md) tienen su prefijo
reservado aunque todavía no estén implementados aquí, para que nadie lo ocupe con otro
significado: `AUDI`, `CAJA`, `CAT`, `CLI`, `COMP`, `DASH`, `DESC`, `EMP`, `INV`, `LOG`,
`LOTE`, `LUG`, `MOD`, `MOV`, `ONB`, `PREF`, `PROM`, `PROV`, `RBAC`, `REP`, `SOL`, `SUSC`,
`USR`.
