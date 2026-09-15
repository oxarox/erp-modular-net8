namespace ERP.Aplicacion.CasosDeUso.Marcas
{
    public sealed record ComandoActualizarMarca(long Id, string Nombre, string? Descripcion, bool? Activo);
}
