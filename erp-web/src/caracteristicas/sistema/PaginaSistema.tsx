import { EncabezadoPagina, Pila } from '@/componentes/Superficie'
import { SeccionAlcance } from '@/caracteristicas/sistema/SeccionAlcance'
import { SeccionEndpoints } from '@/caracteristicas/sistema/SeccionEndpoints'
import { SeccionEstadoApi } from '@/caracteristicas/sistema/SeccionEstadoApi'
import { SeccionPermisos } from '@/caracteristicas/sistema/SeccionPermisos'
import { SeccionSesion } from '@/caracteristicas/sistema/SeccionSesion'
import { SeccionSobreDeError } from '@/caracteristicas/sistema/SeccionSobreDeError'

/**
 * Ficha técnica de la consola.
 *
 * Es la única pantalla que no sirve para operar el ERP: sirve para entenderlo.
 * Quien abra este repositorio desde un portafolio va a querer saber qué hay
 * detrás de la interfaz —qué API, qué sesión, qué permisos, qué contrato de
 * errores y hasta dónde llega el alcance—, y esa respuesta está mejor en una
 * pantalla que se puede recorrer que en un README que hay que creer.
 *
 * El orden de las secciones es deliberado: va de lo que se puede comprobar
 * ahora mismo —la API responde, esta sesión tiene estos permisos— a lo que hay
 * que explicar —el contrato de errores, lo que falta—. Primero la evidencia,
 * después el relato.
 *
 * Las tres primeras secciones leen datos vivos; las tres últimas transcriben la
 * documentación del backend (ver `catalogos.ts`). La única excepción es la sonda
 * de error, que es dato vivo dentro de una sección explicativa, y es a propósito:
 * un contrato mostrado funcionando convence más que uno descrito.
 *
 * Es también la única pantalla sin permiso asociado. Cualquier sesión válida
 * puede verla, porque no muestra datos de la empresa: muestra cómo está hecho el
 * sistema.
 */
export default function PaginaSistema() {
  return (
    <Pila>
      <EncabezadoPagina
        titulo="Estado y arquitectura"
        descripcion="Qué está viendo y cómo está construido: la API que responde, la sesión que lo autoriza, el contrato que comparten y el alcance real de este repositorio."
      />

      <SeccionEstadoApi />
      <SeccionSesion />
      <SeccionPermisos />
      <SeccionEndpoints />
      <SeccionSobreDeError />
      <SeccionAlcance />
    </Pila>
  )
}
