# Probar el sistema en local

Guía de humo de punta a punta: levantar, cargar datos, iniciar sesión, crear una marca,
registrar una venta y comprobar que el aislamiento multiempresa realmente aísla.

Los comandos de este documento están ejecutados, no supuestos. Las respuestas que aparecen son
las que devuelve el sistema.

---

## Opción A — con Docker (nada que instalar)

```bash
docker compose up --build
```

Levanta SQL Server y la API juntos. Después, crear la base y aplicar las migraciones:

```bash
docker compose exec -T base-de-datos /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'ClaveLocal_Dev123' -C -Q "CREATE DATABASE ErpModular"
```

```bash
docker compose exec -T base-de-datos /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'ClaveLocal_Dev123' -C -d ErpModular -b -i /dev/stdin < ERP.Infraestructura/Persistencia/Migraciones/20260101_000_esquema_inicial.sql
```

```bash
docker compose exec -T base-de-datos /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'ClaveLocal_Dev123' -C -d ErpModular -b -i /dev/stdin < ERP.Infraestructura/Persistencia/Migraciones/20260101_001_datos_semilla.sql
```

La API queda en `http://localhost:8080`. Salta al [paso 3](#3-iniciar-sesión).

## Opción B — con el SDK de .NET y SQL Server LocalDB

Requisitos: .NET SDK 8 o superior, y SQL Server LocalDB (viene con SQL Server Express y con
Visual Studio).

### 1. Preparar la base de datos

```bash
sqllocaldb start MSSQLLocalDB
```

```bash
sqlcmd -S "(localdb)\MSSQLLocalDB" -b -Q "IF DB_ID('ErpModular') IS NULL CREATE DATABASE ErpModular;"
```

```bash
sqlcmd -S "(localdb)\MSSQLLocalDB" -d ErpModular -b -i ERP.Infraestructura/Persistencia/Migraciones/20260101_000_esquema_inicial.sql
```

```bash
sqlcmd -S "(localdb)\MSSQLLocalDB" -d ErpModular -b -i ERP.Infraestructura/Persistencia/Migraciones/20260101_001_datos_semilla.sql
```

Los scripts son idempotentes: volver a correrlos no duplica nada. Para comprobarlo, córrelos dos
veces y verifica que los conteos no cambian.

```bash
sqlcmd -S "(localdb)\MSSQLLocalDB" -d ErpModular -b -Q "SELECT (SELECT COUNT(*) FROM dbo.empresas) AS empresas, (SELECT COUNT(*) FROM dbo.productos) AS productos, (SELECT COUNT(*) FROM dbo.roles_permisos) AS permisos;"
```

> `empresas = 2`, `productos = 3`, `permisos = 12`.

### 2. Levantar la API

Los secretos van por variable de entorno; el arranque **falla a propósito** si falta alguno.

```bash
Jwt__ClaveFirma="clave-solo-para-desarrollo-de-al-menos-32-caracteres" ConnectionStrings__DefaultConnection='Server=(localdb)\MSSQLLocalDB;Database=ErpModular;Trusted_Connection=True;TrustServerCertificate=True;' dotnet run --project ERP.Api/ERP.Api.csproj
```

En PowerShell:

```powershell
$env:Jwt__ClaveFirma="clave-solo-para-desarrollo-de-al-menos-32-caracteres"; $env:ConnectionStrings__DefaultConnection='Server=(localdb)\MSSQLLocalDB;Database=ErpModular;Trusted_Connection=True;TrustServerCertificate=True;'; dotnet run --project ERP.Api/ERP.Api.csproj
```

La API queda en `http://localhost:5080` y Swagger en `http://localhost:5080/swagger`.

```bash
curl http://localhost:5080/api/salud
```

> `{"estado":"ok","version":"1.0.0.0","entorno":"Development","fechaUtc":"..."}`

---

## 3. Iniciar sesión

La semilla crea dos empresas para poder comprobar el aislamiento. Contraseña de ambas:
`Demo.1234`.

```bash
curl -s -X POST http://localhost:5080/api/autenticacion/iniciar-sesion -H "Content-Type: application/json" -d '{"correo":"admin@norte.cl","contrasena":"Demo.1234"}'
```

> Devuelve el par de tokens, la empresa y los seis permisos del rol administrador.

Guarda el token de acceso en una variable:

```bash
TOKEN=$(curl -s -X POST http://localhost:5080/api/autenticacion/iniciar-sesion -H "Content-Type: application/json" -d '{"correo":"admin@norte.cl","contrasena":"Demo.1234"}' | python -c "import json,sys;print(json.load(sys.stdin)['tokenAcceso'])")
```

**Comprueba que un correo inexistente y una clave incorrecta dan el mismo error** —es
deliberado, para no permitir enumerar usuarios:

```bash
curl -s -X POST http://localhost:5080/api/autenticacion/iniciar-sesion -H "Content-Type: application/json" -d '{"correo":"admin@norte.cl","contrasena":"clave-mala"}'
```

> `{"code":"unauthorized", ..., "errorCode":"AUTH_001"}`

## 4. Un CRUD completo: marcas

```bash
curl -s -X POST http://localhost:5080/api/marcas/crear-marca -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"nombre":"Bosch","descripcion":"Herramienta profesional","activo":true}'
```

> `201` con `{"exitoso":true,"mensaje":"Marca creada.","id":3}`

Repite el mismo comando cambiando el nombre a minúsculas (`bosch`): el duplicado se detecta sin
importar mayúsculas.

> `409` con `errorCode: MARCA_003`

```bash
curl -s "http://localhost:5080/api/marcas/buscar-marcas?pagina=1&tamanoPagina=10" -H "Authorization: Bearer $TOKEN"
```

> Lista paginada con `total`, `totalPaginas` e `items`.

Sin token, para ver que el 401 también trae el sobre de error completo:

```bash
curl -s http://localhost:5080/api/marcas/buscar-marcas
```

> `{"code":"unauthorized", ..., "errorCode":"API_001"}`

## 5. El caso complejo: registrar una venta

Dos líneas: dos unidades de un producto con descuento, más un servicio que **no** descuenta
inventario.

```bash
curl -s -X POST http://localhost:5080/api/ventas/registrar-venta -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"clienteId":null,"almacenId":1,"metodoPago":"EFECTIVO","lineas":[{"productoId":1,"cantidad":2,"descuentoLinea":500},{"productoId":3,"cantidad":1,"descuentoLinea":null}]}'
```

> `201` con
> `{"id":1,"numero":"V-20260915-0001","subtotal":28980.00,"descuento":500,"impuesto":5411.20,"total":33891.20}`

Comprueba a mano el cálculo del dominio:

| | Neto | Descuento | Base | Impuesto 19 % | Total |
|---|---|---|---|---|---|
| 2 × 1.990 | 3.980 | 500 | 3.480 | 661,20 | 4.141,20 |
| 1 × 25.000 (servicio) | 25.000 | 0 | 25.000 | 4.750,00 | 29.750,00 |
| **Documento** | **28.980** | **500** | | **5.411,20** | **33.891,20** |

El impuesto se aplica sobre la base **ya descontada**, y el total del documento es la suma de
los totales de línea, no un recálculo sobre la suma. Ver
[ADR-0005](decisiones/ADR-0005-totales-de-venta.md).

### Verifica el efecto en el inventario

```bash
sqlcmd -S "(localdb)\MSSQLLocalDB" -d ErpModular -b -Q "SELECT ProductoId, Cantidad FROM dbo.existencias WHERE EmpresaId=1; SELECT ProductoId, Tipo, Cantidad, OrigenTipo, OrigenId FROM dbo.movimientos_inventario;"
```

> El producto 1 baja de 100 a **98**; el producto 2 queda intacto; hay **un solo** movimiento,
> de tipo Egreso, con `OrigenTipo = Venta` y `OrigenId = 1`. El servicio no genera movimiento,
> porque `ControlaInventario = 0`.

### Verifica que las reglas de negocio frenan la operación

```bash
curl -s -X POST http://localhost:5080/api/ventas/registrar-venta -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"clienteId":null,"almacenId":1,"metodoPago":"EFECTIVO","lineas":[{"productoId":1,"cantidad":500,"descuentoLinea":null}]}'
```

> `400` con `errorCode: VENTA_004` y `details` con el disponible y lo solicitado.

```bash
curl -s -X POST http://localhost:5080/api/ventas/registrar-venta -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"clienteId":null,"almacenId":1,"metodoPago":"CHEQUE","lineas":[{"productoId":1,"cantidad":1,"descuentoLinea":null}]}'
```

> `400` con `errorCode: VENTA_007`

En ambos casos, vuelve a consultar `dbo.existencias`: **no cambió nada**. La validación ocurre
antes de abrir la transacción.

## 6. La prueba que más importa: el aislamiento multiempresa

Inicia sesión con la otra empresa:

```bash
TOKEN_SUR=$(curl -s -X POST http://localhost:5080/api/autenticacion/iniciar-sesion -H "Content-Type: application/json" -d '{"correo":"admin@sur.cl","contrasena":"Demo.1234"}' | python -c "import json,sys;print(json.load(sys.stdin)['tokenAcceso'])")
```

Mismo endpoint, misma base de datos, mismas tablas:

```bash
curl -s http://localhost:5080/api/marcas/buscar-marcas -H "Authorization: Bearer $TOKEN_SUR"
```

> `total: 0`. Las tres marcas de Norte no existen para Sur.

```bash
curl -s -i http://localhost:5080/api/marcas/obtener-marca-por-id/3 -H "Authorization: Bearer $TOKEN_SUR"
```

> `404`, no `403`. Responder 403 confirmaría que el recurso existe, que es justo lo que no se
> quiere filtrar. Ver [`multiempresa.md`](multiempresa.md).

## 7. Las pruebas automatizadas

```bash
dotnet test
```

> 32 pruebas en aproximadamente un segundo, **sin base de datos y sin red**. Es la consecuencia
> directa de que el dominio no dependa de nada.

---

## Limpiar

```bash
sqlcmd -S "(localdb)\MSSQLLocalDB" -b -Q "ALTER DATABASE ErpModular SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ErpModular;"
```

Con Docker: `docker compose down -v`.
