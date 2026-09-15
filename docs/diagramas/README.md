# Diagramas

Todos en Mermaid, versionados junto al código: un diagrama que vive en una herramienta externa
deja de reflejar el sistema a las dos semanas. GitHub los renderiza directamente.

## Contexto

Quién usa el sistema y con qué habla.

```mermaid
flowchart TB
    subgraph personas["Personas"]
        V["Vendedor"]
        B["Jefe de bodega"]
        A["Administración"]
    end

    subgraph sistema["ERP Modular"]
        API["API REST .NET 8<br/>multiempresa"]
    end

    subgraph externo["Fuera del sistema"]
        DB[("SQL Server")]
        PROXY["Proxy de entrada<br/>TLS, rate limiting"]
        FRONT["Cliente web"]
    end

    V --> FRONT
    B --> FRONT
    A --> FRONT
    FRONT --> PROXY
    PROXY --> API
    API --> DB

    style API fill:#1d4e7a,stroke:#0c2a44,color:#ffffff
    style DB fill:#8a5a1f,stroke:#4a3010,color:#ffffff
```

El TLS y la protección contra abuso viven en el proxy, no en la aplicación: el contenedor
expone HTTP y no sabe nada de certificados.

## Capas y dependencias

```mermaid
flowchart TB
    API["ERP.Api<br/><small>controladores, validadores, filtros, RBAC</small>"]
    APP["ERP.Aplicacion<br/><small>casos de uso y abstracciones</small>"]
    DOM["ERP.Dominio<br/><small>entidades, servicios de dominio, value objects</small>"]
    INF["ERP.Infraestructura<br/><small>EF Core, JWT, BCrypt, reloj</small>"]

    API --> APP
    APP --> DOM
    INF --> APP
    INF --> DOM
    API -. "solo para registrar en el arranque" .-> INF

    style DOM fill:#1f6f4a,stroke:#0d3d28,color:#ffffff
    style APP fill:#1d4e7a,stroke:#0c2a44,color:#ffffff
    style API fill:#6b3f8f,stroke:#3a2250,color:#ffffff
    style INF fill:#8a5a1f,stroke:#4a3010,color:#ffffff
```

`ERP.Dominio` no tiene ninguna flecha saliente. Es lo que permite que las pruebas corran en un
segundo.

## Registrar una venta

El caso de uso completo, con sus puntos de fallo.

```mermaid
flowchart TD
    A["POST /api/ventas"] --> B{"¿Token válido<br/>y permiso<br/>ventas.registrar?"}
    B -- No --> B1["401 / 403<br/>API_001 · API_002"]
    B -- Sí --> C{"¿Forma válida?<br/>FluentValidation"}
    C -- No --> C1["400 API_006<br/>un error por campo"]
    C -- Sí --> D["Productos por lote<br/>1 consulta"]
    D --> E{"¿Existen, activos,<br/>con stock?"}
    E -- No --> E1["400 / 404<br/>VENTA_002 · 003 · 004"]
    E -- Sí --> F["CalculadoraTotalesVenta<br/>dominio puro"]
    F --> G["BEGIN TRANSACTION"]
    G --> H["Venta + detalle"]
    H --> I["Movimientos de inventario<br/>+ proyección de existencias"]
    I --> J{"¿Todo bien?"}
    J -- No --> K["ROLLBACK<br/>500 VENTA_012"]
    J -- Sí --> L["COMMIT<br/>+ bitácora"]
    L --> M["201 Created"]

    style F fill:#1f6f4a,stroke:#0d3d28,color:#ffffff
    style K fill:#8a2f2f,stroke:#4a1010,color:#ffffff
    style M fill:#1f6f4a,stroke:#0d3d28,color:#ffffff
```

## Ciclo de vida de una sesión

```mermaid
stateDiagram-v2
    [*] --> Anonimo
    Anonimo --> Activa: iniciar-sesion
    Activa --> Activa: refrescar<br/>(rota el token)
    Activa --> Expirada: pasa la expiración
    Activa --> Revocada: cambio de contraseña<br/>o revocación explícita
    Expirada --> [*]
    Revocada --> [*]

    note right of Revocada
        Sube auth_version:
        todos los accesos vivos
        dejan de validar
    end note
```

## Dónde vive una regla

El árbol de decisión completo está en [`../arquitectura.md`](../arquitectura.md#dónde-va-una-regla-nueva).
