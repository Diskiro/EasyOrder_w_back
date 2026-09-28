import { resolveActiveTenantSlug } from '../utils/tenant';

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
    const tenantSlug = resolveActiveTenantSlug();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Restaurant-Slug': tenantSlug,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string>),
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || errorData.error || 'API request failed') as any;
        error.status = response.status;
        error.code = errorData.error;

        // Disparar evento para notificación global de corte de suscripción
        if (response.status === 402 && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('subscription_error', { detail: errorData }));
        }

        throw error;
    }

    return response.json();
};
