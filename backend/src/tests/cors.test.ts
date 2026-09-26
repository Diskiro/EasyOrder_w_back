import { isOriginAllowed } from '../config/cors';

describe('CORS Origin Validation (SRP & Security)', () => {
    const defaultAllowedOrigins = [
        'http://localhost',
        'http://127.0.0.1',
        'https://useeasyorder.com',
        'https://api.useeasyorder.com'
    ];

    it('debe permitir peticiones sin origen (apps nativas, llamadas internas)', () => {
        expect(isOriginAllowed(undefined, defaultAllowedOrigins)).toBe(true);
        expect(isOriginAllowed('', defaultAllowedOrigins)).toBe(true);
    });

    it('debe permitir localhost y 127.0.0.1 con cualquier puerto', () => {
        expect(isOriginAllowed('http://localhost:5173', defaultAllowedOrigins)).toBe(true);
        expect(isOriginAllowed('http://localhost:80', defaultAllowedOrigins)).toBe(true);
        expect(isOriginAllowed('http://127.0.0.1:3000', defaultAllowedOrigins)).toBe(true);
    });

    it('debe permitir useeasyorder.com con HTTPS', () => {
        expect(isOriginAllowed('https://useeasyorder.com', defaultAllowedOrigins)).toBe(true);
        expect(isOriginAllowed('https://api.useeasyorder.com', defaultAllowedOrigins)).toBe(true);
    });

    it('debe permitir subdominios de restaurantes con HTTPS (*.useeasyorder.com)', () => {
        expect(isOriginAllowed('https://restauranteuno.useeasyorder.com', defaultAllowedOrigins)).toBe(true);
        expect(isOriginAllowed('https://restaurantedos.useeasyorder.com', defaultAllowedOrigins)).toBe(true);
        expect(isOriginAllowed('https://admin.useeasyorder.com', defaultAllowedOrigins)).toBe(true);
    });

    it('debe bloquear dominios no seguros (HTTP) en producción', () => {
        expect(isOriginAllowed('http://restauranteuno.useeasyorder.com', defaultAllowedOrigins)).toBe(false);
    });

    it('debe bloquear dominios maliciosos o suplantadores', () => {
        expect(isOriginAllowed('https://fake-useeasyorder.com', defaultAllowedOrigins)).toBe(false);
        expect(isOriginAllowed('https://useeasyorder.com.attacker.com', defaultAllowedOrigins)).toBe(false);
        expect(isOriginAllowed('https://malicious-site.com', defaultAllowedOrigins)).toBe(false);
        expect(isOriginAllowed('not-a-valid-url', defaultAllowedOrigins)).toBe(false);
    });
});
