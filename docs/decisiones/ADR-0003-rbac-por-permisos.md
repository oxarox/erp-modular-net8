# ADR-0003 — Autorización por permisos dentro del token, no por roles

- **Estado:** aceptada
- **Ámbito:** seguridad

## Contexto

Los clientes no quieren tres roles fijos: quieren que el jefe de bodega vea inventario pero no
la caja, y que el cajero registre ventas pero no las anule. Autorizar por nombre de rol
(`[Authorize(Roles = "Administrador")]`) obliga a inventar un rol nuevo cada vez que alguien
pide un matiz, y a recompilar para atenderlo.

## Decisión

La unidad de autorización es el **permiso**, con formato `modulo.accion`
(`ventas.registrar`, `marcas.gestionar`). Los roles son solo agrupaciones de permisos, y son
datos: se editan en la base, no en el código.

Tres piezas lo sostienen:

- `AutorizarPermisoAttribute` declara el permiso en la acción y genera un nombre de política
  sintético (`permiso:ventas.registrar`).
- `PermisoPolicyProvider` materializa esa política al vuelo. Sin él habría que registrar a
  mano una política por permiso en el arranque, y ese registro se desincroniza el mismo día.
- `PermisoAuthorizationHandler` comprueba el permiso contra los claims del token.

Los permisos **viajan firmados dentro del JWT**: autorizar un request no toca la base de datos.

## Consecuencias

**A favor**

- Agregar un permiso es agregar una constante en `Permisos.cs` y una fila en `roles_permisos`.
  No se toca el arranque.
- La autorización no añade una consulta por request. Con ~185 endpoints, eso importa.
- Un permiso mal escrito en el atributo se ve como constante inexistente en compilación, no
  como un 403 misterioso en producción.

**Costo asumido**

- **Revocar un permiso tarda hasta que expira el token de acceso.** Se compensa con dos cosas:
  una expiración corta (30 minutos en desarrollo, 15 en producción) y el claim
  `auth_version`, que permite invalidar de golpe todos los tokens vivos de un usuario
  incrementando un entero (`EventosJwtVersionAutenticacion`).
- El token crece con la cantidad de permisos. Con decenas de permisos sigue siendo pequeño;
  con miles habría que revisar la decisión.

## Alternativas descartadas

- **Consultar permisos en cada request.** Correcto y siempre fresco, pero agrega una consulta
  a cada llamada de la API para resolver algo que cambia una vez al mes.
- **Autorizar por rol.** Se rompe con el primer cliente que pide un matiz.
