using ERP.Aplicacion.Abstracciones.Servicios;

namespace ERP.Infraestructura.Seguridad
{
    /// <summary>
    /// Hashing con BCrypt y factor de trabajo explícito.
    /// El factor se fija aquí, no en configuración: subirlo es una decisión de seguridad
    /// que debe quedar en el historial de git, no en una variable de entorno de producción.
    /// </summary>
    public sealed class ServicioHashContrasenasBCrypt : IServicioHashContrasenas
    {
        private const int FactorTrabajo = 12;

        public string Hashear(string contrasenaEnClaro) =>
            BCrypt.Net.BCrypt.HashPassword(contrasenaEnClaro, workFactor: FactorTrabajo);

        public bool Verificar(string contrasenaEnClaro, string hash)
        {
            if (string.IsNullOrWhiteSpace(hash))
            {
                return false;
            }

            try
            {
                return BCrypt.Net.BCrypt.Verify(contrasenaEnClaro, hash);
            }
            catch (BCrypt.Net.SaltParseException)
            {
                // Hash corrupto o de otro algoritmo: se trata como credencial inválida,
                // nunca como error del servidor.
                return false;
            }
        }
    }
}
