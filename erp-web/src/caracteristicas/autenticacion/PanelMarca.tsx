import { cn } from '@/componentes/cn'
import { IconoCheque } from '@/componentes/Iconos'

/**
 * Portada de la pantalla de sesión.
 *
 * El degradado se arma con peldaños fijos de la rampa (`--marca-700/900/950`) y
 * no con el token semántico `bg-marca`, que en tema oscuro se aclara hasta
 * `--marca-500`: el texto blanco encima quedaría cerca de 2.5:1, por debajo de
 * lo legible. Anclarlo al extremo oscuro de la rampa lo mantiene sobre 8:1 en
 * los dos temas y, de paso, hace que la portada se vea igual en ambos —que es
 * lo que se espera de una portada, a diferencia del resto de la consola.
 *
 * Se oculta bajo `lg`: en un teléfono, empujar el formulario media pantalla
 * hacia abajo para contar de qué va el proyecto es cobrarle al usuario el
 * argumento de venta.
 */

/** Lo que este repositorio pretende demostrar, en cuatro líneas. */
const PUNTOS = [
  {
    titulo: 'Multiempresa por filtro global',
    detalle:
      'Cada consulta se acota a la empresa del token en el propio DbContext. Ningún repositorio escribe ese WHERE, así que ninguno puede olvidarlo.',
  },
  {
    titulo: 'Permisos firmados en el token',
    detalle:
      'La navegación se dibuja con los permisos que trae el JWT, y el servidor vuelve a exigirlos en cada endpoint: la interfaz es cortesía, no control de acceso.',
  },
  {
    titulo: 'Un solo sobre de error',
    detalle:
      'Todo fallo llega con familia, código de catálogo y traceId. El cliente reacciona al código; reformular un mensaje en español no rompe una pantalla.',
  },
  {
    titulo: 'Totales calculados en el dominio',
    detalle:
      'La pantalla de venta previsualiza el total mientras se arma; el número que se guarda lo calcula el servidor.',
  },
] as const

export function PanelMarca() {
  return (
    <aside
      className={cn(
        'relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex xl:p-14',
        'bg-[image:linear-gradient(155deg,var(--marca-700)_0%,var(--marca-900)_55%,var(--marca-950)_100%)]',
      )}
    >
      <div
        className="pointer-events-none absolute -top-32 -right-24 size-[30rem] rounded-full bg-[image:radial-gradient(circle,var(--marca-500),transparent_62%)] opacity-30"
        aria-hidden="true"
      />

      <div className="relative flex items-center gap-3">
        <MarcaErp className="size-9 rounded-[0.6rem]" fondoClase="bg-[var(--marca-600)]" />
        <div className="leading-tight">
          <p className="font-semibold">ERP Modular</p>
          <p className="text-[0.8125rem] opacity-75">Consola multiempresa</p>
        </div>
      </div>

      <div className="relative max-w-lg">
        <h2 className="text-3xl leading-tight font-semibold tracking-tight xl:text-4xl">
          Un ERP pequeño, construido con las decisiones de uno grande.
        </h2>
        <p className="mt-4 leading-relaxed opacity-85">
          Consola en React sobre una API REST en .NET 8 escrita en español, con arquitectura por
          capas y el dominio aislado de la infraestructura.
        </p>

        <ul className="mt-9 flex flex-col gap-5">
          {PUNTOS.map(punto => (
            <li key={punto.titulo} className="flex gap-3">
              <span
                className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[var(--marca-700)]"
                aria-hidden="true"
              >
                <IconoCheque className="size-3.5" />
              </span>
              <div>
                <p className="text-[0.9375rem] font-medium">{punto.titulo}</p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed opacity-75">{punto.detalle}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative font-mono text-[0.6875rem] tracking-wide opacity-60">
        .NET 8 · EF Core · React 19 · TypeScript estricto
      </p>
    </aside>
  )
}

/**
 * Logotipo.
 *
 * Es una copia del que dibuja `app/Disposicion.tsx`, que no lo exporta. La
 * duplicación es deliberada y acotada: la alternativa era editar un archivo
 * fuera de esta característica. Si se extrae a `componentes/`, esta copia se va.
 *
 * El fondo llega por prop y no por `className` porque dos utilidades de
 * `background-color` en el mismo elemento las resuelve el orden del CSS, no el
 * de la cadena de clases: sobre la portada hace falta un verde fijo, y en el
 * encabezado móvil el token que sigue al tema.
 */
export function MarcaErp({
  className,
  fondoClase = 'bg-marca',
}: {
  className?: string
  fondoClase?: string
}) {
  return (
    <span
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-[0.55rem] text-white',
        fondoClase,
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 32 32"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      >
        <path d="M9 10h14M9 16h9M9 22h5" />
        <circle cx="22.5" cy="21.5" r="3.2" strokeWidth="2.2" />
      </svg>
    </span>
  )
}
