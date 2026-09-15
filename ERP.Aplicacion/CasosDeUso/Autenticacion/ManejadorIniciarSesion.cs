using ERP.Aplicacion.Abstracciones.Contexto;
using ERP.Aplicacion.Abstracciones.Entidades;
using ERP.Aplicacion.Abstracciones.Servicios;
using ERP.Aplicacion.Comun.CodigosError;
using ERP.Aplicacion.Comun.Excepciones;
using ERP.Dominio.Entidades;

namespace ERP.Aplicacion.CasosDeUso.Autenticacion
{
    /// <summary>
    /// Caso de uso: iniciar sesión.
    /// <para>
    /// Detalle deliberado: un correo inexistente y una contraseña incorrecta devuelven exactamente
    /// el mismo error y el mismo código. Distinguirlos permitiría enumerar usuarios válidos.
    /// </para>
    /// </summary>
    public sealed class ManejadorIniciarSesion
    {
        private readonly IRepositorioUsuario _usuarios;
        private readonly IRepositorioSesionUsuario _sesiones;
        private readonly IServicioHashContrasenas _hash;
        private readonly IServicioTokens _tokens;
        private readonly IRelojSistema _reloj;

        public ManejadorIniciarSesion(
            IRepositorioUsuario usuarios,
            IRepositorioSesionUsuario sesiones,
            IServicioHashContrasenas hash,
            IServicioTokens tokens,
            IRelojSistema reloj)
        {
            _usuarios = usuarios;
            _sesiones = sesiones;
            _hash = hash;
            _tokens = tokens;
            _reloj = reloj;
        }

        public async Task<ResultadoSesion> ManejarAsync(ComandoIniciarSesion comando, CancellationToken ct)
        {
            Usuario? usuario = await _usuarios.ObtenerPorCorreoAsync(comando.Correo.Trim().ToLowerInvariant(), ct);

            if (usuario is null || !_hash.Verificar(comando.Contrasena, usuario.HashContrasena))
            {
                throw new ExcepcionNoAutorizada(
                    "Las credenciales no son válidas.",
                    CodigosErrorAutenticacion.CredencialesInvalidas);
            }

            if (!usuario.Activo)
            {
                throw new ExcepcionNoAutorizada(
                    "El usuario se encuentra inactivo.",
                    CodigosErrorAutenticacion.UsuarioInactivo,
                    esProhibido: true);
            }

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
