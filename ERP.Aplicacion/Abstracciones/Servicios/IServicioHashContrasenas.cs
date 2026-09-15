namespace ERP.Aplicacion.Abstracciones.Servicios
{
    public interface IServicioHashContrasenas
    {
        string Hashear(string contrasenaEnClaro);

        bool Verificar(string contrasenaEnClaro, string hash);
    }
}
