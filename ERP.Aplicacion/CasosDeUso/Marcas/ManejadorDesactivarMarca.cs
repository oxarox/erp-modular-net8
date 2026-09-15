using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Aplicacion.Abstracciones.Servicios;
using ERP.Aplicacion.Comun.CodigosError;
using ERP.Aplicacion.Comun.Excepciones;
using ERP.Dominio.Entidades;

namespace ERP.Aplicacion.CasosDeUso.Marcas
{
    /// <summary>
    /// Caso de uso: dar de baja una marca. Es baja lógica, nunca DELETE:
    /// hay ventas históricas que siguen apuntando a ella y deben poder leerse.
    /// </summary>
    public sealed class ManejadorDesactivarMarca
    {
        private readonly IRepositorioMarca _repositorio;
        private readonly IRegistroLogAcciones _bitacora;

        public ManejadorDesactivarMarca(IRepositorioMarca repositorio, IRegistroLogAcciones bitacora)
        {
            _repositorio = repositorio;
            _bitacora = bitacora;
        }

        public async Task<ResultadoDesactivarMarca> ManejarAsync(long empresaId, long id, CancellationToken ct)
        {
            Marca existente = await _repositorio.ObtenerPorIdAsync(empresaId, id, ct)
                ?? throw ExcepcionRecursoNoEncontrado.Para("la marca", id, CodigosErrorMarcas.NoEncontrado);

            if (!existente.Activo)
            {
                throw new ExcepcionConflicto(
                    "La marca ya se encuentra inactiva.",
                    CodigosErrorMarcas.EntidadInactiva);
            }

            bool desactivada = await _repositorio.DesactivarAsync(empresaId, id, ct);

            if (!desactivada)
            {
                throw new ExcepcionSolicitudInvalida(
                    "No se pudo desactivar la marca.",
                    CodigosErrorMarcas.DesactivacionFallida);
            }

            await _bitacora.RegistrarAsync("Marcas", "Desactivar", nameof(Marca), id, SeveridadLog.Advertencia, ct: ct);

            return new ResultadoDesactivarMarca(true, "Marca desactivada.", id);
        }
    }
}
