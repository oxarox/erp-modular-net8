using ERP.Aplicacion.Abstracciones.Consultas;
using ERP.Aplicacion.Abstracciones.Contexto;
using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Aplicacion.Abstracciones.Servicios;
using ERP.Aplicacion.Comun.Opciones;
using ERP.Dominio.Servicios;
using ERP.Infraestructura.Contexto;
using ERP.Infraestructura.Repositorios;
using ERP.Infraestructura.Seguridad;
using ERP.Infraestructura.Servicios;
using ERP.Infraestructura.ServiciosDominio;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace ERP.Infraestructura.InyeccionDependencias
{
    /// <summary>
    /// Registro de la capa de infraestructura: es el único archivo del sistema que conoce
    /// a la vez las abstracciones y sus implementaciones concretas.
    /// </summary>
    public static class RegistroInfraestructura
    {
        public static IServiceCollection AgregarInfraestructura(
            this IServiceCollection servicios,
            IConfiguration configuracion,
            IHostEnvironment entorno)
        {
            ValidarConfiguracionCritica(configuracion, entorno);

            servicios.Configure<OpcionesJwt>(configuracion.GetSection(OpcionesJwt.Seccion));
            servicios.Configure<OpcionesVentas>(configuracion.GetSection(OpcionesVentas.Seccion));

            servicios.AddHttpContextAccessor();

            servicios.AddDbContext<ContextoErp>((proveedor, opciones) =>
            {
                string? cadena = configuracion.GetConnectionString("DefaultConnection");

                if (string.IsNullOrWhiteSpace(cadena))
                {
                    throw new InvalidOperationException(
                        "Falta ConnectionStrings:DefaultConnection. Defínala por variable de entorno ConnectionStrings__DefaultConnection.");
                }

                opciones.UseSqlServer(cadena, sql =>
                {
                    // Reintentos ante fallos transitorios de red o failover del servidor.
                    sql.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null);
                });

                if (entorno.IsDevelopment())
                {
                    opciones.EnableDetailedErrors();
                    opciones.EnableSensitiveDataLogging();
                }
            });

            // Contexto del request
            servicios.AddScoped<IProveedorContextoEmpresa, ProveedorContextoEmpresaHttp>();
            servicios.AddScoped<IProveedorContextoUsuario, ProveedorContextoUsuarioHttp>();
            servicios.AddSingleton<IRelojSistema, RelojSistema>();

            // Persistencia
            servicios.AddScoped<IUnidadDeTrabajo, UnidadDeTrabajoEfCore>();
            servicios.AddScoped<IRepositorioMarca, RepositorioMarcaEfCore>();
            servicios.AddScoped<IRepositorioProducto, RepositorioProductoEfCore>();
            servicios.AddScoped<IRepositorioAlmacen, RepositorioAlmacenEfCore>();
            servicios.AddScoped<IRepositorioVenta, RepositorioVentaEfCore>();
            servicios.AddScoped<IRepositorioUsuario, RepositorioUsuarioEfCore>();
            servicios.AddScoped<IRepositorioSesionUsuario, RepositorioSesionUsuarioEfCore>();

            // Read models
            servicios.AddScoped<IConsultaVentasReporte, ConsultaVentasReporteEfCore>();
            servicios.AddScoped<IConsultaCatalogoProductos, ConsultaCatalogoProductosEfCore>();

            // Servicios de dominio que necesitan persistencia
            servicios.AddScoped<IServicioStockProducto, ServicioStockProducto>();

            // Seguridad y transversales
            servicios.AddSingleton<IServicioHashContrasenas, ServicioHashContrasenasBCrypt>();
            servicios.AddScoped<IServicioTokens, ServicioTokensJwt>();
            servicios.AddScoped<IRegistroLogAcciones, RegistroLogAccionesEfCore>();

            return servicios;
        }

        /// <summary>
        /// Fail-fast de arranque: si falta un secreto o queda encendido un interruptor de
        /// desarrollo, la aplicación no levanta. Es preferible un contenedor que no arranca
        /// a uno que arranca inseguro y nadie se entera hasta el incidente.
        /// </summary>
        private static void ValidarConfiguracionCritica(IConfiguration configuracion, IHostEnvironment entorno)
        {
            OpcionesJwt jwt = new();
            configuracion.GetSection(OpcionesJwt.Seccion).Bind(jwt);
            jwt.Validar();

            if (entorno.IsDevelopment())
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(configuracion.GetConnectionString("DefaultConnection")))
            {
                throw new InvalidOperationException(
                    "En entornos no productivos de desarrollo la cadena de conexión debe venir del entorno, no del appsettings.");
            }

            bool simuladosEncendidos = configuracion
                .GetSection("Infraestructura")
                .GetChildren()
                .Any(seccion => seccion.Key.StartsWith("Usar", StringComparison.OrdinalIgnoreCase)
                    && bool.TryParse(seccion.Value, out bool activo)
                    && activo);

            if (simuladosEncendidos)
            {
                throw new InvalidOperationException(
                    "Hay repositorios simulados habilitados fuera de desarrollo. Revise la sección Infraestructura.");
            }
        }
    }
}
