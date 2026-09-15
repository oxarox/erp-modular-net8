using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Aplicacion.Abstracciones.Servicios;
using ERP.Aplicacion.Comun.CodigosError;
using ERP.Aplicacion.Comun.Excepciones;
using ERP.Dominio.Entidades;

namespace ERP.Aplicacion.CasosDeUso.Marcas
{
    public sealed class ManejadorActualizarMarca
    {
        private readonly IRepositorioMarca _repositorio;
        private readonly IRegistroLogAcciones _bitacora;

        public ManejadorActualizarMarca(IRepositorioMarca repositorio, IRegistroLogAcciones bitacora)
        {
            _repositorio = repositorio;
            _bitacora = bitacora;
        }

        public async Task<ResultadoActualizarMarca> ManejarAsync(long empresaId, ComandoActualizarMarca comando, CancellationToken ct)
        {
            Marca existente = await _repositorio.ObtenerPorIdAsync(empresaId, comando.Id, ct)
                ?? throw ExcepcionRecursoNoEncontrado.Para("la marca", comando.Id, CodigosErrorMarcas.NoEncontrado);

            string nombre = comando.Nombre.Trim();

            bool duplicado = await _repositorio.ExisteNombreNormalizadoAsync(
                empresaId,
                nombre.ToUpperInvariant(),
                excluirId: comando.Id,
                ct);

            if (duplicado)
            {
                throw new ExcepcionConflicto(
                    "Ya existe otra marca con el mismo nombre para la empresa.",
                    CodigosErrorMarcas.Duplicado);
            }

            Marca actualizada = new()
            {
                Id = existente.Id,
                EmpresaId = empresaId,
                Nombre = nombre,
                Descripcion = string.IsNullOrWhiteSpace(comando.Descripcion) ? null : comando.Descripcion.Trim(),
                Activo = comando.Activo ?? existente.Activo,
            };

            Marca? resultado = await _repositorio.ActualizarAsync(empresaId, actualizada, ct)
                ?? throw new ExcepcionSolicitudInvalida(
                    "No se pudo actualizar la marca.",
                    CodigosErrorMarcas.ActualizacionFallida);

            await _bitacora.RegistrarAsync("Marcas", "Actualizar", nameof(Marca), resultado.Id, ct: ct);

            return new ResultadoActualizarMarca(true, "Marca actualizada.", resultado.Id);
        }
    }
}
