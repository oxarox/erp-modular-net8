# ADR-0002 — Aislamiento multiempresa por filtro global, reforzado con `empresaId` explícito

- **Estado:** aceptada
- **Ámbito:** persistencia y casos de uso

## Contexto

El sistema es multiempresa sobre una única base de datos: los datos de todos los clientes
conviven en las mismas tablas. Una consulta que olvide filtrar por empresa no devuelve un
error: devuelve datos de otro cliente. Es el fallo más grave posible en este producto, y el
más fácil de cometer.

## Decisión

Dos barreras independientes, no una:

1. **Filtro global de consulta.** Toda entidad que implementa `IEntidadMultiEmpresa` recibe en
   `OnModelCreating` un filtro por `EmpresaId`. Una consulta escrita sin `Where` no puede ver
   datos ajenos. Esto cubre el olvido.
2. **`empresaId` explícito en cada método de repositorio.** La firma obliga a pasarlo. Esto
   cubre el caso en que alguien desactive el filtro con `IgnoreQueryFilters` y también hace
   evidente en la lectura del código que la consulta es por tenant.

La empresa **solo** se resuelve desde el claim del token, en
`ProveedorContextoEmpresaHttp`. Ningún endpoint acepta un `empresaId` por ruta, query o
cuerpo: si el cliente pudiera proponerlo, no habría aislamiento.

Cuando no hay contexto autenticado (migraciones, tareas de arranque) el filtro no recorta, y
el aislamiento queda a cargo del parámetro explícito.

## Consecuencias

**A favor**

- El fallo más caro del producto requiere equivocarse dos veces, no una.
- Está cubierto por pruebas: `FiltroGlobalMultiempresaTests` verifica que una consulta *sin*
  filtro explícito sigue sin ver datos ajenos.

**Costo asumido**

- El login debe saltarse el filtro con `IgnoreQueryFilters`, porque busca por correo antes de
  saber a qué empresa pertenece el usuario. Es la única lectura del sistema autorizada a
  hacerlo, y está marcada como tal en el código.
- Un recurso de otra empresa devuelve 404, no 403: responder 403 confirmaría que el recurso
  existe, que es justo lo que no se quiere filtrar.

## Alternativas descartadas

- **Una base de datos por empresa.** Aísla mejor, pero multiplica por N el costo de cada
  migración y de cada despliegue. Con el volumen del sistema, no compensa.
- **Solo el filtro global.** Un `IgnoreQueryFilters` mal puesto lo anula por completo y nada
  lo delata.
