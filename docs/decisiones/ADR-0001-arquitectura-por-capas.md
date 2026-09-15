# ADR-0001 — Arquitectura por capas con dependencias hacia el dominio

- **Estado:** aceptada
- **Ámbito:** toda la solución

## Contexto

Un ERP crece por acumulación de módulos: empieza con cinco y termina con treinta y uno. El
riesgo no es el primer módulo, es el número veinte, escrito con prisa por alguien que llegó
después. Si la estructura no impide el atajo, el atajo se toma.

Los dos atajos que matan una solución de este tamaño son siempre los mismos: consultar la base
de datos desde el controlador, y meter una regla de negocio dentro de una consulta SQL.

## Decisión

Cuatro proyectos con dependencias dirigidas hacia adentro:

```
ERP.Api ──► ERP.Aplicacion ──► ERP.Dominio
                  ▲                 ▲
                  └── ERP.Infraestructura ──┘
```

- **ERP.Dominio** no referencia ningún paquete NuGet. Su `.csproj` está vacío a propósito.
- **ERP.Aplicacion** solo referencia abstracciones de inyección de dependencias y opciones.
- **ERP.Infraestructura** implementa las interfaces que declara Aplicación.
- **ERP.Api** no referencia Infraestructura para *usarla*, solo para *registrarla* en el arranque.

La regla se hace cumplir sola: si alguien intenta escribir `_contexto.Ventas` dentro de un
controlador, el proyecto no compila, porque `ContextoErp` no está en el grafo de referencias
que el controlador puede alcanzar sin pasar por una abstracción.

## Consecuencias

**A favor**

- Las pruebas del dominio y de los casos de uso corren sin base de datos, sin HTTP y sin red.
  Las 32 pruebas de este repositorio tardan un segundo.
- Cambiar de proveedor de persistencia toca un solo proyecto.
- Cada archivo tiene un único motivo para cambiar, y se sabe cuál.

**Costo asumido**

- Un CRUD simple se reparte en más archivos que en una solución de una sola capa: contrato,
  validador, comando, manejador, resultado, interfaz de repositorio, implementación.
  Es el precio de que el módulo número treinta se escriba igual que el primero.

## Alternativas descartadas

- **Un solo proyecto con carpetas.** Las carpetas no impiden nada: la primera vez que alguien
  tiene prisa, el `DbContext` aparece en el controlador y ya no hay vuelta atrás.
- **Arquitectura hexagonal estricta con puertos y adaptadores para todo.** Más ceremonia de la
  que este dominio justifica; el beneficio marginal sobre lo que ya hay es pequeño.
