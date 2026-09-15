using System.Text;
using System.Text.Json.Serialization;
using ERP.Api.Autorizacion;
using ERP.Api.Filtros;
using ERP.Api.Intermediarios;
using ERP.Aplicacion.InyeccionDependencias;
using ERP.Infraestructura.InyeccionDependencias;
using ERP.Infraestructura.Seguridad;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

// ─────────────────────────────────────────────────────────────────────────────
// Composición de la aplicación.
//
// Este archivo es el ÚNICO lugar donde se ensambla el sistema. Cada capa expone
// un método de extensión (AgregarAplicacion / AgregarInfraestructura) y se
// registra a sí misma, así que agregar un módulo no obliga a tocar el arranque.
//
// El orden del pipeline no es decorativo: está comentado abajo, porque invertir
// dos líneas aquí es la forma más rápida de dejar una API abierta o de perder
// todos los identificadores de correlación de los logs.
// ─────────────────────────────────────────────────────────────────────────────

WebApplicationBuilder constructor = WebApplication.CreateBuilder(args);

// ── Configuración ────────────────────────────────────────────────────────────
// Los secretos (cadena de conexión, clave de firma) NO están en appsettings.json:
// llegan por variable de entorno. AddEnvironmentVariables va al final para que
// el entorno siempre gane sobre el archivo.
constructor.Configuration.AddEnvironmentVariables();

// ── Servicios ────────────────────────────────────────────────────────────────
constructor.Services
    .AddControllers(opciones =>
    {
        // Se registra globalmente: ningún controlador puede olvidarse de validar.
        opciones.Filters.Add<FiltroValidacionFluent>();
    })
    .AddJsonOptions(json =>
    {
        json.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        json.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// Los validadores se descubren por ensamblado: crear un validador nuevo no
// requiere registrarlo a mano.
constructor.Services.AddValidatorsFromAssembly(typeof(Program).Assembly, includeInternalTypes: true);

constructor.Services.AgregarAplicacion();
constructor.Services.AgregarInfraestructura(constructor.Configuration, constructor.Environment);

// ── Autenticación ────────────────────────────────────────────────────────────
OpcionesJwt jwt = new();
constructor.Configuration.GetSection(OpcionesJwt.Seccion).Bind(jwt);
jwt.Validar();

constructor.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opciones =>
    {
        opciones.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt.Emisor,
            ValidAudience = jwt.Audiencia,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.ClaveFirma)),

            // Sin tolerancia de reloj: un token expirado está expirado. Los cinco minutos
            // que ASP.NET concede por defecto son cinco minutos de acceso después de revocar.
            ClockSkew = TimeSpan.Zero,
        };

        opciones.Events = EventosJwtVersionAutenticacion.Crear();
    });

// ── Autorización basada en permisos ──────────────────────────────────────────
// El proveedor de políticas materializa una política por permiso al vuelo:
// [AutorizarPermiso("ventas.registrar")] funciona sin registrar nada aquí.
constructor.Services.AddSingleton<IAuthorizationPolicyProvider, PermisoPolicyProvider>();
constructor.Services.AddSingleton<IAuthorizationHandler, PermisoAuthorizationHandler>();
constructor.Services.AddAuthorization();

// ── CORS ─────────────────────────────────────────────────────────────────────
// Orígenes por ambiente, nunca AllowAnyOrigin en producción.
string[] origenes = constructor.Configuration.GetSection("Cors:OrigenesPermitidos").Get<string[]>() ?? [];

constructor.Services.AddCors(opciones =>
{
    opciones.AddDefaultPolicy(politica =>
    {
        if (origenes.Length == 0 && constructor.Environment.IsDevelopment())
        {
            politica.SetIsOriginAllowed(_ => true).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
            return;
        }

        politica.WithOrigins(origenes).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
    });
});

// ── Swagger ──────────────────────────────────────────────────────────────────
constructor.Services.AddEndpointsApiExplorer();
constructor.Services.AddSwaggerGen(opciones =>
{
    opciones.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "ERP Modular API",
        Version = "v1",
        Description = "API REST multiempresa de referencia: arquitectura por capas sobre .NET 8.",
    });

    opciones.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Token de acceso emitido por /api/autenticacion/iniciar-sesion.",
    });

    opciones.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [new OpenApiSecurityScheme
        {
            Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" },
        }] = Array.Empty<string>(),
    });

    // Los comentarios XML de los controladores alimentan la documentación.
    string archivoXml = Path.Combine(AppContext.BaseDirectory, $"{typeof(Program).Assembly.GetName().Name}.xml");

    if (File.Exists(archivoXml))
    {
        opciones.IncludeXmlComments(archivoXml);
    }
});

WebApplication app = constructor.Build();

// ── Pipeline ─────────────────────────────────────────────────────────────────
// El orden importa, de arriba hacia abajo:
//
//  1. Correlación primero, para que TODO lo que ocurra después (incluido el
//     manejo de excepciones) tenga un identificador que registrar.
//  2. Manejo de excepciones antes que cualquier middleware que pueda fallar.
//  3. HTTPS antes de autenticar, para no leer credenciales de un canal en claro.
//  4. CORS antes de autenticación: el preflight OPTIONS viaja sin token y debe
//     responderse igual.
//  5. Autenticación y luego autorización, en ese orden: no se puede autorizar a
//     quien todavía no se ha identificado.
app.UseMiddleware<IntermediarioCorrelacionRequest>();
app.UseMiddleware<IntermediarioExcepcion>();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

// Swagger queda expuesto solo en desarrollo. En ambientes superiores se publica
// detrás de una capa de autenticación propia o simplemente no se publica.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(opciones => opciones.SwaggerEndpoint("/swagger/v1/swagger.json", "ERP Modular API v1"));
}

app.MapControllers();

app.Run();

/// <summary>
/// Declarada explícitamente para que el proyecto de pruebas pueda referenciarla
/// con <c>WebApplicationFactory&lt;Program&gt;</c> en las pruebas de integración.
/// </summary>
public partial class Program
{
}
