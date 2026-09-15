namespace ERP.Dominio.Abstracciones
{
    /// <summary>
    /// Marca una entidad como perteneciente a una empresa (tenant).
    /// El <see cref="Contexto.ContextoErp"/> aplica un filtro global de consulta sobre
    /// todas las entidades que implementan este contrato, de modo que ninguna consulta
    /// pueda devolver datos de otra empresa aunque el repositorio olvide filtrar.
    /// </summary>
    public interface IEntidadMultiEmpresa
    {
        long EmpresaId { get; }
    }

    /// <summary>
    /// Variante para entidades que pueden ser globales (catálogos compartidos entre empresas)
    /// o pertenecer a una empresa concreta.
    /// </summary>
    public interface IEntidadMultiEmpresaOpcional
    {
        long? EmpresaId { get; }
    }
}
