namespace ERP.Aplicacion.Abstracciones.Contexto
{
    /// <summary>Usuario autenticado del request en curso, tomado de los claims del token.</summary>
    public interface IProveedorContextoUsuario
    {
        long ObtenerUsuarioIdActual();

        string ObtenerNombreUsuarioActual();

        IReadOnlyCollection<string> ObtenerPermisos();
    }
}
