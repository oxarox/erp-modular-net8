namespace ERP.Api.Contracts.Marcas
{
    public sealed record SolicitudBuscarMarcas(string? Criterio, bool? SoloActivas, int? Pagina, int? TamanoPagina);

    public sealed record SolicitudCrearMarca(string Nombre, string? Descripcion, bool? Activo);

    public sealed record SolicitudActualizarMarca(string Nombre, string? Descripcion, bool? Activo);

    public sealed record RespuestaMarca(long Id, string Nombre, string? Descripcion, bool Activo);

    public sealed record RespuestaOperacionMarca(bool Exitoso, string Mensaje, long Id);
}
