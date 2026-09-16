import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Campo, Entrada } from '@/componentes/Formulario'

/**
 * Pruebas del envoltorio de campo.
 *
 * `Campo` existe para que ninguna pantalla pueda olvidarse de describir su
 * error: genera el `id`, lo enlaza con la etiqueta y entrega `aria-describedby`
 * y `aria-invalid` por una función de render, de modo que la única forma de
 * escribir el control es recibiendo esos atributos.
 *
 * Estas pruebas fijan ese contrato. Si alguien "simplifica" el componente y deja
 * de emitir el enlace, la suite lo dice antes que un usuario con lector de
 * pantalla.
 */
describe('Campo', () => {
  it('enlaza la etiqueta con el control', () => {
    render(
      <Campo etiqueta="Nombre">{atributos => <Entrada {...atributos} defaultValue="Acme" />}</Campo>,
    )

    // getByLabelText solo encuentra el input si la asociación existe de verdad.
    expect(screen.getByLabelText('Nombre')).toHaveValue('Acme')
  })

  it('marca el control como inválido y lo enlaza con el mensaje de error', () => {
    render(
      <Campo etiqueta="Nombre" error="El nombre es obligatorio.">
        {atributos => <Entrada {...atributos} />}
      </Campo>,
    )

    const control = screen.getByLabelText(/Nombre/)
    const error = screen.getByRole('alert')

    expect(control).toHaveAttribute('aria-invalid', 'true')
    expect(control).toHaveAccessibleDescription('El nombre es obligatorio.')
    expect(error).toHaveTextContent('El nombre es obligatorio.')
  })

  it('no deja aria-describedby colgando cuando no hay error ni ayuda', () => {
    // Un `aria-describedby` que apunta a un id inexistente hace que el lector de
    // pantalla anuncie el campo sin descripción y ensucia el árbol.
    render(<Campo etiqueta="Nombre">{atributos => <Entrada {...atributos} />}</Campo>)

    expect(screen.getByLabelText('Nombre')).not.toHaveAttribute('aria-describedby')
  })

  it('el error reemplaza a la ayuda en vez de competir con ella', () => {
    render(
      <Campo etiqueta="Nombre" ayuda="Entre 2 y 120 caracteres." error="Mínimo 2 caracteres.">
        {atributos => <Entrada {...atributos} />}
      </Campo>,
    )

    expect(screen.queryByText('Entre 2 y 120 caracteres.')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre/)).toHaveAccessibleDescription('Mínimo 2 caracteres.')
  })

  it('mantiene la etiqueta accesible aunque esté oculta visualmente', () => {
    // El buscador de una tabla no muestra su etiqueta, pero quien navega sin ver
    // la pantalla necesita saber qué es ese campo.
    render(
      <Campo etiqueta="Buscar marcas" etiquetaOculta>
        {atributos => <Entrada {...atributos} placeholder="Buscar…" />}
      </Campo>,
    )

    expect(screen.getByLabelText('Buscar marcas')).toBeInTheDocument()
  })

  it('genera identificadores distintos para cada instancia', () => {
    // Dos campos con el mismo id harían que hacer clic en una etiqueta enfocara
    // el control equivocado.
    render(
      <>
        <Campo etiqueta="Desde">{atributos => <Entrada {...atributos} type="date" />}</Campo>
        <Campo etiqueta="Hasta">{atributos => <Entrada {...atributos} type="date" />}</Campo>
      </>,
    )

    expect(screen.getByLabelText('Desde').id).not.toBe(screen.getByLabelText('Hasta').id)
  })
})
