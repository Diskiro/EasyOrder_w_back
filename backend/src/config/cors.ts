import { CorsOptions } from 'cors';

/**
 * SRP: Validación y configuración centralizada de orígenes permitidos por CORS
 */

/**
 * Valida si un origen HTTP/HTTPS entrante está autorizado para comunicarse con la API.
 * @param origin - Origen recibido en la cabecera Origin del request
 * @param allowedOrigins - Lista de orígenes explícitos configurados por entorno
 * @returns boolean indicando si el origen es de confianza
 */
export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
    // Permitir peticiones sin cabecera Origin (p.ej. apps móviles nativas, curl, microservicios internos)
    if (!origin) {
        return true;
    }

    // Validación contra lista explícita de orígenes configurados
    if (allowedOrigins.includes(origin)) {
        return true;
    }

    try {
        const url = new URL(origin);
        const hostname = url.hostname.toLowerCase();

        // Permitir entornos locales de prueba
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return true;
        }

        // Permitir dominio raíz useeasyorder.com y cualquier subdominio seguro (*.useeasyorder.com)
        if (hostname === 'useeasyorder.com' || hostname.endsWith('.useeasyorder.com')) {
            // Requerir HTTPS para dominios de producción
            return url.protocol === 'https:';
        }
    } catch {
        // En caso de formato de URL inválido, denegar inmediatamente
        return false;
    }

    return false;
}

/**
 * Crea las opciones de configuración de CORS compatibles con Express y Socket.io
 * @param allowedOrigins - Orígenes base permitidos
 */
export function createCorsOptions(allowedOrigins: string[]): CorsOptions {
    return {
        origin: (origin, callback) => {
            if (isOriginAllowed(origin, allowedOrigins)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS bloqueado: El origen "${origin}" no está autorizado`));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    };
}
