namespace ERP.Aplicacion.Abstracciones.Contexto
{
    /// <summary>
    /// Resuelve la empresa (tenant) del request en curso a partir del token.
    /// Ningún caso de uso recibe el empresaId desde el cuerpo de la petición: se toma siempre
    /// del contexto autenticado, para que un cliente no pueda operar sobre otra empresa
    /// cambiando un campo del JSON. Ver docs/multiempresa.md.
    /// </summary>
    public interface IProveedorContextoEmpresa
    {
        long ObtenerEmpresaIdActual();
    }
}
