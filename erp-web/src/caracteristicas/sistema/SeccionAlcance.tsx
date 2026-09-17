import { CabeceraTarjeta, Tarjeta } from '@/componentes/Superficie'
import { ENDPOINTS, FUERA_DE_ALCANCE } from '@/caracteristicas/sistema/catalogos'

/**
 * Qué no hace esta consola.
 *
 * El README del backend dedica una sección entera a esto y la razón es la misma
 * aquí: una pantalla dibujada sobre datos inventados hace ver más grande el
 * repositorio y menos creíble todo lo demás que se muestra en él. Quien revisa
 * este trabajo va a encontrar el límite igual; mejor que lo encuentre escrito.
 */
export function SeccionAlcance() {
  return (
    <Tarjeta>
      <CabeceraTarjeta
        titulo="Lo que no está"
        descripcion="El alcance, dicho antes de que lo descubra quien navega."
      />

      <div className="grid grid-cols-3 divide-x divide-borde border-b border-borde">
        <Cifra valor="31" etiqueta="módulos documentados" />
        <Cifra valor="2" etiqueta="módulos de punta a punta" />
        <Cifra valor={String(ENDPOINTS.length)} etiqueta="endpoints expuestos" />
      </div>

      <ul className="divide-y divide-borde">
        {FUERA_DE_ALCANCE.map(brecha => (
          <li key={brecha.titulo} className="px-4 py-3.5 sm:px-5">
            <p className="text-sm font-medium text-texto">{brecha.titulo}</p>
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-texto-suave">
              {brecha.detalle}
            </p>
          </li>
        ))}
      </ul>

      <div className="border-t border-borde px-4 py-3.5 text-[0.8125rem] leading-relaxed text-texto-suave sm:px-5">
        <p>
          Implementar los otros veintinueve módulos no agregaría nada: todos siguen el mismo patrón
          que Marcas —contrato, validador, manejador, dominio, repositorio y pruebas— y el valor de
          este repositorio está en el patrón, no en repetirlo treinta veces.
        </p>
      </div>
    </Tarjeta>
  )
}

function Cifra({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="px-4 py-4 text-center sm:px-5">
      <p className="cifra text-2xl font-semibold text-texto">{valor}</p>
      <p className="mt-0.5 text-[0.6875rem] leading-snug text-texto-tenue">{etiqueta}</p>
    </div>
  )
}
