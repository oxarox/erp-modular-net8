# Checklist de endpoint

Lista de verificación antes de dar por cerrado un endpoint. Existe porque los mismos cinco
olvidos se repiten: el permiso, el código de error nuevo, la prueba del caso triste, el índice
y la fila en `endpoints.md`.

Se copia al pull request y se marca.

## Contrato

- [ ] Ruta derivada con `[HttpX("[action]")]` — nunca literal — y verbo HTTP correcto
- [ ] El nombre del método describe el caso de uso: es lo que va a quedar en la URL
- [ ] `id` restringido por tipo en la ruta (`{id:long}`)
- [ ] Contrato de entrada y salida propio en `ERP.Api/Contracts/` — **nunca** una entidad de dominio
- [ ] Atributos `[ProducesResponseType]` para cada código que el endpoint puede devolver
- [ ] Si devuelve lista: usa `RespuestaPaginada<T>` con los parámetros estándar
- [ ] Si devuelve lista **sin** paginar: cumple las tres condiciones de
      [ADR-0009](decisiones/ADR-0009-listas-de-selector-sin-paginar.md) —cardinalidad acotada
      por diseño, consumo como selector, y queda escrito en `endpoints.md`—. En duda, se pagina
- [ ] Si crea: devuelve 201 con cabecera `Location`

## Seguridad

- [ ] `[AutorizarPermiso(...)]` con un permiso del catálogo, **como constante**
- [ ] El permiso existe en `ERP.Api/Autorizacion/Permisos.cs` y en `Permisos.Todos`
- [ ] El permiso está en la semilla (`roles_permisos`)
- [ ] El `empresaId` sale del token (`EmpresaId` de `ControladorBase`), nunca del cuerpo o la ruta
- [ ] Si es anónimo: está justificado por escrito (solo login y salud lo son hoy)

## Validación

- [ ] Validador FluentValidation para el contrato de entrada
- [ ] Cada regla lleva su `WithErrorCode` con un código del catálogo
- [ ] Solo reglas de **forma** en el validador; las que consultan el estado van al caso de uso
- [ ] Cadenas: se hace `Trim` y se rechaza el texto compuesto solo de espacios

## Caso de uso

- [ ] Un manejador por caso de uso, con `ManejarAsync(long empresaId, comando, CancellationToken)`
- [ ] Sin `try/catch` para armar errores: se lanzan excepciones de `Comun/Excepciones`
- [ ] Cada excepción lleva su código del catálogo
- [ ] Registrado en `RegistroAplicacion`
- [ ] Si escribe en más de un agregado: usa `IUnidadDeTrabajo` y revierte ante fallo
- [ ] Si lee varias entidades: lectura **por lote**, no una consulta por iteración
- [ ] Si es una acción relevante para auditoría: registra en `IRegistroLogAcciones`

## Persistencia

- [ ] `empresaId` explícito en la firma del repositorio y en el `Where`
- [ ] `AsNoTracking()` en toda lectura que no se va a modificar
- [ ] La entidad implementa `IEntidadMultiEmpresa` (si corresponde) para recibir el filtro global
- [ ] Hay índice que respalda el filtro y el orden de la consulta
- [ ] Las reglas de unicidad tienen su restricción `UQ_` en la base, no solo la validación previa
- [ ] Migración SQL versionada, idempotente y transaccional

## Pruebas

- [ ] Caso feliz
- [ ] **Cada error que el endpoint declara** tiene su prueba, y la prueba verifica el **código**
- [ ] Si hay cálculo: prueba de dominio con los valores en el borde
- [ ] Si hay transacción: prueba de que revierte ante fallo
- [ ] Si hay validador: prueba de que devuelve el código correcto, no solo que falla

## Documentación

- [ ] Fila nueva en [`endpoints.md`](endpoints.md)
- [ ] Códigos nuevos en [`codigos-error.md`](codigos-error.md), con correlativo **nuevo**
      (jamás reutilizado)
- [ ] Comentario XML en la acción si hay algo no obvio; Swagger lo muestra
- [ ] Si se tomó una decisión discutible: ADR en `decisiones/`
