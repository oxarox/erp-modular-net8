using ERP.Aplicacion.Abstracciones.Contexto;
using ERP.Dominio.Abstracciones;
using ERP.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;

namespace ERP.Infraestructura.Contexto
{
    /// <summary>
    /// Contexto de persistencia de la solución.
    /// <para>
    /// Aplica dos políticas globales que no se delegan a los repositorios, porque un repositorio
    /// nuevo escrito con prisa es exactamente donde se olvidan:
    /// </para>
    /// <list type="number">
    ///   <item>
    ///     <b>Aislamiento por empresa.</b> Toda entidad que implementa
    ///     <see cref="IEntidadMultiEmpresa"/> recibe un filtro global de consulta por
    ///     <c>EmpresaId</c>. Una consulta sin <c>Where</c> no puede devolver datos de otro tenant.
    ///   </item>
    ///   <item>
    ///     <b>Precisión decimal.</b> Toda propiedad <c>decimal</c> se mapea a
    ///     <c>decimal(18,2)</c> salvo que su configuración diga lo contrario, para que el dinero
    ///     no dependa del default del proveedor.
    ///   </item>
    /// </list>
    /// </summary>
    public sealed class ContextoErp : DbContext
    {
        private readonly IProveedorContextoEmpresa? _contextoEmpresa;

        public ContextoErp(DbContextOptions<ContextoErp> opciones)
            : base(opciones)
        {
        }

        public ContextoErp(DbContextOptions<ContextoErp> opciones, IProveedorContextoEmpresa contextoEmpresa)
            : base(opciones)
        {
            _contextoEmpresa = contextoEmpresa;
        }

        public DbSet<Empresa> Empresas => Set<Empresa>();

        public DbSet<Usuario> Usuarios => Set<Usuario>();

        public DbSet<Rol> Roles => Set<Rol>();

        public DbSet<UsuarioRol> UsuariosRoles => Set<UsuarioRol>();

        public DbSet<RolPermiso> RolesPermisos => Set<RolPermiso>();

        public DbSet<SesionUsuario> SesionesUsuario => Set<SesionUsuario>();

        public DbSet<Marca> Marcas => Set<Marca>();

        public DbSet<Categoria> Categorias => Set<Categoria>();

        public DbSet<Producto> Productos => Set<Producto>();

        public DbSet<Cliente> Clientes => Set<Cliente>();

        public DbSet<Almacen> Almacenes => Set<Almacen>();

        public DbSet<ExistenciaProducto> Existencias => Set<ExistenciaProducto>();

        public DbSet<MovimientoInventario> MovimientosInventario => Set<MovimientoInventario>();

        public DbSet<Venta> Ventas => Set<Venta>();

        public DbSet<VentaDetalleLinea> VentasDetalle => Set<VentaDetalleLinea>();

        public DbSet<LogAccion> LogAcciones => Set<LogAccion>();

        /// <summary>
        /// Empresa del request en curso. Es <c>0</c> cuando no hay contexto autenticado
        /// (migraciones, tareas de arranque): en ese caso el filtro global no recorta nada,
        /// y el aislamiento recae en el <c>empresaId</c> explícito de cada repositorio.
        /// </summary>
        public long EmpresaIdActual => _contextoEmpresa?.ObtenerEmpresaIdActual() ?? 0L;

        protected override void OnModelCreating(ModelBuilder constructor)
        {
            constructor.ApplyConfigurationsFromAssembly(typeof(ContextoErp).Assembly);

            AplicarFiltroGlobalPorEmpresa(constructor);
            AplicarPrecisionDecimalPorDefecto(constructor);

            base.OnModelCreating(constructor);
        }

        private void AplicarFiltroGlobalPorEmpresa(ModelBuilder constructor)
        {
            foreach (Microsoft.EntityFrameworkCore.Metadata.IMutableEntityType tipo in constructor.Model.GetEntityTypes())
            {
                if (!typeof(IEntidadMultiEmpresa).IsAssignableFrom(tipo.ClrType))
                {
                    continue;
                }

                System.Linq.Expressions.ParameterExpression parametro =
                    System.Linq.Expressions.Expression.Parameter(tipo.ClrType, "e");

                System.Linq.Expressions.MemberExpression propiedad =
                    System.Linq.Expressions.Expression.Property(parametro, nameof(IEntidadMultiEmpresa.EmpresaId));

                System.Linq.Expressions.MemberExpression empresaActual =
                    System.Linq.Expressions.Expression.Property(
                        System.Linq.Expressions.Expression.Constant(this),
                        nameof(EmpresaIdActual));

                System.Linq.Expressions.BinaryExpression sinContexto =
                    System.Linq.Expressions.Expression.Equal(
                        empresaActual,
                        System.Linq.Expressions.Expression.Constant(0L));

                System.Linq.Expressions.BinaryExpression coincide =
                    System.Linq.Expressions.Expression.Equal(propiedad, empresaActual);

                System.Linq.Expressions.BinaryExpression cuerpo =
                    System.Linq.Expressions.Expression.OrElse(sinContexto, coincide);

                constructor.Entity(tipo.ClrType)
                    .HasQueryFilter(System.Linq.Expressions.Expression.Lambda(cuerpo, parametro));
            }
        }

        private static void AplicarPrecisionDecimalPorDefecto(ModelBuilder constructor)
        {
            foreach (Microsoft.EntityFrameworkCore.Metadata.IMutableEntityType tipo in constructor.Model.GetEntityTypes())
            {
                foreach (Microsoft.EntityFrameworkCore.Metadata.IMutableProperty propiedad in tipo.GetProperties())
                {
                    if (propiedad.ClrType != typeof(decimal) && propiedad.ClrType != typeof(decimal?))
                    {
                        continue;
                    }

                    if (propiedad.GetColumnType() is null)
                    {
                        propiedad.SetColumnType("decimal(18,2)");
                    }
                }
            }
        }
    }
}
