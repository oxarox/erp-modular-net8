using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Aplicacion.Comun.CodigosError;
using ERP.Aplicacion.Comun.Excepciones;
using ERP.Dominio.Entidades;

namespace ERP.Aplicacion.CasosDeUso.Marcas
{
    public sealed class ManejadorObtenerMarca
    {
        private readonly IRepositorioMarca _repositorio;

        public ManejadorObtenerMarca(IRepositorioMarca repositorio)
        {
            _repositorio = repositorio;
        }

        public async Task<ResultadoMarca> ManejarAsync(long empresaId, long id, CancellationToken ct)
        {
            Marca marca = await _repositorio.ObtenerPorIdAsync(empresaId, id, ct)
                ?? throw ExcepcionRecursoNoEncontrado.Para("la marca", id, CodigosErrorMarcas.NoEncontrado);

            return new ResultadoMarca(ManejadorBuscarMarcas.Proyectar(marca));
        }
    }
}
