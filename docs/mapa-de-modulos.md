# Mapa de módulos

Inventario de los 31 módulos funcionales del sistema completo, con el prefijo de código de
error reservado para cada uno. Los marcados con ✅ están implementados en este repositorio; el
resto está aquí para dimensionar el alcance real y para que los prefijos no se reutilicen.

Todos siguen exactamente el mismo patrón que Marcas: contrato → validador → manejador →
dominio → repositorio → pruebas.

## Seguridad y acceso

| Módulo | Prefijo | Qué resuelve | |
|---|---|---|---|
| Autenticación | `AUTH` | Login, refresco de sesión con rotación, cierre de sesión | ✅ |
| Usuarios | `USR` | Alta, edición y baja de usuarios de la empresa | |
| RBAC | `RBAC` | Roles, permisos y su asignación | ✅ parcial |
| Cuenta | `CTA` | Perfil propio, cambio de contraseña, recuperación | |
| Preferencias | `PREF` | Preferencias de interfaz por usuario | |
| Módulos | `MOD` | Qué módulos tiene habilitados cada empresa | |
| Onboarding | `ONB` | Alta guiada de una empresa nueva y su primer usuario | |

## Catálogo

| Módulo | Prefijo | Qué resuelve | |
|---|---|---|---|
| Marcas | `MARCA` | Catálogo de marcas | ✅ |
| Categorías | `CAT` | Árbol de categorías de producto | |
| Productos | `PROD` | Ficha de producto: SKU, precios, costos, relaciones | ✅ parcial |
| Descuentos | `DESC` | Descuentos por producto, categoría o cliente | |
| Promociones | `PROM` | Promociones con vigencia y condiciones de aplicación | |

## Inventario

| Módulo | Prefijo | Qué resuelve | |
|---|---|---|---|
| Almacenes | `ALMA` | Bodegas y puntos de almacenamiento | ✅ parcial |
| Lugares | `LUG` | Ubicaciones físicas dentro de un almacén | |
| Lotes | `LOTE` | Trazabilidad por lote y vencimiento | |
| Movimientos de inventario | `INV` | Ingresos, egresos y ajustes como asientos inmutables | ✅ parcial |
| Movimientos entre almacenes | `MOV` | Traslados con origen, destino y estado en tránsito | |
| Solicitudes | `SOL` | Pedidos internos entre lugares, con flujo de aprobación | |

## Comercial

| Módulo | Prefijo | Qué resuelve | |
|---|---|---|---|
| Ventas | `VENTA` | Registro y anulación de ventas, con descuento de inventario | ✅ |
| Clientes | `CLI` | Cartera de clientes y sus datos tributarios | ✅ parcial |
| Caja | `CAJA` | Apertura, cierre y arqueo de cajas; multi-caja por lugar | |
| Punto de venta | `POS` | Flujo de mostrador: carrito, cobro, comprobante | |
| Compras | `COMP` | Órdenes de compra e ingreso de mercadería | |
| Proveedores | `PROV` | Proveedores y su catálogo de artículos | |

## Administración y análisis

| Módulo | Prefijo | Qué resuelve | |
|---|---|---|---|
| Empresa | `EMP` | Datos de la empresa y su configuración | ✅ parcial |
| Dashboards | `DASH` | Indicadores de la operación del día | |
| Reportes | `REP` | Reportes agregados con exportación | ✅ parcial |
| Auditoría | `AUDI` | Historial de cambios campo a campo sobre entidades sensibles | |
| Log de acciones | `LOG` | Bitácora de negocio: quién hizo qué y cuándo | ✅ |
| Configuración de dispositivos | `DISP` | Impresoras, lectores y periféricos por punto de venta | |

## SaaS

| Módulo | Prefijo | Qué resuelve | |
|---|---|---|---|
| Suscripciones | `SUSC` | Plan, estado y vigencia de la suscripción de cada empresa | |
| Pago automático | `PAGO` | Cobro recurrente con pasarela y mandato | |
| Webhooks de pasarela | `WHK` | Recepción y conciliación de eventos de pago | |

---

## Por qué no están todos implementados aquí

Implementar los 31 módulos en este repositorio no agregaría información: todos siguen la misma
plantilla, y ya está escrita dos veces —una simple (Marcas) y una compleja (Ventas)— con sus
pruebas. Repetirla veintinueve veces más solo haría el repositorio más largo de leer, que es
justo lo contrario de lo que debe ser un proyecto de portafolio.

Lo que sí importa y sí está: la estructura que hace que el módulo número treinta se escriba
igual que el primero.
