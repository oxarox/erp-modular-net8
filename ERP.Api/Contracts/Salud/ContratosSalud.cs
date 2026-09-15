namespace ERP.Api.Contracts.Salud
{
    public sealed record RespuestaSalud(string Estado, string Version, string Entorno, DateTime FechaUtc);
}
