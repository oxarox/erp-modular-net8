# Imagen de la consola web. Dos etapas: una compila, la otra solo sirve archivos.
# La imagen final no lleva Node ni node_modules — son 400 MB que no hacen falta
# para entregar HTML estático, y cada megabyte de más es superficie de ataque.

# ── Etapa de compilación ─────────────────────────────────────────────────────
FROM node:22-alpine AS compilacion

WORKDIR /origen

# Se copian primero los manifiestos: mientras no cambien, Docker reutiliza la
# capa de dependencias y `docker compose up --build` no reinstala nada.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# El origen de la API se resuelve EN TIEMPO DE COMPILACIÓN: Vite lo incrusta en
# el bundle. No es una variable de entorno del contenedor, y por eso viaja como
# argumento de build. El valor por defecto es el puerto que docker-compose.yml
# publica para la API, visto desde el navegador del anfitrión (no desde la red
# interna de Docker: quien hace la petición es el navegador, no el contenedor).
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Etapa de ejecución ───────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS ejecucion

COPY --from=compilacion /origen/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -qO- http://localhost/ >/dev/null || exit 1
