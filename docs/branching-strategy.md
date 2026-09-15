# Estrategia de ramas y entrega

## Ramas

```mermaid
gitGraph
    commit id: "main"
    branch dev
    checkout dev
    commit id: "integración"
    branch feature/marcas-busqueda
    checkout feature/marcas-busqueda
    commit id: "feat"
    commit id: "test"
    checkout dev
    merge feature/marcas-busqueda
    branch qa
    checkout qa
    merge dev
    commit id: "validación funcional"
    checkout main
    merge qa tag: "release"
```

| Rama | Rol | Protección |
|---|---|---|
| `main` | Lo que está en producción | No se empuja directo. Solo llega por pull request desde `qa` |
| `qa` | Validación funcional antes de liberar | Pull request desde `dev` |
| `dev` | Integración continua del equipo | Pull request desde `feature/*` |
| `feature/*` | Una unidad de trabajo | Se borra al mezclar |

Cada promoción es un pull request, no un `git push`: el registro de qué entró a producción y
cuándo tiene que quedar en algún lado, y ese lado es el historial de pull requests.

## Convención de commits

[Conventional Commits](https://www.conventionalcommits.org/), en español:

```
feat(marcas): búsqueda por criterio con paginación
fix(ventas): el impuesto se calculaba sobre el bruto, no sobre la base descontada
docs(adr): decisión sobre migraciones versionadas
refactor(inventario): extrae la política de inmutabilidad al dominio
test(ventas): cubre la reversión cuando falla el descuento de stock
chore(ci): cachea los paquetes NuGet
```

El ámbito entre paréntesis es el módulo. Un `fix` describe **qué estaba mal**, no qué se tocó:
dentro de seis meses, "corrige cálculo" no le dice nada a nadie.

## Qué exige un pull request

- CI en verde: compila y las pruebas pasan ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml))
- La imagen Docker construye
- El [checklist de endpoint](checklist-endpoint.md) marcado, si toca la API
- Documentación actualizada en la misma entrega
- Si hay una decisión discutible, su ADR

## Despliegue

El despliegue es **manual y con ambiente protegido**
([`.github/workflows/despliegue.yml`](../.github/workflows/despliegue.yml)): el push a `main`
construye y prueba, pero publicar en un ambiente es una decisión explícita de una persona.

Después de desplegar, el workflow verifica la sonda de salud (`/api/salud`) con reintentos. Un
despliegue que "terminó bien" pero dejó la aplicación sin responder no es un despliegue que
terminó bien.

## Migraciones de base de datos

Van por un pipeline aparte ([`pipelines/migraciones-bd.yml`](../pipelines/migraciones-bd.yml))
y **nunca** al arrancar la aplicación. El detalle y el porqué están en
[`BD/migraciones.md`](BD/migraciones.md) y en
[ADR-0006](decisiones/ADR-0006-migraciones-sql-versionadas.md).

Orden de una entrega que incluye cambio de esquema:

1. Mezclar el código a `main`.
2. Aplicar la migración en el ambiente.
3. Desplegar la aplicación.

Y por eso las migraciones se escriben **compatibles hacia atrás** siempre que se pueda: entre
los pasos 2 y 3 hay una ventana en la que la versión vieja del código convive con el esquema
nuevo.
