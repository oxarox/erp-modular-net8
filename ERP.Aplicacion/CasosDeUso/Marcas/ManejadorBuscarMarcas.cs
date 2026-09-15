using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Aplicacion.Comun.Paginacion;
using ERP.Dominio.Entidades;

namespace ERP.Aplicacion.CasosDeUso.Marcas
{
    public sealed class ManejadorBuscarMarcas
    {
        private readonly IRepositorioMarca _repositorio;

        public ManejadorBuscarMarcas(IRepositorioMarca repositorio)
        {
            _repositorio = repositorio;
        }

        public async Task<ResultadoPaginado<ItemMarca>> ManejarAsync(long empresaId, ConsultaBuscarMarcas consulta, CancellationToken ct)
        {
            SolicitudPaginada paginacion = SolicitudPaginada.Normalizar(consulta.Pagina, consulta.TamanoPagina);

            IReadOnlyList<Marca> encontradas = await _repositorio.BuscarAsync(
                empresaId,
                string.IsNullOrWhiteSpace(consulta.Criterio) ? null : consulta.Criterio.Trim(),
                consulta.SoloActivas,
                ct);

            IReadOnlyList<ItemMarca> pagina = encontradas
                .OrderBy(m => m.Nombre, StringComparer.OrdinalIgnoreCase)
                .Skip(paginacion.Saltar())
                .Take(paginacion.TamanoPagina)
                .Select(Proyectar)
                .ToList();

            return new ResultadoPaginado<ItemMarca>(paginacion.Pagina, paginacion.TamanoPagina, encontradas.Count, pagina);
        }

        internal static ItemMarca Proyectar(Marca marca) =>
            new(marca.Id, marca.Nombre, marca.Descripcion, marca.Activo);
    }
}
