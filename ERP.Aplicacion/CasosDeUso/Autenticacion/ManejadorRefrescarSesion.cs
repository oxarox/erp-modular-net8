using ERP.Aplicacion.Abstracciones.Contexto;
using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Aplicacion.Abstracciones.Servicios;
using ERP.Aplicacion.Comun.CodigosError;
using ERP.Aplicacion.Comun.Excepciones;
using ERP.Dominio.Entidades;

namespace ERP.Aplicacion.CasosDeUso.Autenticacion
{
    /// <summary>
    /// Caso de uso: canjear un token de refresco por un par nuevo.
    /// El token usado se revoca en el mismo acto (rotación): si alguien reutiliza uno viejo,
    /// ya no sirve, y la sesión legítima puede detectar el robo.
    /// </summary>
    public sealed class ManejadorRefrescarSesion
    {
        private readonly IRepositorioSesionUsuario _sesiones;
        private readonly IRepositorioUsuario _usuarios;
        private readonly IServicioTokens _tokens;
        private readonly IRelojSistema _reloj;

        public ManejadorRefrescarSesion(
            IRepositorioSesionUsuario sesiones,
            IRepositorioUsuario usuarios,
            IServicioTokens tokens,
            IRelojSistema reloj)
        {
            _sesiones = sesiones;
            _usuarios = usuarios;
            _tokens = tokens;
            _reloj = reloj;
        }

        public async Task<ResultadoSesion> ManejarAsync(ComandoRefrescarSesion comando, CancellationToken ct)
        {
            string hash = _tokens.CalcularHashRefresco(comando.TokenRefresco);

            SesionUsuario sesion = await _sesiones.ObtenerPorHashAsync(hash, ct)
                ?? throw new ExcepcionNoAutorizada(
                    "El token de refresco no es válido.",
                    CodigosErrorAutenticacion.TokenRefrescoInvalido);

            if (!sesion.EstaVigente(_reloj.AhoraUtc))
            {
                throw new ExcepcionNoAutorizada(
                    "La sesión expiró o fue revocada.",
                    CodigosErrorAutenticacion.TokenRefrescoExpirado);
            }

            Usuario usuario = await _usuarios.ObtenerPorIdAsync(sesion.EmpresaId, sesion.UsuarioId, ct)
                ?? throw new ExcepcionNoAutorizada(
                    "La sesión ya no corresponde a un usuario válido.",
                    CodigosErrorAutenticacion.SesionRevocada);

            if (!usuario.Activo)
            {
                throw new ExcepcionNoAutorizada(
                    "El usuario se encuentra inactivo.",
                    CodigosErrorAutenticacion.UsuarioInactivo,
                    esProhibido: true);
            }

            await _sesiones.RevocarAsync(sesion.Id, _reloj.AhoraUtc, ct);

            IReadOnlyCollection<string> permisos = await _usuarios.ObtenerPermisosAsync(usuario.Id, ct);
            ParTokens par = _tokens.Emitir(usuario, permisos);

            await _sesiones.CrearAsync(
                new SesionUsuario
                {
                    EmpresaId = usuario.EmpresaId,
                    UsuarioId = usuario.Id,
                    HashTokenRefresco = _tokens.CalcularHashRefresco(par.Refresco.Valor),
                    FechaEmisionUtc = _reloj.AhoraUtc,
                    FechaExpiracionUtc = par.Refresco.ExpiraUtc,
                    DireccionIp = comando.DireccionIp,
                },
                ct);

            return new ResultadoSesion(
                par.Acceso.Valor,
                par.Acceso.ExpiraUtc,
                par.Refresco.Valor,
                par.Refresco.ExpiraUtc,
                usuario.Id,
                usuario.NombreCompleto,
                usuario.EmpresaId,
                permisos);
        }
    }
}
