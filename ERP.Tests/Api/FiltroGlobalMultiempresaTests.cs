using ERP.Aplicacion.Abstracciones.Contexto;
using ERP.Dominio.Entidades;
using ERP.Infraestructura.Contexto;
using ERP.Tests.Comun;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace ERP.Tests.Api
{
    /// <summary>
    /// Prueba de la barrera multiempresa contra un contexto real (proveedor en memoria).
    /// <para>
    /// Es la prueba más importante de todo el repositorio: verifica que una consulta escrita
    /// SIN filtro de empresa —el error que cualquiera comete al agregar el módulo número 34—
    /// sigue sin poder ver datos de otro tenant.
    /// </para>
    /// </summary>
    public class FiltroGlobalMultiempresaTests
    {
        [Fact]
        public async Task ConsultaSinFiltroExplicito_SoloDevuelveDatosDeLaEmpresaDelToken()
        {
            await using ContextoErp contexto = CrearContexto(ConstructorDeDatos.EmpresaId);

            contexto.Marcas.AddRange(
                new Marca { EmpresaId = ConstructorDeDatos.EmpresaId, Nombre = "Propia" },
                new Marca { EmpresaId = ConstructorDeDatos.OtraEmpresaId, Nombre = "Ajena" });

            await contexto.SaveChangesAsync();

            // Nótese que NO hay Where por EmpresaId: lo aplica el filtro global del contexto.
            List<Marca> visibles = await contexto.Marcas.ToListAsync();

            visibles.Should().ContainSingle();
            visibles[0].Nombre.Should().Be("Propia");
        }

        [Fact]
        public async Task ConsultaDesdeOtraEmpresa_NoVeLosDatosDeLaPrimera()
        {
            string baseDeDatos = Guid.NewGuid().ToString();

            await using (ContextoErp siembra = CrearContexto(ConstructorDeDatos.EmpresaId, baseDeDatos))
            {
                siembra.Marcas.Add(new Marca { EmpresaId = ConstructorDeDatos.EmpresaId, Nombre = "Propia" });
                await siembra.SaveChangesAsync();
            }

            await using ContextoErp otraEmpresa = CrearContexto(ConstructorDeDatos.OtraEmpresaId, baseDeDatos);

            (await otraEmpresa.Marcas.ToListAsync()).Should().BeEmpty();
            (await otraEmpresa.Marcas.FindAsync(1L)).Should().BeNull();
        }

        [Fact]
        public async Task SinContextoAutenticado_ElFiltroNoRecorta()
        {
            // Escenario de arranque y migraciones: no hay token, así que no hay empresa.
            // El filtro se desactiva y el aislamiento queda a cargo del empresaId explícito
            // que exige cada repositorio.
            await using ContextoErp contexto = CrearContexto(empresaId: 0L);

            contexto.Marcas.AddRange(
                new Marca { EmpresaId = 1L, Nombre = "Una" },
                new Marca { EmpresaId = 2L, Nombre = "Otra" });

            await contexto.SaveChangesAsync();

            (await contexto.Marcas.CountAsync()).Should().Be(2);
        }

        private static ContextoErp CrearContexto(long empresaId, string? baseDeDatos = null)
        {
            DbContextOptions<ContextoErp> opciones = new DbContextOptionsBuilder<ContextoErp>()
                .UseInMemoryDatabase(baseDeDatos ?? Guid.NewGuid().ToString())
                .Options;

            return new ContextoErp(opciones, new ContextoEmpresaFijo(empresaId));
        }

        private sealed class ContextoEmpresaFijo : IProveedorContextoEmpresa
        {
            private readonly long _empresaId;

            public ContextoEmpresaFijo(long empresaId)
            {
                _empresaId = empresaId;
            }

            public long ObtenerEmpresaIdActual() => _empresaId;
        }
    }
}
