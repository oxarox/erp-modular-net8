import { QueryClient } from '@tanstack/react-query'
import { ErrorApi } from '@/nucleo/api/errores'

/**
 * Configuración de TanStack Query.
 *
 * La política de reintentos es la parte que importa y se apoya en el contrato de
 * errores del backend: un 400 o un 404 no mejoran por insistir, y reintentarlos
 * solo multiplica la carga y retrasa el mensaje que la persona necesita leer. Un
 * 503 —`API_009`, la base de datos no responde— sí mejora, y el propio backend
 * lo distingue del 500 justamente para poder decirlo. Ver
 * `ERP.Api/Intermediarios/IntermediarioExcepcion.cs`.
 */
export function crearClienteConsultas(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // El token de acceso dura 30 minutos; media de vida de los datos de un
        // ERP consultados en pantalla: bastante menos.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (intentos, error) => {
          if (error instanceof ErrorApi) {
            return error.esReintentable && intentos < 2
          }

          // Fallo de red: puede ser un corte momentáneo.
          return intentos < 2
        },
        retryDelay: intento => Math.min(1000 * 2 ** intento, 8000),
      },
      mutations: {
        // Una mutación reintentada sola puede duplicar una venta. Nunca.
        retry: false,
      },
    },
  })
}

/**
 * Claves de consulta, centralizadas.
 *
 * Tenerlas en un solo objeto evita el error clásico de invalidar
 * `['marcas']` desde una pantalla que las registró como `['marcas', 'lista']`:
 * la invalidación no falla, simplemente no hace nada, y la tabla se queda vieja.
 */
export const claves = {
  salud: () => ['salud'] as const,
  marcas: {
    todas: () => ['marcas'] as const,
    lista: (filtros: unknown) => ['marcas', 'lista', filtros] as const,
  },
  ventas: {
    todas: () => ['ventas'] as const,
    lista: (filtros: unknown) => ['ventas', 'lista', filtros] as const,
  },
  productos: {
    todos: () => ['productos'] as const,
    lista: (filtros: unknown) => ['productos', 'lista', filtros] as const,
  },
  almacenes: {
    todos: () => ['almacenes'] as const,
    lista: () => ['almacenes', 'lista'] as const,
  },
} as const
