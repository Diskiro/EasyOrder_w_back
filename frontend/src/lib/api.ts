/**
 * SRP: Determina de forma dinámica y segura la URL base de la API según el entorno
 */
export function resolveApiUrl(): string {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    if (typeof window !== 'undefined') {
        const { protocol, hostname } = window.location;

        // Entornos locales de desarrollo
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `${protocol}//${hostname}:3000/api`;
        }

        // Si se accede desde useeasyorder.com o cualquier subdominio (*.useeasyorder.com)
        if (hostname === 'useeasyorder.com' || hostname.endsWith('.useeasyorder.com')) {
            return `${protocol}//api.useeasyorder.com/api`;
        }
    }

    return 'https://api.useeasyorder.com/api';
}

export const API_URL = resolveApiUrl();

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'API request failed');
    }

    // Not all responses will have parsable JSON (e.g., 204 No Content), but our node API always sends JSON objects.
    return response.json();
};
