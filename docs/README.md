# Documentación

Índice maestro. Si vas a modificar el proyecto, lee primero
[`arquitectura.md`](arquitectura.md); es la única lectura obligatoria.

## Cómo está organizada

| Documento | Para qué sirve |
|---|---|
| [`arquitectura.md`](arquitectura.md) | Capas, reglas de dependencia y qué va en cada carpeta |
| [`decisiones/`](decisiones/) | Un ADR por decisión técnica: contexto, alternativas y costo |
| [`multiempresa.md`](multiempresa.md) | Cómo se aísla cada empresa y dónde puede romperse |
| [`seguridad-y-rbac.md`](seguridad-y-rbac.md) | Tokens, permisos, hashing y ciclo de sesión |
| [`convenciones-endpoints.md`](convenciones-endpoints.md) | Rutas, verbos, códigos HTTP, paginación, fechas |
| [`checklist-endpoint.md`](checklist-endpoint.md) | Lista de verificación antes de dar por cerrado un endpoint |
| [`codigos-error.md`](codigos-error.md) | Catálogo de códigos `MODULO_###` |
| [`endpoints.md`](endpoints.md) | Mapa canónico de rutas |
| [`mapa-de-modulos.md`](mapa-de-modulos.md) | Los 31 módulos del sistema completo y qué resuelve cada uno |
| [`testing.md`](testing.md) | Qué se prueba, con qué herramienta y qué no se prueba |
| [`branching-strategy.md`](branching-strategy.md) | Ramas, promoción entre ambientes y convención de commits |
| [`BD/convenciones-bd.md`](BD/convenciones-bd.md) | Nombres de tablas, columnas, índices y tipos |
| [`BD/migraciones.md`](BD/migraciones.md) | Cómo se escribe y se aplica una migración |
| [`diagramas/`](diagramas/) | Diagramas de contexto, capas, modelo de datos y flujos |

## Reglas de la documentación

1. **La documentación se actualiza en la misma entrega que el código.** Un endpoint nuevo que
   no aparece en `endpoints.md` está incompleto, igual que si le faltaran las pruebas.
2. **Un documento describe lo que el sistema hace hoy**, no lo que se planeó. Los planes
   ejecutados se archivan, no se dejan como si fueran vigentes.
3. **Las decisiones van a `decisiones/` como ADR**, con su costo explícito. Un ADR sin
   "alternativas descartadas" ni "costo asumido" no documenta una decisión: documenta una
   preferencia.
