# Estrategia de pruebas

```bash
dotnet test
```

32 pruebas, un segundo, sin base de datos y sin red. Eso no es casualidad: es la consecuencia
directa de que el dominio no dependa de nada y de que la aplicación dependa solo de
abstracciones ([ADR-0001](decisiones/ADR-0001-arquitectura-por-capas.md)).

## Herramientas

| Herramienta | Para qué |
|---|---|
| **xUnit** | Ejecución. `[Fact]` para un caso, `[Theory]` + `[InlineData]` cuando el mismo escenario se repite con datos distintos |
| **NSubstitute** | Dobles de las abstracciones. Se sustituye la interfaz, nunca la clase concreta |
| **FluentAssertions** | Aserciones que se leen como una frase, y mensajes de fallo que dicen qué se esperaba |
| **EF Core InMemory** | Solo para probar el filtro global multiempresa contra un `DbContext` real |

## Qué se prueba, y con qué

| Nivel | Qué verifica | Ejemplo |
|---|---|---|
| **Dominio** | Cálculo puro e invariantes | [`CalculadoraTotalesVentaTests`](../ERP.Tests/Ventas/CalculadoraTotalesVentaTests.cs) |
| **Caso de uso** | La decisión: qué se valida, en qué orden, qué se escribe, qué se revierte | [`ManejadorRegistrarVentaTests`](../ERP.Tests/Ventas/ManejadorRegistrarVentaTests.cs) |
| **Validador** | Que rechaza lo inválido **y devuelve el código correcto** | [`ValidadorSolicitudCrearMarcaTests`](../ERP.Tests/Validadores/ValidadorSolicitudCrearMarcaTests.cs) |
| **Persistencia** | Solo lo que es una garantía transversal: el aislamiento multiempresa | [`FiltroGlobalMultiempresaTests`](../ERP.Tests/Api/FiltroGlobalMultiempresaTests.cs) |

## Reglas

1. **Cada error que un endpoint declara tiene su prueba.** El caso feliz se prueba solo por
   accidente durante el desarrollo; los caminos tristes no los recorre nadie hasta que un
   usuario los encuentra.
2. **La prueba verifica el código de error, no el mensaje.** El mensaje puede reformularse; el
   código es el contrato.
3. **No se prueba que EF Core sepa insertar una fila.** Probar el framework no descubre errores
   propios y encadena la suite a detalles de implementación.
4. **El tiempo se inyecta.** Ninguna capa llama a `DateTime.UtcNow` directamente: existe
   `IRelojSistema` y, en pruebas, [`RelojFijo`](../ERP.Tests/Comun/RelojFijo.cs). Una prueba
   que espera no es una prueba.
5. **Los datos de prueba se construyen en un solo lugar**
   ([`ConstructorDeDatos`](../ERP.Tests/Comun/ConstructorDeDatos.cs)). Cuando cada test inventa
   su propio producto, dejan de comparar el mismo escenario sin que nadie lo note.
6. **Nombre `Metodo_Escenario_Resultado`.** Al fallar, el nombre ya dice qué se rompió, sin
   abrir el archivo.

## La prueba más importante

`FiltroGlobalMultiempresaTests` verifica que una consulta escrita **sin** filtro de empresa
sigue sin poder ver datos de otro tenant. Es decir: prueba qué pasa cuando alguien se equivoca,
no qué pasa cuando todo se escribe bien.

Esa es la diferencia entre una suite que da confianza y una que solo da cobertura.

## Qué no cubre

Honestidad sobre el alcance:

- **No hay pruebas de integración HTTP** con `WebApplicationFactory`. `Program` está declarada
  como `partial` precisamente para poder agregarlas; en el sistema real existen, y en este
  repositorio no aportarían sobre lo que ya muestran las demás.
- **No hay pruebas contra SQL Server real.** El proveedor en memoria no valida restricciones ni
  traduce igual el SQL; sirve para el filtro global y para nada más. Las migraciones se validan
  aplicándolas en un ambiente de QA.
- **No hay pruebas de carga.**

## Cobertura

No se persigue un porcentaje. Un número alto obtenido probando getters da una falsa sensación
de seguridad; lo que importa es que estén cubiertos el cálculo, los caminos de error y las
garantías transversales.
