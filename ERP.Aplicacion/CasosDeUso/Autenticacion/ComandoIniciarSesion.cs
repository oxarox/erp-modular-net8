namespace ERP.Aplicacion.CasosDeUso.Autenticacion
{
    public sealed record ComandoIniciarSesion(string Correo, string Contrasena, string? DireccionIp);

    public sealed record ComandoRefrescarSesion(string TokenRefresco, string? DireccionIp);
}
