using ERP.Aplicacion.CasosDeUso.Autenticacion;
using ERP.Aplicacion.CasosDeUso.Marcas;
using ERP.Aplicacion.CasosDeUso.Ventas;
using Microsoft.Extensions.DependencyInjection;

namespace ERP.Aplicacion.InyeccionDependencias
{
    /// <summary>
    /// Registro de la capa de aplicación.
    /// Cada capa expone UN método de extensión y se registra a sí misma: el Program.cs no conoce
    /// los tipos internos de ninguna capa, solo llama a AgregarAplicacion / AgregarInfraestructura.
    /// Agregar un caso de uso nuevo toca este archivo y ninguno más del arranque.
    /// </summary>
    public static class RegistroAplicacion
    {
        public static IServiceCollection AgregarAplicacion(this IServiceCollection servicios)
        {
            // Marcas
            servicios.AddScoped<ManejadorCrearMarca>();
            servicios.AddScoped<ManejadorActualizarMarca>();
            servicios.AddScoped<ManejadorBuscarMarcas>();
            servicios.AddScoped<ManejadorObtenerMarca>();
            servicios.AddScoped<ManejadorDesactivarMarca>();

            // Ventas
            servicios.AddScoped<ManejadorRegistrarVenta>();
            servicios.AddScoped<ManejadorBuscarVentas>();

            // Autenticación
            servicios.AddScoped<ManejadorIniciarSesion>();
            servicios.AddScoped<ManejadorRefrescarSesion>();

            return servicios;
        }
    }
}
