import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiFetch, resolveApiUrl } from './api';

describe('api client module (SRP & Security)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('resolveApiUrl', () => {
        it('debe resolver la URL local cuando el hostname es localhost', () => {
            const url = resolveApiUrl();
            expect(url).toContain('/api');
        });
    });

    describe('apiFetch', () => {
        it('debe adjuntar el token de autenticación y el header X-Restaurant-Slug', async () => {
            localStorage.setItem('token', 'fake-jwt-token');
            localStorage.setItem('tenant_slug', 'taqueria-central');

            const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ success: true }) };
            window.fetch = vi.fn().mockResolvedValue(mockResponse);

            const result = await apiFetch('/test-endpoint');

            expect(window.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/test-endpoint'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'X-Restaurant-Slug': 'taqueria-central',
                        Authorization: 'Bearer fake-jwt-token'
                    })
                })
            );
            expect(result).toEqual({ success: true });
        });

        it('debe disparar evento global subscription_error ante respuesta HTTP 402', async () => {
            const eventSpy = vi.fn();
            window.addEventListener('subscription_error', eventSpy);

            const mockResponse = {
                ok: false,
                status: 402,
                json: vi.fn().mockResolvedValue({
                    error: 'subscription_expired',
                    message: 'Suscripción vencida'
                })
            };
            window.fetch = vi.fn().mockResolvedValue(mockResponse);

            await expect(apiFetch('/orders')).rejects.toThrow('Suscripción vencida');
            expect(eventSpy).toHaveBeenCalledTimes(1);

            window.removeEventListener('subscription_error', eventSpy);
        });

        it('debe propagar errores HTTP genéricos', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                json: vi.fn().mockResolvedValue({
                    error: 'Internal server error'
                })
            };
            window.fetch = vi.fn().mockResolvedValue(mockResponse);

            await expect(apiFetch('/data')).rejects.toThrow('Internal server error');
        });
    });
});
