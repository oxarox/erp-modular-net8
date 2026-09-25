import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { claves } from '@/app/clienteConsultas'
import { Boton } from '@/componentes/Boton'
import { cn } from '@/componentes/cn'
import { AreaTexto, Campo, Casilla, Entrada } from '@/componentes/Formulario'
import { Modal } from '@/componentes/Modal'
import { useNotificaciones } from '@/componentes/Notificaciones'
import { AvisoError } from '@/componentes/Superficie'
import type { RespuestaMarca, SolicitudCrearMarca } from '@/nucleo/api/contratos'
import { api } from '@/nucleo/api/endpoints'
import { CODIGOS_MARCAS, ErrorApi, erroresPorCampo, mensajeParaUsuario } from '@/nucleo/api/errores'
import type { BorradorMarca } from '@/caracteristicas/marcas/validacionMarca'
import { LIMITES_MARCA, mensajesDeFallos, validarMarca } from '@/caracteristicas/marcas/validacionMarca'

/**
 * Alta y edición de marca, en un único formulario.
 *
 * Un solo componente para los dos modos porque el backend también usa un solo
 * juego de reglas: `ValidadorSolicitudCrearMarca` y `ValidadorSolicitudActualizarMarca`
 * son idénticos, y los dos endpoints devuelven el mismo `RespuestaOperacionMarca`.
 * Partirlo en dos pantallas sería duplicar el mismo formulario para cambiar un
 * título y un verbo HTTP.
 *
 * El componente se monta solo cuando hay algo que mostrar —ver `PaginaMarcas`—,
 * así el borrador nace limpio en cada apertura sin un efecto que lo reinicie
 * mirando `abierto`.
 */

export interface PropsFormularioMarca {
  /** Sin marca, el formulario da de alta. Con marca, edita esa. */
  marca?: RespuestaMarca
  alCerrar: () => void
}

export function FormularioMarca({ marca, alCerrar }: PropsFormularioMarca) {
  const idFormulario = useId()
  const clienteConsultas = useQueryClient()
  const { avisarExito } = useNotificaciones()

  // Se fija como constante para poder usarlo dentro de la mutación: TypeScript
  // conserva el estrechamiento de un `const` dentro de una función anidada.
  const marcaId = marca?.id ?? null

  const [borrador, setBorrador] = useState<BorradorMarca>(() => ({
    nombre: marca?.nombre ?? '',
    descripcion: marca?.descripcion ?? '',
    activo: marca?.activo ?? true,
  }))

  // Dos orígenes de error separados, y por una razón: el del servidor juzgó un
  // cuerpo concreto y deja de valer en cuanto ese cuerpo cambia, mientras que el
  // del cliente se recalcula con cada tecla. Mezclarlos en un solo estado hace
  // que un mensaje del servidor sobreviva al dato que lo provocó.
  const [erroresCliente, setErroresCliente] = useState<Record<string, string>>({})
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({})
  const [codigoServidor, setCodigoServidor] = useState<string | null>(null)
  const [errorGeneral, setErrorGeneral] = useState<unknown>(null)
  const [yaSeEnvio, setYaSeEnvio] = useState(false)

  const errores = { ...erroresServidor, ...erroresCliente }

  const guardar = useMutation({
    mutationFn: (solicitud: SolicitudCrearMarca) =>
      marcaId === null ? api.marcas.crear(solicitud) : api.marcas.actualizar(marcaId, solicitud),

    onSuccess: respuesta => {
      // Primero cerrar, después avisar. Un `<dialog>` abierto con `showModal()`
      // se pinta en la capa superior del navegador, por encima de cualquier
      // z-index: el aviso lanzado con el diálogo todavía abierto quedaría detrás
      // del fondo oscurecido y nadie lo vería.
      alCerrar()
      void clienteConsultas.invalidateQueries({ queryKey: claves.marcas.todas() })

      // El texto lo pone el servidor («Marca creada.», «Marca actualizada.»): es
      // el único que sabe qué ocurrió realmente.
      avisarExito(respuesta.mensaje)
    },

    onError: error => {
      if (!(error instanceof ErrorApi)) {
        setErrorGeneral(error)

        return
      }

      // 400: FluentValidation dice qué campo y por qué, campo por campo.
      if (error.esValidacion) {
        setErroresServidor(erroresPorCampo(error))
        setCodigoServidor(error.codigo)

        return
      }

      // 409 `MARCA_003`. El sobre no trae `details.errors` —no salió del
      // validador—, pero el error es del campo Nombre y ahí tiene que aparecer:
      // mostrarlo como aviso general obligaría a adivinar qué hay que corregir.
      //
      // Es la otra mitad del reparto que declara `validacionMarca.ts`: el
      // validador cubre la FORMA de la solicitud y por eso se puede replicar en
      // el navegador; el caso de uso cubre las reglas que necesitan consultar la
      // base —«¿ya existe este nombre en esta empresa?»— y esas no se replican,
      // se manejan cuando llegan.
      if (error.codigo === CODIGOS_MARCAS.duplicado) {
        setErroresServidor({ nombre: mensajeParaUsuario(error) })
        setCodigoServidor(error.codigo)

        return
      }

      setErrorGeneral(error)
    },
  })

  function actualizar(cambios: Partial<BorradorMarca>) {
    const siguiente = { ...borrador, ...cambios }

    setBorrador(siguiente)

    // Lo que dijo el servidor se refería al cuerpo anterior, que ya no existe.
    setErroresServidor({})
    setCodigoServidor(null)
    setErrorGeneral(null)

    // Después de un envío fallido se revalida en vivo: el mensaje desaparece en
    // cuanto el dato queda bien, en lugar de esperar al siguiente intento.
    if (yaSeEnvio) {
      setErroresCliente(mensajesDeFallos(validarMarca(siguiente)))
    }
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setYaSeEnvio(true)

    const mensajes = mensajesDeFallos(validarMarca(borrador))

    setErroresCliente(mensajes)

    if (Object.keys(mensajes).length > 0) {
      return
    }

    setErrorGeneral(null)

    guardar.mutate({
      nombre: borrador.nombre,
      // Una descripción en blanco viaja como `null` y no como cadena vacía: es lo
      // que el caso de uso termina guardando de todas formas.
      descripcion: borrador.descripcion.trim() === '' ? null : borrador.descripcion,
      activo: borrador.activo,
    })
  }

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo={marcaId === null ? 'Nueva marca' : 'Editar marca'}
      descripcion={
        marcaId === null
          ? 'Las marcas agrupan los productos del catálogo.'
          : `Marca #${marcaId} · los productos que ya la usan conservan la referencia.`
      }
      pie={
        <>
          <Boton onClick={alCerrar} disabled={guardar.isPending}>
            Cancelar
          </Boton>
          {/* El botón vive en el pie del diálogo, fuera del <form>; `form` es lo
              que los vuelve a unir sin sacar el envío del formulario. */}
          <Boton tono="primario" type="submit" form={idFormulario} cargando={guardar.isPending}>
            {marcaId === null ? 'Crear marca' : 'Guardar cambios'}
          </Boton>
        </>
      }
    >
      {/* `noValidate`: la validación nativa del navegador mostraría sus propios
          globos, con otro texto y en otro idioma que el catálogo de errores. Una
          sola voz por campo. */}
      <form id={idFormulario} onSubmit={alEnviar} noValidate className="flex flex-col gap-4">
        {errorGeneral !== null && <AvisoError error={errorGeneral} />}

        <div className="flex flex-col gap-1.5">
          <Campo
            etiqueta="Nombre"
            requerido
            error={errores['nombre']}
            ayuda="Debe ser único dentro de la empresa."
          >
            {atributos => (
              <div className="flex flex-col gap-1">
                <Entrada
                  {...atributos}
                  value={borrador.nombre}
                  onChange={evento => actualizar({ nombre: evento.target.value })}
                  // El foco arranca aquí y no en el botón de cerrar, que es el
                  // primer control del diálogo y el que `showModal()` elegiría.
                  autoFocus
                />
                <ContadorCaracteres
                  largo={borrador.nombre.length}
                  maximo={LIMITES_MARCA.nombreMaximo}
                />
              </div>
            )}
          </Campo>

          {codigoServidor === CODIGOS_MARCAS.duplicado && (
            // La clave única no distingue por estado (ver ADR-0007): una marca
            // dada de baja sigue ocupando su nombre. Sin esta línea, el mensaje
            // parece un error del sistema cuando en realidad hay adónde ir.
            <p className="text-[0.8125rem] leading-relaxed text-texto-tenue">
              El nombre se compara contra todas las marcas de la empresa, también
              las inactivas. Si no la ve en la lista, desmarque «Solo activas»
              para encontrarla y reactivarla.
            </p>
          )}
        </div>

        <Campo etiqueta="Descripción" error={errores['descripcion']}>
          {atributos => (
            <div className="flex flex-col gap-1">
              <AreaTexto
                {...atributos}
                value={borrador.descripcion}
                onChange={evento => actualizar({ descripcion: evento.target.value })}
                placeholder="Opcional"
              />
              <ContadorCaracteres
                largo={borrador.descripcion.length}
                maximo={LIMITES_MARCA.descripcionMaxima}
              />
            </div>
          )}
        </Campo>

        <Casilla
          etiqueta="Marca activa"
          descripcion="Las inactivas no se ofrecen al crear productos, pero siguen leyéndose en los documentos que ya las referencian."
          checked={borrador.activo}
          onChange={evento => actualizar({ activo: evento.target.checked })}
        />
      </form>
    </Modal>
  )
}

/** Proporción del límite a partir de la cual el contador empieza a mostrarse. */
const UMBRAL_CONTADOR = 0.8

/**
 * Caracteres restantes.
 *
 * Aparece solo cerca del límite: un contador permanente en un campo de 120
 * caracteres es ruido para los nombres de tres palabras, que son casi todos.
 *
 * El control tampoco lleva `maxLength`, a propósito. Cortar en silencio un texto
 * pegado desde otro lado es peor que decir que sobra: quien pega no se entera de
 * qué se perdió. Se deja escribir de más y se marca, que es además lo que hace
 * el servidor con `MARCA_006`.
 */
function ContadorCaracteres({ largo, maximo }: { largo: number; maximo: number }) {
  if (largo < maximo * UMBRAL_CONTADOR) {
    return null
  }

  const restantes = maximo - largo

  return (
    <span
      className={cn(
        'cifra self-end text-[0.75rem]',
        restantes < 0 ? 'text-peligro' : 'text-texto-tenue',
      )}
    >
      {restantes < 0
        ? `${Math.abs(restantes)} caracteres de más`
        : `Quedan ${restantes} de ${maximo}`}
    </span>
  )
}
