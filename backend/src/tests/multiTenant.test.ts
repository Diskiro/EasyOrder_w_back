import { extractRestaurantSlug } from '../middleware/tenant';
import { isSubscriptionValid } from '../middleware/subscription';
import { hasFeatureEnabled } from '../middleware/featureGate';

describe('Multi-Tenant & Subscription Architecture (SRP & Security)', () => {
    describe('1. Extracción de Subdominio e Identificador (extractRestaurantSlug)', () => {
        it('debe extraer el slug desde el header X-Restaurant-Slug prioritariamente', () => {
            const slug = extractRestaurantSlug('useeasyorder.com', 'taqueria-central');
            expect(slug).toBe('taqueria-central');
        });

        it('debe limpiar mayúsculas y espacios en el header', () => {
            const slug = extractRestaurantSlug('useeasyorder.com', '  La-Pizzeria  ');
            expect(slug).toBe('la-pizzeria');
        });

        it('debe rechazar caracteres maliciosos o no alfanuméricos en el slug', () => {
            expect(extractRestaurantSlug('useeasyorder.com', 'taqueria;DROP TABLE--')).toBeNull();
            expect(extractRestaurantSlug('useeasyorder.com', '<script>alert(1)</script>')).toBeNull();
        });

        it('debe extraer el subdominio de un hostname válido de producción', () => {
            const slug = extractRestaurantSlug('restauranteuno.useeasyorder.com', undefined);
            expect(slug).toBe('restauranteuno');
        });

        it('debe ignorar subdominios reservados de infraestructura (api, admin, www)', () => {
            expect(extractRestaurantSlug('api.useeasyorder.com', undefined)).toBeNull();
            expect(extractRestaurantSlug('www.useeasyorder.com', undefined)).toBeNull();
            expect(extractRestaurantSlug('app.useeasyorder.com', undefined)).toBeNull();
        });

        it('debe retornar null cuando se accede desde localhost sin subdominio', () => {
            expect(extractRestaurantSlug('localhost', undefined)).toBeNull();
        });
    });

    describe('2. Validación de Vigencia de Suscripción (isSubscriptionValid)', () => {
        const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 15); // +15 días
        const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 1); // -1 día

        it('debe validar como correcta una suscripción activa con fecha futura', () => {
            const result = isSubscriptionValid('active', futureDate.toISOString());
            expect(result.valid).toBe(true);
        });

        it('debe bloquear una suscripción con status suspended', () => {
            const result = isSubscriptionValid('suspended', futureDate.toISOString());
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('suspended');
        });

        it('debe bloquear una suscripción cuya fecha de corte ya pasó', () => {
            const result = isSubscriptionValid('active', pastDate.toISOString());
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('expired');
        });

        it('debe manejar datos ausentes o inválidos', () => {
            expect(isSubscriptionValid(undefined, undefined).valid).toBe(false);
            expect(isSubscriptionValid('active', 'not-a-valid-date').valid).toBe(false);
        });
    });

    describe('3. Control de Acceso por Módulos / Planes (hasFeatureEnabled)', () => {
        const basicPlan = {
            has_kitchen_display: false,
            has_analytics: false,
            has_reservations: false,
            has_cash_register: false,
            has_qr_ordering: true,
            max_tables: 10,
            max_users: 2,
        };

        const proPlan = {
            has_kitchen_display: true,
            has_analytics: true,
            has_reservations: true,
            has_cash_register: true,
            has_qr_ordering: true,
            max_tables: 30,
            max_users: 8,
        };

        it('debe denegar analíticas y pantalla de cocina en el Plan Básico', () => {
            expect(hasFeatureEnabled(basicPlan, 'has_kitchen_display')).toBe(false);
            expect(hasFeatureEnabled(basicPlan, 'has_analytics')).toBe(false);
            expect(hasFeatureEnabled(basicPlan, 'has_qr_ordering')).toBe(true);
        });

        it('debe permitir todos los módulos en el Plan Pro', () => {
            expect(hasFeatureEnabled(proPlan, 'has_kitchen_display')).toBe(true);
            expect(hasFeatureEnabled(proPlan, 'has_analytics')).toBe(true);
            expect(hasFeatureEnabled(proPlan, 'has_cash_register')).toBe(true);
            expect(hasFeatureEnabled(proPlan, 'has_reservations')).toBe(true);
        });

        it('debe retornar false de forma segura si el plan es undefined', () => {
            expect(hasFeatureEnabled(undefined, 'has_analytics')).toBe(false);
        });
    });
});
