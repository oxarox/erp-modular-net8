using ERP.Dominio.Abstracciones;

namespace ERP.Dominio.Entidades
{
    public enum SeveridadLog
    {
        Informativa = 1,
        Advertencia = 2,
        Critica = 3,
    }

    /// <summary>
    /// Bitácora de acciones de negocio (quién hizo qué, sobre qué entidad y cuándo).
    /// El nombre del autor se denormaliza a propósito: el log debe seguir siendo legible
    /// aunque el usuario se desactive o se renombre después.
    /// </summary>
    public sealed class LogAccion : IEntidadMultiEmpresa
    {
        public long Id { get; init; }
        public long EmpresaId { get; init; }
        public long? UsuarioId { get; init; }
        public string UsuarioNombre { get; init; } = string.Empty;
        public string Modulo { get; init; } = string.Empty;
        public string Accion { get; init; } = string.Empty;
        public string? EntidadTipo { get; init; }
        public long? EntidadId { get; init; }
        public SeveridadLog Severidad { get; init; } = SeveridadLog.Informativa;
        public string? Detalle { get; init; }
        public string? CorrelacionId { get; init; }
        public DateTime FechaUtc { get; init; }
    }
}
