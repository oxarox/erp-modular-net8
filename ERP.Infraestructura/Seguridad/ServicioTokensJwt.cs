using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using ERP.Aplicacion.Abstracciones.Contexto;
using ERP.Aplicacion.Abstracciones.Servicios;
using ERP.Dominio.Entidades;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace ERP.Infraestructura.Seguridad
{
    /// <summary>
    /// Emisor de tokens JWT.
    /// <para>
    /// Decisiones que vale la pena mirar:
    /// </para>
    /// <list type="bullet">
    ///   <item>
    ///     los permisos viajan dentro del token: la autorización de cada request no pega a la
    ///     base de datos. El costo es que revocar un permiso tarda hasta la expiración del acceso,
    ///     y por eso el acceso dura minutos, no horas;
    ///   </item>
    ///   <item>
    ///     el token de refresco es un valor aleatorio opaco, no un JWT: no lleva información,
    ///     solo sirve para canjearlo, y de él se guarda el hash;
    ///   </item>
    ///   <item>
    ///     el claim <c>auth_version</c> permite invalidar todos los tokens de un usuario
    ///     incrementando un entero, sin mantener una lista negra.
    ///   </item>
    /// </list>
    /// </summary>
    public sealed class ServicioTokensJwt : IServicioTokens
    {
        private readonly OpcionesJwt _opciones;
        private readonly IRelojSistema _reloj;

        public ServicioTokensJwt(IOptions<OpcionesJwt> opciones, IRelojSistema reloj)
        {
            _opciones = opciones.Value;
            _reloj = reloj;
        }

        public ParTokens Emitir(Usuario usuario, IReadOnlyCollection<string> permisos)
        {
            DateTime ahora = _reloj.AhoraUtc;
            DateTime expiraAcceso = ahora.AddMinutes(_opciones.MinutosTokenAcceso);

            List<Claim> claims =
            [
                new Claim(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, usuario.Correo),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(ClaimsErp.UsuarioId, usuario.Id.ToString()),
                new Claim(ClaimsErp.EmpresaId, usuario.EmpresaId.ToString()),
                new Claim(ClaimsErp.NombreCompleto, usuario.NombreCompleto),
                new Claim(ClaimsErp.VersionAutenticacion, usuario.VersionAutenticacion.ToString()),
            ];

            claims.AddRange(permisos.Select(p => new Claim(ClaimsErp.Permiso, p)));

            SigningCredentials credenciales = new(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opciones.ClaveFirma)),
                SecurityAlgorithms.HmacSha256);

            JwtSecurityToken token = new(
                issuer: _opciones.Emisor,
                audience: _opciones.Audiencia,
                claims: claims,
                notBefore: ahora,
                expires: expiraAcceso,
                signingCredentials: credenciales);

            string acceso = new JwtSecurityTokenHandler().WriteToken(token);
            string refresco = GenerarTokenOpaco();

            return new ParTokens(
                new TokenEmitido(acceso, expiraAcceso),
                new TokenEmitido(refresco, ahora.AddDays(_opciones.DiasTokenRefresco)));
        }

        public string CalcularHashRefresco(string tokenRefresco)
        {
            byte[] hash = SHA256.HashData(Encoding.UTF8.GetBytes(tokenRefresco));

            return Convert.ToHexString(hash);
        }

        private static string GenerarTokenOpaco()
        {
            byte[] bytes = RandomNumberGenerator.GetBytes(48);

            return Convert.ToBase64String(bytes);
        }
    }
}
