# Consola web — ERP Modular

Cliente React de la [API REST en .NET 8](../README.md) de este mismo repositorio. No es una
maqueta: consume los endpoints reales, respeta el catálogo de códigos de error del servidor y
usa los permisos que vienen firmados dentro del token para decidir qué mostrar.

**▶ [Abrir la consola en vivo](https://oxarox.github.io/erp-modular-net8/)** — sin instalar
nada, con `admin@norte.cl` / `Demo.1234`.

| | |
|---|---|
| **Base** | React 19 + TypeScript 6 + Vite |
| **Datos** | TanStack Query v5 |
| **Rutas** | React Router |
| **Estilos** | Tailwind v4 con tokens semánticos propios, tema claro y oscuro |
| **Modo demo** | MSW 2 — los endpoints respondidos dentro del navegador |
| **Pruebas** | Vitest + Testing Library |
| **Entrega** | Dockerfile multietapa (nginx), GitHub Actions |

---

## Arrancar

### Contra la API real

Necesita la API corriendo. Desde la raíz del repositorio, `docker compose up --build` levanta
base de datos, API y esta consola; o `dotnet run --project ERP.Api/ERP.Api.csproj` y luego,
aquí:

```bash
npm install
npm run dev
```

La consola queda en <http://localhost:5173>. El puerto no es casual: es el origen que
`docker-compose.yml` ya declara en `Cors__OrigenesPermitidos__0`, así que cambiarlo obliga a
tocar también el backend.

Credenciales de la semilla de desarrollo:

| Correo | Contraseña | Empresa |
|---|---|---|
| `admin@norte.cl` | `Demo.1234` | Comercial Norte |
| `admin@sur.cl` | `Demo.1234` | Distribuidora Sur |

Son dos empresas distintas a propósito: entrar con una y no ver los datos de la otra es la
forma más rápida de comprobar el aislamiento multiempresa.

### Sin backend (modo demo)

```bash
npm run dev:demo
```

Un Service Worker responde los endpoints dentro del navegador, con datos equivalentes a la
semilla de desarrollo. No hace falta API ni SQL Server. Es lo que se publica en GitHub Pages
para que la consola se pueda recorrer desde un enlace.

El simulador **no** es un montón de datos falsos: valida el token, aplica los permisos,
filtra por empresa, devuelve el mismo sobre de error con los mismos códigos y descuenta el
stock al registrar una venta. El acceso caduca a los 30 minutos y el refresco rota en cada
canje, igual que en el backend, para que la renovación automática del cliente se pueda ver
funcionando. Si dejara pasar todo, la demo no demostraría nada.

Dos detalles de su alcance, dichos antes de que sorprendan:

- **El catálogo y el histórico se vuelven a sembrar en cada recarga.** Son deterministas —el
  generador usa una semilla fija— así que salen idénticos siempre, pero una marca creada o una
  venta registrada durante la visita no sobreviven al refresco. Es un servidor en memoria.
- **La sesión sí sobrevive**, reflejada en `sessionStorage`. Es la única excepción, y es
  deliberada: sin ella, refrescar cerraría la sesión y se perdería justamente la restauración
  automática del token, que es una de las cosas que la consola viene a mostrar. Cerrar la
  pestaña sí termina la sesión.

### Configuración

Copie `.env.example` a `.env.local` y ajuste lo que necesite.

| Variable | Por defecto | Para qué |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5080` | Origen de la API |
| `VITE_MODO_DEMO` | `false` | Activa el simulador MSW |
| `VITE_TASA_IMPUESTO` | `0.19` | Espejo de `Ventas:TasaImpuesto` del servidor |
| `VITE_PRECIO_INCLUYE_IMPUESTO` | `false` | Espejo de `Ventas:PrecioIncluyeImpuesto` |
| `VITE_BASE` | `/` | Subruta de publicación (GitHub Pages) |

---

## Comandos

```bash
npm run dev             # servidor de desarrollo contra la API real
npm run dev:demo        # servidor de desarrollo con el simulador MSW
npm run build           # verifica tipos y compila
npm run build:demo      # compila en modo demo
npm run typecheck       # solo verificación de tipos
npm run lint            # oxlint
npm run test            # Vitest
npm run test:cobertura  # Vitest con informe de cobertura
```

---

## Qué se prueba, y qué no

```bash
npm run test
```

Las pruebas van donde un error es **invisible**, no donde es fácil escribirlas. Un botón mal
alineado se ve; un impuesto calculado sobre el bruto se ve exactamente igual que uno correcto.

| Qué | Dónde | Por qué importa |
|---|---|---|
| Espejo del cálculo de totales | `nucleo/dominio/totales.test.ts` | Traducción caso por caso de `CalculadoraTotalesVentaTests.cs`. Es lo que mantiene honesta la duplicación |
| Sobre de error | `nucleo/api/errores.test.ts` | Fija el otro extremo del contrato: códigos, errores por campo, detalle de stock |
| Cliente HTTP | `nucleo/api/cliente.test.ts` | Renovación del token, deduplicación del canje, cuerpos que no son el sobre prometido |
| Parseo de fechas UTC | `nucleo/formato/formato.test.ts` | El backend manda `DateTime` sin sufijo Z; un error aquí desplaza cada venta varias horas |
| Agregación del tablero | `caracteristicas/tablero/agregacion.test.ts` | Una venta anulada que suma al total se ve igual que una cifra correcta |
| Reglas de una línea de venta | `caracteristicas/ventas/VentaTipos.test.ts` | Que el cliente repita la regla del servidor **con el mismo código** del catálogo |
| Validadores del cliente | `caracteristicas/marcas/validacionMarca.test.ts` | Espejos de `ERP.Api/Validadores/`, comparados por código y no por texto |
| Accesibilidad del campo | `componentes/Formulario.test.tsx` | Que un error visible sea además un error **anunciado** |

**Qué no cubre**, con la misma honestidad que
[`docs/testing.md`](../docs/testing.md#qué-no-cubre) del backend:

- **No hay pruebas de render de las pantallas completas.** Montar `PaginaMarcas` y buscar
  textos verifica sobre todo que el JSX sigue siendo el mismo, y esa prueba se rompe en cada
  cambio de diseño sin haber encontrado nunca un error. Lo que sí vale de esas pantallas —las
  reglas— está extraído a módulos que sí se prueban.
- **No hay pruebas de extremo a extremo.** El modo demo cumple esa función a mano: recorre los
  mismos flujos contra un contrato equivalente.
- **No se prueban los componentes de presentación.** Excepción hecha de `Campo`, porque ahí el
  contrato es de accesibilidad y sí puede romperse en silencio.

---

## Estructura

```
src/
├─ app/                 Armazón: rutas, guardas, barra lateral, cliente de consultas
├─ caracteristicas/     Una carpeta por pantalla
│  ├─ autenticacion/    Inicio de sesión
│  ├─ tablero/          Indicadores y serie diaria de ventas
│  ├─ marcas/           CRUD completo con baja lógica
│  ├─ productos/        Catálogo de solo lectura con stock por almacén
│  ├─ ventas/           Listado y registro de ventas
│  └─ sistema/          Estado de la API, sesión, permisos y contrato de errores
├─ componentes/         Sistema de diseño: botones, tabla, formulario, modal, avisos
├─ nucleo/              Lo que no es pantalla
│  ├─ api/              Contratos, cliente HTTP, catálogo de errores
│  ├─ autenticacion/    Almacén de sesión y proveedor de React
│  ├─ dominio/          Espejo del cálculo de totales del dominio
│  └─ formato/          Fechas, montos y números en es-CL
├─ simulacion/          Modo demo: manejadores MSW y datos semilla
└─ estilos/             Tokens de color y tema
```

---

## Las decisiones que vale la pena mirar

### El token de acceso vive en memoria; el de refresco, en `localStorage`

El acceso dura 30 minutos y abre todo, así que guardarlo en `localStorage` lo deja legible
por cualquier script inyectado en la página. Se paga el costo de perderlo al recargar. El de
refresco sí se persiste —sin él, recargar cerraría la sesión—, es de un solo uso porque el
backend lo rota en cada canje, y puede revocarse subiendo `auth_version` del usuario, lo que
además invalida todos los accesos vivos.

Ver [`src/nucleo/autenticacion/almacenSesion.ts`](src/nucleo/autenticacion/almacenSesion.ts).

### La renovación del token está deduplicada

Si tres consultas del tablero reciben 401 a la vez, se hace **un** canje y las tres esperan
el mismo resultado. Sin esa promesa compartida, las tres canjearían el mismo token de
refresco y —como el backend lo rota— dos recibirían `AUTH_004` y cerrarían la sesión de
alguien cuya sesión estaba perfectamente viva.

Ver [`src/nucleo/api/cliente.ts`](src/nucleo/api/cliente.ts).

### Se reacciona al código de error, nunca al texto

El backend garantiza que todo error sale con el mismo sobre —`{traceId, code, message,
details, errorCode}`— y que `errorCode` nunca viaja nulo. Por eso el cliente tiene **un**
manejador de errores y no uno por endpoint, y por eso reformular un mensaje en español en el
servidor no rompe ninguna pantalla.

Los errores de validación llegan por campo, con el nombre de propiedad que usa
FluentValidation (`Nombre`, `Lineas[0].Cantidad`); `erroresPorCampo()` los normaliza a los
nombres del formulario.

Ver [`src/nucleo/api/errores.ts`](src/nucleo/api/errores.ts) y
[`docs/codigos-error.md`](../docs/codigos-error.md).

### Las fechas UTC se parsean a mano, y hace falta

El backend expone `DateTime`. Cuando el valor viene de SQL Server su `Kind` es `Unspecified`,
así que `System.Text.Json` lo escribe **sin sufijo Z**. El estándar de ECMAScript manda
interpretar una fecha-hora sin desfase como hora **local**: `new Date(venta.fechaUtc)`
desplazaría cada venta según la zona del navegador —en Chile, tres o cuatro horas—.
`fechaUtcDesdeApi()` agrega la Z cuando falta, y hay una prueba que lo fija.

Ver [`src/nucleo/formato/formato.ts`](src/nucleo/formato/formato.ts).

### El cálculo de totales está duplicado, y es una deuda consciente

`src/nucleo/dominio/totales.ts` es un espejo de
[`CalculadoraTotalesVenta`](../ERP.Dominio/Servicios/CalculadoraTotalesVenta.cs), y existe
solo para que se vea el total mientras se arma la venta sin ir y volver al servidor por cada
cambio de cantidad. **El cálculo que vale es el del servidor**, y la pantalla muestra los
totales que devuelve `POST /api/ventas/registrar-venta` en cuanto la venta se registra.

Duplicar una regla de negocio en el cliente se paga con una prueba: `totales.test.ts` es una
traducción caso por caso de `CalculadoraTotalesVentaTests.cs`, con los mismos números. Si el
dominio cambia y el espejo no, esta suite se pone roja.

### Los filtros viven en la URL

Con `useFiltrosEnUrl`, el enlace de «ventas anuladas de septiembre» se puede pegar en un
chat, el botón atrás deshace un filtro en vez de salirse de la pantalla, y recargar no pierde
lo que se estaba mirando.

### Los permisos ocultan enlaces, no protegen nada

La barra lateral esconde lo que el usuario no puede usar, y las rutas verifican el permiso
antes de montar la pantalla. Eso es **comodidad de interfaz**: quien manda es el servidor, que
responde `403 · API_002` aunque alguien escriba la URL a mano. Ver
[ADR-0003](../docs/decisiones/ADR-0003-rbac-por-permisos.md).

### Un solo componente de tabla para todos los módulos

Porque hay una sola forma de respuesta paginada. `ResultadoPaginado<T>` garantiza que los 31
módulos del sistema devuelvan `pagina`, `tamanoPagina`, `total`, `totalPaginas` e `items`.
Esa decisión del servidor es la que permite que aquí no haya una tabla por módulo.

### Los colores son tokens semánticos, no literales

`bg-superficie` y `text-texto-suave`, nunca `bg-white` ni `dark:bg-zinc-800`. Los tokens se
redefinen una vez bajo `.dark` y ningún componente conoce la paleta, así que el tema oscuro no
es una segunda hoja de estilos que mantener sincronizada.

Ver [`src/estilos/global.css`](src/estilos/global.css).

---

## Accesibilidad

- Navegación completa con teclado, incluido el selector de productos de la venta.
- Enlace de «saltar al contenido» y foco visible solo cuando llega por teclado.
- Los diálogos usan el elemento nativo `<dialog>`: el navegador resuelve la trampa de foco,
  el cierre con Escape y la inertización del fondo mejor que una implementación propia.
- Los avisos se anuncian en una región `aria-live`; un mensaje que solo existe en píxeles no
  llega a quien usa un lector de pantalla.
- El gráfico del tablero lleva una tabla equivalente oculta, no solo un `aria-label`.
- Se respeta `prefers-reduced-motion`.

---

## Alcance

La consola cubre lo que la API expone y nada más. No hay pantallas que finjan funcionalidad:
el detalle de una venta, su anulación, el alta de productos y los reportes no tienen endpoint
en este repositorio, y la pantalla de **Sistema** lo dice explícitamente en vez de dejar
botones que no hacen nada.
