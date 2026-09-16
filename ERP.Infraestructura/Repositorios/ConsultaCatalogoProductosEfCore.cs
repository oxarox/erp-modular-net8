using ERP.Aplicacion.Abstracciones.Consultas;
using ERP.Aplicacion.Comun.Paginacion;
using ERP.Dominio.Entidades;
using ERP.Infraestructura.Contexto;
using Microsoft.EntityFrameworkCore;

namespace ERP.Infraestructura.Repositorios
{
    /// <summary>
    /// Read model del catálogo de productos. No hereda ni comparte nada con los repositorios de
    /// escritura: cruza y pagina en la base de datos, y proyecta a la fila que la pantalla de
    /// venta necesita sin materializar entidades de dominio.
    /// <para>
    /// Devuelve la existencia tal como está en la tabla y no la interpreta: qué significa que no
    /// haya fila —cero o desconocido— lo decide el caso de uso. Una consulta SQL no es el lugar
    /// donde buscar una regla de negocio, y menos si mañana hay una segunda implementación.
    /// </para>
    /// </summary>
    public sealed class ConsultaCatalogoProductosEfCore : IConsultaCatalogoProductos
    {
        private readonly ContextoErp _contexto;

        public ConsultaCatalogoProductosEfCore(ContextoErp contexto)
        {
            _contexto = contexto;
        }

        public async Task<ResultadoPaginado<FilaCatalogoProducto>> BuscarAsync(
            long empresaId,
            string? criterio,
            bool? soloActivos,
            long? almacenId,
            SolicitudPaginada paginacion,
            CancellationToken ct)
        {
            IQueryable<Producto> consulta = _contexto.Productos
                .AsNoTracking()
                .Where(p => p.EmpresaId == empresaId);

            if (soloActivos == true)
            {
                consulta = consulta.Where(p => p.Activo);
            }

            if (!string.IsNullOrWhiteSpace(criterio))
            {
                // El mismo texto busca por código y por nombre: quien atiende un mostrador
                // teclea el SKU si lo tiene a la vista y el nombre si no, y no debería tener
                // que elegir antes de escribir.
                string patron = $"%{criterio.Trim()}%";
                consulta = consulta.Where(p => EF.Functions.Like(p.Sku, patron) || EF.Functions.Like(p.Nombre, patron));
            }

            // Se cuenta y se pagina en la base de datos: el catálogo real tiene decenas de miles
            // de SKU y traerlo entero para quedarse con veinticinco filas solo falla en producción.
            int total = await consulta.CountAsync(ct);

            // El saldo se resuelve en la MISMA consulta, como join externo correlacionado. La
            // alternativa —preguntarle el stock al servicio de dominio dentro del bucle— son
            // veinticinco viajes a la base por página.
            // Cuando no viene almacén se usa un identificador que ninguna fila puede tener, así
            // el join no encuentra nada y la consulta conserva una sola forma.
            long almacenBuscado = almacenId ?? 0L;

            var filas = await consulta
                .OrderBy(p => p.Nombre)
                .ThenBy(p => p.Id)
                .Skip(paginacion.Saltar())
                .Take(paginacion.TamanoPagina)
                .Select(p => new
                {
                    p.Id,
                    p.Sku,
                    p.Nombre,
                    // Los nombres se resuelven por subconsulta y no por la navegación: una
                    // navegación solo arrastra el filtro global del contexto, y ese filtro se
                    // apaga cuando no hay empresa en el contexto —una tarea de arranque, un
                    // servicio alojado—. Ahí un producto cuyo MarcaId apunte a la marca de otra
                    // empresa devolvería el nombre ajeno, y nada en el esquema lo impide:
                    // FK_productos_marcas referencia marcas(Id), sin EmpresaId. Con el
                    // empresaId explícito las cuatro tablas de la consulta llevan las dos
                    // barreras, no solo dos de ellas.
                    Marca = _contexto.Marcas
                        .Where(m => m.EmpresaId == empresaId && m.Id == p.MarcaId)
                        .Select(m => m.Nombre)
                        .FirstOrDefault(),
                    Categoria = _contexto.Categorias
                        .Where(c => c.EmpresaId == empresaId && c.Id == p.CategoriaId)
                        .Select(c => c.Nombre)
                        .FirstOrDefault(),
                    p.PrecioVenta,
                    p.ControlaInventario,
                    p.Activo,
                    Existencia = _contexto.Existencias
                        .Where(e => e.EmpresaId == empresaId && e.ProductoId == p.Id && e.AlmacenId == almacenBuscado)
                        .Select(e => (decimal?)e.Cantidad)
                        .FirstOrDefault(),
                })
                .ToListAsync(ct);

            IReadOnlyList<FilaCatalogoProducto> items = filas
                .Select(f => new FilaCatalogoProducto(
                    f.Id,
                    f.Sku,
                    f.Nombre,
                    f.Marca,
                    f.Categoria,
                    f.PrecioVenta,
                    f.ControlaInventario,
                    f.Activo,
                    f.Existencia))
                .ToList();

            return new ResultadoPaginado<FilaCatalogoProducto>(paginacion.Pagina, paginacion.TamanoPagina, total, items);
        }
    }
}
