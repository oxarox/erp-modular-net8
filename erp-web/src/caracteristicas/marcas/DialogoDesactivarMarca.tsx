import { useMutation, useQueryClient } from '@tanstack/react-query'
import { claves } from '@/app/clienteConsultas'
import { ModalConfirmacion } from '@/componentes/Modal'
import { useNotificaciones } from '@/componentes/Notificaciones'
import type { RespuestaMarca } from '@/nucleo/api/contratos'
import { api } from '@/nucleo/api/endpoints'
import { CODIGOS_MARCAS, ErrorApi } from '@/nucleo/api/errores'

/**
 * Confirmación de la baja de una marca.
 *
 * El texto explica lo que realmente ocurre —y sobre todo lo que no ocurre—
 * porque «desactivar» se lee como «borrar» y no lo es: la fila sigue en la base,
 * las ventas y los productos que la referencian se siguen leyendo igual, y la
 * operación se deshace desde «Editar». Por eso el botón que abre este diálogo
 * lleva un icono de apagado y no una papelera.
 *
 * Ver docs/decisiones/ADR-0007-baja-logica.md.
 */

export interface PropsDialogoDesactivarMarca {
  marca: RespuestaMarca
  alCerrar: () => void
}

export function DialogoDesactivarMarca({ marca, alCerrar }: PropsDialogoDesactivarMarca) {
  const clienteConsultas = useQueryClient()
  const { avisarExito, avisarError } = useNotificaciones()

  const desactivar = useMutation({
    mutationFn: () => api.marcas.desactivar(marca.id),

    onSuccess: respuesta => {
      // Cerrar antes de avisar: el diálogo se pinta en la capa superior del
      // navegador y taparía el aviso. Ver la misma nota en `FormularioMarca`.
      alCerrar()
      void clienteConsultas.invalidateQueries({ queryKey: claves.marcas.todas() })
      avisarExito(respuesta.mensaje)
    },

    onError: error => {
      // `MARCA_010`: la marca ya estaba inactiva, casi siempre porque otra
      // persona la dio de baja mientras esta tabla mostraba un estado viejo. El
      // aviso explica el rechazo, pero además hay que refrescar la lista: si no,
      // sigue ofreciendo una acción que ya no tiene sentido.
      if (error instanceof ErrorApi && error.codigo === CODIGOS_MARCAS.entidadInactiva) {
        void clienteConsultas.invalidateQueries({ queryKey: claves.marcas.todas() })
      }

      alCerrar()
      avisarError(error)
    },
  })

  return (
    <ModalConfirmacion
      abierto
      alCerrar={alCerrar}
      alConfirmar={() => desactivar.mutate()}
      titulo={`Desactivar «${marca.nombre}»`}
      tono="peligro"
      textoConfirmar="Desactivar"
      cargando={desactivar.isPending}
      mensaje={
        <>
          Es una <strong className="font-medium text-texto">baja lógica</strong>: la marca deja de
          estar disponible para asignarla a productos nuevos, pero no se borra. Los documentos
          históricos que la referencian —ventas, productos del catálogo— se siguen leyendo igual
          que hoy, y puede volver a activarla desde «Editar».
          <span className="mt-3 block font-mono text-[0.6875rem] text-texto-tenue">
            docs/decisiones/ADR-0007-baja-logica.md
          </span>
        </>
      }
    />
  )
}
