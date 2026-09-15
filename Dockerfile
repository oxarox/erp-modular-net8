# syntax=docker/dockerfile:1.7

# ─────────────────────────────────────────────────────────────────────────────
# Etapa 1: compilación y publicación.
#
# Se copian primero los .csproj y se restaura, y solo después el resto del código.
# Así la capa de restore queda cacheada y un cambio en una línea de C# no obliga
# a volver a bajar todos los paquetes NuGet.
# ─────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Directory.Build.props ./
COPY ERP.Dominio/ERP.Dominio.csproj ERP.Dominio/
COPY ERP.Aplicacion/ERP.Aplicacion.csproj ERP.Aplicacion/
COPY ERP.Infraestructura/ERP.Infraestructura.csproj ERP.Infraestructura/
COPY ERP.Api/ERP.Api.csproj ERP.Api/

RUN dotnet restore ERP.Api/ERP.Api.csproj

COPY . .

RUN dotnet publish ERP.Api/ERP.Api.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false

# ─────────────────────────────────────────────────────────────────────────────
# Etapa 2: ejecución.
#
# Imagen aspnet (no sdk): el contenedor final no lleva compilador ni código fuente.
# Corre como usuario sin privilegios y expone solo HTTP: el TLS lo termina el
# proxy de entrada, no la aplicación.
# ─────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

USER $APP_UID

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true

COPY --from=build /app/publish .

EXPOSE 8080

# Los secretos (ConnectionStrings__DefaultConnection, Jwt__ClaveFirma) se inyectan
# como variables de entorno en tiempo de ejecución. Nunca se hornean en la imagen.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["dotnet", "--info"]

ENTRYPOINT ["dotnet", "ERP.Api.dll"]
