using ERP.Aplicacion.Abstracciones.Contexto;
using ERP.Aplicacion.Abstracciones.Servicios;
using ERP.Dominio.Entidades;
using ERP.Infraestructura.Contexto;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace ERP.Infraestructura.Servicios
{
    /// <summary>
    /// Bitácora de negocio sobre EF Core.
    /// Nunca propaga excepciones: si el log falla, la operación de negocio que lo originó
    /// ya ocurrió y no tiene por qué revertirse. El fallo se reporta al logger técnico.
    /// </summary>
    public sealed class RegistroLogAccionesEfCore : IRegistroLogAcciones
    {
        private readonly ContextoErp _contexto;
        private readonly IProveedorContextoEmpresa _empresa;
        private readonly IProveedorContextoUsuario _usuario;
        private readonly IRelojSistema _reloj;
        private readonly IHttpContextAccessor _accesor;
        private readonly ILogger<RegistroLogAccionesEfCore> _log;

        public RegistroLogAccionesEfCore(
            ContextoErp contexto,
            IProveedorContextoEmpresa empresa,
            IProveedorContextoUsuario usuario,
            IRelojSistema reloj,
            IHttpContextAccessor accesor,
            ILogger<RegistroLogAccionesEfCore> log)
        {
            _contexto = contexto;
            _empresa = empresa;
            _usuario = usuario;
            _reloj = reloj;
            _accesor = accesor;
            _log = log;
        }

        public async Task RegistrarAsync(
            string modulo,
            string accion,
            string? entidadTipo = null,
            long? entidadId = null,
            SeveridadLog severidad = SeveridadLog.Informativa,
            string? detalle = null,
            CancellationToken ct = default)
        {
            try
            {
                long empresaId = _empresa.ObtenerEmpresaIdActual();

                if (empresaId <= 0)
                {
                    return;
                }

                _contexto.LogAcciones.Add(new LogAccion
                {
                    EmpresaId = empresaId,
                    UsuarioId = _usuario.ObtenerUsuarioIdActual(),
                    UsuarioNombre = _usuario.ObtenerNombreUsuarioActual(),
                    Modulo = modulo,
                    Accion = accion,
                    EntidadTipo = entidadTipo,
                    EntidadId = entidadId,
                    Severidad = severidad,
                    Detalle = detalle,
                    CorrelacionId = _accesor.HttpContext?.TraceIdentifier,
                    FechaUtc = _reloj.AhoraUtc,
                });

                await _contexto.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "No se pudo registrar la acción {Modulo}/{Accion} en la bitácora.", modulo, accion);
            }
        }
    }
}
