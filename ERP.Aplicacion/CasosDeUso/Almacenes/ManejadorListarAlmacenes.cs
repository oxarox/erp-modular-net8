using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Dominio.Entidades;

namespace ERP.Aplicacion.CasosDeUso.Almacenes
{
    /// <summary>
    /// Listado completo de almacenes de la empresa.
    /// <para>
    /// El orden —predeterminado primero, después alfabético— es parte del contrato del caso de
    /// uso y no una cortesía del repositorio: quien abre el selector espera encontrar
    /// preseleccionada la bodega en la que trabaja todos los días. Se reafirma aquí para que
    /// siga cumpliéndose aunque mañana cambie la implementación de persistencia.
    /// </para>
    /// </summary>
    public sealed class ManejadorListarAlmacenes
    {
        private readonly IRepositorioAlmacen _repositorio;

        public ManejadorListarAlmacenes(IRepositorioAlmacen repositorio)
        {
            _repositorio = repositorio;
        }

        public async Task<IReadOnlyList<ItemAlmacen>> ManejarAsync(long empresaId, bool? soloActivos, CancellationToken ct)
        {
            IReadOnlyList<Almacen> almacenes = await _repositorio.ListarAsync(empresaId, soloActivos, ct);

            return almacenes
                .OrderByDescending(a => a.EsPredeterminado)
                .ThenBy(a => a.Nombre, StringComparer.OrdinalIgnoreCase)
                .Select(Proyectar)
                .ToList();
        }

        internal static ItemAlmacen Proyectar(Almacen almacen) =>
            new(almacen.Id, almacen.Nombre, almacen.Ubicacion, almacen.EsPredeterminado, almacen.Activo);
    }
}
