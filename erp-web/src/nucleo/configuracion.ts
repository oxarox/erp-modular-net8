/**
 * Configuración de ejecución, leída una sola vez al arrancar.
 *
 * Todo lo que cambia entre ambientes entra por `import.meta.env` y se normaliza
 * aquí. Ningún otro módulo lee `import.meta.env` directamente: así hay un solo
 * lugar donde mirar cuando algo apunta al servidor equivocado, y los valores por
 * defecto están escritos una vez y no repartidos por la aplicación.
 */

function booleano(valor: string | undefined, porDefecto: boolean): boolean {
  if (valor === undefined || valor.trim() === '') {
    return porDefecto
  }

  return ['1', 'true', 'si', 'sí'].includes(valor.trim().toLowerCase())
}

function numero(valor: string | undefined, porDefecto: number): number {
  const convertido = Number(valor)

  return valor === undefined || valor.trim() === '' || Number.isNaN(convertido)
    ? porDefecto
    : convertido
}

/** Quita la barra final para que `${base}/api/...` nunca produzca `//api`. */
function sinBarraFinal(url: string): string {
  return url.replace(/\/+$/, '')
}

const modoDemo = booleano(import.meta.env['VITE_MODO_DEMO'], false)

export const configuracion = {
  /**
   * Origen de la API. En desarrollo apunta al perfil `http` de launchSettings.json
   * (puerto 5080), que es el origen que docker-compose.yml autoriza por CORS.
   */
  urlApi: sinBarraFinal(import.meta.env['VITE_API_URL'] ?? 'http://localhost:5080'),

  /**
   * Modo demo: los doce endpoints los responde un Service Worker (MSW) con datos
   * equivalentes a la semilla de desarrollo, sin API ni SQL Server detrás.
   * Es lo que permite publicar la consola y que alguien la recorra desde un enlace.
   */
  modoDemo,

  /**
   * Parámetros tributarios. **Son un espejo de la sección `Ventas` del backend**
   * (`appsettings.json`), y existen solo para previsualizar los totales mientras
   * se arma la venta. El total que vale es el que devuelve el servidor: el
   * cálculo autoritativo vive en `CalculadoraTotalesVenta` del dominio, no aquí.
   * Ver docs/decisiones/ADR-0005-totales-de-venta.md.
   */
  impuesto: {
    tasa: numero(import.meta.env['VITE_TASA_IMPUESTO'], 0.19),
    precioIncluyeImpuesto: booleano(import.meta.env['VITE_PRECIO_INCLUYE_IMPUESTO'], false),
  },

  /** Se muestra en la pantalla de sesión para no dejar a nadie adivinando en la demo. */
  credencialesDemo: [
    { correo: 'admin@norte.cl', contrasena: 'Demo.1234', empresa: 'Comercial Norte' },
    { correo: 'admin@sur.cl', contrasena: 'Demo.1234', empresa: 'Distribuidora Sur' },
  ],
} as const

export type Configuracion = typeof configuracion
