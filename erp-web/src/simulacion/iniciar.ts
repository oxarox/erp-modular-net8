import { setupWorker } from 'msw/browser'
import { manejadores } from '@/simulacion/manejadores'

/**
 * Arranque del modo demo.
 *
 * `main.tsx` importa este módulo de forma dinámica y espera a que termine antes
 * de montar React. El orden importa: si React montara primero, las primeras
 * consultas del tablero saldrían hacia una API que no existe y la pantalla
 * arrancaría con un error de red en vez de con datos.
 *
 * Todo lo que hay debajo —los doce endpoints, el sobre de error, los permisos y
 * el aislamiento multiempresa— vive en `manejadores.ts`. Aquí solo se registra
 * el Service Worker.
 */

/**
 * Ruta del worker, respetando la base de despliegue.
 *
 * La demo se publica en GitHub Pages bajo una subruta
 * (`usuario.github.io/erp-modular-net8/`), y `vite.config.ts` traslada esa
 * subruta a `import.meta.env.BASE_URL`. Un `/mockServiceWorker.js` absoluto
 * daría 404 allí y la demo arrancaría sin simulador: todas las peticiones
 * saldrían a la red y la pantalla se llenaría de errores. Como Vite garantiza
 * que la base empieza y termina en barra, basta con concatenar, pero se
 * normaliza igual para no depender de esa garantía.
 */
function rutaDelTrabajador(): string {
  const base = import.meta.env.BASE_URL

  return `${base.endsWith('/') ? base : `${base}/`}mockServiceWorker.js`
}

export async function iniciarSimulacion(): Promise<void> {
  const trabajador = setupWorker(...manejadores)

  await trabajador.start({
    // Lo que no coincide con ningún manejador pasa de largo y en silencio: los
    // módulos de Vite, las fuentes y el propio favicon son peticiones legítimas
    // que no tiene sentido advertir en consola una por una.
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: rutaDelTrabajador() },
  })
}
