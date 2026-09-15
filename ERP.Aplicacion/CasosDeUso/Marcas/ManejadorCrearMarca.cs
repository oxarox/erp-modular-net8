using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Aplicacion.Abstracciones.Servicios;
using ERP.Aplicacion.Comun.CodigosError;
using ERP.Aplicacion.Comun.Excepciones;
using ERP.Dominio.Entidades;

namespace ERP.Aplicacion.CasosDeUso.Marcas
{
    /// <summary>
    /// Caso de uso: crear una marca.
    /// <para>
    /// Un manejador = un caso de uso. Recibe el <c>empresaId</c> ya resuelto por el controlador,
    /// valida las reglas de negocio, orquesta repositorios y devuelve un record.
    /// No conoce HTTP, ni EF Core, ni el formato del error que verá el cliente.
    /// </para>
    /// </summary>
    public sealed class ManejadorCrearMarca
    {
        private readonly IRepositorioMarca _repositorio;
        private readonly IRegistroLogAcciones _bitacora;

        public ManejadorCrearMarca(IRepositorioMarca repositorio, IRegistroLogAcciones bitacora)
        {
            _repositorio = repositorio;
            _bitacora = bitacora;
        }

        public async Task<ResultadoCrearMarca> ManejarAsync(long empresaId, ComandoCrearMarca comando, CancellationToken ct)
        {
            string nombre = comando.Nombre.Trim();
            string nombreNormalizado = nombre.ToUpperInvariant();

            bool duplicado = await _repositorio.ExisteNombreNormalizadoAsync(empresaId, nombreNormalizado, null, ct);

            if (duplicado)
            {
                throw new ExcepcionConflicto(
                    "Ya existe una marca con el mismo nombre para la empresa.",
                    CodigosErrorMarcas.Duplicado);
            }

            Marca marca = new()
            {
                EmpresaId = empresaId,
                Nombre = nombre,
                Descripcion = string.IsNullOrWhiteSpace(comando.Descripcion) ? null : comando.Descripcion.Trim(),
                Activo = comando.Activo ?? true,
            };

            Marca creada = await _repositorio.CrearAsync(empresaId, marca, ct);

            if (creada.Id <= 0)
            {
                throw new ExcepcionSolicitudInvalida(
                    "No se pudo crear la marca.",
                    CodigosErrorMarcas.CreacionFallida);
            }

            await _bitacora.RegistrarAsync("Marcas", "Crear", nameof(Marca), creada.Id, ct: ct);

            return new ResultadoCrearMarca(true, "Marca creada.", creada.Id);
        }
    }
}
