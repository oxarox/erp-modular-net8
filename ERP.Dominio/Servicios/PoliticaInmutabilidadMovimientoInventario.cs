using ERP.Dominio.Entidades;

namespace ERP.Dominio.Servicios
{
    /// <summary>
    /// Regla de dominio: un movimiento de inventario es inmutable una vez registrado.
    /// Corregir stock significa registrar un movimiento de ajuste, nunca editar o borrar el anterior.
    /// Vive en el dominio (y no en el repositorio) porque es una regla de negocio, no de persistencia:
    /// debe valer igual si mañana cambia el motor de base de datos.
    /// </summary>
    public static class PoliticaInmutabilidadMovimientoInventario
    {
        public static void AsegurarQuePuedeRegistrarse(MovimientoInventario movimiento)
        {
            ArgumentNullException.ThrowIfNull(movimiento);

            if (movimiento.Id != 0)
            {
                throw new InvalidOperationException(
                    "Un movimiento de inventario ya registrado no puede modificarse: registre un movimiento de ajuste.");
            }

            if (movimiento.Cantidad <= 0m)
            {
                throw new InvalidOperationException(
                    "La cantidad de un movimiento debe ser mayor a cero; el sentido lo define el tipo de movimiento.");
            }
        }
    }
}
