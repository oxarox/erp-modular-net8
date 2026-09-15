namespace ERP.Api.Contracts.Auth
{
    public sealed record SolicitudIniciarSesion(string Correo, string Contrasena);

    public sealed record SolicitudRefrescarSesion(string TokenRefresco);

    public sealed record RespuestaSesion(
        string TokenAcceso,
        DateTime AccesoExpiraUtc,
        string TokenRefresco,
        DateTime RefrescoExpiraUtc,
        long UsuarioId,
        string NombreCompleto,
        long EmpresaId,
        IReadOnlyCollection<string> Permisos);
}
