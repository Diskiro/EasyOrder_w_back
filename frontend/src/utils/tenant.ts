/**
 * SRP: Módulo utilitario responsable exclusivamente de extraer,
 * validar y gestionar el slug del restaurante inquilino (tenant) en el frontend.
 */

const RESERVED_SUBDOMAINS = new Set(['api', 'admin', 'www', 'mail', 'app', 'localhost']);
const DEFAULT_TENANT_SLUG = 'demo';
const SLUG_REGEX = /^[a-z0-9-]+$/;

/**
 * Valida y sanea un slug de restaurante asegurando formato seguro
 */
export function sanitizeTenantSlug(rawSlug: string | null | undefined): string | null {
    if (!rawSlug || typeof rawSlug !== 'string') {
        return null;
    }

    const cleaned = rawSlug.trim().toLowerCase();
    if (SLUG_REGEX.test(cleaned) && !RESERVED_SUBDOMAINS.has(cleaned)) {
        return cleaned;
    }

    return null;
}

/**
 * Extrae el subdominio a partir de un hostname (ej. 'restaurante1.useeasyorder.com')
 */
export function extractSubdomainFromHostname(hostname: string | undefined): string | null {
    if (!hostname || typeof hostname !== 'string') {
        return null;
    }

    const parts = hostname.toLowerCase().split('.');
    // Para dominios con subdominio (ej: ['mitienda', 'useeasyorder', 'com'] o ['rest1', 'localhost'])
    if (parts.length >= 3 || (parts.length === 2 && parts[1] === 'localhost')) {
        const subdomain = parts[0];
        return sanitizeTenantSlug(subdomain);
    }

    return null;
}

/**
 * Determina el slug del inquilino activo según el entorno y la ubicación del navegador
 */
export function resolveActiveTenantSlug(): string | null {
    if (typeof window === 'undefined') {
        return null;
    }

    // 1. Prioridad: Parámetro en URL '?tenant=mi-slug' (útil en pruebas y desarrollo)
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const querySlug = urlParams.get('tenant');
        const sanitizedQuerySlug = sanitizeTenantSlug(querySlug);
        if (sanitizedQuerySlug) {
            localStorage.setItem('tenant_slug', sanitizedQuerySlug);
            return sanitizedQuerySlug;
        }
    } catch {
        // En caso de que URLSearchParams falle en entornos no estándar
    }

    // 2. Prioridad: Subdominio del hostname actual (ej: demo.useeasyorder.com)
    const subdomain = extractSubdomainFromHostname(window.location.hostname);
    if (subdomain) {
        return subdomain;
    }

    // 3. Si estamos en el dominio raíz de producción (useeasyorder.com), no hay tenant por defecto
    const hostname = window.location.hostname.toLowerCase();
    if (hostname === 'useeasyorder.com' || hostname === 'www.useeasyorder.com') {
        return null;
    }

    // 4. Prioridad: Slug persistido en LocalStorage
    try {
        const storedSlug = localStorage.getItem('tenant_slug');
        const sanitizedStored = sanitizeTenantSlug(storedSlug);
        if (sanitizedStored) {
            return sanitizedStored;
        }
    } catch {
        // Ignorar errores de acceso a localStorage en modos privados
    }

    // 5. Fallback exclusivo para desarrollo local (localhost / 127.0.0.1)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return DEFAULT_TENANT_SLUG;
    }

    return null;
}

/**
 * Permite cambiar o forzar manualmente el inquilino activo en almacenamiento local
 */
export function setActiveTenantSlug(slug: string): boolean {
    const sanitized = sanitizeTenantSlug(slug);
    if (!sanitized) {
        return false;
    }

    try {
        localStorage.setItem('tenant_slug', sanitized);
        return true;
    } catch {
        return false;
    }
}
