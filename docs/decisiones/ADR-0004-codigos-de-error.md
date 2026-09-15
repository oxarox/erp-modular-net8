# ADR-0004 — Catálogo de códigos de error con correlativo global por módulo

- **Estado:** aceptada
- **Ámbito:** contrato de la API

## Contexto

El front necesita reaccionar distinto a "el nombre ya existe" y a "no tienes permiso". Si la
única señal es el mensaje en español, cualquier corrección de redacción rompe al cliente. Y si
cada módulo inventa su propio formato, el manejador de errores del front termina con un
`switch` por endpoint.

## Decisión

Todo error de la API sale con la misma forma —`RespuestaError`— y lleva un **código estable**
con formato `MODULO_###`:

```json
{
  "codigo": "MARCA_003",
  "mensaje": "Ya existe una marca con el mismo nombre para la empresa.",
  "correlacionId": "8f3c1e...",
  "detalles": null
}
```

Reglas del catálogo:

1. El correlativo es **global por módulo** y **nunca se reutiliza**, ni siquiera si el código
   queda obsoleto. Reutilizar un número significa que un cliente viejo interpreta mal un error
   nuevo.
2. Los códigos viven en constantes (`ERP.Aplicacion/Comun/CodigosError/`), no en literales.
3. El catálogo se documenta en [`docs/codigos-error.md`](../codigos-error.md) y se actualiza
   en la misma entrega que introduce el código.
4. El mensaje es para la persona; el código es para el programa. El mensaje puede cambiar
   libremente, el código no.

La traducción de excepción a respuesta ocurre en **un solo lugar**: `IntermediarioExcepcion`.
Ningún controlador arma su propio error.

## Consecuencias

**A favor**

- El front escribe un manejador de errores, no treinta y uno.
- Reformular un mensaje en español no es un cambio de contrato.
- El `correlacionId` cruza el error del usuario con el log del servidor sin adivinar por hora.

**Costo asumido**

- Hay que mantener el catálogo. Es trabajo real, y se paga en cada endpoint nuevo.

## Alternativas descartadas

- **`ProblemDetails` estándar.** Correcto y conocido, pero su campo `type` como URI resulta
  incómodo de consumir desde el front y no aporta sobre un código corto y estable.
- **Códigos por texto (`MarcaDuplicada`).** Legibles, pero invitan a renombrarlos, y renombrar
  un código es romperlo.
