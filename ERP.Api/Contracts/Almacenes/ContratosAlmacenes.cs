namespace ERP.Api.Contracts.Almacenes
{
    public sealed record SolicitudListarAlmacenes(bool? SoloActivos);

    public sealed record RespuestaAlmacen(long Id, string Nombre, string? Ubicacion, bool EsPredeterminado, bool Activo);
}
