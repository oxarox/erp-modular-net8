using ERP.Dominio.Entidades;

namespace ERP.Tests.Comun
{
    /// <summary>
    /// Constructores de datos de prueba. Centralizarlos evita que cada test repita quince
    /// líneas de inicialización y, sobre todo, evita que cada test invente un producto
    /// distinto cuando el escenario debería ser el mismo.
    /// </summary>
    public static class ConstructorDeDatos
    {
        public const long EmpresaId = 1L;
        public const long OtraEmpresaId = 2L;
        public const long UsuarioId = 10L;
        public const long AlmacenId = 100L;

        public static Marca Marca(long id = 1L, string nombre = "Marca de prueba", bool activo = true) =>
            new()
            {
                Id = id,
                EmpresaId = EmpresaId,
                Nombre = nombre,
                Descripcion = null,
                Activo = activo,
            };

        public static Producto Producto(
            long id = 1L,
            decimal precio = 1000m,
            bool activo = true,
            bool controlaInventario = true) =>
            new()
            {
                Id = id,
                EmpresaId = EmpresaId,
                Sku = $"SKU-{id:D4}",
                Nombre = $"Producto {id}",
                PrecioVenta = precio,
                CostoPromedio = precio / 2m,
                ControlaInventario = controlaInventario,
                Activo = activo,
            };

        public static Usuario Usuario(string hashContrasena, bool activo = true) =>
            new()
            {
                Id = UsuarioId,
                EmpresaId = EmpresaId,
                Correo = "persona@ejemplo.cl",
                NombreCompleto = "Persona de Prueba",
                HashContrasena = hashContrasena,
                VersionAutenticacion = 1,
                Activo = activo,
            };
    }
}
