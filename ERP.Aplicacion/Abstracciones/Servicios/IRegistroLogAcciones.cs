using ERP.Dominio.Entidades;

namespace ERP.Aplicacion.Abstracciones.Servicios
{
    /// <summary>
    /// Bitácora de negocio. Es un servicio y no un repositorio porque el registro nunca
    /// debe hacer fallar la operación que lo origina: si la escritura del log falla, se traga el error
    /// y se reporta por el logger técnico.
    /// </summary>
    public interface IRegistroLogAcciones
    {
        Task RegistrarAsync(
            string modulo,
            string accion,
            string? entidadTipo = null,
            long? entidadId = null,
            SeveridadLog severidad = SeveridadLog.Informativa,
            string? detalle = null,
            CancellationToken ct = default);
    }
}
