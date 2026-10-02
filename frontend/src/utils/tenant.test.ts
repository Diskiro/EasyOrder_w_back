import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    sanitizeTenantSlug,
    extractSubdomainFromHostname,
    resolveActiveTenantSlug,
    setActiveTenantSlug
} from './tenant';

describe('tenant utility module (SRP & Input Validation)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('sanitizeTenantSlug', () => {
        it('debe aceptar slugs válidos con letras, números y guiones', () => {
            expect(sanitizeTenantSlug('taqueria-los-arcos')).toBe('taqueria-los-arcos');
            expect(sanitizeTenantSlug('cafe24')).toBe('cafe24');
        });

        it('debe limpiar mayúsculas y espacios en blanco', () => {
            expect(sanitizeTenantSlug('  Mi-Restaurante  ')).toBe('mi-restaurante');
        });

        it('debe rechazar subdominios reservados de infraestructura', () => {
            expect(sanitizeTenantSlug('api')).toBeNull();
            expect(sanitizeTenantSlug('admin')).toBeNull();
            expect(sanitizeTenantSlug('www')).toBeNull();
            expect(sanitizeTenantSlug('app')).toBeNull();
            expect(sanitizeTenantSlug('localhost')).toBeNull();
        });

        it('debe rechazar caracteres maliciosos, símbolos o espacios internos', () => {
            expect(sanitizeTenantSlug('tacos;DROP TABLE--')).toBeNull();
            expect(sanitizeTenantSlug('<script>alert(1)</script>')).toBeNull();
            expect(sanitizeTenantSlug('tacos el pastor')).toBeNull();
            expect(sanitizeTenantSlug('')).toBeNull();
            expect(sanitizeTenantSlug(null)).toBeNull();
            expect(sanitizeTenantSlug(undefined)).toBeNull();
        });
    });

    describe('extractSubdomainFromHostname', () => {
        it('debe extraer el subdominio de un dominio de producción estándar', () => {
            expect(extractSubdomainFromHostname('restauranteuno.useeasyorder.com')).toBe('restauranteuno');
            expect(extractSubdomainFromHostname('cafe-roma.useeasyorder.com')).toBe('cafe-roma');
        });

        it('debe retornar null para subdominios reservados', () => {
            expect(extractSubdomainFromHostname('api.useeasyorder.com')).toBeNull();
            expect(extractSubdomainFromHostname('admin.useeasyorder.com')).toBeNull();
            expect(extractSubdomainFromHostname('www.useeasyorder.com')).toBeNull();
        });

        it('debe soportar subdominios locales para desarrollo (ej. rest1.localhost)', () => {
            expect(extractSubdomainFromHostname('rest1.localhost')).toBe('rest1');
        });

        it('debe retornar null para hostname simple sin subdominio', () => {
            expect(extractSubdomainFromHostname('localhost')).toBeNull();
            expect(extractSubdomainFromHostname('useeasyorder.com')).toBeNull();
            expect(extractSubdomainFromHostname('')).toBeNull();
            expect(extractSubdomainFromHostname(undefined)).toBeNull();
        });
    });

    describe('setActiveTenantSlug', () => {
        it('debe guardar en localStorage si el slug es válido', () => {
            const success = setActiveTenantSlug('pizzeria-napoli');
            expect(success).toBe(true);
            expect(localStorage.getItem('tenant_slug')).toBe('pizzeria-napoli');
        });

        it('debe rechazar slugs inválidos y no modificar localStorage', () => {
            const success = setActiveTenantSlug('admin');
            expect(success).toBe(false);
            expect(localStorage.getItem('tenant_slug')).toBeNull();
        });
    });

    describe('resolveActiveTenantSlug', () => {
        it('debe retornar "demo" en localhost si no hay parámetros ni subdominio', () => {
            expect(resolveActiveTenantSlug()).toBe('demo');
        });

        it('debe retornar null en el dominio raíz de producción useeasyorder.com', () => {
            const originalLocation = window.location;
            // @ts-ignore
            delete window.location;
            // @ts-ignore
            window.location = { ...originalLocation, hostname: 'useeasyorder.com', search: '' };

            expect(resolveActiveTenantSlug()).toBeNull();

            // @ts-ignore
            window.location = originalLocation;
        });

        it('debe dar prioridad al slug guardado en localStorage para desarrollo', () => {
            localStorage.setItem('tenant_slug', 'sushi-master');
            expect(resolveActiveTenantSlug()).toBe('sushi-master');
        });
    });
});
