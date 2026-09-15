namespace ERP.Aplicacion.CasosDeUso.Autenticacion
{
    public sealed record ResultadoSesion(
        string TokenAcceso,
        DateTime AccesoExpiraUtc,
        string TokenRefresco,
        DateTime RefrescoExpiraUtc,
        long UsuarioId,
        string NombreCompleto,
        long EmpresaId,
        IReadOnlyCollection<string> Permisos);
}
